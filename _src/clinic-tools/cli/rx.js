#!/usr/bin/env node
// Formula Maker + Point Finder on the command line, for Claude to run a case and save drafts to the clinic EHR.
// Uses the same data files and the same checks as the web tools. Node 16+, no packages.
//
//   node rx.js signs [words]              sign ids to pick from (t_ tongue and p_ pulse ids included)
//   node rx.js patterns id,id,id          patterns ranked by fit, with their formulas
//   node rx.js formula <id|name>          a base formula: herbs, doses, roles, numbered modifications
//   node rx.js formulas [words]           search formulas by name, action or indication
//   node rx.js herbs [words]              search herbs by name, action or category
//   node rx.js build spec.json            build a formula and run the checks  (prints JSON with "ehr")
//   node rx.js points [words]             search points by code, name or indication
//   node rx.js point <code>               one point in full
//   node rx.js combos [words]             classical and Tung combinations
//   node rx.js plan spec.json             build a point plan and run the checks (prints JSON with "ehr")
//   node rx.js rows save.json             rows for the Sheet tabs, in each tab's column order
//
// build spec: {"base":"xiao_yao_san","mods":[0],"add":[["dan_shen",9]],"remove":["sheng_jiang"],"dose":[["bai_shao",12]],
//              "form":"raw"|"granule","bags":7,"ratio":5,"name":"","notes":"","patterns":["lr_qi_stag"],"signs":["irritability"]}
// plan spec:  {"name":"","notes":"","retentionMin":25,"points":[{"code":"LI4","side":"B","tech":"even"},"LR3","22.05"]}
//   side B L R M; tech even tonify reduce electro bleed moxa cup
// save.json:  {"patientId":"P-…","visitId":"V-…"|"new"|"","formula":<build ehr>,"plan":<plan ehr>,
//              "status":"Suggested" (default; the EHR keeps Suggested rows out of signing, redrafts and history),
//              "rawNotes":"case notes (written to a new visit)","headers":{"Formulas":[…],"FormulaItems":[…],"Requests":[…],"Treatments":[…],"Visits":[…]},"now":"2026-11-20 14:05"}
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
function load(files, names) {
  const src = files.map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n;\n") + `\n;({${names.join(",")}})`;
  return vm.runInNewContext(src, {});
}
const D = load(["formula-maker/herbs.js", "formula-maker/formulas.js", "formula-maker/patterns.js"], ["HERB_ROWS", "FORMULAS", "SIGN_ROWS", "SIGN_GROUPS", "PATTERNS"]);
const Q = load(["point-finder/pts1.js", "point-finder/pts2.js", "point-finder/pts3.js", "point-finder/tung.js", "point-finder/ehr-codes.js"], ["PTS1", "PTS2", "PTS3", "TUNG", "TUNG_ZONES", "COMBOS", "EHR_CODES"]);

// ───── Formula Maker data and rules (as formula-maker/app.js)
const TEMP = { H: ["Hot", 3], W: ["Warm", 2], w: ["Slightly warm", 1], N: ["Neutral", 0], c: ["Slightly cool", -1], C: ["Cool", -2], K: ["Cold", -3] };
const WU_TOU = ["ban_xia", "gua_lou", "tian_hua_fen", "zhe_bei_mu", "chuan_bei_mu", "bai_ji"];
const PAIRS = [
  ...WU_TOU.map(h => ["fu_zi", h, "bad", "Eighteen incompatibilities: Fu Zi (Wu Tou family) with "]),
  ["gan_cao", "hai_zao", "bad", "Eighteen incompatibilities: Gan Cao with Hai Zao"], ["zhi_gan_cao", "hai_zao", "bad", "Eighteen incompatibilities: Gan Cao with Hai Zao"],
  ["ding_xiang", "yu_jin", "bad", "Nineteen antagonisms: Ding Xiang with Yu Jin"], ["mang_xiao", "san_leng", "bad", "Nineteen antagonisms: Mang Xiao with San Leng"],
  ["ren_shen", "wu_ling_zhi", "bad", "Nineteen antagonisms: Ren Shen with Wu Ling Zhi"], ["rou_gui", "chi_shi_zhi", "bad", "Nineteen antagonisms: Rou Gui with Chi Shi Zhi"],
  ["ren_shen", "lai_fu_zi", "info", "Lai Fu Zi is traditionally said to weaken Ren Shen"]];
