// Checks the saved copy of the open times: Booking.gs writing it to GitHub, and the page's head script reading it.
// Usage: node _src/booking/test_publish.js   (run python3 _src/build.py first so book/*.html is current)
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert'), crypto = require('crypto');
const root = path.join(__dirname, '..', '..');
let n = 0; const ok = (name, fn) => Promise.resolve().then(fn).then(() => { n++; console.log('ok  ' + name); });

// ---------- Part 1: Booking.gs apptPublish_ ----------
function world() {
  const props = {}, calls = [], w = { lockFree: true, replies: [] };
  const ctx = {
    console: { log() {}, error() {} }, JSON, String, Number, Date, Math, Array, Object, encodeURIComponent,
    prop_: (k, d) => (props['p:' + k] !== undefined ? props['p:' + k] : d),
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (props[k] === undefined ? null : props[k]), setProperty: (k, v) => { props[k] = v; }, deleteProperty: k => { delete props[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => w.lockFree, releaseLock() {} }) },
    Utilities: {
      DigestAlgorithm: { MD5: 'md5' },
      computeDigest: (a, s) => Array.from(crypto.createHash('md5').update(s).digest()),
      base64Encode: x => Buffer.from(Array.isArray(x) ? x : Buffer.from(String(x))).toString('base64'),
      newBlob: s => ({ getBytes: () => Array.from(Buffer.from(s, 'utf8')) })
    },
    UrlFetchApp: { fetch(url, o) {
      o = o || {}; calls.push({ url, method: (o.method || 'get').toLowerCase(), body: o.payload ? JSON.parse(o.payload) : null, headers: o.headers });
      const r = w.replies.shift() || { code: 200, body: '{}' };
      return { getResponseCode: () => r.code, getContentText: () => r.body };
    } }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'Booking.gs'), 'utf8') + '\nthis.__api={apptPublish_,SLOTS_HEARTBEAT_MS};', ctx);
  return { ctx, props, calls, w, publish: ctx.__api.apptPublish_, HB: ctx.__api.SLOTS_HEARTBEAT_MS };
}
const A = { 'full-lotus-lift': { service: { slug: 'full-lotus-lift' }, today: '2026-11-19', windowDays: 21, days: [{ date: '2026-11-23', slots: [{ start: 'x', label: '2:00 pm' }] }] } };
const B = JSON.parse(JSON.stringify(A)); B['full-lotus-lift'].days[0].slots = [];
const T0 = Date.UTC(2026, 10, 19, 20, 0);
const put = c => c.filter(x => x.method === 'put');

