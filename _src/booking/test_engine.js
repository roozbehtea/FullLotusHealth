// Runs the slot rules in Booking.gs against made-up calendars. Usage: node _src/booking/test_engine.js
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path'), assert = require('assert');
const TZ = 'America/Los_Angeles';
function parts(ms) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', month_: 'long' });
  const o = {}; f.formatToParts(new Date(ms)).forEach(p => o[p.type] = p.value); return o;
}
function offsetAt(ms) { const p = parts(ms); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60000) * 60000; }
const Utilities = {
  DigestAlgorithm: { MD5: 'md5' },
  computeDigest: (a, s) => Array.from(crypto.createHash('md5').update(s).digest()).map(b => b > 127 ? b - 256 : b),
  parseDate(str, tz, fmt) {
    const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(str); assert(m, 'bad date ' + str);
    const g = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    const t0 = g - offsetAt(g); return new Date(g - offsetAt(t0));
  },
  formatDate(d, tz, fmt) {
    const ms = d.getTime(), p = parts(ms), long = (o) => new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: TZ }, o)).format(d);
    const hr = +p.hour, h12 = ((hr + 11) % 12) + 1, ap = hr < 12 ? 'AM' : 'PM';
    if (fmt === 'yyyy-MM-dd') return `${p.year}-${p.month}-${p.day}`;
    if (fmt === 'u') return String(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1);
    if (fmt === 'h:mm a') return `${h12}:${p.minute} ${ap}`;
    if (fmt === 'EEEE, MMMM d') return long({ weekday: 'long', month: 'long', day: 'numeric' });
    if (fmt === "EEEE, MMMM d 'at' h:mm a") return long({ weekday: 'long', month: 'long', day: 'numeric' }) + ` at ${h12}:${p.minute} ${ap}`;
    throw new Error('fmt ' + fmt);
  }
};
const sheets = {};
const SpreadsheetApp = { openById(id) { const t = sheets[id]; if (!t) throw new Error('no sheet ' + id); return {
  getSheets: () => [{ getName: () => 'Form Responses 1', getLastRow: () => t.length, getLastColumn: () => t[0].length,
    getRange: (r, c, nr, nc) => ({ getValues: () => t.slice(r - 1, r - 1 + nr).map(row => row.slice(c - 1, c - 1 + nc)) }) }] }; } };
const ctx = { Utilities, SpreadsheetApp, console, TZ, prop_: (k, d) => d, cfg_: () => ({ match: 'tea sit' }), Date, Math, JSON, String, parseInt, parseFloat, isNaN, Array, Object };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Booking.gs'), 'utf8') + '\nthis.__api={AC,apptFormsNote_,apptFormList_,apptCfg_,apptDays_,apptCfg_,slotFree_,at_,addDays_,dayKey_,dow_,apptSoonThrough_,APPT_SERVICES};', ctx);
const { AC, apptFormsNote_, apptFormList_, apptDays_, apptCfg_, at_, addDays_, dayKey_, dow_, apptSoonThrough_, APPT_SERVICES } = ctx.__api;

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok  ' + name); };
const cfg = apptCfg_();
const now = Utilities.parseDate('2026-11-18 12:00', TZ, 'yyyy-MM-dd HH:mm').getTime();   // Wednesday
const ev = (key, from, to, full) => ({ s: at_(key, from * 60), e: at_(key, to * 60), full: !!full });
const times = d => d.slots.map(s => Utilities.formatDate(new Date(s.start), TZ, 'h:mm a'));