const HERBS = D.HERB_ROWS.map(r => ({ id: r[0], py: r[1], cn: r[2], ph: r[3], cat: r[4], temp: r[5], tastes: r[6].split(""), ch: r[7].split(" "), tags: r[8].split(" "), act: r[9], min: r[10], max: r[11], flags: r[12], note: r[13] }));
const H = Object.fromEntries(HERBS.map(h => [h.id, h]));
const F = Object.fromEntries(D.FORMULAS.map(f => [f.id, f]));
const SIGNS = Object.fromEntries(D.SIGN_ROWS.map(s => [s[0], { id: s[0], label: s[1], group: s[2] }]));
const P = Object.fromEntries(D.PATTERNS.map(p => [p.id, p]));
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.一-鿿]/g, "");
const HERB_BY_NAME = {};
for (const h of HERBS) { HERB_BY_NAME[norm(h.py)] = h.id; HERB_BY_NAME[norm(h.cn)] = h.id; HERB_BY_NAME[norm(h.id)] = h.id; }
Object.entries({ "Bei Sha Shen": "bei_sha_shen", "Zhi Ban Xia": "ban_xia", "Fa Ban Xia": "ban_xia", "Gou Teng": "gou_teng", "Mai Dong": "mai_men_dong", "Tian Dong": "tian_men_dong",
  "Sheng Di": "sheng_di_huang", "Shu Di": "shu_di_huang", "Zhi Fu Zi": "fu_zi", "Duan Mu Li": "mu_li", "Duan Long Gu": "long_gu", "Ci Ji Li": "bai_ji_li" })
  .forEach(([k, v]) => { if (H[v]) HERB_BY_NAME[norm(k)] = v; });
const EHR_HERB = { bei_sha_shen: "Bei Sha Shen" };
const fmt = n => { const r = Math.round(n * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1); };
const groupPrefix = s => SIGNS[s].group === "tongue" ? "Tongue: " : SIGNS[s].group === "pulse" ? "Pulse: " : "";

function herbId(x) { const id = H[x] ? x : HERB_BY_NAME[norm(x)]; if (!id) die(`Unknown herb "${x}". Try: node rx.js herbs ${x}`); return id; }
function formulaId(x) { if (F[x]) return x; const n = norm(x); const f = D.FORMULAS.find(f => norm(f.py) === n || norm(f.en) === n || f.cn === x); if (!f) die(`Unknown formula "${x}". Try: node rx.js formulas ${x}`); return f.id; }
function die(msg) { console.error(msg); process.exit(1); }
function defaultDose(h) { const m = (h.min + h.max) / 2; return m >= 9 ? Math.round(m / 3) * 3 : Math.round(m * 2) / 2; }

function scorePatterns(sel) {
  return D.PATTERNS.map(p => {
    let tot = 0, got = 0; const hits = [], missKey = [];
    const tally = (arr, w, isKey) => arr.forEach(s => { tot += w; if (sel.has(s)) { got += w; hits.push(s); } else if (isKey) missKey.push(s); });
    tally(p.key, 3, true); tally(p.also, 1, false); tally(p.tongue, 1.5, false); tally(p.pulse, 1.5, false);
    return { p, got, tot, frac: got / tot, hits, missKey, rank: (got / tot) * Math.sqrt(got) };
  }).filter(r => r.got >= 2).sort((a, b) => b.rank - a.rank);
}

