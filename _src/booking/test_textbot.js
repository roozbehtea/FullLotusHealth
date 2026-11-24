// Plays whole text-booking conversations against made-up calendars. Usage: node _src/booking/test_textbot.js
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path'), assert = require('assert');
const TZ = 'America/Los_Angeles';
function parts(ms) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' });
  const o = {}; f.formatToParts(new Date(ms)).forEach(p => o[p.type] = p.value); return o;
}
function offsetAt(ms) { const p = parts(ms); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(ms / 60000) * 60000; }
const toBytes = b => Array.from(b).map(x => x > 127 ? x - 256 : x);
const Utilities = {
  DigestAlgorithm: { MD5: 'md5', SHA_256: 'sha256' },
  computeDigest: (a, s) => toBytes(crypto.createHash(a).update(s).digest()),
  base64EncodeWebSafe: bytes => Buffer.from(bytes.map(x => x & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
  parseDate(str) {
    const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(str); assert(m, 'bad date ' + str);
    const g = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    const t0 = g - offsetAt(g); return new Date(g - offsetAt(t0));
  },
  formatDate(d, tz, fmt) {
    const p = parts(d.getTime()), long = o => new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: TZ }, o)).format(d);
    const hr = +p.hour, h12 = ((hr + 11) % 12) + 1, ap = hr < 12 ? 'AM' : 'PM';
    if (fmt === 'yyyy-MM-dd') return `${p.year}-${p.month}-${p.day}`;
    if (fmt === 'yyyyMMddHH') return `${p.year}${p.month}${p.day}${p.hour}`;
    if (fmt === 'u') return String(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday) + 1);
    if (fmt === 'H') return String(hr);
    if (fmt === 'h:mm a') return `${h12}:${p.minute} ${ap}`;
    if (fmt === 'EEEE, MMMM d') return long({ weekday: 'long', month: 'long', day: 'numeric' });
    if (fmt === "EEEE, MMMM d 'at' h:mm a") return long({ weekday: 'long', month: 'long', day: 'numeric' }) + ` at ${h12}:${p.minute} ${ap}`;
    throw new Error('fmt ' + fmt);
  }
};
const cache = new Map(), props = new Map(), mails = [], booked = [];
let rows = [];
const ctx = {
  Utilities, console, TZ, Date, Math, JSON, String, parseInt, parseFloat, isNaN, Array, Object,
  CacheService: { getScriptCache: () => ({ get: k => cache.has(k) ? cache.get(k) : null, put: (k, v) => cache.set(k, v) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.has(k) ? props.get(k) : null, setProperty: (k, v) => props.set(k, v), deleteProperty: k => props.delete(k) }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
  MailApp: { sendEmail: m => mails.push(m) },
  prop_: (k, d) => props.has(k) ? props.get(k) : d,
  cfg_: () => ({ match: 'tea sit', notify: 'info@fulllotushealth.com', address: '2116 N Glenoaks Blvd, Ste 3, Burbank, CA 91504', phone: '(818) 253-9307', site: 'https://www.fulllotushealth.com' }),
  clean_: (s, max) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max)
};
vm.createContext(ctx);
const src = ['Booking.gs', 'TextBot.gs'].map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
vm.runInContext(src, ctx);

// Fake world: the calendar is `items`; apptSlots_ and apptBusy_ read it; apptBook_ records instead of calling Stripe.
let items = [];
const realNow = Date.now();
ctx.apptBusy_ = () => items;
ctx.apptSlots_ = slug => ({ days: ctx.apptDays_(items, ctx.APPT_SERVICES[slug].minutes, ctx.apptCfg_(), Date.now()) });
ctx.apptRows_ = () => rows;
ctx.apptSheet_ = () => ({ appendRow: r => {} });
ctx.apptFind_ = session => { const i = rows.findIndex(r => r[ctx.AC.session - 1] === session); return i < 0 ? null : { index: i + 2, row: rows[i] }; };
ctx.apptBook_ = b => {
  const offered = ctx.apptSlots_(b.service).days.some(d => d.slots.some(s => s.start === b.start));
  if (!offered) return { error: 'taken' };
  booked.push(b);
  const r = []; r[ctx.AC.session - 1] = 'cs_test_' + booked.length; r[ctx.AC.status - 1] = 'pending'; r[ctx.AC.when - 1] = 'Friday, December 4 at 11:00 AM–12:30 PM';
  r[ctx.AC.phone - 1] = b.phone; r[ctx.AC.name - 1] = b.name; r[ctx.AC.email - 1] = b.email;
  rows.push(r);
  return { ok: true, url: 'https://checkout.stripe.com/c/pay/cs_test_' + booked.length, session: 'cs_test_' + booked.length };
};

const say = (from, text, ch) => ctx.botHandle_(from, text, ch || (from.startsWith('test:') ? 'test' : 'sms')).join('\n\n');
let n = 0; const ok = (name, fn) => { fn(); n++; console.log('ok  ' + name); };
const firstOffer = (from) => JSON.parse(cache.get('bot-st-' + ctx.botHash_(from))).offer;

ok('first text: greets as an automated assistant and lists the services with prices', () => {
  const r = say('sms:8185550001', 'Hi');
  assert(/booking assistant \(automated\)/.test(r), r);
  assert(/1\) Acupuncture, first visit, \$180/.test(r) && /4\) Microneedling, \$500 \(90 min\)/.test(r), r);
});
ok('a full booking by text: service, time, name, email, YES gives a Stripe link', () => {
  const me = 'sms:8185550002';
  say(me, 'hello');
  let r = say(me, '4');
  assert(/Microneedling \(\$500, 90 min\)/.test(r) && /1\) \w{3} \w{3} \d+, \d+:\d\d (am|pm)/.test(r), r);
  const offer = firstOffer(me);
  assert(offer.length >= 1 && offer.length <= 6, 'offer ' + offer.length);
  r = say(me, '2');
  assert(/What's your first and last name/.test(r), r);
  r = say(me, 'my name is Lily Chen');
  assert(/Thanks, Lily!/.test(r), r);
  r = say(me, 'sure, it\'s Lily.Chen@Example.com');
  assert(/Microneedling/.test(r) && /lily\.chen@example\.com/.test(r) && /\$500/.test(r) && /\$95/.test(r) && /Reply YES/.test(r), r);
  r = say(me, 'Yes!');
  assert(/checkout\.stripe\.com/.test(r), r);
  assert.strictEqual(booked.length, 1);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(booked[0])), { service: 'medical-microneedling-session', start: offer[1].start, name: 'Lily Chen', email: 'lily.chen@example.com', phone: '8185550002', returning: false });
});
ok('texting after the link: not paid yet resends it; paid says all set', () => {
  const me = 'sms:8185550002';
  let r = say(me, 'did it go through?');
  assert(/don't see the payment yet/.test(r) && /cs_test_1/.test(r), r);
  rows[0][ctx.AC.status - 1] = 'paid';
  r = say(me, 'paid');
  assert(/You're all set for Friday, December 4/.test(r), r);
});
ok('a returning patient (paid booking from this phone) is offered their name and masked email', () => {
  const me = 'sms:8185550002';
  say(me, 'book');
  say(me, 'nano');
  const r = say(me, '1');
  assert(/Should I book it for Lily Chen \(l•••@example\.com\)/.test(r), r);
  const c = say(me, 'yes');
  assert(/Nanoneedling/.test(c) && /Reply YES/.test(c), c);
});
ok('"acupuncture" asks first visit or returning, then lists the right service', () => {
  const me = 'sms:8185550003';
  let r = say(me, 'Can I book acupuncture?');
  assert(/first acupuncture visit/.test(r), r);
  r = say(me, '2');
  assert(/Acupuncture: Repeat Treatment \(\$120, 45 min\)/.test(r), r);
});
ok('free text names a service straight away', () => {
  assert(/Cosmetic Acupuncture \(\$250/.test(say('sms:8185550004', 'Hi do you have anything for facial cosmetic acupuncture next week?')));
  assert(/Initial Consultation \(Online\)/.test(say('sms:8185550005', 'I want an online consult')));
});
ok('asking for a day shows only that weekday; mornings shows only morning times', () => {
  const me = 'sms:8185550006';
  say(me, 'hi'); say(me, '2');
  let r = say(me, 'Friday please');
  const offer = firstOffer(me);
  assert(offer.length && offer.every(o => /^Friday/.test(o.day)), r);
  r = say(me, 'mornings');
  assert(firstOffer(me).every(o => /am$/.test(o.time)), r);
});
ok('a day with nothing open says so and offers Roozbeh', () => {
  const me = 'sms:8185550007';
  say(me, 'hi'); say(me, '2');
  const r = say(me, 'sunday');
  assert(/don't have anything open online on Sundays/.test(r) && /ROOZBEH/.test(r), r);
});
ok('MORE moves on to later dates without repeating', () => {
  const me = 'sms:8185550008';
  say(me, 'hi'); say(me, '2');
  const a = firstOffer(me).map(o => o.start);
  say(me, 'more');
  const b = firstOffer(me).map(o => o.start);
  assert(b.length && b.every(x => !a.includes(x)) && b[0] > a[a.length - 1], a + ' / ' + b);
});
ok('a number outside the list is not mistaken for a service', () => {
  const me = 'sms:8185550009';
  say(me, 'hi'); say(me, '2');
  const r = say(me, '7');
  assert(/Reply the number next to the time/.test(r), r);
});
ok('a time taken while they type is caught at YES and the list is refreshed', () => {
  const me = 'sms:8185550010';
  say(me, 'hi'); say(me, '4');
  const pick = firstOffer(me)[0];
  say(me, '1'); say(me, 'Sam Ortiz'); say(me, 'sam@example.com');
  items.push({ s: Date.parse(pick.start) - 30 * 60000, e: Date.parse(pick.start) + 120 * 60000, full: true });
  const r = say(me, 'yes');
  assert(/Someone just took that time/.test(r), r);
  assert(!firstOffer(me).some(o => o.start === pick.start));
  items = [];
});
ok('cancel or reschedule goes to Roozbeh by email, mentions the $95 rule, then the bot stays quiet', () => {
  const me = 'sms:8185550011'; mails.length = 0;
  const r = say(me, 'Hi I need to reschedule my appointment on Friday');
  assert(/passed this to Roozbeh/.test(r) && /\$95/.test(r), r);
  assert.strictEqual(mails.length, 1);
  assert(/Text from \(818\) 555-0011: Cancel or reschedule/.test(mails[0].subject) && /reschedule my appointment/.test(mails[0].body), mails[0].body);
  assert.strictEqual(say(me, 'thanks!'), '');
  assert(/What would you like to book/.test(say(me, 'book')));
});
ok('ROOZBEH any time hands off; three misunderstood replies hand off too', () => {
  const me = 'sms:8185550012'; mails.length = 0;
  say(me, 'hi');
  assert(/passed this to Roozbeh/.test(say(me, 'Roozbeh')));
  const me2 = 'sms:8185550013';
  say(me2, 'hi'); say(me2, 'blah'); say(me2, 'what');
  assert(/trouble following/.test(say(me2, 'huh')));
  assert.strictEqual(mails.length, 2);
});
ok('STOP opts out for good: nothing answered until START', () => {
  const me = 'sms:8185550014';
  say(me, 'hi');
  assert(/won't get any more texts/.test(say(me, 'STOP')));
  assert.strictEqual(say(me, 'hi'), '');
  assert.strictEqual(say(me, 'book'), '');
  assert(/You're back on/.test(say(me, 'START')));
});
ok('tea questions point to the tea sits page', () => {
  assert(/\/tea-sits/.test(say('sms:8185550015', 'Can I come to a tea sit?')));
});
ok('the test page never books, holds, emails or recognizes anyone', () => {
  const me = 'test:abcdefgh12345'; mails.length = 0; const before = booked.length;
  say(me, 'hi'); say(me, '3'); say(me, '1'); say(me, 'Test Person'); say(me, 'test@example.com');
  const r = say(me, 'yes');
  assert(/TEST MODE/.test(r) && !/stripe\.com/.test(r), r);
  assert.strictEqual(booked.length, before);
  assert(/TEST MODE: Roozbeh would get an email/.test(say(me, 'roozbeh')));
  assert.strictEqual(mails.length, 0);
});
ok('the test endpoint checks its id and can be switched off', () => {
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.botPost_({ action: 'bot_test', id: 'x', text: 'hi' }))), { error: 'bad_request' });
  assert(ctx.botPost_({ action: 'bot_test', id: 'abcdefgh99', text: 'hi' }).replies.length === 1);
  props.set('BOT_TEST', 'false');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.botPost_({ action: 'bot_test', id: 'abcdefgh99', text: 'hi' }))), { error: 'off' });
  props.delete('BOT_TEST');
});
ok('a sender is capped at 80 answered messages a day', () => {
  const me = 'sms:8185550016';
  for (let i = 0; i < 80; i++) say(me, 'hi');
  assert.strictEqual(say(me, 'hi'), '');
});
ok('replies stay text-sized (under 900 characters)', () => {
  const me = 'sms:8185550017';
  [say(me, 'hi'), say(me, '4'), say(me, '1'), say(me, 'Ana Ruiz'), say(me, 'ana@example.com')].forEach(r => assert(r.length < 900, r.length + ': ' + r));
});
console.log(`\n${n} checks passed`);
