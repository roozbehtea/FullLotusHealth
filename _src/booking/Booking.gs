/**
 * Full Lotus Health: online appointment booking.
 *
 * Lives in the SAME Apps Script project as the tea sits (_src/teasits/Code.gs). It reuses that project's
 * Stripe key, Google Sheet, 10-minute check and web app URL. Code.gs hands any action that starts with
 * "appt_" to apptGet_ / apptPost_ below, and calls apptReconcile_ and apptSetup_.
 *
 * Source of truth:  the info@fulllotushealth.com Google Calendar. Anything on it that is not marked free
 *                   takes up room; an event with "hold" in its title blocks its time without a reason
 *                   shown; an all-day event blocks the whole day.
 * What patients see: a curated set of openings (rules in apptDays_). Nothing is a booking until it is PAID:
 *                   the calendar event is created only after Stripe confirms payment, which is what stops a
 *                   cancelled or abandoned checkout from ever looking like an appointment.
 * Collects only name, email, phone and an optional short note. Health details stay in the Google Form intake.
 *
 * Admin settings (Project Settings > Script properties; all optional, defaults in apptCfg_):
 *   APPT_CORE_DAYS=1,3,5        days offered first (1 = Mon ... 7 = Sun)
 *   APPT_EXTRA_DAYS=2,4         opened for a week only once that week's core days have no openings
 *   APPT_OPEN_EXTRA=true        false keeps the extra days closed
 *   APPT_START=10:00  APPT_END=17:00     earliest start and latest finish
 *   APPT_MAX_VISIBLE=3          openings shown per day, however much is free
 *   APPT_ROTATE=true            vary which free windows are shown from day to day
 *   APPT_NOTICE_HOURS=24  APPT_WINDOW_DAYS=21  APPT_CAPACITY=2 (treatment rooms)
 *   INTAKE_URL                  new patient form link
 */

// Keep this block in step with SERVICES in _src/build.py (build.py checks it and warns when they differ).
var APPT_SERVICES = /*json*/ {
  "acupuncture-initial-treatment": {"name": "Acupuncture: Initial Treatment", "minutes": 60, "price": 180, "intake": true, "series": false, "online": false},
  "acupuncture-repeat-treatment": {"name": "Acupuncture: Repeat Treatment", "minutes": 45, "price": 120, "intake": false, "series": false, "online": false},
  "full-lotus-lift": {"name": "Cosmetic Acupuncture", "minutes": 60, "price": 250, "intake": true, "series": true, "online": false},
  "medical-microneedling-session": {"name": "Microneedling", "minutes": 90, "price": 500, "intake": true, "series": true, "online": false},
  "facial-nano-needling": {"name": "Nanoneedling", "minutes": 60, "price": 350, "intake": true, "series": true, "online": false},
  "initial-consultation-online": {"name": "Initial Consultation (Online)", "minutes": 60, "price": 180, "intake": true, "series": false, "online": true},
  "repeat-consultation-online": {"name": "Repeat Consultation (Online)", "minutes": 45, "price": 180, "intake": false, "series": false, "online": true}
} /*end*/;

var APPT_SHEET = 'Appointments';
var APPT_HEADERS = ['Created', 'Appt ID', 'Service ID', 'Service', 'Start', 'End', 'When', 'Name', 'Email', 'Phone', 'Note', 'Status', 'Stripe session', 'Amount paid', 'Paid at', 'Event ID', 'Emailed'];
var AC = { created: 1, id: 2, svc: 3, svcName: 4, start: 5, end: 6, when: 7, name: 8, email: 9, phone: 10, note: 11, status: 12, session: 13, amount: 14, paidAt: 15, eventId: 16, emailed: 17 };
var WAIT_SHEET = 'Waitlist';
var WAIT_HEADERS = ['Created', 'Kind', 'Service', 'Day or wish', 'Name', 'Email', 'Phone', 'Note'];
var APPT_HOLD_MINUTES = 35;     // Stripe Checkout links expire after 31 minutes; holds outlast them slightly
var APPT_STEP = 30;             // start times fall on the hour or half hour