function buildFormula(spec) {
  const rx = { name: spec.name || "", baseId: null, baseHerbs: {}, items: [], form: spec.form === "granule" ? "granule" : "raw", days: Math.max(1, parseInt(spec.bags, 10) || 7),
    ratio: Number(spec.ratio) || 5, notes: spec.notes || "", patternIds: spec.patterns || [], signs: spec.signs || [], applied: [] };
  const idx = id => rx.items.findIndex(i => i.id === id);
  const add = (id, dose) => { const h = H[id]; const i = idx(id);
    if (i >= 0) { if (dose != null) rx.items[i].dose = Math.max(rx.items[i].dose, dose); }
    else rx.items.push({ id, dose: dose ?? (rx.baseHerbs[id] ?? defaultDose(h)), role: rx.baseId && F[rx.baseId].herbs.find(x => x[0] === id)?.[2] || "" }); };
  const remove = id => { const i = idx(id); if (i >= 0) rx.items.splice(i, 1); };
  if (spec.base) {
    const f = F[formulaId(spec.base)]; rx.baseId = f.id; rx.name = rx.name || f.py;
    rx.baseHerbs = Object.fromEntries(f.herbs.map(h => [h[0], h[1]])); rx.items = f.herbs.map(h => ({ id: h[0], dose: h[1], role: h[2] }));
    for (const mi of spec.mods || []) { const m = f.mods[mi]; if (!m) die(`${f.py} has no modification ${mi}. Run: node rx.js formula ${f.id}`);
      (m.remove || []).forEach(remove); (m.add || []).forEach(([id, d]) => add(id, d));
      (m.dose || []).forEach(([id, d]) => { const i = idx(id); if (i >= 0) rx.items[i].dose = d; else add(id, d); }); rx.applied.push(m.label); }
  }
  for (const m of spec.merge || []) { const f = F[formulaId(m.formula || m)]; const sc = m.scale || 1; f.herbs.forEach(([id, d]) => add(id, Math.round(d * sc * 2) / 2)); rx.applied.push("Merged " + f.py); }
  (spec.remove || []).forEach(x => remove(herbId(x)));
  (spec.add || []).forEach(([x, d]) => add(herbId(x), d == null ? null : Number(d)));
  (spec.dose || []).forEach(([x, d]) => { const id = herbId(x); const i = idx(id); if (i >= 0) rx.items[i].dose = Number(d); else add(id, Number(d)); });
  if (!rx.items.length) die("The formula has no herbs.");
  rx.name = rx.name || "Custom formula";

  // checks (as warnings())
  const ids = new Set(rx.items.map(i => i.id)), checks = [];
  for (const [a, b, sev, msg] of PAIRS) if (ids.has(a) && ids.has(b)) checks.push({ level: sev, text: msg + (msg.endsWith("with ") ? H[b].py : "") + ". Confirm this combination is intended." });
  for (const it of rx.items) { const h = H[it.id];
    if (it.dose > h.max) { const base = rx.baseHerbs[it.id]; const classical = base != null && it.dose <= base;
      checks.push({ level: classical ? "info" : "warn", text: `${h.py} ${fmt(it.dose)} g is above the usual ${fmt(h.min)}–${fmt(h.max)} g range${classical ? `, which matches the classical dose in ${F[rx.baseId].py}` : ""}.` }); }
    if (it.dose < h.min) checks.push({ level: "info", text: `${h.py} ${fmt(it.dose)} g is below the usual ${fmt(h.min)}–${fmt(h.max)} g range.` }); }
  const preg = rx.items.filter(i => H[i.id].flags.includes("P")).map(i => H[i.id].py), pregC = rx.items.filter(i => H[i.id].flags.includes("p")).map(i => H[i.id].py);
  if (preg.length) checks.push({ level: "warn", text: "Contraindicated in pregnancy: " + preg.join(", ") });
  if (pregC.length) checks.push({ level: "info", text: "Use caution in pregnancy: " + pregC.join(", ") });
  for (const it of rx.items) { const h = H[it.id]; if (h.flags.includes("T")) checks.push({ level: "warn", text: `${h.py}: ${h.note || "Toxic; stay within the dose range."}` }); }
  const gc = (rx.items.find(i => i.id === "gan_cao")?.dose || 0) + (rx.items.find(i => i.id === "zhi_gan_cao")?.dose || 0);
  if (gc > 9 && rx.days > 14) checks.push({ level: "info", text: `Licorice totals ${fmt(gc)} g a day over ${rx.days} days. Watch for edema and raised blood pressure.` });
  const order = { bad: 0, warn: 1, info: 2 }; checks.sort((a, b) => order[a.level] - order[b.level]);

  // profile
  const tot = rx.items.reduce((a, i) => a + i.dose, 0) || 1; let t = 0; const ch = {};
  for (const i of rx.items) { const h = H[i.id]; t += TEMP[h.temp][1] * i.dose; h.ch.forEach(c => ch[c] = (ch[c] || 0) + i.dose); }
  const temp = t / tot, tempWord = temp >= 1.5 ? "warm" : temp >= 0.5 ? "slightly warm" : temp > -0.5 ? "balanced" : temp > -1.5 ? "slightly cool" : "cool";

  // diff and prep
  const b = rx.baseHerbs, added = [], changed = [], removed = [];
  for (const it of rx.items) { if (!(it.id in b)) added.push(it.id); else if (Math.abs(b[it.id] - it.dose) > 0.001) changed.push(it.id); }
  for (const id in b) if (idx(id) < 0) removed.push(id);
  const parts = [];
  if (added.length) parts.push("added " + added.map(id => `${H[id].py} ${fmt(rx.items[idx(id)].dose)} g`).join(", "));
  if (removed.length) parts.push("removed " + removed.map(id => H[id].py).join(", "));
  if (changed.length) parts.push("changed " + changed.map(id => `${H[id].py} ${fmt(b[id])} to ${fmt(rx.items[idx(id)].dose)} g`).join(", "));
  const prepFor = id => { const n = (H[id].note || "").toLowerCase(), out = [];
    if (/cook first|cook 30/.test(n)) out.push("Cook first"); if (/add (at|near) the end|add late|add near/.test(n)) out.push("Add near the end");
    if (/wrap/.test(n)) out.push("Wrap in cloth"); if (/dissolve|melt/.test(n)) out.push("Dissolve in the strained decoction"); if (/cook separately/.test(n)) out.push("Cook separately");
    return out.join("; "); };
  const gran = rx.form === "granule", perBag = rx.items.reduce((a, i) => a + i.dose, 0);
  const base = rx.baseId ? F[rx.baseId] : null;
  const ehr = { kind: "formula", name: rx.name, baseFormula: base ? base.py : "", modifications: base ? (parts.join("; ") || "unmodified") : "", form: rx.form, bags: rx.days,
    granuleRatio: gran ? rx.ratio : null, totalPerBag: Math.round(perBag * 10) / 10, granulePerDay: gran ? Math.round(perBag / rx.ratio * 10) / 10 : null, notes: rx.notes,
    patterns: rx.patternIds.filter(p => P[p]).map(p => P[p].name), checks,
    herbs: rx.items.map(i => ({ herb: EHR_HERB[i.id] || H[i.id].py, hanzi: H[i.id].cn, grams: +i.dose, granuleGrams: gran ? Math.round(i.dose / rx.ratio * 10) / 10 : null, note: prepFor(i.id) })) };
  return { summary: { name: rx.name, base: base ? `${base.py} ${base.cn}` : "", applied: rx.applied, modifications: ehr.modifications,
      herbs: rx.items.map(i => `${H[i.id].py} ${H[i.id].cn} ${fmt(i.dose)} g${i.role ? " (" + i.role + ")" : ""}${gran ? " = " + fmt(i.dose / rx.ratio) + " g granules" : ""}`),
      totalPerBag: fmt(perBag) + " g raw per day", temperature: `${tempWord} (${fmt(temp)})`, channels: Object.entries(ch).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c).join(" "),
      checks: checks.map(c => c.level.toUpperCase() + ": " + c.text) }, ehr };
}

