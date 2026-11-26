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
 * Collects only name, email, phone and an "I've already completed the forms" box. Forms the patient already did (the box,
 * or their email or mobile phone found in that form's responses sheet) are left out of the confirmation, email and invite. Health details stay in the Google Form intake.
 *
 * Admin settings (Project Settings > Script properties; all optional, defaults in apptCfg_):
 *   APPT_CORE_DAYS=1,3,5        days offered first (1 = Mon ... 7 = Sun)
 *   APPT_EXTRA_DAYS=2,4         opened for a week only once that week's core days have no openings
 *   APPT_OPEN_EXTRA=true        false keeps the extra days closed
 *   APPT_START=10:00  APPT_END=17:00     earliest start and latest finish
 *   APPT_MAX_VISIBLE=3          openings shown per day, however much is free
 *   APPT_ROTATE=true            vary which free windows are shown from day to day
 *   APPT_NOTICE_HOURS=24  APPT_WINDOW_DAYS=21  APPT_CAPACITY=2 (treatment rooms)
 *   Open times are cached so the page can answer quickly. The cache is never used to
 *   decide a booking: apptBook_ always rereads the calendar. Run apptInstallCache once to refresh
 *   that cache every 5 minutes. A hold, a payment, a release, or an expiry clears it.
 *   GITHUB_TOKEN               optional. A GitHub token (Contents: read and write, this repository only). With it, every refresh
 *                              also saves the open times as a small file on GitHub that the website reads first, so the page does
 *                              not wait on Apps Script at all. Without it, nothing changes. GITHUB_REPO, SLOTS_BRANCH and
 *                              SLOTS_PATH can override roozbehtea/fulllotushealth, slots and slots/slots.json.
 *   INTAKE_URL                  new patient form link
 *   INTAKE_SHEET_ID, SKIN_INTAKE_SHEET_ID   responses sheets checked to recognize returning patients
 *   SKIN_INTAKE_URL             Skin Treatment Intake & Consent link (skin services, in addition to the new patient form)
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
    intake: prop_('INTAKE_URL', 'https://docs.google.com/forms/d/e/1FAIpQLSfMS8d01yMjbKDpyX7065HTPgHsZNcFwGa9GGI5DhhPWkB6hg/viewform'),
    skinIntake: prop_('SKIN_INTAKE_URL', 'https://docs.google.com/forms/d/e/1FAIpQLSdNzCi2CoU4WeAVBHHNp1IrKtoAUavYBMhe7aeQzBGxJSuMiw/viewform'),
    intakeSheet: prop_('INTAKE_SHEET_ID', '1kdRQ6FNAsIgsP0GYrzqhrW9YX0DtwL8PIY5I4zxOs2M'),          // New Patient Intake (responses)
    skinSheet: prop_('SKIN_INTAKE_SHEET_ID', '1WAJnYsDRNffvLPk4DzjOV6S3PCGYO9M_GFQVU0wcm6s')      // Skin Treatment Intake & Consent (responses)
  };
}

// Skin services also need the Skin Treatment Intake & Consent form, on top of the new patient form.
var APPT_SKIN = { 'full-lotus-lift': true, 'medical-microneedling-session': true, 'facial-nano-needling': true };

// Forms a patient has already done are left out of the confirmation page, email and invite. What we know is kept
// in the booking's Note column: the patient ticked "I've already completed the forms", or their email or mobile
// phone was found in a form's responses sheet when they booked.
var APPT_RETURNING = 'Returning patient: has already completed the forms';
var APPT_ON_FILE = 'Forms on file: ';
var APPT_NP_NAME = 'New Patient Intake', APPT_SKIN_NAME = 'Skin Treatment Intake & Consent';
function apptNote_(r) { return String(r[AC.note - 1] || ''); }
function apptNeedIntake_(svc, r) { var n = apptNote_(r); return !!svc.intake && n !== APPT_RETURNING && !(n.indexOf(APPT_ON_FILE) === 0 && n.indexOf(APPT_NP_NAME) >= 0); }
function apptNeedSkin_(r) { var n = apptNote_(r); return !!APPT_SKIN[r[AC.svc - 1]] && n !== APPT_RETURNING && !(n.indexOf(APPT_ON_FILE) === 0 && n.indexOf(APPT_SKIN_NAME) >= 0); }
function apptFormList_(svc, r) {
  var cfg = apptCfg_(), out = [];
  if (apptNeedIntake_(svc, r)) out.push({ name: APPT_NP_NAME, url: cfg.intake });
  if (apptNeedSkin_(r)) out.push({ name: APPT_SKIN_NAME, url: cfg.skinIntake });
  return out;
}