const part1 = () => Promise.resolve()
  .then(() => ok('without a token nothing is sent anywhere', () => {
    const t = world(); assert.strictEqual(t.publish(A, T0), 'off'); assert.strictEqual(t.calls.length, 0);
  }))
  .then(() => ok('first save: looks for the file, creates it on the slots branch, remembers its sha', () => {
    const t = world(); t.props['p:GITHUB_TOKEN'] = 'tok';
    t.w.replies = [{ code: 404, body: '{}' }, { code: 201, body: JSON.stringify({ content: { sha: 'abc' } }) }];
    assert.strictEqual(t.publish(A, T0), 'saved');
    assert.strictEqual(t.calls[0].method, 'get'); assert.ok(t.calls[0].url.endsWith('/contents/slots/slots.json?ref=slots'));
    const p = put(t.calls)[0]; assert.strictEqual(p.body.branch, 'slots'); assert.strictEqual(p.body.sha, undefined);
    assert.strictEqual(p.headers.Authorization, 'Bearer tok');
    const file = JSON.parse(Buffer.from(p.body.content, 'base64').toString('utf8'));
    assert.strictEqual(file.generated, T0); assert.deepStrictEqual(file.services, A);
    assert.strictEqual(t.props.SLOTS_SHA, 'abc');
  }))
  .then(() => ok('an unchanged answer inside the hour sends nothing', () => {
    const t = world(); t.props['p:GITHUB_TOKEN'] = 'tok';
    t.w.replies = [{ code: 404, body: '{}' }, { code: 201, body: JSON.stringify({ content: { sha: 'abc' } }) }];
    t.publish(A, T0); const before = t.calls.length;
    assert.strictEqual(t.publish(JSON.parse(JSON.stringify(A)), T0 + 5 * 60000), 'same'); assert.strictEqual(t.calls.length, before);
  }))
  .then(() => ok('a changed answer is saved at once, reusing the remembered sha (one request)', () => {
    const t = world(); t.props['p:GITHUB_TOKEN'] = 'tok';
    t.w.replies = [{ code: 404, body: '{}' }, { code: 201, body: JSON.stringify({ content: { sha: 'abc' } }) }, { code: 200, body: JSON.stringify({ content: { sha: 'def' } }) }];
    t.publish(A, T0); const before = t.calls.length;
    assert.strictEqual(t.publish(B, T0 + 5 * 60000), 'saved');
    assert.strictEqual(t.calls.length, before + 1); assert.strictEqual(put(t.calls)[1].body.sha, 'abc'); assert.strictEqual(t.props.SLOTS_SHA, 'def');
  }))
  .then(() => ok('an unchanged answer is rewritten after about an hour so the page can see the refresh is alive', () => {
    const t = world(); t.props['p:GITHUB_TOKEN'] = 'tok';
    t.w.replies = [{ code: 404, body: '{}' }, { code: 201, body: JSON.stringify({ content: { sha: 'abc' } }) }, { code: 200, body: JSON.stringify({ content: { sha: 'def' } }) }];
    t.publish(A, T0);
    assert.strictEqual(t.publish(A, T0 + t.HB - 1), 'same');
    assert.strictEqual(t.publish(A, T0 + t.HB + 1), 'saved');
    assert.strictEqual(JSON.parse(Buffer.from(put(t.calls)[1].body.content, 'base64').toString()).generated, T0 + t.HB + 1);
  }))
  .then(() => ok('a stale sha (409) is looked up again and the save is retried once', () => {
    const t = world(); t.props['p:GITHUB_TOKEN'] = 'tok'; t.props.SLOTS_SHA = 'old';
    t.w.replies = [{ code: 409, body: '{}' }, { code: 200, body: JSON.stringify({ sha: 'fresh' }) }, { code: 200, body: JSON.stringify({ content: { sha: 'next' } }) }];
    assert.strictEqual(t.publish(A, T0), 'saved');
    assert.strictEqual(put(t.calls)[0].body.sha, 'old'); assert.strictEqual(put(t.calls)[1].body.sha, 'fresh'); assert.strictEqual(t.props.SLOTS_SHA, 'next');
  }))
  .then(() => ok('a refused token fails quietly and is tried again on the next refresh', () => {
    const t = world(); t.props['p:GITHUB_TOKEN'] = 'bad';
    t.w.replies = [{ code: 404, body: '{}' }, { code: 401, body: '{"message":"Bad credentials"}' }, { code: 404, body: '{}' }, { code: 201, body: JSON.stringify({ content: { sha: 'ok' } }) }];
    assert.strictEqual(t.publish(A, T0), 'failed'); assert.strictEqual(t.props.SLOTS_DIGEST, undefined);
    assert.strictEqual(t.publish(A, T0 + 5 * 60000), 'saved');
  }))
  .then(() => ok('a refresh that overlaps another skips the save instead of racing it', () => {
    const t = world(); t.props['p:GITHUB_TOKEN'] = 'tok'; t.w.lockFree = false;
    assert.strictEqual(t.publish(A, T0), 'busy'); assert.strictEqual(t.calls.length, 0);
  }))
  .then(() => ok('nothing is saved when no service could be worked out', () => {
    const t = world(); t.props['p:GITHUB_TOKEN'] = 'tok';
    assert.strictEqual(t.publish({}, T0), 'failed'); assert.strictEqual(t.calls.length, 0);
  }));