// ───── Point Finder data and rules (as point-finder/app.js)
const SIDES = { B: "Bilateral", L: "Left", R: "Right", M: "Midline" };
const TECH = { even: "Even", tonify: "Tonify", reduce: "Reduce", electro: "Electro", bleed: "Bleed", moxa: "Moxa", cup: "Cup" };
const NEEDLE_TECH = new Set(["even", "tonify", "reduce", "electro"]);
const MODALITY = { even: "Acupuncture", tonify: "Acupuncture", reduce: "Acupuncture", electro: "Electroacupuncture", bleed: "Bloodletting", moxa: "Moxibustion", cup: "Cupping" };
const chOf = code => { const m = code.match(/^(LU|LI|ST|SP|HT|SI|BL|KI|PC|SJ|GB|LR|GV|CV)\d+$/); return m ? m[1] : "EX"; };
const POINTS = [];
for (const r of [...Q.PTS1, ...Q.PTS2, ...Q.PTS3]) { const ch = chOf(r[0]);
  POINTS.push({ code: r[0], py: r[1], cn: r[2], en: r[3], loc: r[4], needle: r[5], cats: r[6].split(" ").filter(Boolean), act: r[7], ind: r[8], flags: r[9] || "", ch, tung: false, label: ch === "EX" ? r[1] : r[0] }); }