function apptPhoneKey_(s) { var d = String(s || '').replace(/\D/g, ''); return d.length >= 7 ? d.slice(-10) : ''; }
/** The responses tab of a form's sheet, and which columns hold the email and mobile phone (0 if none). */
function apptFormCols_(sheetId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sh = ss.getSheets().filter(function (x) { return /^form responses/i.test(x.getName()); })[0] || ss.getSheets()[0];
  var cols = sh.getLastColumn();
  var head = cols ? sh.getRange(1, 1, 1, cols).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
  var pick = function (good, bad) {
    for (var i = 0; i < head.length; i++) if (good.test(head[i]) && !(bad && bad.test(head[i]))) return i + 1;
    return 0;
  };
  var ec = pick(/^email( address)?$/i) || pick(/email/i, /communicat|may email/i);
  var pc = pick(/^mobile phone$/i) || pick(/phone/i, /emergency|physician|doctor/i);
  return { sh: sh, rows: sh.getLastRow() - 1, ec: ec, pc: pc, head: head };
}
/** True if this email or mobile phone appears in a form's responses sheet. Reads only the email and phone columns. */
function apptInSheet_(sheetId, email, phoneKey) {
  if (!sheetId) return false;
  var f = apptFormCols_(sheetId);
  if (f.rows < 1) return false;
  if (email && f.ec) {
    var es = f.sh.getRange(2, f.ec, f.rows, 1).getValues();
    for (var a = 0; a < es.length; a++) if (String(es[a][0]).trim().toLowerCase() === email) return true;
  }
  if (phoneKey && f.pc) {
    var ps = f.sh.getRange(2, f.pc, f.rows, 1).getValues();
    for (var b = 0; b < ps.length; b++) if (apptPhoneKey_(ps[b][0]) === phoneKey) return true;
  }
  return false;
}
/** Run from the editor to see which columns the returning-patient match reads. Logs column names and counts only. */
function checkFormSheets() {
  var c = apptCfg_();
  [[APPT_NP_NAME, c.intakeSheet], [APPT_SKIN_NAME, c.skinSheet]].forEach(function (x) {
    var f = apptFormCols_(x[1]);
    console.log(x[0] + ': tab "' + f.sh.getName() + '", ' + Math.max(0, f.rows) + ' responses, email column "' +
      (f.ec ? f.head[f.ec - 1] : 'NOT FOUND') + '", phone column "' + (f.pc ? f.head[f.pc - 1] : 'NOT FOUND') + '"');
  });
}
/** The Note for a new booking: the patient's tick, or which forms we found for them (blank if none). Never blocks a booking. */
function apptFormsNote_(slug, svc, email, phone, ticked) {
  if (ticked) return APPT_RETURNING;
  if (!svc.intake) return '';
  var cfg = apptCfg_(), key = apptPhoneKey_(phone), found = [];
  var check = function (id, name) {
    try { if (apptInSheet_(id, email, key)) found.push(name); }
    catch (err) { console.error('form match ' + name + ': ' + err); }
  };
  check(cfg.intakeSheet, APPT_NP_NAME);
  if (APPT_SKIN[slug]) check(cfg.skinSheet, APPT_SKIN_NAME);
  return found.length ? APPT_ON_FILE + found.join(', ') : '';
}

