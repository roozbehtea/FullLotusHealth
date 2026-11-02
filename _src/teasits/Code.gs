/**
 * Full Lotus Health: tea sit reservations.
 *
 * Schedule:     events in the clinic Google Calendar whose title contains "Tea sit".
 *               Optional lines in an event's description override the defaults:
 *                 Seats: 4
 *                 Price: 45
 * Reservations: one row per reservation in the "Reservations" tab of the sheet this script is attached to.
 * Payment:      Stripe Checkout. A seat is held for 35 minutes while the guest pays, then released if unpaid.
 *
 * Collects only name, email, optional phone and seat count. No health details.
 * Setup steps are in README.md next to this file.
 */

// ------------------------------------------------------------------ settings
var SHEET_NAME = 'Reservations';
var HEADERS = ['Created', 'Sit ID', 'Sit', 'Name', 'Email', 'Phone', 'Seats', 'Status', 'Stripe session', 'Amount paid', 'Paid at', 'Emailed'];
var COL = { created: 1, sitId: 2, sit: 3, name: 4, email: 5, phone: 6, seats: 7, status: 8, session: 9, amount: 10, paidAt: 11, emailed: 12 };
var HOLD_MINUTES = 35;          // Stripe Checkout links expire after 31 minutes; holds outlast them slightly
var MAX_SEATS_PER_BOOKING = 3;
var WEEKS_AHEAD = 8;
var TZ = 'America/Los_Angeles';

function prop_(key, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return (v === null || v === '') ? fallback : v;
}
function cfg_() {
  return {
    stripeKey: prop_('STRIPE_SECRET_KEY', ''),
    calendarId: prop_('CALENDAR_ID', 'info@fulllotushealth.com'),
    site: prop_('SITE_URL', 'https://www.fulllotushealth.com'),
    match: prop_('TITLE_MATCH', 'tea sit').toLowerCase(),
    seats: parseInt(prop_('DEFAULT_SEATS', '6'), 10),
    price: parseFloat(prop_('DEFAULT_PRICE', '35')),
    cutoffMinutes: parseInt(prop_('CUTOFF_MINUTES', '60'), 10),   // online booking closes this long before start
    notify: prop_('NOTIFY_EMAIL', 'info@fulllotushealth.com'),
    address: prop_('ADDRESS', '2116 N Glenoaks Blvd, Ste 3, Burbank, CA 91504'),
    phone: prop_('PHONE', '(818) 253-9307')
  };
}