for (const r of Q.TUNG) POINTS.push({ code: r[0], py: r[1], cn: r[2], en: r[3], loc: r[4], needle: r[5], cats: [], act: r[7], ind: r[8], flags: r[9] || "", ch: "T" + r[6], zone: r[6], near: r[10] || "", tung: true, label: r[0].startsWith("DD.") ? r[1] : r[0] });
const PT = Object.fromEntries(POINTS.map(p => [p.code, p]));
const ALIAS = { REN: "CV", DU: "GV", TE: "SJ", TB: "SJ", TW: "SJ", LIV: "LR", UB: "BL", H: "HT", HE: "HT", P: "PC", K: "KI", KID: "KI", SPL: "SP", LV: "LR", G: "GB", S: "ST" };
function findPoint(raw) {
  if (!raw) return null; const s = String(raw).trim().replace(/^tung\s+/i, "");
  if (PT[s]) return s;
  const up = s.toUpperCase().replace(/[\s\-_]/g, "");
  const m = up.match(/^([A-Z]+)(\d+)$/); if (m) { const c = (ALIAS[m[1]] || m[1]) + parseInt(m[2], 10); if (PT[c]) return c; }
  const t = up.match(/^(\d{2,4})\.?(\d{1,2})$/); if (t) { const c = t[1] + "." + t[2].padStart(2, "0"); if (PT[c]) return c; }
  const n = norm(s); const hit = POINTS.find(p => norm(p.py) === n || norm(p.code) === n || p.cn === s); return hit ? hit.code : null;
}
const midline = p => p.ch === "GV" || p.ch === "CV" || ["Yintang", "Haiquan", "Shiqizhui", "Yaoqi", "Jinjin_Yuye"].includes(p.code) || /^(1010\.0[1-8]|1010\.12)$/.test(p.code) || p.code.startsWith("DD.");
function flagText(p) { const f = []; if (p.flags.includes("P")) f.push("pregnancy: avoid"); else if (p.flags.includes("p")) f.push("pregnancy: caution");
  if (p.flags.includes("D")) f.push("needle with care"); if (p.flags.includes("N")) f.push("do not needle"); if (p.flags.includes("B")) f.push("commonly bled"); return f.join(", "); }