// ------------------------------------------------------------------ prepaid packages
// Packages live in the "Packages" tab of the clinic EHR spreadsheet (a different file from the one this script is attached to).
// A patient whose email or phone matches an Active package that covers the booked service is booked WITHOUT Stripe, and one
// visit is counted off. Anything that goes wrong looking a package up falls back to the normal paid flow.
//   PACKAGES_SHEET_ID   script property; defaults to the Full Lotus Clinic spreadsheet
var PKG_SHEET = 'Packages', PKG_COLS = 14;
var PC = { id: 1, patientId: 2, name: 3, email: 4, phone: 5, service: 6, total: 7, used: 8, left: 9, purchased: 10, price: 11, status: 12, log: 13, notes: 14 };
// Package "Service" label (lower case) -> booking services it pays for. The 5-visit acupuncture package covers follow-up visits only.
var PKG_COVERS = { 'acupuncture': ['acupuncture-repeat-treatment'] };

function pkgSheetId_() { return prop_('PACKAGES_SHEET_ID', '1aHCaewhMlLVv6rGyEg-nq4QK6ndlr8Iw8g0NyVeH8L4'); }
function pkgSheet_() { return SpreadsheetApp.openById(pkgSheetId_()).getSheetByName(PKG_SHEET); }
function pkgCovers_(label, slug) {
  var l = String(label || '').trim().toLowerCase();
  return l === slug || (PKG_COVERS[l] || []).indexOf(slug) !== -1;
}
function pkgTime_(v) {
  var t = v instanceof Date ? v.getTime() : Date.parse(String(v || ''));
  return isNaN(t) ? Infinity : t;
}
/**
 * The package that pays for this booking, or null. Active, visits left (total minus used, worked out here, never read from the
 * formula column), covers the service, and the email (any case) or the last 10 digits of the phone match. Oldest purchase first.
 */
function pkgFind_(email, phone, slug) {
  var sh = pkgSheet_();
  if (!sh) return null;
  var n = sh.getLastRow() - 1;
  if (n < 1) return null;
  var rows = sh.getRange(2, 1, n, PKG_COLS).getValues();
  var em = String(email || '').trim().toLowerCase(), key = apptPhoneKey_(phone), best = null, bestAt = 0;
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (String(r[PC.status - 1]).trim().toLowerCase() !== 'active') continue;
    var total = Number(r[PC.total - 1]), used = Number(r[PC.used - 1] || 0);
    if (!(total > 0) || isNaN(used) || total - used < 1) continue;
    if (!pkgCovers_(r[PC.service - 1], slug)) continue;
    var byEmail = !!em && String(r[PC.email - 1]).trim().toLowerCase() === em;
    var byPhone = !!key && apptPhoneKey_(r[PC.phone - 1]) === key;
    if (!byEmail && !byPhone) continue;
    var at = pkgTime_(r[PC.purchased - 1]);
    if (!best || at < bestAt) {
      best = { row: i + 2, id: String(r[PC.id - 1]), patientId: String(r[PC.patientId - 1] || ''), total: total, used: used, left: total - used };
      bestAt = at;
    }
  }
  return best;
}
/** Counts one visit off. Call inside the script lock. Re-reads the row so it never trusts an earlier read. Returns {used, total, left}. */
function pkgUse_(pkg, visitDay) {
  var sh = pkgSheet_();
  var row = sh.getRange(pkg.row, 1, 1, PKG_COLS).getValues()[0];
  if (String(row[PC.id - 1]) !== pkg.id) throw new Error('package row moved');
  var total = Number(row[PC.total - 1]), used = Number(row[PC.used - 1] || 0) + 1;
  if (!(used <= total)) throw new Error('package has no visits left');
  sh.getRange(pkg.row, PC.used).setValue(used);
  var log = String(row[PC.log - 1] || ''), entry = visitDay + ' (visit ' + used + ')';
  sh.getRange(pkg.row, PC.log).setValue(log ? log + '; ' + entry : entry);
  if (used >= total) sh.getRange(pkg.row, PC.status).setValue('Used up');
  return { used: used, total: total, left: total - used };
}
/** One line in the EHR AuditLog. Never blocks a booking. Columns: Timestamp, User, Action, PatientID, RecordID, Model, InputTokens, OutputTokens, EstCostUSD, Detail. */
function pkgAudit_(pkg, apptId, when, left) {
  try {
    var sh = SpreadsheetApp.openById(pkgSheetId_()).getSheetByName('AuditLog');
    if (sh) sh.appendRow([new Date(), 'online booking', 'package booking', pkg.patientId, pkg.id, '', '', '', '', 'Visit ' + apptId + ', ' + when + '. ' + left + ' left.']);
  } catch (err) { console.error('package audit: ' + err); }
}
/** Package bookings carry their details in the "Stripe session" column as pkg|PKG-0001|visits left|total|appt id. */
function pkgTag_(session) {
  var p = String(session || '').split('|');
  return p[0] === 'pkg' && p.length === 5 ? { id: p[1], left: Number(p[2]), total: Number(p[3]) } : null;
}