// ---------- Part 2: the head script on a booking page ----------
const html = fs.readFileSync(path.join(root, 'book', 'full-lotus-lift.html'), 'utf8');
const script = (html.match(/<script>\s*\(function \(\) \{\s*var boot = [\s\S]*?<\/script>/) || [])[0];
function page({ saved, live, now = T0, local = null }) {
  const log = [];
  const win = {}, ls = { getItem: () => local, setItem() {} };
  const fetchFn = (url) => {
    const isSaved = /raw\.githubusercontent/.test(url); log.push(isSaved ? 'saved' : 'live');
    const r = isSaved ? saved : live;
    if (r instanceof Error) return Promise.reject(r);
    return Promise.resolve({ ok: r.ok !== false, json: () => Promise.resolve(r.json) });
  };
  const RealDate = Date; const D = function (...a) { return new RealDate(...a); }; D.now = () => now; D.UTC = RealDate.UTC;
  vm.runInNewContext(script.replace(/^<script>/, '').replace(/<\/script>$/, ''), { window: win, localStorage: ls, fetch: fetchFn, Date: D, JSON, encodeURIComponent, Promise, Error });
  return { win, log };
}
const day = { date: '2026-11-23', slots: [{ start: 's', label: '2:00 pm' }] };
const file = (over, gen) => ({ generated: gen === undefined ? T0 - 10 * 60000 : gen, services: { 'full-lotus-lift': Object.assign({ service: { slug: 'full-lotus-lift' }, today: '2026-11-19', windowDays: 21, days: [day] }, over || {}) } });
const LIVE = { json: { live: true, days: [day] } };

const part2 = () => Promise.resolve()
  .then(() => ok('the page includes the saved-file address and a 90-minute limit', () => {
    assert.ok(script, 'head script found'); assert.ok(/"slots":"https:\/\/raw\.githubusercontent\.com\//.test(script)); assert.ok(/"maxAge":5400000/.test(script));
  }))
  .then(() => { const p = page({ saved: { json: file() }, live: LIVE }); return p.win.__flAppt.pending.then(r => ok('a fresh saved file is used and Apps Script is never called', () => { assert.strictEqual(r.service.slug, 'full-lotus-lift'); assert.deepStrictEqual(p.log, ['saved']); })); })
  .then(() => { const p = page({ saved: { ok: false, json: {} }, live: LIVE }); return p.win.__flAppt.pending.then(r => ok('no saved file yet (404): falls back to the live calendar', () => { assert.strictEqual(r.live, true); assert.deepStrictEqual(p.log, ['saved', 'live']); })); })
  .then(() => { const p = page({ saved: new Error('offline'), live: LIVE }); return p.win.__flAppt.pending.then(r => ok('GitHub unreachable: falls back to the live calendar', () => { assert.strictEqual(r.live, true); })); })
  .then(() => { const p = page({ saved: { json: file({}, T0 - 91 * 60000) }, live: LIVE }); return p.win.__flAppt.pending.then(r => ok('a file older than 90 minutes (refresh stopped) is ignored', () => { assert.strictEqual(r.live, true); })); })
  .then(() => { const p = page({ saved: { json: file({}, T0 + 3600000) }, live: LIVE }); return p.win.__flAppt.pending.then(r => ok('a file dated far in the future (wrong clock) is ignored', () => { assert.strictEqual(r.live, true); })); })
  .then(() => { const p = page({ saved: { json: file({ days: [] }) }, live: LIVE }); return p.win.__flAppt.pending.then(r => ok('a file with no days is ignored', () => { assert.strictEqual(r.live, true); })); })
  .then(() => { const f = file(); f.services = {}; const p = page({ saved: { json: f }, live: LIVE }); return p.win.__flAppt.pending.then(r => ok('a file without this service is ignored', () => { assert.strictEqual(r.live, true); })); })
  .then(() => { const p = page({ saved: { json: file({ partial: true }) }, live: LIVE }); return p.win.__flAppt.pending.then(r => ok('a partial answer is never taken as the whole calendar', () => { assert.strictEqual(r.live, true); })); });

part1().then(part2).then(() => console.log('\n' + n + ' checks passed')).catch(e => { console.error(e); process.exit(1); });