function buildPlan(spec) {
  const items = [];
  for (const raw of spec.points || []) {
    const o = typeof raw === "string" ? { code: raw } : raw; const code = findPoint(o.code);
    if (!code) die(`Unknown point "${o.code}". Try: node rx.js points ${o.code}`);
    if (items.some(i => i.code === code)) continue; const p = PT[code];
    const side = o.side || (midline(p) ? "M" : "B"); if (!SIDES[side]) die(`Side for ${o.code} must be B, L, R or M.`);
    const tech = o.tech || (p.flags.includes("N") ? "moxa" : p.flags.includes("B") && p.needle.toLowerCase().startsWith("prick") ? "bleed" : "even"); if (!TECH[tech]) die(`Technique for ${o.code} must be one of ${Object.keys(TECH).join(", ")}.`);
    items.push({ code, side, tech });
  }
  if (!items.length) die("The plan has no points.");
  const ids = new Set(items.map(i => i.code)), checks = [];
  const Pp = items.filter(i => PT[i.code].flags.includes("P")).map(i => PT[i.code].label), pp = items.filter(i => PT[i.code].flags.includes("p")).map(i => PT[i.code].label);
  if (Pp.length) checks.push({ level: "warn", text: "Contraindicated in pregnancy: " + Pp.join(", ") });
  if (pp.length) checks.push({ level: "info", text: "Use caution in pregnancy: " + pp.join(", ") });
  for (const i of items) { const p = PT[i.code];
    if (p.flags.includes("N") && NEEDLE_TECH.has(i.tech)) checks.push({ level: "bad", text: `${p.label} is not needled. ${p.needle}` });
    else if (p.flags.includes("D") && NEEDLE_TECH.has(i.tech)) checks.push({ level: "warn", text: `${p.label}: ${p.needle}` }); }
  if (ids.has("11.24") && ids.has("11.06")) checks.push({ level: "info", text: "Fu Ke and Huan Chao: put them on opposite hands and alternate sides each visit." });
  if (["88.01", "88.02", "88.03"].filter(c => ids.has(c)).length > 2) checks.push({ level: "warn", text: "Tong Guan, Tong Shan and Tong Tian: Tung advised no more than two of the three per leg." });
  if (ids.has("11.17")) checks.push({ level: "info", text: "Mu Huo: retain only about 5 minutes, shortening on later visits." });
  for (const i of items) { const p = PT[i.code]; if (p.tung && /contralateral/i.test(p.act) && i.side === "B") checks.push({ level: "info", text: `${p.py} (${p.code}) is usually needled contralateral to the problem rather than bilaterally.` }); }
  for (const i of items) { const p = PT[i.code]; if (p.near && ids.has(p.near)) checks.push({ level: "info", text: `${p.py} (${p.code}) sits at or beside ${PT[p.near].label}, which is also in the plan.` }); }
  const order = { bad: 0, warn: 1, info: 2 }; checks.sort((a, b) => order[a.level] - order[b.level]);
  const needles = items.reduce((a, i) => a + (NEEDLE_TECH.has(i.tech) ? (i.side === "B" ? 2 : 1) : 0), 0);
  const ehr = { kind: "points", name: spec.name || "Point plan", notes: spec.notes || "", needles, retentionMin: spec.retentionMin || "", checks,
    points: items.map(i => ({ code: Q.EHR_CODES[i.code] || PT[i.code].label, pinyin: PT[i.code].py, hanzi: PT[i.code].cn, side: SIDES[i.side], technique: TECH[i.tech], modality: MODALITY[i.tech] || "Acupuncture", tung: PT[i.code].tung })) };
  return { summary: { name: ehr.name, needles, points: items.map(i => { const p = PT[i.code]; return `${p.tung ? "Tung " : ""}${p.code}${p.py !== p.code ? " " + p.py : ""} ${p.cn} — ${SIDES[i.side]}, ${TECH[i.tech]}${flagText(p) ? " [" + flagText(p) + "]" : ""}`; }),
      checks: checks.map(c => c.level.toUpperCase() + ": " + c.text) }, ehr };
}