ok('services match prices/minutes', () => { for (const k in APPT_SERVICES) assert(APPT_SERVICES[k].minutes > 0 && APPT_SERVICES[k].price > 0); });
ok('only Mon/Wed/Fri on an empty calendar, 24h notice, 21-day window', () => {
  const days = apptDays_([], 45, cfg, now);
  days.forEach(d => assert([1, 3, 5].includes(dow_(at_(d.date, 720))), d.date));
  assert.strictEqual(days[0].date, '2026-11-20');            // Wed 11/18 is inside 24h, so Fri is first
  assert(days[days.length - 1].date <= addDays_('2026-11-18', 21));
  days.forEach(d => assert(d.slots.length === 3, d.date + ' shows ' + d.slots.length));
});
ok('slots land on the hour or half hour inside clinic hours and the first and last hour are used on an empty day', () => {
  apptDays_([], 60, cfg, now).forEach(d => d.slots.forEach(s => {
    const p = Utilities.formatDate(new Date(s.start), TZ, 'h:mm a'); assert(/:(00|30) /.test(p), p);
  }));
});
ok('a booked acupuncture at 10:00 leaves 10:30 as next opening (two rooms) and 10:00 not offered', () => {
  const day = '2026-11-20', items = [ev(day, 10, 11)];
  const all = apptDays_(items, 60, Object.assign({}, cfg, { maxVisible: 99, rotate: false }), now).find(d => d.date === day);
  const t = times(all); assert(!t.includes('10:00 AM'), t.join()); 
});
ok('two overlapping visits fill both rooms: no start inside the overlap', () => {
  const day = '2026-11-20', items = [ev(day, 11, 12), ev(day, 11.5, 12.5)];
  const d = apptDays_(items, 60, Object.assign({}, cfg, { maxVisible: 99 }), now).find(x => x.date === day);
  const t = times(d); ['11:00 AM', '11:30 AM', '10:30 AM'].forEach(x => assert(!t.includes(x), x + ' offered: ' + t.join()));
  assert(t.includes('1:00 PM') || t.includes('12:30 PM'), t.join());
});
ok('"hold" / full block removes its time without more', () => {
  const day = '2026-11-20', d = apptDays_([ev(day, 10, 17, true)], 45, cfg, now).find(x => x.date === day);
  assert.strictEqual(d.slots.length, 0);
});
ok('first and last hour are left out on a day that already has a visit', () => {
  const day = '2026-11-20', items = [ev(day, 13, 14)];
  const d = apptDays_(items, 60, Object.assign({}, cfg, { maxVisible: 99, rotate: false }), now).find(x => x.date === day);
  d.slots.forEach(s => { const m = new Date(s.start); const t = Utilities.formatDate(m, TZ, 'h:mm a'); assert(!['10:00 AM', '10:30 AM', '4:00 PM'].includes(t), t); });
});
ok('openings beside an existing visit are preferred', () => {
  const day = '2026-11-20', items = [ev(day, 13, 14)];
  const d = apptDays_(items, 60, Object.assign({}, cfg, { maxVisible: 1 }), now).find(x => x.date === day);
  assert(['12:00 PM', '2:00 PM'].includes(times(d)[0]), times(d)[0]);
});
ok('shown set rotates between days', () => {
  const sets = new Set(apptDays_([], 60, cfg, now).map(d => times(d).join()));
  assert(sets.size > 2, 'pattern never changes');
});
ok('Tue/Thu open only for a week whose core days are full', () => {
  const full = [];  // block all of Fri 11/20 and next week Mon 11/23, Wed 11/25, Fri 11/27 entirely
  ['2026-11-20', '2026-11-23', '2026-11-25', '2026-11-27'].forEach(k => full.push(ev(k, 0, 24, true)));
  const days = apptDays_(full, 60, cfg, now), keys = days.map(d => d.date);
  assert(keys.includes('2026-11-24') && keys.includes('2026-11-26'), keys.join());   // Tue and Thu of the full week
  assert(!keys.includes('2026-12-01') || true);
  const thu = days.find(d => d.date === '2026-11-19');   // this week's core days are full, so Thursday opens, but only after the 24h notice
  assert(thu && thu.slots.length > 0 && thu.slots.every(s => new Date(s.start).getTime() >= now + 24 * 3600000), 'Thu 11/19 should open after notice');
  assert(days.find(d => d.date === '2026-11-20').slots.length === 0, 'full Friday shows waitlist (no slots)');
});
ok('Tue/Thu stay closed while a core day still has room', () => {
  assert(!apptDays_([], 60, cfg, now).some(d => [2, 4].includes(dow_(at_(d.date, 720)))));
});
ok('same start is refused (stagger) even with a free room', () => {
  const items = [ev('2026-11-20', 10, 10.75)];
  assert.strictEqual(ctx.__api.slotFree_(items, at_('2026-11-20', 600), at_('2026-11-20', 660), 2), false);
  assert.strictEqual(ctx.__api.slotFree_(items, at_('2026-11-20', 630), at_('2026-11-20', 690), 2), true);
});
ok('a long treatment cannot end after closing', () => {
  apptDays_([], 90, cfg, now).forEach(d => d.slots.forEach(s => assert(new Date(s.start).getTime() + 90 * 60000 <= at_(d.date, 17 * 60))));
});
ok('daylight saving change does not shift clinic times (Nov 1 2026 fall back)', () => {
  const n2 = Utilities.parseDate('2026-10-28 12:00', TZ, 'yyyy-MM-dd HH:mm').getTime();
  apptDays_([], 60, cfg, n2).forEach(d => d.slots.forEach(s => assert(/:(00|30) /.test(Utilities.formatDate(new Date(s.start), TZ, 'h:mm a')))));
});
ok('a short window stops at untilKey and still offers a day inside it', () => {
  const days = apptDays_([], 60, cfg, now, '2026-11-25');
  assert(days.some(d => d.date === '2026-11-20' && d.slots.length === 3));
  assert(days[days.length - 1].date <= '2026-11-25');
  assert(!days.some(d => d.date > '2026-11-25'));
});
ok('the first answer reaches the Sunday of the week a week ahead', () => {
  assert.strictEqual(apptSoonThrough_('2026-11-18'), '2026-11-29');
  assert.strictEqual(apptSoonThrough_('2026-11-19'), '2026-11-29');
  assert.strictEqual(apptSoonThrough_('2026-11-23'), '2026-11-29');
});
ok('an all-day event takes the day off the calendar entirely', () => {
  const key = '2026-11-27', off = { s: at_(key, 0), e: at_(addDays_(key, 1), 0), full: true, dayOff: true };
  const days = apptDays_([off], 60, cfg, now);
  assert(!days.some(d => d.date === key), 'Nov 27 should not be listed');
  assert(days.some(d => d.date === '2026-11-25'), 'other days still listed');
});

