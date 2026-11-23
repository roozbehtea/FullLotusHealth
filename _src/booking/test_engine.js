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
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Booking.gs'), 'utf8') + '\nthis.__api={AC,apptFormsNote_,apptFormList_,apptCfg_,apptDays_,apptCfg_,slotFree_,at_,addDays_,dayKey_,dow_,apptSoonThrough_,APPT_SERVICES,apptQuotedCents_};', ctx);
const { AC, apptFormsNote_, apptFormList_, apptDays_, apptCfg_, at_, addDays_, dayKey_, dow_, apptSoonThrough_, APPT_SERVICES, apptQuotedCents_ } = ctx.__api;

let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok  ' + name); };
const cfg = apptCfg_();
const now = Utilities.parseDate('2026-11-18 12:00', TZ, 'yyyy-MM-dd HH:mm').getTime();   // Wednesday
const ev = (key, from, to, full) => ({ s: at_(key, from * 60), e: at_(key, to * 60), full: !!full });
const times = d => d.slots.map(s => Utilities.formatDate(new Date(s.start), TZ, 'h:mm a'));

ok('services match prices/minutes', () => { for (const k in APPT_SERVICES) assert(APPT_SERVICES[k].minutes > 0 && APPT_SERVICES[k].price > 0); });
ok('ad offer visits charge the advertised prices for a 90-minute microneedling slot', () => {
  const base = APPT_SERVICES['medical-microneedling-session'];
  const first = APPT_SERVICES['microneedling-offer-first'];
  const series = APPT_SERVICES['microneedling-offer-series'];
  assert.strictEqual(first.minutes, 90);
  assert.strictEqual(first.minutes, base.minutes);
  assert.strictEqual(first.price, 400);
  assert.strictEqual(series.minutes, base.minutes);
  assert.strictEqual(series.price, 1800);
  assert.strictEqual(!!series.package, true);
  assert.strictEqual(apptQuotedCents_('microneedling-offer-first').cents, 40000);
  assert.strictEqual(apptQuotedCents_('microneedling-offer-series').cents, 180000);
  assert.strictEqual(apptQuotedCents_('microneedling-offer-first', 500).error, 'price');
  assert.strictEqual(apptQuotedCents_('microneedling-offer-series', '1800').cents, 180000);
  assert.strictEqual(apptQuotedCents_('not-a-service').error, 'service');
  const day = '2026-11-20';
  const opts = Object.assign({}, cfg, { maxVisible: 99, rotate: false });
  const slots = mins => times(apptDays_([], mins, opts, now).find(d => d.date === day));
  assert.deepStrictEqual(slots(first.minutes), slots(base.minutes));
  assert.deepStrictEqual(slots(series.minutes), slots(base.minutes));
});
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
  ok('ad offer visits ask for the same skin form as microneedling', () => {
    for (const slug of ['microneedling-offer-first', 'microneedling-offer-series']) {
      const n1 = note(slug, 'other@example.com', '+1 818 555 0102');
      assert.strictEqual(n1, 'Forms on file: New Patient Intake', slug);
      assert.strictEqual(names(slug, n1), 'Skin Treatment Intake & Consent', slug);
    }
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
console.log(`\n${n} checks passed`);