// ───── Sheet rows (as ehr/ClinicTools.gs ctSaveFormula / ctSaveTreatment)
const hex8 = () => require("crypto").randomBytes(4).toString("hex").toUpperCase();
const num = n => { const v = Number(n); if (!isFinite(v) || v < 0 || v > 1000) die("A dose is not a valid number of grams."); return Math.round(v * 10) / 10; };
const txt = (s, max) => String(s == null ? "" : s).slice(0, max || 500);
const cell = v => v == null ? "" : typeof v === "string" && /^[=+\-@]/.test(v) ? "'" + v : v; // the Sheet reads input as typed
function rows(save) {
  const status = save.status || "Suggested", hd = save.headers || {}, now = save.now || new Date().toLocaleString("sv-SE", { timeZone: "America/Los_Angeles" }).slice(0, 16), out = {}, ids = {};
  const put = (tab, rec) => { const h = hd[tab]; if (!h || !h.length) die(`headers.${tab} is missing. Read row 1 of the ${tab} tab first.`);
    const miss = Object.keys(rec).filter(k => !h.includes(k)); if (miss.length) die(`${tab} has no column ${miss.join(", ")}.`);
    (out[tab] = out[tab] || []).push(h.map(k => cell(rec[k]))); };
  if (!save.patientId) die("patientId is required.");
  let visitId = save.visitId || "";
  const newVisit = service => { const id = "V-" + hex8(); put("Visits", { VisitID: id, PatientID: save.patientId, VisitDate: now, Service: service, Status: "Draft", RawNotes: txt(save.rawNotes, 20000), CreatedAt: now }); ids.newVisit = id; return id; };
  if (save.plan && visitId === "") die("A point plan needs a visit: give visitId, or \"new\".");
  if (visitId === "new") visitId = newVisit(save.plan ? "Acupuncture" : "Herbal consultation");
  if (save.formula) { const p = save.formula; if (p.kind !== "formula" || !p.herbs?.length) die("formula is not a build ehr object.");
    const gran = p.form === "granule", ratio = gran ? num(p.granuleRatio || 5) : null;
    const herbs = p.herbs.map(h => ({ herb: txt(h.herb, 60), grams: num(h.grams), gran: gran ? num(h.granuleGrams != null ? h.granuleGrams : h.grams / ratio) : null, note: txt(h.note, 200) }));
    const bags = Math.max(1, Math.min(180, parseInt(p.bags, 10) || 7)), raw = herbs.reduce((a, h) => a + h.grams, 0), gt = gran ? herbs.reduce((a, h) => a + h.gran, 0) : 0;
    const id = "F-" + hex8(); ids.formula = id;
    const reason = [p.baseFormula ? `Suggested by Claude with Formula Maker from ${txt(p.baseFormula, 80)}${p.modifications ? ": " + txt(p.modifications, 600) : ""}.` : "Suggested by Claude with Formula Maker."];
    if (p.patterns?.length) reason.push("Patterns: " + p.patterns.join(", ") + "."); if (p.notes) reason.push(txt(p.notes, 1500));
    put("Formulas", { FormulaID: id, PatientID: save.patientId, VisitID: visitId, DatePrescribed: now, Name: txt(p.name, 120) || txt(p.baseFormula, 80) || "Custom formula", BaseFormula: txt(p.baseFormula, 80),
      Form: gran ? "Granules" : "Raw decoction", IngredientsText: herbs.map(h => gran ? `${h.herb} ${h.gran} g (${h.grams} g raw)` : `${h.herb} ${h.grams} g`).join(", "),
      TotalGrams: Math.round((gran ? gt : raw) * 10) / 10, DailyDose: gran ? `${Math.round(gt * 10) / 10} g granules a day (${ratio}:1)` : "1 bag a day", DaysSupplied: bags, ReasonForChange: reason.join(" "), Status: status });
    herbs.forEach(h => put("FormulaItems", { ItemID: "FI-" + hex8(), FormulaID: id, Herb: h.herb, Grams: gran ? h.gran : h.grams, Notes: [gran ? h.grams + " g raw equivalent" : "", h.note].filter(String).join("; ") }));
    const q = "Q-" + hex8(); ids.checkRequest = q;
    put("Requests", { RequestID: q, CreatedAt: now, Action: "check_formula", PatientID: save.patientId, VisitID: visitId, RecordID: id, Status: "Queued" });
  }
  if (save.plan) { const p = save.plan; if (p.kind !== "points" || !p.points?.length) die("plan is not a plan ehr object.");
    const groups = {}, order = [];
    p.points.forEach(pt => { const k = [pt.modality, pt.side, pt.technique].join("|"); if (!groups[k]) { groups[k] = { m: pt.modality, s: pt.side, t: pt.technique, codes: [] }; order.push(k); } groups[k].codes.push(txt(pt.code, 40)); });
    const notes = [p.name ? "Suggested by Claude with Point Finder: " + txt(p.name, 120) : "Suggested by Claude with Point Finder", txt(p.notes, 1000)].filter(String).join(". ");
    ids.treatments = [];
    order.forEach((k, n) => { const g = groups[k], tid = "T-" + hex8(); ids.treatments.push(tid);
      put("Treatments", { TreatmentID: tid, VisitID: visitId, PatientID: save.patientId, Modality: g.m, Points: g.codes.join(", "), Side: g.s, Technique: g.t, RetentionMin: /Acupuncture/.test(g.m) ? (p.retentionMin || "") : "", Notes: n === 0 ? notes : "", Status: status }); });
  }
  return { visitId, ids, append: Object.entries(out).map(([tab, values]) => ({ range: tab + "!A1", values })) };
}

// ───── Commands
const [cmd, ...args] = process.argv.slice(2);
const words = args.join(" ").toLowerCase().split(/\s+/).filter(Boolean);
const has = (s, ws) => ws.every(w => s.toLowerCase().includes(w));
const out = x => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { die(`Could not read ${f}: ${e.message}`); } };