function apptCfg_() {
  var days = function (k, d) { return String(prop_(k, d)).split(',').map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x >= 1 && x <= 7; }); };
  var mins = function (k, d) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(prop_(k, d))); return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 0; };
  return {
    core: days('APPT_CORE_DAYS', '1,3,5'),
    extra: days('APPT_EXTRA_DAYS', '2,4'),
    openExtra: String(prop_('APPT_OPEN_EXTRA', 'true')) === 'true',
    startMin: mins('APPT_START', '10:00'),
    endMin: mins('APPT_END', '17:00'),
    maxVisible: parseInt(prop_('APPT_MAX_VISIBLE', '3'), 10),
    rotate: String(prop_('APPT_ROTATE', 'true')) === 'true',
    noticeMs: parseFloat(prop_('APPT_NOTICE_HOURS', '24')) * 3600000,
    windowDays: parseInt(prop_('APPT_WINDOW_DAYS', '21'), 10),
    capacity: parseInt(prop_('APPT_CAPACITY', '2'), 10),
    intake: prop_('INTAKE_URL', 'https://docs.google.com/forms/d/e/1FAIpQLSfMS8d01yMjbKDpyX7065HTPgHsZNcFwGa9GGI5DhhPWkB6hg/viewform')
  };
}

// ------------------------------------------------------------------ entry points (called from Code.gs)
function apptGet_(p) {
  if (p.action === 'appt_slots') return apptSlots_(String(p.service || ''));
  if (p.action === 'appt_confirm') return apptConfirm_(String(p.session || ''));
  if (p.action === 'appt_release') return apptRelease_(String(p.session || ''));
  return { error: 'bad_request' };
}

function apptPost_(b) {
  if (b.action === 'appt_book') return apptBook_(b);
  if (b.action === 'appt_waitlist') return apptWaitlist_(b);
  return { error: 'bad_request' };
}

// ------------------------------------------------------------------ time helpers (all clinic time is Los Angeles)
function dayKey_(ms) { return Utilities.formatDate(new Date(ms), TZ, 'yyyy-MM-dd'); }
function dow_(ms) { return parseInt(Utilities.formatDate(new Date(ms), TZ, 'u'), 10); }          // 1 = Mon ... 7 = Sun
function at_(key, minutes) {                                                                         // local day + minutes after midnight -> ms
  var h = Math.floor(minutes / 60), m = minutes % 60;
  return Utilities.parseDate(key + ' ' + (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m, TZ, 'yyyy-MM-dd HH:mm').getTime();
}
function addDays_(key, n) {                                                                          // noon avoids daylight-saving edges
  return dayKey_(Utilities.parseDate(key + ' 12:00', TZ, 'yyyy-MM-dd HH:mm').getTime() + n * 864e5);
}
function weekStart_(key) { return addDays_(key, -(dow_(at_(key, 720)) - 1)); }
function timeLabel_(ms) { return Utilities.formatDate(new Date(ms), TZ, 'h:mm a').toLowerCase(); }
function whenLabel_(startMs, endMs) {
  return Utilities.formatDate(new Date(startMs), TZ, "EEEE, MMMM d 'at' h:mm a") + '–' + Utilities.formatDate(new Date(endMs), TZ, 'h:mm a');
}
function hash_(s) {
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, s);
  return ((d[0] & 255) << 16) | ((d[1] & 255) << 8) | (d[2] & 255);
}

// ------------------------------------------------------------------ what takes up room
/** Calendar events and unconfirmed or not-yet-on-calendar reservations, as {s, e, full}. `full` blocks every room. */
function apptBusy_(fromMs, toMs, cfg) {
  var items = [];
  var cal = CalendarApp.getCalendarById(cfg_().calendarId) || CalendarApp.getDefaultCalendar();
  cal.getEvents(new Date(fromMs), new Date(toMs)).forEach(function (ev) {
    try { if (ev.getTransparency() === CalendarApp.EventTransparency.TRANSPARENT) return; } catch (x) {}   // marked "free"
    try { if (ev.getMyStatus() === CalendarApp.GuestStatus.NO) return; } catch (x) {}                       // declined
    var title = ev.getTitle() || '';
    var full = ev.isAllDayEvent() || /\bhold\b/i.test(title) || title.toLowerCase().indexOf(cfg_().match) !== -1;   // all-day, "hold", tea sits
    items.push({ s: ev.getStartTime().getTime(), e: ev.getEndTime().getTime(), full: full, dayOff: ev.isAllDayEvent() });
  });
  var fresh = Date.now() - APPT_HOLD_MINUTES * 60000;
  apptRows_().forEach(function (r) {
    var st = r[AC.status - 1];
    var counts = (st === 'pending' && new Date(r[AC.created - 1]).getTime() > fresh) || (st === 'paid' && !r[AC.eventId - 1]);
    if (counts) items.push({ s: new Date(r[AC.start - 1]).getTime(), e: new Date(r[AC.end - 1]).getTime(), full: false });
  });
  return items;
}