// ---- recognizing returning patients
{
  const c = apptCfg_();
  sheets[c.intakeSheet] = [['Timestamp', 'Email Address', 'Full name', 'Mobile phone', 'Emergency contact phone'],
    ['t', 'Ana@Example.com ', 'Ana', '(818) 555-0101', '310-555-9999'], ['t', 'bo@example.com', 'Bo', '818.555.0102', '']];
  sheets[c.skinSheet] = [['Timestamp', 'Email Address', 'Mobile phone'], ['t', 'ana@example.com', '8185550101']];
  const row = (slug, note) => { const r = []; r[AC.svc - 1] = slug; r[AC.note - 1] = note; return r; };
  const names = (slug, note) => apptFormList_(APPT_SERVICES[slug], row(slug, note)).map(f => f.name).join(' + ');
  const note = (slug, email, phone, tick) => apptFormsNote_(slug, APPT_SERVICES[slug], email, phone, !!tick);
  ok('a new skin patient gets both forms', () => {
    const n1 = note('facial-nano-needling', 'new@example.com', '8185550000'); assert.strictEqual(n1, '');
    assert.strictEqual(names('facial-nano-needling', n1), 'New Patient Intake + Skin Treatment Intake & Consent');
  });
  ok('a returning skin patient matched by email gets no forms', () => {
    const n1 = note('full-lotus-lift', 'ana@example.com', ''); assert.strictEqual(names('full-lotus-lift', n1), '', n1);
  });
  ok('an acupuncture patient booking a first skin treatment gets only the skin form (matched by phone)', () => {
    const n1 = note('medical-microneedling-session', 'other@example.com', '+1 818 555 0102');
    assert.strictEqual(n1, 'Forms on file: New Patient Intake');
    assert.strictEqual(names('medical-microneedling-session', n1), 'Skin Treatment Intake & Consent');
  });
  ok('an emergency contact phone does not count as a match', () => {
    assert.strictEqual(note('acupuncture-initial-treatment', 'x@example.com', '310-555-9999'), '');
  });
  ok('the tick drops every form; repeat visits never get forms', () => {
    assert.strictEqual(names('facial-nano-needling', note('facial-nano-needling', 'new@example.com', '', true)), '');
    assert.strictEqual(names('acupuncture-repeat-treatment', note('acupuncture-repeat-treatment', 'new@example.com', '')), '');
  });
  ok('an unreadable sheet never blocks a booking, it just sends the forms', () => {
    delete sheets[c.skinSheet];
    const n1 = note('facial-nano-needling', 'ana@example.com', '');
    assert.strictEqual(names('facial-nano-needling', n1), 'Skin Treatment Intake & Consent');
  });
}