// ------------------------------------------------------------------ entry points (called from Code.gs)
function apptGet_(p) {
  if (p.action === 'appt_slots') return apptSlots_(String(p.service || ''), String(p.span || ''), String(p.after || ''));
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
function apptDays_(items, minutes, cfg, nowMs, untilKey) {
  var today = dayKey_(nowMs), last = untilKey || addDays_(today, cfg.windowDays), days = [];
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

// Display cache only. A booking never reads this: apptBook_ rereads the calendar inside a lock.
var APPT_CACHE_SECS = 600;      // longer than the 5-minute refresh, so the saved copy never lapses between refreshes
var APPT_CACHE_GEN = 'appt-cache-gen';

function apptCacheKey_(slug, today) { return 'appt-v1-' + slug + '-' + today; }
function apptSoonKey_(slug, today) { return 'appt-soon-v1-' + slug + '-' + today; }
function apptCacheGen_() {
  try { return CacheService.getScriptCache().get(APPT_CACHE_GEN) || '0'; }
  catch (e) { return '0'; }
}
function apptCacheBump_() {
  try { CacheService.getScriptCache().put(APPT_CACHE_GEN, String(Date.now()), 21600); }
  catch (e) { console.error('appt cache bump: ' + e); }
}
function apptCacheRead_(key, gen) {
  try {
    var raw = CacheService.getScriptCache().get(key);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || !parsed.days || String(parsed.gen) !== String(gen)) return null;
    return parsed;
  } catch (e) { return null; }
}
function apptCacheWrite_(key, payload, gen) {
  if (apptCacheGen_() !== gen) return;                         // a booking landed while we were computing: do not put the stale copy back
  try {
    payload.gen = gen;
    CacheService.getScriptCache().put(key, JSON.stringify(payload), APPT_CACHE_SECS);
  } catch (e) { console.error('appt cache put: ' + e); }
}
function apptPublic_(payload) {
  if (!payload) return payload;
  var out = {};
  for (var k in payload) if (payload.hasOwnProperty(k) && k !== 'gen') out[k] = payload[k];
  return out;
}
function apptService_(slug, svc) {
  return { slug: slug, name: svc.name, minutes: svc.minutes, price: svc.price, intake: !!svc.intake, series: !!svc.series, online: !!svc.online };
}
/** Sunday of the week that contains the day a week from today, so the first answer covers the next open days and a whole week of the extra-day rule. */
function apptSoonThrough_(today) {
  var horizon = addDays_(today, 6);
  return addDays_(horizon, 7 - dow_(at_(horizon, 720)));
}
function apptPayload_(slug, svc, days, cfg, now, extra) {
  var out = { service: apptService_(slug, svc), today: dayKey_(now), windowDays: cfg.windowDays, days: days };
  if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) out[k] = extra[k];
  return out;
}
function apptSlotsCompute_(slug, items) {
  var svc = APPT_SERVICES[slug];
  if (!svc) return { error: 'service' };
  var cfg = apptCfg_(), now = Date.now(), gen = apptCacheGen_();
  var today = dayKey_(now);
  var from = at_(today, 0), to = at_(addDays_(today, cfg.windowDays + 8), 0);
  var days = apptDays_(items || apptBusy_(from, to, cfg), svc.minutes, cfg, now);
  var payload = apptPayload_(slug, svc, days, cfg, now);
  apptCacheWrite_(apptCacheKey_(slug, today), payload, gen);
  return apptPublic_(payload);
}
function apptSlotsSoon_(slug) {
  var svc = APPT_SERVICES[slug];
  if (!svc) return { error: 'service' };
  var cfg = apptCfg_(), now = Date.now(), gen = apptCacheGen_();
  var today = dayKey_(now), through = apptSoonThrough_(today);
  var hit = apptCacheRead_(apptSoonKey_(slug, today), gen);
  if (hit) return apptPublic_(hit);
  var from = at_(weekStart_(today), 0), to = at_(addDays_(through, 1), 0);
  var days = apptDays_(apptBusy_(from, to, cfg), svc.minutes, cfg, now, through);
  var payload = apptPayload_(slug, svc, days, cfg, now, { partial: true, through: through });
  apptCacheWrite_(apptSoonKey_(slug, today), payload, gen);
  return apptPublic_(payload);
}
function apptSliceRest_(full, after) {
  var days = [], out = apptPublic_(full), i;
  for (i = 0; i < full.days.length; i++) if (!after || full.days[i].date > after) days.push(full.days[i]);
  out.days = days;
  out.partial = false;
  return out;
}
/**
 * span=soon returns the next open days first (a short calendar read) when nothing is cached.
 * A warm cache returns the whole window in that same request, so the page does not make a second round trip.
 * span=rest returns the days after `after`. Anything else returns the whole window.
 */