// ------------------------------------------------------------------ web app entry points
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'confirm') return json_(confirm_(String(p.session || '')));
    if (p.action === 'release') return json_(release_(String(p.session || '')));
    return json_({ sits: listSits_() });
  } catch (err) {
    console.error(err);
    return json_({ error: 'server' });
  }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return json_({ error: 'bad_request' }); }
  try {
    if (body.action === 'reserve') return json_(reserve_(body));
    return json_({ error: 'bad_request' });
  } catch (err) {
    console.error(err);
    return json_({ error: 'server' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------ schedule
function sitId_(ev) {
  var raw = ev.getId() + '|' + ev.getStartTime().getTime();
  var d = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
  return d.slice(0, 6).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function readOverride_(desc, label) {
  var m = new RegExp('^\\s*' + label + '\\s*:\\s*\\$?\\s*([0-9]+(?:\\.[0-9]+)?)', 'im').exec(desc || '');
  return m ? parseFloat(m[1]) : null;
}

function sitLabel_(start, end) {
  return Utilities.formatDate(start, TZ, "EEEE, MMMM d 'at' h:mm a") + '–' + Utilities.formatDate(end, TZ, 'h:mm a');
}

/** Upcoming sits that are still open for online booking, with seats left. */
function listSits_() {
  var c = cfg_();
  var now = new Date();
  var until = new Date(now.getTime() + WEEKS_AHEAD * 7 * 864e5);
  var cal = CalendarApp.getCalendarById(c.calendarId) || CalendarApp.getDefaultCalendar();
  var taken = seatsTaken_();
  var out = [];
  cal.getEvents(now, until).forEach(function (ev) {
    if (ev.getTitle().toLowerCase().indexOf(c.match) === -1) return;
    var start = ev.getStartTime(), end = ev.getEndTime();
    if (start.getTime() - c.cutoffMinutes * 60000 <= now.getTime()) return;
    var desc = ev.getDescription();
    var seats = readOverride_(desc, 'seats'); if (seats === null) seats = c.seats;
    var price = readOverride_(desc, 'price'); if (price === null) price = c.price;
    var id = sitId_(ev);
    var left = Math.max(0, seats - (taken[id] || 0));
    out.push({ id: id, title: ev.getTitle(), start: start.toISOString(), end: end.toISOString(),
               label: sitLabel_(start, end), price: price, seats: seats, left: left });
  });
  out.sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  return out;
}

// ------------------------------------------------------------------ sheet
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) { sh.appendRow(HEADERS); sh.setFrozenRows(1); }
  return sh;
}

function rows_() {
  var sh = sheet_();
  var n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, HEADERS.length).getValues() : [];
}

/** Seats per sit: paid, plus unpaid holds that are still fresh. */
function seatsTaken_() {
  var cutoff = Date.now() - HOLD_MINUTES * 60000;
  var taken = {};
  rows_().forEach(function (r) {
    var status = r[COL.status - 1];
    var counts = status === 'paid' || (status === 'pending' && new Date(r[COL.created - 1]).getTime() > cutoff);
    if (counts) taken[r[COL.sitId - 1]] = (taken[r[COL.sitId - 1]] || 0) + Number(r[COL.seats - 1] || 0);
  });
  return taken;
}

function findRow_(session) {
  var rs = rows_();
  for (var i = 0; i < rs.length; i++) if (rs[i][COL.session - 1] === session) return { index: i + 2, row: rs[i] };
  return null;
}

function setCells_(rowIndex, values) {
  var sh = sheet_();
  Object.keys(values).forEach(function (k) { sh.getRange(rowIndex, COL[k]).setValue(values[k]); });
}

// ------------------------------------------------------------------ reserve
function clean_(s, max) {
  s = String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;   // keep spreadsheet formulas out
}

function reserve_(b) {
  if (b.website) return { error: 'bad_request' };                         // trap field: bots fill it
  var name = clean_(b.name, 80);
  var email = String(b.email || '').trim().toLowerCase();
  var phone = clean_(b.phone, 30);
  var seats = parseInt(b.seats, 10);
  if (!name) return { error: 'name' };
  if (!(email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) || /^[=+\-@]/.test(email)) return { error: 'email' };
  if (!(seats >= 1 && seats <= MAX_SEATS_PER_BOOKING)) return { error: 'seats' };

  var c = cfg_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sit = listSits_().filter(function (s) { return s.id === b.sitId; })[0];
    if (!sit) return { error: 'closed' };
    if (sit.left < seats) return { error: 'full', left: sit.left };

    var sh = sheet_();
    if (!(sit.price > 0)) {                                                   // free sit: no payment step
      var freeId = 'free-' + Utilities.getUuid();
      sh.appendRow([new Date(), sit.id, sit.label, name, email, phone, seats, 'paid', freeId, 0, new Date(), '']);
      sendEmails_(freeId);
      return { ok: true, free: true, sit: sit.label };
    }

    if (!c.stripeKey) return { error: 'setup' };
    var session = stripe_('post', '/v1/checkout/sessions', {
      'mode': 'payment',
      'customer_email': email,
      'client_reference_id': sit.id,
      'line_items[0][quantity]': String(seats),
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(Math.round(sit.price * 100)),
      'line_items[0][price_data][product_data][name]': 'Tea sit, ' + sit.label,
      'line_items[0][price_data][product_data][description]': 'Full Lotus Health, ' + c.address,
      'metadata[sit_id]': sit.id,
      'metadata[name]': name,
      'expires_at': String(Math.floor(Date.now() / 1000) + 31 * 60),
      'success_url': c.site + '/tea-sits?paid={CHECKOUT_SESSION_ID}',
      'cancel_url': c.site + '/tea-sits?cancelled=1'
    });
    sh.appendRow([new Date(), sit.id, sit.label, name, email, phone, seats, 'pending', session.id, '', '', '']);
    return { ok: true, url: session.url, session: session.id };
  } finally {
    lock.releaseLock();
  }
}

// ------------------------------------------------------------------ confirm, release, reconcile
function confirm_(session) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(session)) return { error: 'bad_request' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var found;
  try {
    found = findRow_(session);
    if (!found) return { error: 'not_found' };
    if (found.row[COL.status - 1] !== 'paid') {
      var s = stripe_('get', '/v1/checkout/sessions/' + session);
      if (s.payment_status !== 'paid') return { ok: false, status: s.status };
      setCells_(found.index, { status: 'paid', amount: (s.amount_total || 0) / 100, paidAt: new Date() });
    }
    sendEmails_(session);                       // inside the lock so two confirms can't both send
  } finally {
    lock.releaseLock();
  }
  return { ok: true, sit: found.row[COL.sit - 1], seats: found.row[COL.seats - 1], name: found.row[COL.name - 1] };
}