if (cmd === "signs") {
  for (const [g, label] of D.SIGN_GROUPS) { const list = D.SIGN_ROWS.filter(s => s[2] === g && has(s[0] + " " + s[1] + " " + label, words)); if (list.length) out(`## ${label}\n` + list.map(s => `${s[0]}: ${s[1]}`).join("\n")); }
} else if (cmd === "patterns") {
  const sel = new Set(args.join(",").split(/[,\s]+/).filter(Boolean)); const bad = [...sel].filter(s => !SIGNS[s]); if (bad.length) die("Unknown sign ids: " + bad.join(", ") + ". Run: node rx.js signs");
  const r = scorePatterns(sel).slice(0, 8);
  out(r.map((x, n) => `${n + 1}. ${x.p.name} [${x.p.id}] fit ${Math.round(x.frac * 100)}% (score ${x.rank.toFixed(2)})\n   matched: ${x.hits.map(s => groupPrefix(s) + SIGNS[s].label).join(", ")}\n   missing cardinal: ${x.missKey.map(s => SIGNS[s].label).join(", ") || "none"}\n   treatment: ${x.p.tx}\n   formulas: ${x.p.formulas.filter(f => F[f]).map(f => `${F[f].py} [${f}]`).join(", ")}`).join("\n") || "No pattern matches two or more of those signs.");
} else if (cmd === "formula") {
  const f = F[formulaId(args.join(" "))];
  out(`${f.py} ${f.cn} (${f.en}) [${f.id}] — ${f.src || ""}\nAction: ${f.act}\nIndication: ${f.ind}\nHerbs:\n` + f.herbs.map(([id, g, r]) => `  ${H[id].py} ${H[id].cn} ${g} g ${r}`).join("\n")
    + `\nModifications:\n` + (f.mods || []).map((m, i) => `  ${i}: ${m.label}`).join("\n"));
} else if (cmd === "formulas") {
  out(D.FORMULAS.filter(f => has([f.id, f.py, f.en, f.cn, f.act, f.ind, f.cat].join(" "), words)).map(f => `${f.py} [${f.id}] — ${f.act}`).join("\n") || "No match.");
} else if (cmd === "herbs") {
  out(HERBS.filter(h => has([h.id, h.py, h.cn, h.ph, h.act, h.cat, h.tags.join(" ")].join(" "), words)).slice(0, 40).map(h => `${h.py} ${h.cn} [${h.id}] ${h.min}–${h.max} g ${TEMP[h.temp][0]}${h.flags ? " flags:" + h.flags : ""} — ${h.act}`).join("\n") || "No match.");
} else if (cmd === "build") {
  out(buildFormula(readJson(args[0])));
} else if (cmd === "points") {
  const direct = findPoint(args.join(" "));
  const scored = POINTS.map(p => { let sc = p.code === direct ? 100 : 0; const n = norm(p.py), en = p.en.toLowerCase(), ind = p.ind.toLowerCase(), body = (p.act + " " + p.loc).toLowerCase();
    for (const t of words) { const tn = norm(t); if (!tn) continue; let hit = false;
      if (n.startsWith(tn)) { sc += 30; hit = true; } else if (n.includes(tn)) { sc += 15; hit = true; }
      if (en.includes(t)) { sc += 12; hit = true; } if (ind.includes(t)) { sc += 8; hit = true; } else if (body.includes(t)) { sc += 3; hit = true; }
      if (!hit && !norm(p.code).includes(tn)) sc -= 1000; }
    return { p, sc }; }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 30);
  out(scored.map(({ p }) => `${p.tung ? "Tung " : ""}${p.code} ${p.py} ${p.cn}${flagText(p) ? " [" + flagText(p) + "]" : ""} — ${p.ind}`).join("\n") || "No match.");
} else if (cmd === "point") {
  const c = findPoint(args.join(" ")); if (!c) die("Unknown point."); const p = PT[c];
  out({ code: p.code, ehrCode: Q.EHR_CODES[p.code] || p.label, pinyin: p.py, hanzi: p.cn, english: p.en, location: p.loc, needling: p.needle, categories: p.cats, actions: p.act, indications: p.ind, flags: flagText(p), near: p.near || undefined });
} else if (cmd === "combos") {
  out(Q.COMBOS.filter(c => has([c.name, c.use, c.note, c.points.join(" ")].join(" "), words)).map(c => `${c.name} (${c.kind}): ${c.points.join(", ")} — ${c.use}${c.note ? " Note: " + c.note : ""}`).join("\n") || "No match.");
} else if (cmd === "plan") {
  out(buildPlan(readJson(args[0])));
} else if (cmd === "rows") {
  out(rows(readJson(args[0])));
} else {
  out(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 23).map(l => l.replace(/^\/\/ ?/, "")).join("\n"));
}