function apptSlots_(slug, span, after) {
  var svc = APPT_SERVICES[slug];
  if (!svc) return { error: 'service' };
  if (after && !/^\d{4}-\d{2}-\d{2}$/.test(after)) after = '';
  var today = dayKey_(Date.now()), gen = apptCacheGen_();
  var full = apptCacheRead_(apptCacheKey_(slug, today), gen);
  if (span === 'rest') return apptSliceRest_(full || apptSlotsCompute_(slug), after || '');
  if (full) return apptPublic_(full);
  if (span === 'soon') return apptSlotsSoon_(slug);
  return apptSlotsCompute_(slug);
}

/** Every 5 minutes, from apptInstallCache: one calendar read, then a cached answer for every service, and a static copy on GitHub. */
function apptWarm() {
  var slugs = [], slug;
  for (slug in APPT_SERVICES) if (APPT_SERVICES.hasOwnProperty(slug)) slugs.push(slug);
  if (!slugs.length) return;
  var cfg = apptCfg_(), now = Date.now(), gen = apptCacheGen_();
  var today = dayKey_(now);
  var from = at_(today, 0), to = at_(addDays_(today, cfg.windowDays + 8), 0);
  var items = apptBusy_(from, to, cfg), i, payloads = {};
  for (i = 0; i < slugs.length; i++) {
    slug = slugs[i];
    try {
      var payload = apptPayload_(slug, APPT_SERVICES[slug], apptDays_(items, APPT_SERVICES[slug].minutes, cfg, now), cfg, now);
      apptCacheWrite_(apptCacheKey_(slug, today), payload, gen);
      payloads[slug] = apptPublic_(payload);
    } catch (err) { console.error('warm ' + slug + ': ' + err); }
  }
  var sits = null;   // tea sits (Code.gs) ride along in the same file, so the tea sits page never waits on Apps Script either
  try { if (typeof listSits_ === 'function') sits = listSits_(); } catch (err) { console.error('tea sits: ' + err); }
  try { console.log('GitHub copy of open times: ' + apptPublish_(payloads, now, sits)); } catch (err) { console.error('publish: ' + err); }   // off = no GITHUB_TOKEN set, same = nothing changed, saved, busy, failed
}

// ---- Static copy of the open times. The website reads this small file first, so a visitor never waits on Apps Script.
// Display only, like the cache: apptBook_ rereads the live calendar before any payment, so a stale copy can never double-book a time.
var SLOTS_HEARTBEAT_MS = 55 * 60 * 1000;   // rewrite an unchanged file about hourly, so the page can tell the refresh is still running