/** Guest went back from Stripe without paying: end the checkout and free the seats now. */
function release_(session) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(session)) return { error: 'bad_request' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var found = findRow_(session);
    if (!found || found.row[COL.status - 1] !== 'pending') return { ok: true };
    var s = stripe_('get', '/v1/checkout/sessions/' + session);
    if (s.payment_status === 'paid') return { ok: true };
    if (s.status === 'open') stripe_('post', '/v1/checkout/sessions/' + session + '/expire', {});
    setCells_(found.index, { status: 'cancelled' });
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Runs every 10 minutes (setup() installs the trigger). Catches guests who paid but closed the
 * window before returning to the site, and marks stale holds as expired.
 */
function reconcile() {
  var cutoff = Date.now() - HOLD_MINUTES * 60000;
  var rs = rows_();
  for (var i = 0; i < rs.length; i++) {
    var r = rs[i];
    if (r[COL.status - 1] !== 'pending') continue;
    var session = r[COL.session - 1];
    try {
      var s = stripe_('get', '/v1/checkout/sessions/' + session);
      if (s.payment_status === 'paid') confirm_(session);
      else if (s.status === 'expired' || new Date(r[COL.created - 1]).getTime() < cutoff) setCells_(i + 2, { status: 'expired' });
    } catch (err) {
      console.error('reconcile ' + session + ': ' + err);
    }
  }
}

// ------------------------------------------------------------------ email
function sendEmails_(session) {
  var found = findRow_(session);
  if (!found || found.row[COL.emailed - 1]) return;
  var r = found.row, c = cfg_();
  var name = r[COL.name - 1], seats = r[COL.seats - 1], sit = r[COL.sit - 1], email = r[COL.email - 1];
  var seatWord = seats == 1 ? '1 seat' : seats + ' seats';
  MailApp.sendEmail({
    to: email,
    replyTo: c.notify,
    name: 'Full Lotus Health',
    subject: 'Your tea sit: ' + sit,
    body: 'Hi ' + name + ',\n\n' +
      'You have ' + seatWord + ' at the tea sit on ' + sit + '.\n\n' +
      'Where: Full Lotus Health, ' + c.address + '\n' +
      'Please arrive a few minutes early. We sit in silence, so wear comfortable clothes you can sit on the floor in.\n\n' +
      'Questions or need to cancel? Reply to this email or text ' + c.phone + '.\n\n' +
      'See you soon,\nRoozbeh\nFull Lotus Health'
  });
  var left = '';
  try {
    var s = listSits_().filter(function (x) { return x.id === r[COL.sitId - 1]; })[0];
    if (s) left = '\nSeats left: ' + s.left + ' of ' + s.seats;
  } catch (x) {}
  MailApp.sendEmail({
    to: c.notify,
    replyTo: email,
    subject: 'Tea sit reservation: ' + name + ' (' + seatWord + ')',
    body: name + ' reserved ' + seatWord + ' for ' + sit + '.\nEmail: ' + email + '\nPhone: ' + (r[COL.phone - 1] || '-') + left
  });
  setCells_(found.index, { emailed: new Date() });
}

// ------------------------------------------------------------------ Stripe
function stripe_(method, path, params) {
  var opts = {
    method: method,
    headers: { Authorization: 'Bearer ' + cfg_().stripeKey },
    muteHttpExceptions: true
  };
  if (method === 'post') opts.payload = params || {};
  var res = UrlFetchApp.fetch('https://api.stripe.com' + path, opts);
  var data = JSON.parse(res.getContentText());
  if (res.getResponseCode() >= 300) throw new Error('Stripe ' + res.getResponseCode() + ': ' + (data.error && data.error.message));
  return data;
}

// ------------------------------------------------------------------ one-time setup
/** Run once from the Apps Script editor: creates the Reservations tab and the 10-minute check. */
function setup() {
  sheet_();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'reconcile') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('reconcile').timeBased().everyMinutes(10).create();
  console.log('Upcoming sits: ' + JSON.stringify(listSits_(), null, 1));
}