/** Is [s, e) free for a new appointment? Needs a free room throughout, and no other visit starting at the same moment. */
function slotFree_(items, s, e, cap) {
  var points = [s];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (it.s === s && !it.full) return false;                       // stagger: no two visits start together
    if (it.s > s && it.s < e) points.push(it.s);
  }
  for (var k = 0; k < points.length; k++) {
    var used = 0;
    for (var j = 0; j < items.length; j++) {
      var x = items[j];
      if (x.s <= points[k] && points[k] < x.e) used += x.full ? cap : 1;
    }
    if (used >= cap) return false;
  }
  return true;
}

function freeStarts_(items, key, minutes, cfg, nowMs) {
  var out = [];
  for (var m = cfg.startMin; m + minutes <= cfg.endMin; m += APPT_STEP) {
    var s = at_(key, m), e = s + minutes * 60000;
    if (s < nowMs + cfg.noticeMs) continue;
    if (slotFree_(items, s, e, cfg.capacity)) out.push({ s: s, e: e, m: m });
  }
  return out;
}

// ------------------------------------------------------------------ the rules: which openings patients see
/**
 * Returns the days patients may book, each with the openings shown.
 *  - Days: core days; extra days only for a week whose core days have no openings left.
 *  - Window: today through windowDays ahead. Beyond it the page offers "request a date".
 *  - Per day: at most maxVisible openings. Openings that sit right beside an existing visit are preferred, so
 *    bookings cluster; the first and last hour are left out unless the day is otherwise empty; among the rest a
 *    day-seeded shuffle decides, so the pattern changes from day to day.
 *  - A day with nothing to show comes back with no slots, and the page offers the waitlist.
 * `items` are the busy items from apptBusy_, `minutes` the service length.
 */
function apptDays_(items, minutes, cfg, nowMs) {
  var today = dayKey_(nowMs), last = addDays_(today, cfg.windowDays), days = [];
  var weekFull = {};   // week start -> true when no core day that week has any opening left
  function coreHasRoom(wk) {
    if (weekFull[wk] !== undefined) return !weekFull[wk];
    var room = false;
    for (var d = 0; d < 7 && !room; d++) {
      var k = addDays_(wk, d);
      if (cfg.core.indexOf(dow_(at_(k, 720))) === -1) continue;
      if (freeStarts_(items, k, minutes, cfg, nowMs).length) room = true;
    }
    weekFull[wk] = !room;
    return room;
  }
  for (var key = today; key <= last; key = addDays_(key, 1)) {
    if (at_(key, cfg.endMin) <= nowMs + cfg.noticeMs) continue;      // too soon to book online at all: not "full", just not offered
    var dw = dow_(at_(key, 720));
    var isCore = cfg.core.indexOf(dw) !== -1;
    var isExtra = cfg.openExtra && cfg.extra.indexOf(dw) !== -1 && !coreHasRoom(weekStart_(key));
    if (!isCore && !isExtra) continue;
    var noon = at_(key, 720);
    if (items.some(function (it) { return it.dayOff && it.s <= noon && it.e > noon; })) continue;   // all-day event: day off, not shown at all

    var free = freeStarts_(items, key, minutes, cfg, nowMs);
    var dayStart = at_(key, 0), dayEnd = at_(key, 1439);
    var booked = items.filter(function (it) { return !it.full && it.s < dayEnd && it.e > dayStart; });
    var shown = [];
    if (free.length) {
      var pool = free;
      if (booked.length) {                                           // keep the first and last hour back on a day that already has visits
        var inner = free.filter(function (c) { return c.m >= cfg.startMin + 60 && c.m + minutes <= cfg.endMin - 60; });
        if (inner.length) pool = inner;
      }
      pool = pool.map(function (c) {
        var beside = items.some(function (it) { return !it.full && (it.e === c.s || it.s === c.e); });
        return { s: c.s, e: c.e, beside: beside, h: cfg.rotate ? hash_(key + '|' + c.m) : c.m };
      });
      pool.sort(function (a, b) { return (b.beside - a.beside) || (a.h - b.h); });
      shown = pool.slice(0, Math.max(1, cfg.maxVisible)).sort(function (a, b) { return a.s - b.s; });
    }
    days.push({
      date: key,
      label: Utilities.formatDate(new Date(at_(key, 720)), TZ, 'EEEE, MMMM d'),
      slots: shown.map(function (x) { return { start: new Date(x.s).toISOString(), label: timeLabel_(x.s) }; })
    });
  }
  return days;
}