/** Saves every service's open times to GitHub when they changed (or about hourly). Returns 'off', 'busy', 'same', 'saved' or 'failed'. */
function apptPublish_(payloads, now, sits) {
  var token = prop_('GITHUB_TOKEN', '');
  if (!token) return 'off';
  var n = 0, k;
  for (k in payloads) if (payloads.hasOwnProperty(k)) n++;
  if (!n) return 'failed';
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(3000)) return 'busy';
  try {
    var props = PropertiesService.getScriptProperties();
    var digest = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(sits ? { s: payloads, t: sits } : payloads)));
    var last = Number(props.getProperty('SLOTS_AT') || 0);
    if (props.getProperty('SLOTS_DIGEST') === digest && now - last >= 0 && now - last < SLOTS_HEARTBEAT_MS) return 'same';
    if (!apptGithubPut_(token, JSON.stringify(sits ? { generated: now, services: payloads, teasits: sits } : { generated: now, services: payloads }))) return 'failed';
    props.setProperty('SLOTS_DIGEST', digest);
    props.setProperty('SLOTS_AT', String(now));
    return 'saved';
  } finally { lock.releaseLock(); }
}

/** Creates or replaces one file through GitHub's contents API. Replacing needs the file's current sha; a wrong one is looked up again once. */
function apptGithubPut_(token, text) {
  var repo = prop_('GITHUB_REPO', 'roozbehtea/fulllotushealth'), branch = prop_('SLOTS_BRANCH', 'slots'), path = prop_('SLOTS_PATH', 'slots/slots.json');
  var url = 'https://api.github.com/repos/' + repo + '/contents/' + path;
  var headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  var props = PropertiesService.getScriptProperties();
  var content = Utilities.base64Encode(Utilities.newBlob(text).getBytes());
  for (var attempt = 0; attempt < 2; attempt++) {
    var sha = attempt === 0 ? props.getProperty('SLOTS_SHA') : '';
    if (!sha) {
      var g = UrlFetchApp.fetch(url + '?ref=' + encodeURIComponent(branch), { headers: headers, muteHttpExceptions: true });
      sha = g.getResponseCode() === 200 ? JSON.parse(g.getContentText()).sha : '';
    }
    var body = { message: 'Open times', content: content, branch: branch };
    if (sha) body.sha = sha;
    var r = UrlFetchApp.fetch(url, { method: 'put', contentType: 'application/json', headers: headers, payload: JSON.stringify(body), muteHttpExceptions: true });
    var code = r.getResponseCode();
    if (code === 200 || code === 201) {
      try { props.setProperty('SLOTS_SHA', JSON.parse(r.getContentText()).content.sha); } catch (e) { props.deleteProperty('SLOTS_SHA'); }
      return true;
    }
    props.deleteProperty('SLOTS_SHA');
    if (code !== 409 && code !== 422) { console.error('github ' + code + ': ' + String(r.getContentText()).slice(0, 200)); return false; }
  }
  console.error('github: could not replace the open-times file');
  return false;
}

/** Run once from the Apps Script editor after pasting this file. Safe to run again. */
function apptInstallCache() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'apptWarm') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('apptWarm').timeBased().everyMinutes(5).create();
  apptWarm();
  console.log('Open times are refreshed in the background every 5 minutes.' + (prop_('GITHUB_TOKEN', '') ? ' A copy is saved on GitHub for the website.' : ' Add GITHUB_TOKEN to also save a copy on GitHub for the website.'));
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
  var startMs = Date.parse(String(b.start || ''));
  if (!name) return { error: 'name' };
  if (!(email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) || /^[=+\-@]/.test(email)) return { error: 'email' };
  if (phone.replace(/\D/g, '').length < 7) return { error: 'phone' };
  if (isNaN(startMs)) return { error: 'closed' };
  var note = apptFormsNote_(String(b.service), svc, email, phone, b.returning === true || b.returning === 'yes');

  var c = cfg_(), cfg = apptCfg_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    // Live calendar, never the display cache. A slot shown from cache is accepted only if it is still offered here.
    var now = Date.now();
    var from = at_(dayKey_(now), 0), to = at_(addDays_(dayKey_(now), cfg.windowDays + 8), 0);
    var days = apptDays_(apptBusy_(from, to, cfg), svc.minutes, cfg, now);
    var offered = days.some(function (d) { return d.slots.some(function (s) { return Date.parse(s.start) === startMs; }); });
    if (!offered) { apptCacheBump_(); return { error: 'taken' }; }       // someone else got it, or it is no longer offered

    var endMs = startMs + svc.minutes * 60000;
    var when = whenLabel_(startMs, endMs);

    // A prepaid package that covers this visit: no Stripe, one visit counted off. If the packages cannot be read, fall through to payment.
    var pkg = null;
    try { pkg = pkgFind_(email, phone, String(b.service)); } catch (err) { console.error('package lookup: ' + err); }
    if (pkg) return apptBookWithPackage_(b, svc, pkg, { name: name, email: email, phone: phone, note: note, startMs: startMs, endMs: endMs, when: when });

    if (!c.stripeKey) return { error: 'setup' };
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
    apptCacheBump_();                                                    // the hold takes the slot; the next page load must not offer it
    return { ok: true, url: session.url, session: session.id };
  } finally {
    lock.releaseLock();
  }
}