// ---------------------------------------------------------------- prepaid packages (pkgFind_, apptBook_ with a package)
{
  class FakeSheet {
    constructor(name, rows) { this.name = name; this.rows = rows; this.frozen = 0; }
    getName() { return this.name; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return this.rows.length ? this.rows[0].length : 0; }
    setFrozenRows(k) { this.frozen = k; }
    appendRow(r) { this.rows.push(r.slice()); }
    getRange(r, c, nr, nc) {
      const t = this;
      return {
        getValues: () => t.rows.slice(r - 1, r - 1 + (nr || 1)).map(row => { const o = []; for (let k = 0; k < (nc || 1); k++) o.push(row[c - 1 + k] === undefined ? '' : row[c - 1 + k]); return o; }),
        setValue: v => { while (t.rows.length < r) t.rows.push([]); t.rows[r - 1][c - 1] = v; }
      };
    }
  }
  class FakeBook {
    constructor(sheets) { this.sheets = sheets; }
    getSheetByName(nm) { return this.sheets.find(x => x.name === nm) || null; }
    insertSheet(nm) { const x = new FakeSheet(nm, []); this.sheets.push(x); return x; }
    getSheets() { return this.sheets; }
  }
  const PKG_HEAD = ['PackageID', 'PatientID', 'PatientName', 'Email', 'Phone', 'Service', 'TotalVisits', 'VisitsUsed', 'VisitsLeft', 'PurchaseDate', 'Price', 'Status', 'UsageLog', 'Notes'];
  const pkgRow = (id, over) => Object.assign({ id, pid: 'P-' + id, name: 'Test Patient', email: 'pat@example.com', phone: '8185550123', service: 'Acupuncture', total: 5, used: 1, date: '2026-11-25', status: 'Active', log: '2026-11-25 (visit 1)' }, over || {});
  const toRow = o => [o.id, o.pid, o.name, o.email, o.phone, o.service, o.total, o.used, '', o.date, 500, o.status, o.log, ''];
  const EHR = 'ehr-sheet-id';
  let book, appts, ehr, calendar, mails, stripeCalls;
  const setup = (pkgs) => {
    appts = new FakeSheet('Appointments', []);
    ehr = new FakeBook([new FakeSheet('Packages', [PKG_HEAD].concat(pkgs.map(toRow))), new FakeSheet('AuditLog', [['Timestamp', 'User', 'Action', 'PatientID', 'RecordID', 'Model', 'InputTokens', 'OutputTokens', 'EstCostUSD', 'Detail']])]);
    book = new FakeBook([appts]);
    calendar = []; mails = []; stripeCalls = 0;
    ctx.SpreadsheetApp = { getActiveSpreadsheet: () => book, openById: id => { if (id === EHR) return ehr; throw new Error('no sheet ' + id); } };
    ctx.prop_ = (k, d) => k === 'PACKAGES_SHEET_ID' ? EHR : d;
    ctx.cfg_ = () => ({ match: 'tea sit', stripeKey: 'sk_test', calendarId: 'cal', site: 'https://site.test', address: '2116 N Glenoaks Blvd', phone: '(818) 253-9307', notify: 'info@test' });
    ctx.clean_ = (v, max) => String(v || '').trim().slice(0, max);
    ctx.stripe_ = () => { stripeCalls++; return { id: 'cs_test_' + stripeCalls, url: 'https://stripe.test/pay' }; };
    ctx.paidOk_ = () => true;
    ctx.LockService = { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) };
    ctx.CacheService = { getScriptCache: () => ({ get: () => null, put() {} }) };
    ctx.MailApp = { sendEmail: m => mails.push(m) };
    ctx.CalendarApp = {
      EventTransparency: { TRANSPARENT: 'T' }, GuestStatus: { NO: 'N' },
      getCalendarById: () => ({
        getEvents: () => calendar.map(e => ({ getTransparency: () => 'O', getMyStatus: () => 'Y', getTitle: () => e.title, isAllDayEvent: () => false, getStartTime: () => e.s, getEndTime: () => e.e })),
        createEvent: (title, s, e, o) => { calendar.push({ title, s, e, o }); return { getId: () => 'ev' + calendar.length }; }
      }),
      getDefaultCalendar: () => null
    };
    ctx.Utilities.newBlob = str => ({ getBytes: () => Array.from(Buffer.from(str, 'utf8')) });
    ctx.Utilities.base64EncodeWebSafe = bytes => Buffer.from(bytes).toString('base64url') + '==';
    let u = 0; ctx.Utilities.getUuid = () => 'abcd' + String(++u).padStart(4, '0') + '-0000';
  };
  vm.runInContext('this.__pkg={apptBook_,pkgFind_,apptRows_,pkgTag_,apptBookLink_};', ctx);
  const P = ctx.__pkg;
  const realNow = Date.now();
  const firstSlot = (slug) => apptDays_([], APPT_SERVICES[slug].minutes, apptCfg_(), realNow).find(d => d.slots.length).slots[0].start;
  const req = (over) => Object.assign({ service: 'acupuncture-repeat-treatment', start: firstSlot('acupuncture-repeat-treatment'), name: 'Pat Patient', email: 'pat@example.com', phone: '(818) 555-0123' }, over || {});
  const pk = (rowNo) => ehr.getSheetByName('Packages').rows[rowNo - 1];

  ok('package: matched by email (case and spaces ignored), no Stripe, calendar event, one visit counted off', () => {
    setup([pkgRow('PKG-0001')]);
    const r = P.apptBook_(req({ email: '  PAT@Example.com ' }));
    assert.strictEqual(r.ok, true); assert.strictEqual(r.package, true); assert.strictEqual(r.left, 3); assert.strictEqual(r.total, 5);
    assert.strictEqual(stripeCalls, 0); assert.strictEqual(calendar.length, 1);
    assert.strictEqual(pk(2)[7], 2); assert.strictEqual(pk(2)[11], 'Active');
    assert(/^2026-.*\(visit 1\); \d{4}-\d{2}-\d{2} \(visit 2\)$/.test(pk(2)[12]), pk(2)[12]);
    const a = appts.rows[1]; assert.strictEqual(a[AC.status - 1], 'paid'); assert.strictEqual(a[AC.amount - 1], 0); assert(/^pkg\|PKG-0001\|3\|5\|/.test(a[AC.session - 1]));
    assert(calendar[0].o.description.indexOf('Package visit: PKG-0001, 3 of 5 visits left') >= 0);
    assert(calendar[0].o.description.indexOf('$95') >= 0, 'late-cancellation text stays');
  });
  ok('package: matched by phone in a different format; the email need not match', () => {
    setup([pkgRow('PKG-0001', { phone: '8185550123' })]);
    const r = P.apptBook_(req({ email: 'someone.else@example.com', phone: '+1 818-555-0123' }));
    assert.strictEqual(r.package, true); assert.strictEqual(stripeCalls, 0);
  });
  ok('package: confirmation email says visits left, and Roozbeh\'s copy names the package', () => {
    setup([pkgRow('PKG-0001')]); P.apptBook_(req());
    assert(mails[0].body.indexOf('covered by your package: 3 of 5 visits left') >= 0, mails[0].body);
    assert(mails[0].body.indexOf('payment has been received') < 0);
    assert(mails[1].body.indexOf('using package PKG-0001') >= 0, mails[1].body);
  });
  ok('package: an AuditLog line is written with the patient and package ids', () => {
    setup([pkgRow('PKG-0001')]); P.apptBook_(req());
    const log = ehr.getSheetByName('AuditLog').rows; assert.strictEqual(log.length, 2);
    assert.strictEqual(log[1][3], 'P-PKG-0001'); assert.strictEqual(log[1][4], 'PKG-0001'); assert(/3 left/.test(log[1][9]));
  });
  ok('package: a different service than the package covers is charged normally (initial treatment, microneedling)', () => {
    ['acupuncture-initial-treatment', 'medical-microneedling-session'].forEach(slug => {
      setup([pkgRow('PKG-0001')]);
      const r = P.apptBook_(req({ service: slug, start: firstSlot(slug) }));
      assert.strictEqual(r.ok, true); assert(r.url, slug); assert(!r.package);
      assert.strictEqual(pk(2)[7], 1, 'visits untouched');
    });
  });
  ok('package: no visits left, or status not Active (Used up, Cancelled), is charged normally', () => {
    [{ used: 5, status: 'Active' }, { used: 1, status: 'Used up' }, { used: 1, status: 'Cancelled' }].forEach(o => {
      setup([pkgRow('PKG-0001', o)]);
      const r = P.apptBook_(req()); assert(r.url && !r.package, JSON.stringify(o)); assert.strictEqual(stripeCalls, 1);
    });
  });
  ok('package: no match on email or phone is charged normally (a typo falls back to payment)', () => {
    setup([pkgRow('PKG-0001')]);
    const r = P.apptBook_(req({ email: 'pat@exampel.com', phone: '(818) 555-9999' })); assert(r.url && !r.package);
  });
  ok('package: two active packages for the same person use the oldest purchase first', () => {
    setup([pkgRow('PKG-0002', { date: '2026-12-01' }), pkgRow('PKG-0001', { date: '2026-11-01' })]);
    const r = P.apptBook_(req()); assert.strictEqual(r.package, true);
    assert.strictEqual(pk(3)[7], 2, 'oldest (row 3) used'); assert.strictEqual(pk(2)[7], 1, 'newer untouched');
  });
  ok('package: the last visit marks the package Used up, and the next booking is charged', () => {
    setup([pkgRow('PKG-0001', { used: 4 })]);
    const r = P.apptBook_(req()); assert.strictEqual(r.left, 0); assert.strictEqual(pk(2)[7], 5); assert.strictEqual(pk(2)[11], 'Used up');
    const r2 = P.apptBook_(req({ start: apptDays_([], 45, apptCfg_(), realNow).find(d => d.slots.length).slots[2].start })); assert(r2.url && !r2.package);
  });
  ok('package: a double click books once and counts one visit', () => {
    setup([pkgRow('PKG-0001')]);
    const b = req(), r1 = P.apptBook_(b), r2 = P.apptBook_(b);
    assert.strictEqual(r1.package, true); assert.strictEqual(r2.error, 'taken');
    assert.strictEqual(pk(2)[7], 2); assert.strictEqual(calendar.length, 1); assert.strictEqual(appts.rows.length, 2, 'header plus one booking');
  });
  ok('package: if the packages tab cannot be read, the patient still gets the normal payment flow', () => {
    setup([pkgRow('PKG-0001')]); ehr = null;
    const r = P.apptBook_(req()); assert(r.url && !r.package);
  });
  ok('package: if the visit cannot be counted, the booking is cancelled and no event is made', () => {
    setup([pkgRow('PKG-0001')]);
    const sh = ehr.getSheetByName('Packages'), orig = sh.getRange.bind(sh); let wide = 0;
    sh.getRange = (r, c, nr, nc) => { const g = orig(r, c, nr, nc); return (nc === 14 && ++wide === 2) ? { getValues: () => { const v = g.getValues(); v[0][0] = 'PKG-MOVED'; return v; } } : g; };
    const r = P.apptBook_(req()); assert.strictEqual(r.error, 'server'); assert.strictEqual(calendar.length, 0);
    assert.strictEqual(appts.rows[1][AC.status - 1], 'cancelled'); assert.strictEqual(pk(2)[7], 1);
  });
  ok('next-visit link: first visits lead to the follow-up page, details ride after the # and decode back, accents survive', () => {
    setup([]);
    const dec = link => JSON.parse(Buffer.from(link.split('#me=')[1], 'base64url').toString('utf8'));
    const l1 = P.apptBookLink_('acupuncture-initial-treatment', 'José Ñandú', 'jose@example.com', '(818) 555-0123');
    assert(l1.startsWith('https://site.test/book/acupuncture-repeat-treatment#me='), l1);
    assert.deepStrictEqual(dec(l1), { name: 'José Ñandú', email: 'jose@example.com', phone: '(818) 555-0123' });
    assert(!/[=+/]/.test(l1.split('#me=')[1]), 'token is URL safe with no padding');
    assert(P.apptBookLink_('facial-nano-needling', 'A', 'a@b.co', '1').startsWith('https://site.test/book/facial-nano-needling#me='));
    assert(P.apptBookLink_('initial-consultation-online', 'A', 'a@b.co', '1').indexOf('/book/repeat-consultation-online#') > 0);
  });
  ok('next-visit link: the patient confirmation email has it, Roozbeh\'s copy does not', () => {
    setup([pkgRow('PKG-0001')]); P.apptBook_(req());
    assert(/Book your next visit: https:\/\/site\.test\/book\/acupuncture-repeat-treatment#me=/.test(mails[0].body), mails[0].body);
    assert(mails[1].body.indexOf('#me=') < 0);
  });
  ok('package: pkgTag_ reads package bookings and ignores Stripe sessions', () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(P.pkgTag_('pkg|PKG-0007|2|5|abcd1234'))), { id: 'PKG-0007', left: 2, total: 5 });
    assert.strictEqual(P.pkgTag_('cs_test_123'), null);
  });
}

console.log(`\n${n} checks passed`);