function apptSlots_(slug) {
  var svc = APPT_SERVICES[slug];
  if (!svc) return { error: 'service' };
  var cfg = apptCfg_(), now = Date.now();
  var from = at_(dayKey_(now), 0), to = at_(addDays_(dayKey_(now), cfg.windowDays + 8), 0);
  var days = apptDays_(apptBusy_(from, to, cfg), svc.minutes, cfg, now);
  return {
    service: { slug: slug, name: svc.name, minutes: svc.minutes, price: svc.price, intake: svc.intake, series: svc.series, online: svc.online },
    today: dayKey_(now), windowDays: cfg.windowDays, days: days
  };
}

// ------------------------------------------------------------------ sheet
function apptSheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) { sh.appendRow(headers); sh.setFrozenRows(1); }
  return sh;
}
function apptRows_() {
  var sh = apptSheet_(APPT_SHEET, APPT_HEADERS);
  var n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, APPT_HEADERS.length).getValues() : [];
}
function apptFind_(session) {
  var rs = apptRows_();
  for (var i = 0; i < rs.length; i++) if (rs[i][AC.session - 1] === session) return { index: i + 2, row: rs[i] };
  return null;
}
function apptSet_(rowIndex, values) {
  var sh = apptSheet_(APPT_SHEET, APPT_HEADERS);
  Object.keys(values).forEach(function (k) { sh.getRange(rowIndex, AC[k]).setValue(values[k]); });
}