/** The booking is already on the sheet as paid (by package), so the visit is counted off, then the calendar event and emails follow. Runs inside apptBook_'s lock. */
function apptBookWithPackage_(b, svc, pkg, x) {
  var sh = apptSheet_(APPT_SHEET, APPT_HEADERS), apptId = Utilities.getUuid().slice(0, 8);
  var tag = ['pkg', pkg.id, pkg.left - 1, pkg.total, apptId].join('|');
  sh.appendRow([new Date(), apptId, String(b.service), svc.name, new Date(x.startMs), new Date(x.endMs), x.when, x.name, x.email, x.phone, x.note, 'paid', tag, 0, new Date(), '', '']);
  var rowIndex = sh.getLastRow(), use;
  try { use = pkgUse_(pkg, dayKey_(x.startMs)); }
  catch (err) {                                                            // could not count the visit: undo the booking rather than give a free one
    console.error('package use: ' + err);
    apptSet_(rowIndex, { status: 'cancelled' });
    apptCacheBump_();
    return { error: 'server' };
  }
  pkgAudit_(pkg, apptId, x.when, use.left);
  try { apptFinish_(tag); } catch (err) { console.error('package booking finish (reconcile will retry): ' + err); }
  apptCacheBump_();
  var found = apptFind_(tag), r = found ? found.row : [];
  return { ok: true, package: true, left: use.left, total: use.total, when: x.when, service: svc.name, name: x.name,
    intake: apptNeedIntake_(svc, r), skin: apptNeedSkin_(r), online: !!svc.online, series: !!svc.series,
    intakeUrl: apptCfg_().intake, skinUrl: apptCfg_().skinIntake };
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
    var wasPaid = found.row[AC.status - 1] === 'paid', hadEvent = !!found.row[AC.eventId - 1];
    if (!wasPaid) {
      var s = stripe_('get', '/v1/checkout/sessions/' + session);
      if (!paidOk_(s)) return { ok: false, status: s.status };
      apptSet_(found.index, { status: 'paid', amount: (s.amount_total || 0) / 100, paidAt: new Date() });
    }
    apptFinish_(session);                       // calendar event, then emails; inside the lock so two confirms can't both run
    found = apptFind_(session);
    if (!wasPaid || (!hadEvent && found.row[AC.eventId - 1])) apptCacheBump_();
  } finally {
    lock.releaseLock();
  }
  var r = found.row, svc = APPT_SERVICES[r[AC.svc - 1]] || {};
  return { ok: true, when: r[AC.when - 1], service: r[AC.svcName - 1], name: r[AC.name - 1], intake: apptNeedIntake_(svc, r), skin: apptNeedSkin_(r), online: !!svc.online, series: !!svc.series,
    intakeUrl: apptCfg_().intake, skinUrl: apptCfg_().skinIntake };
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
    apptCacheBump_();                               // the hold is gone, so the time can show again
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/** Every 10 minutes (from Code.gs reconcile): paid but never confirmed, stale holds, and paid rows still missing their event. */
function apptReconcile_() {
  var cutoff = Date.now() - APPT_HOLD_MINUTES * 60000;
  var rs = apptRows_();
  var freed = false;
  for (var i = 0; i < rs.length; i++) {
    var r = rs[i], session = r[AC.session - 1], st = r[AC.status - 1];
    try {
      if (st === 'pending') {
        var s = stripe_('get', '/v1/checkout/sessions/' + session);
        if (paidOk_(s)) apptConfirm_(session);             // confirm clears the cache itself when the calendar changes
        else if (s.status === 'expired' || new Date(r[AC.created - 1]).getTime() < cutoff) {
          apptSet_(i + 2, { status: 'expired' });
          freed = true;
        }
      } else if (st === 'paid' && (!r[AC.eventId - 1] || !r[AC.emailed - 1])) {
        if (pkgTag_(session)) { apptFinish_(session); freed = true; }   // package booking: nothing to confirm with Stripe
        else apptConfirm_(session);
      }
    } catch (err) {
      console.error('appt reconcile ' + session + ': ' + err);
    }
  }
  if (freed) apptCacheBump_();
}