// ------------------------------------------------------------------ book
function apptBook_(b) {
  if (b.website) return { error: 'bad_request' };                         // trap field: bots fill it
  var svc = APPT_SERVICES[String(b.service || '')];
  if (!svc) return { error: 'service' };
  var name = clean_(b.name, 80);
  var email = String(b.email || '').trim().toLowerCase();
  var phone = clean_(b.phone, 30);
  var note = clean_(b.note, 300);
  var startMs = Date.parse(String(b.start || ''));
  if (!name) return { error: 'name' };
  if (!(email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) || /^[=+\-@]/.test(email)) return { error: 'email' };
  if (phone.replace(/\D/g, '').length < 7) return { error: 'phone' };
  if (isNaN(startMs)) return { error: 'closed' };

  var c = cfg_(), cfg = apptCfg_();
  if (!c.stripeKey) return { error: 'setup' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var now = Date.now();
    var from = at_(dayKey_(now), 0), to = at_(addDays_(dayKey_(now), cfg.windowDays + 8), 0);
    var days = apptDays_(apptBusy_(from, to, cfg), svc.minutes, cfg, now);
    var offered = days.some(function (d) { return d.slots.some(function (s) { return Date.parse(s.start) === startMs; }); });
    if (!offered) return { error: 'taken' };                              // someone else got it, or it is no longer offered

    var endMs = startMs + svc.minutes * 60000;
    var when = whenLabel_(startMs, endMs);
    var session = stripe_('post', '/v1/checkout/sessions', {
      'mode': 'payment',
      'customer_email': email,
      'client_reference_id': String(b.service),
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(Math.round(svc.price * 100)),
      'line_items[0][price_data][product_data][name]': svc.name + ', ' + when,
      'line_items[0][price_data][product_data][description]': 'Full Lotus Health, ' + (svc.online ? 'by video' : c.address),
      'allow_promotion_codes': 'true',
      'metadata[service]': String(b.service),
      'metadata[start]': new Date(startMs).toISOString(),
      'metadata[name]': name,
      'expires_at': String(Math.floor(Date.now() / 1000) + 31 * 60),
      'success_url': c.site + '/book/' + b.service + '?paid={CHECKOUT_SESSION_ID}',
      'cancel_url': c.site + '/book/' + b.service + '?cancelled=1'
    });
    apptSheet_(APPT_SHEET, APPT_HEADERS).appendRow([new Date(), Utilities.getUuid().slice(0, 8), String(b.service), svc.name,
      new Date(startMs), new Date(endMs), when, name, email, phone, note, 'pending', session.id, '', '', '', '']);
    return { ok: true, url: session.url, session: session.id };
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------------ confirm, release, reconcile
function apptConfirm_(session) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(session)) return { error: 'bad_request' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var found;
  try {
    found = apptFind_(session);
    if (!found) return { error: 'not_found' };
    if (found.row[AC.status - 1] !== 'paid') {
      var s = stripe_('get', '/v1/checkout/sessions/' + session);
      if (!paidOk_(s)) return { ok: false, status: s.status };
      apptSet_(found.index, { status: 'paid', amount: (s.amount_total || 0) / 100, paidAt: new Date() });
    }
    apptFinish_(session);                       // calendar event, then emails; inside the lock so two confirms can't both run
    found = apptFind_(session);
  } finally {
    lock.releaseLock();
  }
  var r = found.row, svc = APPT_SERVICES[r[AC.svc - 1]] || {};
  return { ok: true, when: r[AC.when - 1], service: r[AC.svcName - 1], name: r[AC.name - 1], intake: !!svc.intake, online: !!svc.online, series: !!svc.series, intakeUrl: apptCfg_().intake };
}

/** Went back from Stripe without paying: end the checkout and free the time now. Nothing was ever on the calendar. */
function apptRelease_(session) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(session)) return { error: 'bad_request' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var found = apptFind_(session);
    if (!found || found.row[AC.status - 1] !== 'pending') return { ok: true };
    var s = stripe_('get', '/v1/checkout/sessions/' + session);
    if (paidOk_(s)) return { ok: true };
    if (s.status === 'open') stripe_('post', '/v1/checkout/sessions/' + session + '/expire', {});
    apptSet_(found.index, { status: 'cancelled' });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** Every 10 minutes (from Code.gs reconcile): paid but never confirmed, stale holds, and paid rows still missing their event. */
function apptReconcile_() {
  var cutoff = Date.now() - APPT_HOLD_MINUTES * 60000;
  var rs = apptRows_();
  for (var i = 0; i < rs.length; i++) {
    var r = rs[i], session = r[AC.session - 1], st = r[AC.status - 1];
    try {
      if (st === 'pending') {
        var s = stripe_('get', '/v1/checkout/sessions/' + session);
        if (paidOk_(s)) apptConfirm_(session);
        else if (s.status === 'expired' || new Date(r[AC.created - 1]).getTime() < cutoff) apptSet_(i + 2, { status: 'expired' });
      } else if (st === 'paid' && (!r[AC.eventId - 1] || !r[AC.emailed - 1])) {
        apptConfirm_(session);
      }
    } catch (err) {
      console.error('appt reconcile ' + session + ': ' + err);
    }
  }
}

/** Create the calendar event and send the emails. Safe to run twice: each step is skipped once done. */
function apptFinish_(session) {
  var found = apptFind_(session);
  if (!found) return;
  var r = found.row, c = cfg_();
  var svc = APPT_SERVICES[r[AC.svc - 1]] || { name: r[AC.svcName - 1] };
  if (!r[AC.eventId - 1]) {
    var cal = CalendarApp.getCalendarById(c.calendarId) || CalendarApp.getDefaultCalendar();
    var intake = svc.intake ? '\n\nBefore your visit, please complete the New Patient Intake form: ' + apptCfg_().intake : '';
    var ev = cal.createEvent(r[AC.svcName - 1] + ' (' + r[AC.name - 1] + ')', new Date(r[AC.start - 1]), new Date(r[AC.end - 1]), {
      description: 'Booked online\n' + r[AC.name - 1] + '\n' + r[AC.email - 1] + '\n' + r[AC.phone - 1] +
        (r[AC.note - 1] ? '\nNote: ' + r[AC.note - 1] : '') +
        '\n\nPaid: $' + Number(r[AC.amount - 1] || 0).toFixed(2) + ' (Stripe ' + session + ')' +
        '\nTo reschedule or cancel, call or text ' + c.phone + ' at least 24 hours ahead. Appointments cancelled or missed with less than 24 hours\' notice are charged $95.' + intake,
      location: svc.online ? 'Online (video)' : c.address,
      guests: String(r[AC.email - 1]),
      sendInvites: true
    });
    apptSet_(found.index, { eventId: ev.getId() });
    found = apptFind_(session);
  }
  if (!found.row[AC.emailed - 1]) { apptEmails_(found.row, svc); apptSet_(found.index, { emailed: new Date() }); }
}

function apptEmails_(r, svc) {
  var c = cfg_(), name = r[AC.name - 1], email = r[AC.email - 1], when = r[AC.when - 1];
  var where = svc.online ? 'Online, by video. Roozbeh will email you the video link before your visit.' : 'Full Lotus Health, ' + c.address;
  var intake = svc.intake ? '\nPlease fill in the New Patient Intake form before you come: ' + apptCfg_().intake + '\n' : '';
  var series = svc.series ? '\nIf you would like a series of treatments, we will plan the rest together after this first session.\n' : '';
  MailApp.sendEmail({
    to: email, replyTo: c.notify, name: 'Full Lotus Health',
    subject: 'Your appointment: ' + r[AC.svcName - 1] + ', ' + when.split(' at ')[0],
    body: 'Hi ' + name + ',\n\nYou are booked for ' + r[AC.svcName - 1] + ' on ' + when + '.\n\n' +
      'Where: ' + where + '\n' + intake + series + '\n' +
      'Your payment has been received. To reschedule or cancel, reply to this email or text ' + c.phone + ' at least 24 hours ahead. ' +
      'Appointments cancelled or missed with less than 24 hours\' notice are charged $95.\n\nSee you soon,\nRoozbeh\nFull Lotus Health'
  });
  MailApp.sendEmail({
    to: c.notify, replyTo: email,
    subject: 'New booking: ' + name + ', ' + r[AC.svcName - 1] + ', ' + when.split(' at ')[0],
    body: name + ' booked ' + r[AC.svcName - 1] + ' for ' + when + ' and paid $' + Number(r[AC.amount - 1] || 0).toFixed(2) + '.\nEmail: ' + email +
      '\nPhone: ' + (r[AC.phone - 1] || '-') + (r[AC.note - 1] ? '\nNote: ' + r[AC.note - 1] : '') + '\nIt is on the calendar.'
  });
}

// ------------------------------------------------------------------ waitlist and "request a date"
function apptWaitlist_(b) {
  if (b.website) return { error: 'bad_request' };
  var svc = APPT_SERVICES[String(b.service || '')];
  if (!svc) return { error: 'service' };
  var kind = b.kind === 'request' ? 'Request a date' : 'Waitlist';
  var name = clean_(b.name, 80), email = String(b.email || '').trim().toLowerCase(), phone = clean_(b.phone, 30);
  var wish = clean_(b.wish, 120), note = clean_(b.note, 300);
  if (!name) return { error: 'name' };
  if (!(email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) || /^[=+\-@]/.test(email)) return { error: 'email' };
  if (!wish) return { error: 'wish' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    apptSheet_(WAIT_SHEET, WAIT_HEADERS).appendRow([new Date(), kind, svc.name, wish, name, email, phone, note]);
  } finally {
    lock.releaseLock();
  }
  MailApp.sendEmail({
    to: cfg_().notify, replyTo: email,
    subject: kind + ': ' + name + ', ' + svc.name,
    body: name + ' asked for ' + svc.name + '.\nDay or time: ' + wish + '\nEmail: ' + email + '\nPhone: ' + (phone || '-') + (note ? '\nNote: ' + note : '')
  });
  return { ok: true };
}

// ------------------------------------------------------------------ one-time setup (called from setup() in Code.gs)
function apptSetup_() {
  apptSheet_(APPT_SHEET, APPT_HEADERS);
  apptSheet_(WAIT_SHEET, WAIT_HEADERS);
  var s = apptSlots_('acupuncture-repeat-treatment');
  console.log('Next openings (repeat treatment): ' + JSON.stringify(s.days.slice(0, 6), null, 1));
}