/** Create the calendar event and send the emails. Safe to run twice: each step is skipped once done. */
function apptFinish_(session) {
  var found = apptFind_(session);
  if (!found) return;
  var r = found.row, c = cfg_();
  var svc = APPT_SERVICES[r[AC.svc - 1]] || { name: r[AC.svcName - 1] };
  if (!r[AC.eventId - 1]) {
    var cal = CalendarApp.getCalendarById(c.calendarId) || CalendarApp.getDefaultCalendar();
    var forms = apptFormList_(svc, r);
    var intake = forms.length ? '\n\nBefore your visit, please complete the ' + forms.map(function (f) { return f.name + ' form: ' + f.url; }).join('\nand the ') : '';
    var ev = cal.createEvent(r[AC.svcName - 1] + ' (' + r[AC.name - 1] + ')', new Date(r[AC.start - 1]), new Date(r[AC.end - 1]), {
      description: 'Booked online\n' + r[AC.name - 1] + '\n' + r[AC.email - 1] + '\n' + r[AC.phone - 1] +
        (r[AC.note - 1] ? '\nNote: ' + r[AC.note - 1] : '') +
        '\n\n' + (pkgTag_(session) ? 'Package visit: ' + pkgTag_(session).id + ', ' + pkgTag_(session).left + ' of ' + pkgTag_(session).total + ' visits left' : 'Paid: $' + Number(r[AC.amount - 1] || 0).toFixed(2) + ' (Stripe ' + session + ')') +
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
  var forms = apptFormList_(svc, r);
  var intake = forms.map(function (f, k) {
    return k === 0 ? '\nPlease fill in the ' + f.name + ' form before you come: ' + f.url + '\n' : 'And the ' + f.name + ' form: ' + f.url + '\n';
  }).join('');
  var series = svc.series ? '\nIf you would like a series of treatments, we will plan the rest together after this first session.\n' : '';
  var pk = pkgTag_(r[AC.session - 1]);
  var paidLine = pk ? 'This visit is covered by your package: ' + pk.left + ' of ' + pk.total + ' visits left.' : 'Your payment has been received.';
  MailApp.sendEmail({
    to: email, replyTo: c.notify, name: 'Full Lotus Health',
    subject: 'Your appointment: ' + r[AC.svcName - 1] + ', ' + when.split(' at ')[0],
    body: 'Hi ' + name + ',\n\nYou are booked for ' + r[AC.svcName - 1] + ' on ' + when + '.\n\n' +
      'Where: ' + where + '\n' + intake + series + '\n' +
      paidLine + ' To reschedule or cancel, reply to this email or text ' + c.phone + ' at least 24 hours ahead. ' +
      'Appointments cancelled or missed with less than 24 hours\' notice are charged $95.\n\nSee you soon,\nRoozbeh\nFull Lotus Health'
  });
  MailApp.sendEmail({
    to: c.notify, replyTo: email,
    subject: 'New booking: ' + name + ', ' + r[AC.svcName - 1] + ', ' + when.split(' at ')[0],
    body: name + ' booked ' + r[AC.svcName - 1] + ' for ' + when + (pk ? ' using package ' + pk.id + ' (' + pk.left + ' of ' + pk.total + ' visits left).' : ' and paid $' + Number(r[AC.amount - 1] || 0).toFixed(2) + '.') + '\nEmail: ' + email +
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
