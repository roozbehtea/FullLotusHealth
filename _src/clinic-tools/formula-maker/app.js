// ───────────────────────── Reference tables
const TEMP = {H:["Hot",3],W:["Warm",2],w:["Slightly warm",1],N:["Neutral",0],c:["Slightly cool",-1],C:["Cool",-2],K:["Cold",-3]};
const TASTE = {S:"Sweet",B:"Bitter",P:"Acrid",A:"Sour",L:"Salty",D:"Bland",R:"Astringent"};
const CHANNELS = {LU:"Lung",LI:"Large Intestine",ST:"Stomach",SP:"Spleen",HT:"Heart",SI:"Small Intestine",BL:"Bladder",KI:"Kidney",PC:"Pericardium",SJ:"San Jiao",GB:"Gallbladder",LR:"Liver"};
const TAGS = {wc:"Wind-cold exterior",wh:"Wind-heat exterior",fire:"Drain fire",hdamp:"Clear damp-heat",cblood:"Cool blood",tox:"Resolve toxicity",dheat:"Clear deficiency heat",sheat:"Clear summerheat",
 purge:"Purge downward",moist:"Moisten intestines",urin:"Drain damp, promote urination",aroma:"Transform dampness",wdamp:"Dispel wind-damp",
 warm:"Warm the interior",rq:"Regulate qi",lr:"Spread liver qi",food:"Reduce food stagnation",bleed:"Stop bleeding",ib:"Invigorate blood",brk:"Break stasis and masses",
 phc:"Transform cold-phlegm",phh:"Transform hot-phlegm",cough:"Stop cough and wheezing",shh:"Anchor and calm the shen",shn:"Nourish heart, calm shen",ew:"Extinguish wind, anchor yang",open:"Open the orifices",
 tqi:"Tonify qi",raise:"Raise yang",tyang:"Tonify yang",tblood:"Tonify blood",tyin:"Tonify yin",fluids:"Generate fluids",ast:"Stabilize and bind",
 soft:"Soften hardness, nodules",pain:"Alleviate pain",worms:"Expel parasites",skin:"Skin: itch and rashes"};
const TAG_GROUPS = [["Exterior",["wc","wh"]],["Clear heat",["fire","hdamp","cblood","tox","dheat","sheat"]],["Drain and dry",["purge","moist","urin","aroma","wdamp"]],
 ["Warm, move, stop",["warm","rq","lr","food","ib","brk","bleed"]],["Phlegm, shen, wind",["phc","phh","cough","shh","shn","ew","open"]],["Tonify and secure",["tqi","raise","tyang","tblood","tyin","fluids","ast"]],["Other",["soft","pain","skin","worms"]]];
const HERB_CATS = {"ext-c":"Release exterior: wind-cold","ext-h":"Release exterior: wind-heat","heat-fire":"Clear heat: drain fire","heat-damp":"Clear heat: dry dampness","heat-blood":"Clear heat: cool blood","heat-tox":"Clear heat: resolve toxicity","heat-def":"Clear deficiency heat",
 purge:"Downward draining","damp-drain":"Drain dampness","damp-aroma":"Aromatic, transform dampness","wind-damp":"Dispel wind-dampness",warm:"Warm the interior",qi:"Regulate qi",food:"Reduce food stagnation",bleed:"Stop bleeding",blood:"Invigorate blood",
 phlegm:"Transform phlegm","cough":"Stop cough, calm wheezing",shen:"Calm the shen",wind:"Extinguish wind",orifice:"Open the orifices","t-qi":"Tonify qi","t-yang":"Tonify yang","t-blood":"Tonify blood","t-yin":"Tonify yin",astringe:"Stabilize and bind",parasite:"Expel parasites"};
const F_CATS = {exterior:"Release the exterior",harmonize:"Harmonize",heat:"Clear heat",purge:"Purge",warm:"Warm the interior","tonify-qi":"Tonify qi","tonify-blood":"Tonify blood","tonify-yin":"Tonify yin","tonify-yang":"Tonify yang",
 qi:"Regulate qi",blood:"Invigorate blood",damp:"Expel dampness",phlegm:"Transform phlegm",shen:"Calm the shen",wind:"Extinguish wind",astringe:"Stabilize and bind",food:"Reduce food stagnation"};
const ROLES = {C:"Chief",D:"Deputy",A:"Assistant",E:"Envoy"};
const STATUSES = {draft:"Draft",ready:"Ready to order",ordered:"Ordered"};
// Classical cautions
const WU_TOU = ["ban_xia","gua_lou","tian_hua_fen","zhe_bei_mu","chuan_bei_mu","bai_ji"];
const PAIRS = [
 ...WU_TOU.map(h=>["fu_zi",h,"bad","Eighteen incompatibilities: Fu Zi (Wu Tou family) with "]),
 ["gan_cao","hai_zao","bad","Eighteen incompatibilities: Gan Cao with Hai Zao"],["zhi_gan_cao","hai_zao","bad","Eighteen incompatibilities: Gan Cao with Hai Zao"],
 ["ding_xiang","yu_jin","bad","Nineteen antagonisms: Ding Xiang with Yu Jin"],["mang_xiao","san_leng","bad","Nineteen antagonisms: Mang Xiao with San Leng"],
 ["ren_shen","wu_ling_zhi","bad","Nineteen antagonisms: Ren Shen with Wu Ling Zhi"],["rou_gui","chi_shi_zhi","bad","Nineteen antagonisms: Rou Gui with Chi Shi Zhi"],
 ["ren_shen","lai_fu_zi","info","Lai Fu Zi is traditionally said to weaken Ren Shen"]];

// ───────────────────────── Data
const HERBS = HERB_ROWS.map(r=>({id:r[0],py:r[1],cn:r[2],ph:r[3],cat:r[4],temp:r[5],tastes:r[6].split(""),ch:r[7].split(" "),tags:r[8].split(" "),act:r[9],min:r[10],max:r[11],flags:r[12],note:r[13]}));
const H = Object.fromEntries(HERBS.map(h=>[h.id,h]));
const F = Object.fromEntries(FORMULAS.map(f=>[f.id,f]));
const SIGNS = Object.fromEntries(SIGN_ROWS.map(s=>[s[0],{id:s[0],label:s[1],group:s[2]}]));
const P = Object.fromEntries(PATTERNS.map(p=>[p.id,p]));
const norm = s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9一-鿿]/g,"");
const HERB_BY_NAME = {};
for(const h of HERBS){ HERB_BY_NAME[norm(h.py)] = h.id; HERB_BY_NAME[norm(h.cn)] = h.id; HERB_BY_NAME[norm(h.id)] = h.id; }
HERB_BY_NAME[norm("Bei Sha Shen")]="bei_sha_shen"; HERB_BY_NAME[norm("Zhi Ban Xia")]="ban_xia"; HERB_BY_NAME[norm("Fa Ban Xia")]="ban_xia"; HERB_BY_NAME[norm("Gou Teng")]="gou_teng";
HERB_BY_NAME[norm("Mai Dong")]="mai_men_dong"; HERB_BY_NAME[norm("Tian Dong")]="tian_men_dong"; HERB_BY_NAME[norm("Sheng Di")]="sheng_di_huang"; HERB_BY_NAME[norm("Shu Di")]="shu_di_huang";
HERB_BY_NAME[norm("Zhi Fu Zi")]="fu_zi"; HERB_BY_NAME[norm("Duan Mu Li")]="mu_li"; HERB_BY_NAME[norm("Duan Long Gu")]="long_gu"; HERB_BY_NAME[norm("Ci Ji Li")]="bai_ji_li";

// ───────────────────────── Helpers
const $ = (s,el=document)=>el.querySelector(s);
const esc = s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n=>{ const r=Math.round(n*10)/10; return (Number.isInteger(r)?r.toString():r.toFixed(1)); };
const tempClass = t=>{const v=TEMP[t][1]; return "t"+(v<0?"m"+(-v):v);};
const safeGet = k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const safeSet = (k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
let toastTimer;
function toast(msg){ let t=$(".toast"); if(!t){t=document.createElement("div");t.className="toast";t.setAttribute("role","status");document.body.append(t);} t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.hidden=true,2800); }
async function copyText(text, label){
  try{ await navigator.clipboard.writeText(text); toast(label+" copied"); }
  catch(e){ const ta=$("#copy-fallback"); ta.hidden=false; ta.value=text; ta.focus(); ta.select(); toast("Select all and copy from the box below the slip"); }
}

// ───────────────────────── State
function newRx(){ return {name:"",baseId:null,baseHerbs:{},items:[],form:"raw",days:7,ratio:5,caseRef:"",notes:"",docId:null,status:"draft",patternIds:[],createdAt:null}; }
const S = { view:"diagnose", signs:new Set(), signQ:"", example:false, intake:"",
  herb:{q:"",tags:new Set(),temp:"any",ch:"",cat:"",from:null},
  fq:"", fcat:"", open:null, rx:newRx(), saved:[], dbState:"loading", review:null, intakeState:null, confirmDel:null };

function loadState(){
  const raw = safeGet("fm-state");
  if(raw){ try{ const d=JSON.parse(raw); S.signs=new Set((d.signs||[]).filter(s=>SIGNS[s])); if(d.rx){ S.rx=Object.assign(newRx(),d.rx); S.rx.items=S.rx.items.filter(i=>H[i.id]); } S.intake=d.intake||""; return; }catch(e){} }
  if(EHR) return; // inside the EHR, start empty so an example is never saved to a patient
  // Example case for a first visit
  S.example = true;
  ["fatigue","heat_sens","sp_sweat","thirst_warm","poor_appetite","loose_stool","t_pale","t_teeth","p_big_weak"].forEach(s=>S.signs.add(s));
  loadBase("bu_zhong_yi_qi_tang", true);
  S.rx.patternIds=["yin_fire"];
}
let saveT;
function persist(){ clearTimeout(saveT); saveT=setTimeout(()=>safeSet("fm-state",JSON.stringify({signs:[...S.signs],rx:S.rx,intake:S.intake})),250); }

// ───────────────────────── Prescription operations
function loadBase(fid, quiet){
  const f=F[fid]; if(!f) return;
  const keep = {form:S.rx.form,days:S.rx.days,ratio:S.rx.ratio,caseRef:S.rx.caseRef,notes:S.rx.notes,docId:null,status:"draft",patternIds:S.rx.patternIds};
  S.rx = Object.assign(newRx(), keep, {name:f.py, baseId:fid, baseHerbs:Object.fromEntries(f.herbs.map(h=>[h[0],h[1]])), items:f.herbs.map(h=>({id:h[0],dose:h[1],role:h[2]}))});
  S.review=null;
  if(!quiet){ toast(f.py+" loaded as the base"); afterRx(); }
}
function itemIndex(id){ return S.rx.items.findIndex(i=>i.id===id); }
function addHerb(id, dose){
  const h=H[id]; if(!h) return;
  const i=itemIndex(id);
  if(i>=0){ if(dose!=null) S.rx.items[i].dose=Math.max(S.rx.items[i].dose,dose); }
  else S.rx.items.push({id,dose:dose ?? (S.rx.baseHerbs[id] ?? defaultDose(h)),role:S.rx.baseId&&F[S.rx.baseId].herbs.find(x=>x[0]===id)?.[2]||""});
}
function defaultDose(h){ const m=(h.min+h.max)/2; return m>=9?Math.round(m/3)*3:Math.round(m*2)/2; }
function removeHerb(id){ const i=itemIndex(id); if(i>=0) S.rx.items.splice(i,1); }
function applyMod(fid, mi){
  if(S.rx.baseId!==fid) loadBase(fid,true);
  const m=F[fid].mods[mi];
  (m.remove||[]).forEach(removeHerb);
  (m.add||[]).forEach(([id,d])=>addHerb(id,d));
  (m.dose||[]).forEach(([id,d])=>{const i=itemIndex(id); if(i>=0) S.rx.items[i].dose=d; else addHerb(id,d);});
  toast("Applied: "+m.label.replace(/\s*\(.*\)\s*$/,""));
  afterRx();
}
function mergeFormula(fid, scale){
  const f=F[fid]; if(!S.rx.items.length){ loadBase(fid); return; }
  f.herbs.forEach(([id,d])=>addHerb(id, Math.round(d*scale*2)/2));
  if(!S.rx.name || (S.rx.baseId && S.rx.name===F[S.rx.baseId].py)) S.rx.name = (S.rx.baseId?F[S.rx.baseId].py:"Custom")+" + "+f.py;
  toast(f.py+" merged ("+Math.round(scale*100)+"%)"); afterRx();
}
function diff(){
  const b=S.rx.baseHerbs, out={added:[],changed:[],removed:[]};
  for(const it of S.rx.items){ if(!(it.id in b)) out.added.push(it.id); else if(Math.abs(b[it.id]-it.dose)>0.001) out.changed.push(it.id); }
  for(const id in b) if(itemIndex(id)<0) out.removed.push(id);
  return out;
}
function totals(){ const g=S.rx.items.reduce((a,i)=>a+(+i.dose||0),0); return {perBag:g, course:g*S.rx.days, granPerDay:g/S.rx.ratio, granCourse:g/S.rx.ratio*S.rx.days}; }
function profile(){
  const items=S.rx.items.filter(i=>i.dose>0); const tot=items.reduce((a,i)=>a+i.dose,0)||1;
  let t=0; const ch={}, ta={};
  for(const i of items){ const h=H[i.id]; t+=TEMP[h.temp][1]*i.dose; h.ch.forEach(c=>ch[c]=(ch[c]||0)+i.dose); h.tastes.forEach(x=>ta[x]=(ta[x]||0)+i.dose); }
  const rank=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k,v/tot]);
  return {temp:t/tot, ch:rank(ch).slice(0,6), ta:rank(ta).slice(0,5)};
}
function warnings(){
  const ids=new Set(S.rx.items.map(i=>i.id)), out=[];
  for(const [a,b,sev,msg] of PAIRS){ if(ids.has(a)&&ids.has(b)) out.push({sev, html: esc(msg + (msg.endsWith("with ")?H[b].py:"")) + ". Confirm this combination is intended."}); }
  for(const it of S.rx.items){ const h=H[it.id];
    if(it.dose>h.max){ const base=S.rx.baseHerbs[it.id]; const classical = base!=null && it.dose<=base;
      out.push({sev:classical?"info":"warn", html:`<b>${esc(h.py)} ${fmt(it.dose)} g</b> is above the usual ${fmt(h.min)}–${fmt(h.max)} g range${classical?`, which matches the classical dose in ${esc(F[S.rx.baseId].py)}`:""}.`}); }
  }
  const preg=S.rx.items.filter(i=>H[i.id].flags.includes("P")).map(i=>H[i.id].py);
  const pregC=S.rx.items.filter(i=>H[i.id].flags.includes("p")).map(i=>H[i.id].py);
  if(preg.length) out.push({sev:"warn",html:`<b>Contraindicated in pregnancy:</b> ${esc(preg.join(", "))}`});
  if(pregC.length) out.push({sev:"info",html:`Use caution in pregnancy: ${esc(pregC.join(", "))}`});
  for(const it of S.rx.items){ const h=H[it.id]; if(h.flags.includes("T")) out.push({sev:"warn",html:`<b>${esc(h.py)}:</b> ${esc(h.note||"Toxic; stay within the dose range.")}`}); }
  const gc=(S.rx.items.find(i=>i.id==="gan_cao")?.dose||0)+(S.rx.items.find(i=>i.id==="zhi_gan_cao")?.dose||0);
  if(gc>9 && S.rx.days>14) out.push({sev:"info",html:`Licorice totals ${fmt(gc)} g a day over ${S.rx.days} days. Watch for edema and raised blood pressure.`});
  const order={bad:0,warn:1,info:2}; return out.sort((a,b)=>order[a.sev]-order[b.sev]);
}
function prepNotes(){
  const groups={"Cook first":[],"Add near the end":[],"Wrap in cloth":[],"Dissolve or melt in the strained decoction":[],"Cook separately":[]};
  for(const it of S.rx.items){ const n=(H[it.id].note||"").toLowerCase(), py=H[it.id].py;
    if(/cook first|cook 30/.test(n)) groups["Cook first"].push(py);
    if(/add (at|near) the end|add late|add near/.test(n)) groups["Add near the end"].push(py);
    if(/wrap/.test(n)) groups["Wrap in cloth"].push(py);
    if(/dissolve|melt/.test(n)) groups["Dissolve or melt in the strained decoction"].push(py);
    if(/cook separately/.test(n)) groups["Cook separately"].push(py); }
  return Object.entries(groups).filter(([,v])=>v.length);
}
function afterRx(){ persist(); renderRx(); if(S.view==="herbs") renderHerbResults(); if(S.view==="formulas") renderFormulaList(); updateRxCount(); }

// ───────────────────────── Pattern scoring
function scorePatterns(){
  const sel=S.signs; if(!sel.size) return [];
  return PATTERNS.map(p=>{
    let tot=0, got=0; const hits=[], missKey=[];
    const tally=(arr,w,isKey)=>arr.forEach(s=>{tot+=w; if(sel.has(s)){got+=w; hits.push([s,isKey]);} else if(isKey) missKey.push(s);});
    tally(p.key,3,true); tally(p.also,1,false); tally(p.tongue,1.5,false); tally(p.pulse,1.5,false);
    return {p, got, tot, frac:got/tot, hits, missKey, rank:(got/tot)*Math.sqrt(got)};
  }).filter(r=>r.got>=2).sort((a,b)=>b.rank-a.rank);
}

// ───────────────────────── Views
const WIDE = window.matchMedia("(min-width:1080px)");
function setView(v){
  if(!["diagnose","herbs","formulas","saved","rx"].includes(v)) v="diagnose";
  if(v==="rx" && WIDE.matches){ v=S.prevView||"diagnose"; setTimeout(()=>$("#rx-name")?.focus(),0); }
  if(v!=="rx") S.prevView=v;
  if(S.view!==v) window.scrollTo(0,0);
  S.view=v; document.body.className="view-"+v;
  document.querySelectorAll("nav.tabs a").forEach(a=>a.setAttribute("aria-current", a.dataset.view===v?"page":"false"));
  for(const id of ["diagnose","herbs","formulas","saved"]) $("#v-"+id).hidden = (id!==v);
  if(v==="diagnose") renderDiagnose();
  if(v==="herbs") renderHerbs();
  if(v==="formulas") renderFormulas();
  if(v==="saved") renderSaved();
  if(v==="rx") renderRx();
}
function updateRxCount(){ document.querySelectorAll(".rx-count").forEach(el=>el.textContent=S.rx.items.length); }

// Diagnose
function renderDiagnose(){
  $("#intake").value = S.intake;
  renderPicked(); renderSignGroups(); renderPatternResults();
}
function renderPicked(){
  const el=$("#picked");
  const banner = S.example ? `<div class="banner"><span>Example case loaded: a spleen-stomach deficiency picture with heat signs. Clear it to start your own.</span><button class="btn sm" data-act="clear-signs">Clear example</button></div>` : "";
  if(!S.signs.size){ el.innerHTML = banner+`<p class="muted" style="margin:0">Select signs below, or describe the case and let Claude pick them.</p>`; return; }
  el.innerHTML = banner + `<div class="row" style="justify-content:space-between"><span class="eyebrow">${S.signs.size} selected</span><button class="btn ghost sm" data-act="clear-signs">Clear all</button></div>
   <div class="chips">${[...S.signs].map(s=>`<button class="chip x" aria-pressed="true" data-act="toggle-sign" data-id="${s}" aria-label="Remove ${esc(SIGNS[s].label)}">${esc(groupPrefix(s)+SIGNS[s].label)}</button>`).join("")}</div>`;
}
const groupPrefix = s=>SIGNS[s].group==="tongue"?"Tongue: ":SIGNS[s].group==="pulse"?"Pulse: ":"";
function renderSignGroups(){
  const q=norm(S.signQ);
  $("#sign-groups").innerHTML = SIGN_GROUPS.map(([g,label])=>{
    const list=SIGN_ROWS.filter(s=>s[2]===g && (!q || norm(s[1]).includes(q)));
    if(!list.length) return "";
    const n=list.filter(s=>S.signs.has(s[0])).length;
    return `<section class="group"><h3>${esc(label)} ${n?`<span class="n">${n}</span>`:""}</h3><div class="chips">${list.map(s=>`<button class="chip" aria-pressed="${S.signs.has(s[0])}" data-act="toggle-sign" data-id="${s[0]}">${esc(s[1])}</button>`).join("")}</div></section>`;
  }).join("") || `<p class="muted">No signs match “${esc(S.signQ)}”.</p>`;
}
function renderPatternResults(){
  const el=$("#pattern-results"); const res=scorePatterns().slice(0,7);
  if(!res.length){ el.innerHTML=`<div class="empty">Matching patterns appear here once you select two or more signs.</div>`; return; }
  const combo = res[1] && res[1].frac>=0.35 && res[0].frac>=0.35 && !sameFamily(res[0].p,res[1].p)
    ? `<div class="banner info"><span>This picture fits <b>${esc(res[0].p.name)}</b> and <b>${esc(res[1].p.name)}</b>. Consider a base for the first and modifications for the second.</span></div>` : "";
  el.innerHTML = combo + res.map((r,i)=>{
    const p=r.p; const pct=Math.round(r.frac*100);
    return `<article class="pat${i===0?" top":""}">
      <div class="pat-head"><div><div class="eyebrow">${esc(p.organ)}</div><h3>${esc(p.name)}</h3></div>
        <div class="score" title="${fmt(r.got)} of ${fmt(r.tot)} weighted points"><span class="bar"><i style="width:${pct}%"></i></span><span class="num">${pct}%</span></div></div>
      <div class="tx">${esc(p.tx)}</div>
      <div class="hits">Matched: ${r.hits.map(([s,k])=>k?`<b>${esc(SIGNS[s].label)}</b>`:esc(groupPrefix(s)+SIGNS[s].label)).join(", ")}</div>
      ${r.missKey.length?`<div class="miss">Key signs not selected: ${esc(r.missKey.map(s=>SIGNS[s].label).join(", "))}</div>`:""}
      ${p.note?`<div class="note">${esc(p.note)}</div>`:""}
      <div class="actions">${p.formulas.map((fid,j)=>`<button class="btn sm${j===0?" primary":""}" data-act="load-base" data-id="${fid}" data-pattern="${p.id}">Load ${esc(F[fid].py)}</button>`).join("")}
        <button class="btn ghost sm" data-act="pattern-herbs" data-id="${p.id}">Herbs for this pattern</button></div>
    </article>`; }).join("");
}
function sameFamily(a,b){ return a.formulas.some(f=>b.formulas.includes(f)); }

// Herbs
function renderHerbs(){
  const hs=S.herb;
  $("#h-q").value=hs.q; $("#h-ch").value=hs.ch; $("#h-cat").value=hs.cat;
  document.querySelectorAll("#h-temp button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===hs.temp));
  $("#fn-groups").innerHTML = TAG_GROUPS.map(([g,tags])=>`<div><h4>${esc(g)}</h4><div class="chips">${tags.map(t=>`<button class="chip" aria-pressed="${hs.tags.has(t)}" data-act="toggle-tag" data-id="${t}">${esc(TAGS[t])}</button>`).join("")}</div></div>`).join("");
  $("#fn-sum").innerHTML = `Functions ${hs.tags.size?`<span class="muted">·</span> ${[...hs.tags].map(t=>`<span class="pill plain">${esc(TAGS[t])}</span>`).join(" ")} <button class="btn ghost sm" data-act="clear-tags">Clear</button>`:`<span class="muted" style="font-weight:400">Pick one or more treatment actions</span>`}`;
  $("#h-from").innerHTML = hs.from ? `<div class="banner info"><span>Showing herbs for <b>${esc(P[hs.from].name)}</b>: ${esc(P[hs.from].tx)}.</span><button class="btn sm" data-act="clear-tags">Show all herbs</button></div>` : "";
  renderHerbResults();
}
function herbMatches(){
  const hs=S.herb, q=norm(hs.q), tags=[...hs.tags];
  let list = HERBS.map(h=>({h, n:tags.filter(t=>h.tags.includes(t)).length}));
  if(tags.length) list=list.filter(x=>x.n>0);
  if(q) list=list.filter(({h})=>norm(h.py+h.cn+h.ph+h.act+(HERB_CATS[h.cat]||"")).includes(q));
  if(hs.ch) list=list.filter(({h})=>h.ch.includes(hs.ch));
  if(hs.cat) list=list.filter(({h})=>h.cat===hs.cat);
  if(hs.temp!=="any") list=list.filter(({h})=>{const v=TEMP[h.temp][1]; return hs.temp==="warm"?v>0:hs.temp==="cool"?v<0:v===0;});
  return list.sort((a,b)=>b.n-a.n || a.h.py.localeCompare(b.h.py));
}
function renderHerbResults(){
  const list=herbMatches(), tags=S.herb.tags;
  $("#h-count").textContent = `${list.length} of ${HERBS.length} herbs` + (tags.size>1?" · herbs matching more of the selected functions are listed first":"");
  $("#herb-list").innerHTML = list.slice(0,120).map(({h,n})=>{
    const inRx=itemIndex(h.id)>=0;
    return `<article class="herb${inRx?" in":""}">
      <div class="herb-top"><div><span class="py">${esc(h.py)}</span><span class="cn han">${esc(h.cn)}</span><div class="ph">${esc(h.ph)}</div></div>
        ${inRx?`<button class="btn sm" data-act="rx-remove" data-id="${h.id}" aria-label="Remove ${esc(h.py)} from the prescription">In Rx ✓</button>`:`<button class="btn sm primary" data-act="rx-add" data-id="${h.id}">Add</button>`}</div>
      <div class="props"><span class="temp ${tempClass(h.temp)}">${TEMP[h.temp][0]}</span><span>${h.tastes.map(t=>TASTE[t]).join(", ")}</span><span class="mono">${h.ch.join(" ")}</span><span class="mono">${fmt(h.min)}–${fmt(h.max)} g</span>
        ${h.flags.includes("P")?`<span class="pill bad">Pregnancy: avoid</span>`:h.flags.includes("p")?`<span class="pill warn">Pregnancy: caution</span>`:""}${h.flags.includes("T")?`<span class="pill bad">Toxic</span>`:""}</div>
      <p class="act">${esc(h.act)}</p>
      ${h.note?`<div class="hnote">${esc(h.note)}</div>`:""}
      <div class="tagline">${h.tags.map(t=>`<span class="${tags.has(t)?"hit":""}">${esc(TAGS[t])}</span>`).join("")}</div>
    </article>`; }).join("") || `<div class="empty">No herbs match these filters.</div>`;
}

// Formulas
function renderFormulas(){
  $("#f-q").value=S.fq;
  $("#f-cats").innerHTML = `<button class="chip" aria-pressed="${!S.fcat}" data-act="fcat" data-id="">All</button>`+Object.entries(F_CATS).filter(([k])=>FORMULAS.some(f=>f.cat===k)).map(([k,v])=>`<button class="chip" aria-pressed="${S.fcat===k}" data-act="fcat" data-id="${k}">${esc(v)}</button>`).join("");
  renderFormulaList();
}
function renderFormulaList(){
  const q=norm(S.fq);
  const list=FORMULAS.filter(f=>(!S.fcat||f.cat===S.fcat) && (!q || norm(f.py+f.cn+f.en+f.ind+f.act+f.src+f.herbs.map(h=>H[h[0]].py).join("")).includes(q)));
  $("#f-count").textContent=`${list.length} formulas`;
  $("#f-list").innerHTML = list.map(f=>{
    const open=S.open===f.id, isBase=S.rx.baseId===f.id;
    return `<article class="f-card" id="f-${f.id}">
      <button class="f-sum" data-act="toggle-formula" data-id="${f.id}" aria-expanded="${open}">
        <span><span class="nm">${esc(f.py)}<span class="han">${esc(f.cn)}</span></span><br><span class="en">${esc(f.en)}</span></span>
        <span class="meta">${esc(F_CATS[f.cat])}<br>${esc(f.src)}${isBase?`<br><span class="pill add">Current base</span>`:""}</span>
        <span class="ind">${esc(f.ind)}</span>
      </button>
      ${open?`<div class="f-body">
        <div><p><b>Actions.</b> ${esc(f.act)}</p>
          <table class="comp">${f.herbs.map(([id,d,r])=>`<tr><td class="r" title="${ROLES[r]||""}">${r}</td><td>${esc(H[id].py)} <span class="han muted">${esc(H[id].cn)}</span></td><td class="d">${fmt(d)} g</td></tr>`).join("")}
          <tr><td></td><td class="muted">Total per bag</td><td class="d">${fmt(f.herbs.reduce((a,h)=>a+h[1],0))} g</td></tr></table>
          ${f.note?`<p class="muted" style="margin-top:8px">${esc(f.note)}</p>`:""}
          <div class="row" style="margin-top:10px">
            <button class="btn primary sm" data-act="load-base" data-id="${f.id}">Load as base</button>
            <button class="btn sm" data-act="merge" data-id="${f.id}" data-scale="1">Merge into Rx</button>
            <button class="btn sm" data-act="merge" data-id="${f.id}" data-scale="0.5">Merge at 50%</button>
          </div>
          <p class="muted" style="font-size:.78rem;margin-top:6px">Merging keeps the larger dose of any herb already in the slip.</p>
        </div>
        <div><div class="eyebrow">Modifications</div>
          ${f.mods.length?`<div class="mods">${f.mods.map((m,i)=>`<div class="mod"><span>${esc(m.label)}</span><button class="btn sm" data-act="apply-mod" data-id="${f.id}" data-i="${i}">Apply</button></div>`).join("")}</div>`:`<p class="muted">No standard modifications listed. Add herbs from the slip or the herb finder.</p>`}
          ${!isBase&&f.mods.length?`<p class="muted" style="font-size:.78rem;margin-top:6px">Applying a modification loads this formula as the base first.</p>`:""}
        </div></div>`:""}
    </article>`; }).join("") || `<div class="empty">No formulas match.</div>`;
}

// Prescription slip
function renderRx(){
  const rx=S.rx, d=diff(), t=totals(), base=rx.baseId?F[rx.baseId]:null;
  const nameEl=$("#rx-name"); if(document.activeElement!==nameEl) nameEl.value=rx.name;
  $("#rx-base").innerHTML = base ? `Based on <b>${esc(base.py)}</b> <span class="han muted">${esc(base.cn)}</span>
     ${d.added.length?`<span class="pill add">+${d.added.length} added</span>`:""}${d.changed.length?`<span class="pill chg">${d.changed.length} changed</span>`:""}${d.removed.length?`<span class="pill plain">−${d.removed.length} removed</span>`:""}
     ${(d.added.length||d.changed.length||d.removed.length)?`<button class="btn ghost sm" data-act="reset-base">Reset to base</button>`:""}`
    : (rx.items.length?`Custom formula`:"");
  const gran=rx.form==="granule";
  const body=$("#rx-body");
  if(!rx.items.length && !d.removed.length){
    body.innerHTML = `<div class="rx-empty">The slip is empty. Load a base formula from a pattern match or the formula library, or add single herbs below.</div>${adderHtml()}`;
    renderRxActions(); return;
  }
  const over=new Set(rx.items.filter(i=>i.dose>H[i.id].max).map(i=>i.id));
  body.innerHTML = `
   <div class="rx-sec">
     <table class="lines"><tbody>
     ${rx.items.map((it,idx)=>{ const h=H[it.id], added=d.added.includes(it.id), chg=d.changed.includes(it.id);
       return `<tr class="${added?"added":""}${over.has(it.id)?" over":""}">
         <td class="role" title="${ROLES[it.role]||(added?"Added":"")}">${it.role||(added?"+":"")}</td>
         <td class="h"><span class="hp">${esc(h.py)}</span><span class="hc han">${esc(h.cn)}</span>
           <span class="hs">${esc(h.ph)}${chg?` · was ${fmt(rx.baseHerbs[it.id])} g`:""}${added?" · added":""}</span></td>
         <td class="dose"><input type="number" id="dose-${it.id}" inputmode="decimal" min="0" step="0.5" value="${it.dose}" data-act="dose" data-id="${it.id}" aria-label="${esc(h.py)} grams per bag"></td>
         ${gran?`<td class="gran" title="Granule grams per day">${fmt(it.dose/rx.ratio)}</td>`:""}
         <td class="del"><button class="x-btn" data-act="rx-remove" data-id="${it.id}" aria-label="Remove ${esc(h.py)}">×</button></td></tr>`; }).join("")}
     </tbody></table>
     ${d.removed.length?`<div class="removed">Removed from base: ${d.removed.map(id=>`<s>${esc(H[id].py)}</s> <button data-act="restore" data-id="${id}">restore</button>`).join(", ")}</div>`:""}
     ${adderHtml()}
   </div>
   <div class="rx-sec">
     <div class="totals">
       <span>Per bag (one day), raw</span><span class="num big">${fmt(t.perBag)} g</span>
       <span>${rx.days} bags, raw total</span><span class="num">${fmt(t.course)} g</span>
       ${gran?`<span>Granules per day at ${fmt(rx.ratio)}:1</span><span class="num">${fmt(t.granPerDay)} g</span><span>Granules for ${rx.days} days</span><span class="num">${fmt(t.granCourse)} g</span>`:""}
     </div>
   </div>
   ${profileHtml()}
   ${warningsHtml()}
   ${modsHtml()}
   ${reviewHtml()}`;
  renderRxActions();
}
function adderHtml(){ return `<div class="adder"><input type="search" id="rx-add" placeholder="Add an herb: pinyin, 中文 or Latin" autocomplete="off" aria-label="Add an herb"><div class="suggest" id="rx-suggest" hidden></div></div>`; }
function profileHtml(){
  if(!S.rx.items.length) return "";
  const p=profile(), pos=((p.temp+3)/6*100);
  const lean = p.temp>1.2?"Warm":p.temp>0.4?"Slightly warm":p.temp<-1.2?"Cold":p.temp<-0.4?"Cool":"Balanced";
  const bars = arr=>`<div class="bars">${arr.map(([k,v])=>`<span class="mono">${esc(k)}</span><span class="b"><i style="width:${Math.round(v*100)}%"></i></span><span class="num">${Math.round(v*100)}%</span>`).join("")}</div>`;
  return `<div class="rx-sec"><h4>Profile <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:500">${lean} overall</span></h4>
    <div class="thermo" role="img" aria-label="Temperature balance: ${lean}"><i style="left:${pos}%"></i></div>
    <div class="thermo-labels"><span>Cold</span><span>Neutral</span><span>Hot</span></div>
    <div class="prof"><div><div class="eyebrow" style="margin-bottom:4px">Channels</div>${bars(p.ch)}</div>
      <div><div class="eyebrow" style="margin-bottom:4px">Flavors</div>${bars(p.ta.map(([k,v])=>[TASTE[k],v]))}</div></div>
    <div class="muted" style="font-size:.74rem">Weighted by dose. Channel shares overlap because most herbs enter several.</div></div>`;
}
function warningsHtml(){
  const w=warnings(), prep=prepNotes();
  if(!w.length && !prep.length) return `<div class="rx-sec"><h4>Checks</h4><div class="muted" style="font-size:.84rem">No incompatibilities, pregnancy cautions or dose flags.</div></div>`;
  return `<div class="rx-sec"><h4>Checks</h4>${w.length?`<ul class="warns">${w.map(x=>`<li class="${x.sev}">${x.html}</li>`).join("")}</ul>`:""}
    ${prep.length&&S.rx.form==="raw"?`<div class="eyebrow" style="margin-top:4px">Preparation</div><ul class="prep">${prep.map(([k,v])=>`<li>${esc(k)}: ${esc(v.join(", "))}</li>`).join("")}</ul>`:""}</div>`;
}
function modsHtml(){
  const f=S.rx.baseId&&F[S.rx.baseId]; if(!f||!f.mods.length) return "";
  return `<div class="rx-sec"><h4>Modifications for ${esc(f.py)}</h4><div class="mods">${f.mods.map((m,i)=>`<div class="mod"><span>${esc(m.label)}</span><button class="btn sm" data-act="apply-mod" data-id="${f.id}" data-i="${i}">Apply</button></div>`).join("")}</div></div>`;
}
function reviewHtml(){
  const r=S.review; if(!r) return "";
  if(r.state==="busy") return `<div class="rx-sec"><h4>Claude's review</h4><div class="review muted">Thinking… <button class="btn ghost sm" data-act="review-stop">Stop</button></div></div>`;
  if(r.state==="error") return `<div class="rx-sec"><h4>Claude's review</h4><div class="review muted">${esc(r.msg)}</div></div>`;
  const d=r.data;
  return `<div class="rx-sec"><h4>Claude's review <button class="btn ghost sm" data-act="review-close">Dismiss</button></h4><div class="review">
    <div>${esc(d.assessment||"")}</div>
    ${(d.suggestions||[]).map((s,i)=>{ const id=HERB_BY_NAME[norm(s.herb)]; const label = s.action==="remove"?"Remove":s.action==="dose"?"Change dose":"Add";
      const can = id && (s.action!=="remove"||itemIndex(id)>=0);
      return `<div class="sug"><span><b>${label} ${esc(s.herb)}${s.dose?` ${fmt(+s.dose)} g`:""}</b>. ${esc(s.reason||"")}${!id?` <span class="muted">(not in this materia medica)</span>`:""}</span>${can?`<button class="btn sm" data-act="apply-sug" data-i="${i}">Apply</button>`:""}</div>`; }).join("")}
    ${(d.cautions||[]).length?`<ul class="warns">${d.cautions.map(c=>`<li class="warn">${esc(c)}</li>`).join("")}</ul>`:""}
    <div class="muted" style="font-size:.76rem">Suggestions from Claude. Check them against your own judgement before use.</div></div></div>`;
}
function renderRxActions(){
  const rx=S.rx;
  document.querySelectorAll("#rx-form button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.v===rx.form));
  const setv=(id,v)=>{const el=$(id); if(document.activeElement!==el) el.value=v;};
  setv("#rx-days",rx.days); setv("#rx-ratio",rx.ratio); setv("#rx-case",rx.caseRef); setv("#rx-notes",rx.notes);
  $("#rx-ratio-wrap").hidden = rx.form!=="granule";
  $("#rx-status").value = rx.status;
  const st=$("#save-state");
  st.textContent = db?.local ? (rx.docId?"Saved in this browser.":"Not saved yet. Saves stay in this browser.") : S.dbState==="none" ? "Saving to your library works on the published page. This draft stays in this browser."
    : rx.docId ? `Saved to your library${S.saved.find(s=>s.id===rx.docId)?.updatedAt?` · ${new Date(S.saved.find(s=>s.id===rx.docId).updatedAt).toLocaleString()}`:""}` : "Not saved yet.";
  $("#btn-save").disabled = S.dbState==="none" || !rx.items.length;
  $("#btn-save").textContent = rx.docId ? "Update saved" : "Save to library";
}

// Saved
function renderSaved(){
  const el=$("#saved-list");
  if(S.dbState==="none"){ el.innerHTML=`<div class="empty">Your saved formulas live with the published page and need you to be signed in. The current draft is kept in this browser.</div>`; return; }
  if(S.dbState==="loading"){ el.innerHTML=`<div class="empty">Loading saved formulas…</div>`; return; }
  if(S.dbState==="error"){ el.innerHTML=`<div class="empty">Saved formulas could not be loaded. Reload the page to try again.</div>`; return; }
  const localNote = db?.local ? `<div class="banner info"><span>Formulas saved here stay in this browser only. Clearing site data removes them, and an ordering assistant can't see them.</span></div>` : "";
  if(!S.saved.length){ el.innerHTML=localNote+`<div class="empty">No saved formulas yet. Build one in the slip and choose <b>Save to library</b>. Saved formulas marked <b>Ready to order</b> are what an ordering assistant will pick up.</div>`; return; }
  el.innerHTML = localNote + S.saved.map(s=>`<article class="saved">
    <div><div class="nm">${esc(s.name||"Untitled formula")}</div>
      <div class="meta">${s.caseRef?`${esc(s.caseRef)} · `:""}${s.form==="granule"?`Granules ${fmt(s.granuleRatio||5)}:1`:"Raw"} · ${s.bags} bags · ${fmt(s.totalPerBag||0)} g per bag · ${s.updatedAt?new Date(s.updatedAt).toLocaleDateString():""}</div></div>
    <div class="acts">
      <select class="status-sel" id="st-${s.id}" data-act="set-status" data-id="${s.id}" aria-label="Status">${Object.entries(STATUSES).map(([k,v])=>`<option value="${k}"${s.status===k?" selected":""}>${v}</option>`).join("")}</select>
      <button class="btn sm primary" data-act="open-saved" data-id="${s.id}">Open</button>
      <button class="btn sm" data-act="dup-saved" data-id="${s.id}">Duplicate</button>
      ${S.confirmDel===s.id?`<button class="btn sm danger" data-act="del-saved" data-id="${s.id}">Confirm delete</button><button class="btn ghost sm" data-act="del-cancel">Keep</button>`:`<button class="btn ghost sm danger" data-act="del-ask" data-id="${s.id}">Delete</button>`}
    </div>
    <div class="herbs-line">${(s.herbs||[]).map(h=>`${esc(h.pinyin)} ${fmt(h.dose)}`).join(" · ")}</div>
  </article>`).join("");
}

// ───────────────────────── Export
function rxRecord(){
  const rx=S.rx, t=totals(), gran=rx.form==="granule";
  return { name: rx.name||"Untitled formula", caseRef: rx.caseRef||"", status: rx.status, form: rx.form, bags: rx.days, granuleRatio: gran?rx.ratio:null,
    baseFormula: rx.baseId?{id:rx.baseId, pinyin:F[rx.baseId].py, hanzi:F[rx.baseId].cn}:null,
    herbs: rx.items.map(i=>({id:i.id, pinyin:H[i.id].py, hanzi:H[i.id].cn, pharmaceutical:H[i.id].ph, dose:+i.dose, unit:"g", granuleDose: gran?Math.round(i.dose/rx.ratio*10)/10:null})),
    totalPerBag: Math.round(t.perBag*10)/10, totalCourse: Math.round(t.course*10)/10,
    granulePerDay: gran?Math.round(t.granPerDay*10)/10:null,
    preparation: rx.form==="raw"?prepNotes().map(([k,v])=>`${k}: ${v.join(", ")}`):[],
    patterns: (rx.patternIds||[]).filter(p=>P[p]).map(p=>P[p].name),
    signs: [...S.signs].map(s=>groupPrefix(s)+SIGNS[s].label),
    notes: rx.notes||"" };
}
function orderText(){
  const r=rxRecord(), gran=r.form==="granule";
  const lines=[`Formula: ${r.name}`];
  if(r.caseRef) lines.push(`Case: ${r.caseRef}`);
  lines.push(gran?`Form: Granules (${fmt(r.granuleRatio)}:1), ${r.bags} days`:`Form: Raw herbs, ${r.bags} bags (1 bag per day)`);
  if(r.baseFormula) lines.push(`Based on: ${r.baseFormula.pinyin} ${r.baseFormula.hanzi}`);
  lines.push("");
  r.herbs.forEach(h=>lines.push(gran?`${h.pinyin} ${h.hanzi} (${h.pharmaceutical}): ${fmt(h.granuleDose)} g granules per day (${fmt(h.dose)} g raw)`:`${h.pinyin} ${h.hanzi} (${h.pharmaceutical}): ${fmt(h.dose)} g`));
  lines.push("");
  lines.push(gran?`Granules per day: ${fmt(r.granulePerDay)} g · Total for ${r.bags} days: ${fmt(r.granulePerDay*r.bags)} g`:`Per bag: ${fmt(r.totalPerBag)} g · Total for ${r.bags} bags: ${fmt(r.totalCourse)} g`);
  if(r.preparation.length){ lines.push(""); lines.push("Preparation:"); r.preparation.forEach(p=>lines.push("- "+p)); }
  if(r.notes){ lines.push(""); lines.push("Notes: "+r.notes); }
  return lines.join("\n");
}

// ───────────────────────── Capabilities: db (saved formulas), sample (Claude)
// Browser-only library used when the hosted store is unavailable (e.g. on the website)
function localDb(KEY){
  const subs=new Set();
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
  const write=o=>{try{localStorage.setItem(KEY,JSON.stringify(o))}catch(e){throw {code:"unavailable"}} subs.forEach(f=>f());};
  const snap=()=>{const o=read(); return {docs:Object.entries(o).map(([id,d])=>({id,data:()=>d})).sort((a,b)=>String(b.data().updatedAt||"").localeCompare(String(a.data().updatedAt||"")))};};
  const ref=id=>({id,set:async d=>{const o=read();o[id]=d;write(o);},update:async d=>{const o=read(); if(!o[id]) throw {code:"invalid_argument"}; o[id]={...o[id],...d}; write(o);},delete:async()=>{const o=read(); delete o[id]; write(o);}});
  try{ window.addEventListener("storage",e=>{ if(e.key===KEY) subs.forEach(f=>f()); }); }catch(e){}
  return {local:true,collection:()=>({doc:id=>ref(id||("l"+Date.now().toString(36)+Math.random().toString(36).slice(2,7))),
    orderBy:()=>({onSnapshot:cb=>{const f=()=>cb(snap()); subs.add(f); f(); return ()=>subs.delete(f);}})})};
}
let db=null, sample=null, reviewCtl=null, intakeCtl=null;
(async()=>{
  try{ db = await window.claude?.use?.("db") ?? null; }catch(e){ db=null; }
  if(!db) db=localDb("fm-library");
  db.collection("formulas").orderBy("updatedAt","desc").onSnapshot(snap=>{
    S.saved=snap.docs.map(d=>({id:d.id,...d.data()})); S.dbState="ready";
    $("#saved-count").textContent=S.saved.length||"";
    if(S.view==="saved") renderSaved(); renderRxActions();
  }, ()=>{ S.dbState="error"; renderSaved(); });
})();
(async()=>{
  try{ sample = await window.claude?.use?.("sample") ?? null; }catch(e){ sample=null; }
  document.querySelectorAll(".needs-claude").forEach(el=>el.hidden=!sample);
})();
const sampleErr = e=>({not_granted:"Claude isn't allowed on this page. You can allow it from the page's permissions.",rate_limited:"Claude is busy or you've hit a usage limit. Try again in a little while.",
  sampling_disabled:"Claude isn't available on this account.",invalid_json:"Claude's answer couldn't be read. Try again.",refused:"Claude declined this request. Rephrase the notes and try again.",
  session_expired:"Sign in again to use Claude."}[e?.code] || "Something went wrong reaching Claude. Try again.");

async function saveRx(){
  if(!db) return;
  const rec=rxRecord(), now=new Date().toISOString();
  rec.updatedAt=now; rec.createdAt=S.rx.createdAt||now;
  const btn=$("#btn-save"); btn.disabled=true;
  try{
    if(S.rx.docId){ await db.collection("formulas").doc(S.rx.docId).set(rec); }
    else { const ref=db.collection("formulas").doc(); await ref.set(rec); S.rx.docId=ref.id; }
    S.rx.createdAt=rec.createdAt; clearTimeout(saveT); safeSet("fm-state",JSON.stringify({signs:[...S.signs],rx:S.rx,intake:S.intake})); toast(db.local?"Saved in this browser":"Saved to your library");
  }catch(e){ toast(e?.code==="invalid_argument"?"You can view this library but not change it.":e?.code==="quota_exceeded"?"The library is full. Delete old formulas to save new ones.":"Saving failed. Try again."); }
  btn.disabled=false; renderRxActions();
}
function openSaved(id, dup){
  const s=S.saved.find(x=>x.id===id); if(!s) return;
  const base=s.baseFormula?.id&&F[s.baseFormula.id];
  S.rx=Object.assign(newRx(),{name:dup?(s.name+" (copy)"):s.name, caseRef:s.caseRef||"", notes:s.notes||"", form:s.form||"raw", days:s.bags||7, ratio:s.granuleRatio||5,
    status:dup?"draft":(s.status||"draft"), docId:dup?null:s.id, createdAt:dup?null:s.createdAt,
    baseId:base?base.id:null, baseHerbs:base?Object.fromEntries(base.herbs.map(h=>[h[0],h[1]])):{},
    items:(s.herbs||[]).filter(h=>H[h.id]).map(h=>({id:h.id,dose:h.dose,role:base?.herbs.find(x=>x[0]===h.id)?.[2]||""}))});
  S.review=null; afterRx(); toast(dup?"Copy opened in the slip":"Opened in the slip");
  if(window.matchMedia("(max-width:1079px)").matches) location.hash="rx";
}

async function reviewRx(){
  if(!sample||!S.rx.items.length) return;
  reviewCtl?.abort(); reviewCtl=new AbortController();
  S.review={state:"busy"}; renderRx();
  const top=scorePatterns().slice(0,3).map(r=>`${r.p.name} (${Math.round(r.frac*100)}% match; principle: ${r.p.tx})`);
  const prompt = `You are assisting a licensed acupuncturist and Chinese herbalist who is building a Chinese herbal formula. Review the draft below.
Signs and symptoms selected: ${[...S.signs].map(s=>groupPrefix(s)+SIGNS[s].label).join("; ")||"none recorded"}
Pattern matches from the app: ${top.join("; ")||"none"}
Clinician's notes: ${S.rx.notes||"none"}
Form: ${S.rx.form==="granule"?"granules":"raw decoction"}, ${S.rx.days} days. Base formula: ${S.rx.baseId?F[S.rx.baseId].py:"none"}.
Formula, grams of raw herb per day:
${S.rx.items.map(i=>`- ${H[i.id].py} (${H[i.id].ph}) ${fmt(i.dose)} g`).join("\n")}

Judge how well the formula fits the pattern, and suggest at most 6 concrete modifications (add, remove, or change a dose) with standard pinyin names and gram doses per day. Note safety issues such as incompatibilities, toxicity, pregnancy, or drug interactions worth checking.
Reply with only JSON in this shape:
{"assessment":"2-4 sentences","suggestions":[{"action":"add|remove|dose","herb":"Pinyin","dose":12,"reason":"short reason"}],"cautions":["short caution"]}`;
  try{
    const data = await sample.json(prompt,{signal:reviewCtl.signal, modelTier:"complex"});
    S.review={state:"done",data:data&&typeof data==="object"?data:{assessment:String(data)}};
  }catch(e){ S.review = e?.code==="cancelled"?null:{state:"error",msg:sampleErr(e)}; }
  renderRx();
}
function applySuggestion(i){
  const s=S.review?.data?.suggestions?.[i]; if(!s) return; const id=HERB_BY_NAME[norm(s.herb)]; if(!id) return;
  if(s.action==="remove") removeHerb(id);
  else if(s.action==="dose"){ const k=itemIndex(id); if(k>=0) S.rx.items[k].dose=+s.dose||S.rx.items[k].dose; else addHerb(id,+s.dose||null); }
  else { const k=itemIndex(id); if(k>=0 && s.dose) S.rx.items[k].dose=+s.dose; else addHerb(id, s.dose?+s.dose:null); }
  S.review.data.suggestions.splice(i,1); toast("Applied"); afterRx();
}
async function intakeToSigns(){
  const text=S.intake.trim(); if(!sample||!text) return;
  intakeCtl?.abort(); intakeCtl=new AbortController();
  const out=$("#intake-out"); out.textContent="Reading the notes…"; $("#btn-intake").disabled=true;
  const prompt = `A Chinese medicine practitioner pasted case notes. Map them to the sign IDs in the list. Choose only signs that the notes clearly state; do not infer.
Sign list (id: label):
${SIGN_ROWS.map(s=>`${s[0]}: ${s[2]==="tongue"?"Tongue ":s[2]==="pulse"?"Pulse ":""}${s[1]}`).join("\n")}

Case notes:
"""${text.slice(0,6000)}"""

Reply with only JSON: {"signs":["id", "..."],"unmatched":["short phrase from the notes that no sign covers"]}`;
  try{
    const d = await sample.json(prompt,{signal:intakeCtl.signal});
    const ids=(d?.signs||[]).filter(s=>SIGNS[s]);
    if(S.example){ S.signs.clear(); S.example=false; }
    const before=S.signs.size;
    ids.forEach(s=>S.signs.add(s));
    out.innerHTML = `Added ${S.signs.size-before} new sign${S.signs.size-before===1?"":"s"}.${(d?.unmatched||[]).length?` Not covered by the sign list: ${esc(d.unmatched.slice(0,8).join("; "))}.`:""}`;
    persist(); renderPicked(); renderSignGroups(); renderPatternResults();
  }catch(e){ out.textContent = e?.code==="cancelled"?"":sampleErr(e); }
  $("#btn-intake").disabled=false;
}

// ───────────────────────── Events
document.addEventListener("click", e=>{
  const b=e.target.closest("[data-act]"); if(!b) return;
  const act=b.dataset.act, id=b.dataset.id;
  if(b.closest("summary")) e.preventDefault();
  if(b.tagName==="SELECT"||b.tagName==="INPUT") return;
  switch(act){
    case "toggle-sign": S.signs.has(id)?S.signs.delete(id):S.signs.add(id); if(S.example){S.example=false;} persist(); renderPicked(); renderSignGroups(); renderPatternResults(); break;
    case "clear-signs": S.signs.clear(); S.example=false; persist(); renderPicked(); renderSignGroups(); renderPatternResults(); break;
    case "load-base": loadBase(id); if(b.dataset.pattern) { S.rx.patternIds=[b.dataset.pattern]; persist(); } if(S.view==="formulas") renderFormulaList();
      if(window.matchMedia("(max-width:1079px)").matches) location.hash="rx"; break;
    case "pattern-herbs": S.herb.tags=new Set(P[id].tags); S.herb.from=id; S.herb.q=""; S.herb.cat=""; S.herb.ch=""; S.herb.temp="any"; location.hash="herbs"; break;
    case "toggle-tag": S.herb.tags.has(id)?S.herb.tags.delete(id):S.herb.tags.add(id); S.herb.from=null; renderHerbs(); break;
    case "clear-tags": S.herb.tags.clear(); S.herb.from=null; renderHerbs(); break;
    case "h-temp": S.herb.temp=b.dataset.v; renderHerbs(); break;
    case "rx-add": addHerb(id); toast(H[id].py+" added"); afterRx(); break;
    case "rx-remove": removeHerb(id); afterRx(); break;
    case "restore": addHerb(id, S.rx.baseHerbs[id]); { const f=F[S.rx.baseId]; const order=f.herbs.map(h=>h[0]); S.rx.items.sort((a,b)=>{const ia=order.indexOf(a.id), ib=order.indexOf(b.id); return (ia<0?99:ia)-(ib<0?99:ib);}); } afterRx(); break;
    case "reset-base": loadBase(S.rx.baseId); break;
    case "fcat": S.fcat=id; renderFormulas(); break;
    case "toggle-formula": S.open = S.open===id?null:id; renderFormulaList(); break;
    case "merge": mergeFormula(id, +b.dataset.scale); break;
    case "apply-mod": applyMod(id, +b.dataset.i); if(S.view==="formulas") renderFormulaList(); break;
    case "rx-form": S.rx.form=b.dataset.v; afterRx(); break;
    case "pick-herb": addHerb(id); $("#rx-add").value=""; afterRx(); setTimeout(()=>$("#rx-add")?.focus(),0); break;
    case "copy-text": copyText(orderText(),"Order text"); break;
    case "ehr-save": ehrSaveFormula(); break;
    case "copy-json": copyText(JSON.stringify(rxRecord(),null,2),"JSON"); break;
    case "save": saveRx(); break;
    case "new-rx": S.rx=newRx(); S.review=null; afterRx(); toast("New empty slip"); break;
    case "review": reviewRx(); break;
    case "review-stop": reviewCtl?.abort(); S.review=null; renderRx(); break;
    case "review-close": S.review=null; renderRx(); break;
    case "apply-sug": applySuggestion(+b.dataset.i); break;
    case "intake-go": intakeToSigns(); break;
    case "open-saved": openSaved(id,false); break;
    case "dup-saved": openSaved(id,true); break;
    case "del-ask": S.confirmDel=id; renderSaved(); break;
    case "del-cancel": S.confirmDel=null; renderSaved(); break;
    case "del-saved": (async()=>{ try{ await db.collection("formulas").doc(id).delete(); if(S.rx.docId===id){S.rx.docId=null; persist();} toast("Deleted"); }catch(err){ toast("Delete failed. Try again."); } S.confirmDel=null; renderSaved(); renderRxActions(); })(); break;
  }
});
document.addEventListener("change", e=>{
  const el=e.target;
  if(el.dataset.act==="dose"){ const k=itemIndex(el.dataset.id); const v=parseFloat(el.value); if(k>=0 && v>=0){ S.rx.items[k].dose=Math.round(v*10)/10; afterRx(); } }
  if(el.dataset.act==="set-status" && db){ db.collection("formulas").doc(el.dataset.id).update({status:el.value, updatedAt:new Date().toISOString()}).then(()=>toast("Marked "+STATUSES[el.value].toLowerCase())).catch(()=>toast("Couldn't update the status."));
    if(S.rx.docId===el.dataset.id){ S.rx.status=el.value; persist(); renderRxActions(); } }
  if(el.id==="rx-status"){ S.rx.status=el.value; persist(); }
  if(el.id==="h-ch"){ S.herb.ch=el.value; renderHerbResults(); }
  if(el.id==="h-cat"){ S.herb.cat=el.value; renderHerbResults(); }
});
let sugIdx=0;
document.addEventListener("input", e=>{
  const el=e.target;
  if(el.id==="sign-q"){ S.signQ=el.value; renderSignGroups(); }
  if(el.id==="intake"){ S.intake=el.value; persist(); }
  if(el.id==="h-q"){ S.herb.q=el.value; renderHerbResults(); }
  if(el.id==="f-q"){ S.fq=el.value; renderFormulaList(); }
  if(el.id==="rx-name"){ S.rx.name=el.value; persist(); }
  if(el.id==="rx-case"){ S.rx.caseRef=el.value; persist(); }
  if(el.id==="rx-notes"){ S.rx.notes=el.value; persist(); }
  if(el.id==="rx-days"){ const v=parseInt(el.value,10); if(v>0&&v<=180){ S.rx.days=v; persist(); renderRxPartial(); } }
  if(el.id==="rx-ratio"){ const v=parseFloat(el.value); if(v>0&&v<=20){ S.rx.ratio=v; persist(); renderRxPartial(); } }
  if(el.id==="rx-add"){ sugIdx=0; renderSuggest(el.value); }
});
function renderRxPartial(){ const a=document.activeElement?.id; renderRx(); if(a){ const el=document.getElementById(a); el?.focus(); } }
function renderSuggest(v){
  const box=$("#rx-suggest"); if(!box) return; const q=norm(v);
  if(!q){ box.hidden=true; return; }
  const list=HERBS.filter(h=>norm(h.py+h.cn+h.ph).includes(q)).sort((a,b)=>(norm(a.py).startsWith(q)?0:1)-(norm(b.py).startsWith(q)?0:1)||a.py.localeCompare(b.py)).slice(0,8);
  box.innerHTML = list.map((h,i)=>`<button class="${i===sugIdx?"on":""}" data-act="pick-herb" data-id="${h.id}"><span>${esc(h.py)} <span class="han muted">${esc(h.cn)}</span>${itemIndex(h.id)>=0?" ✓":""}</span><small>${esc(HERB_CATS[h.cat])} · ${fmt(h.min)}–${fmt(h.max)} g</small></button>`).join("") || `<div class="muted" style="padding:8px 10px;font-size:.86rem">No herb matches “${esc(v)}”.</div>`;
  box.hidden=false;
}
document.addEventListener("keydown", e=>{
  if(e.target.id==="rx-add"){
    const btns=[...document.querySelectorAll("#rx-suggest button")];
    if(e.key==="ArrowDown"&&btns.length){ e.preventDefault(); sugIdx=Math.min(sugIdx+1,btns.length-1); renderSuggest(e.target.value); }
    if(e.key==="ArrowUp"&&btns.length){ e.preventDefault(); sugIdx=Math.max(sugIdx-1,0); renderSuggest(e.target.value); }
    if(e.key==="Enter"&&btns[sugIdx]){ e.preventDefault(); btns[sugIdx].click(); }
    if(e.key==="Escape"){ $("#rx-suggest").hidden=true; }
  }
  if(e.target.dataset?.act==="dose" && e.key==="Enter"){ e.target.blur(); }
});
document.addEventListener("focusout", e=>{ if(e.target.id==="rx-add") setTimeout(()=>{ const b=$("#rx-suggest"); if(b && !b.contains(document.activeElement)) b.hidden=true; },150); });
window.addEventListener("hashchange",()=>setView(location.hash.slice(1)));
WIDE.addEventListener?.("change",()=>setView(location.hash.slice(1)||S.view));


// ───────────────────────── EHR link (opened from the clinic EHR's Clinic Tools menu)
const EHR = /[?&]ehr=1(&|$)/.test(location.search) && window.parent !== window;
function ehrPost(payload){ try{ window.parent.postMessage({source:"fl-clinic-tools", v:1, payload}, "*"); return true; }catch(e){ return false; } }
window.addEventListener("message", e=>{
  const d=e.data; if(!EHR || !d || d.source!=="fl-ehr" || e.source!==window.parent) return;
  if(d.type==="saved") toast(d.message||"Saved to the chart");
  if(d.type==="error") toast(d.message||"The chart could not be updated.");
});

const EHR_HERB = {bei_sha_shen:"Bei Sha Shen"};
function prepNoteFor(id){ const n=(H[id].note||"").toLowerCase(), out=[];
  if(/cook first|cook 30/.test(n)) out.push("Cook first"); if(/add (at|near) the end|add late|add near/.test(n)) out.push("Add near the end");
  if(/wrap/.test(n)) out.push("Wrap in cloth"); if(/dissolve|melt/.test(n)) out.push("Dissolve in the strained decoction"); if(/cook separately/.test(n)) out.push("Cook separately");
  return out.join("; "); }
function ehrFormula(){
  const r=rxRecord(), d=diff(), base=S.rx.baseId?F[S.rx.baseId]:null;
  const parts=[];
  if(d.added.length) parts.push("added "+d.added.map(id=>`${H[id].py} ${fmt(S.rx.items[itemIndex(id)].dose)} g`).join(", "));
  if(d.removed.length) parts.push("removed "+d.removed.map(id=>H[id].py).join(", "));
  if(d.changed.length) parts.push("changed "+d.changed.map(id=>`${H[id].py} ${fmt(S.rx.baseHerbs[id])} to ${fmt(S.rx.items[itemIndex(id)].dose)} g`).join(", "));
  return {kind:"formula", name:r.name, baseFormula:base?base.py:"", modifications:base?(parts.join("; ")||"unmodified"):"", form:r.form, bags:r.bags,
    granuleRatio:r.granuleRatio, totalPerBag:r.totalPerBag, granulePerDay:r.granulePerDay, notes:r.notes, patterns:r.patterns,
    checks:warnings().map(w=>({level:w.sev, text:w.html.replace(/<[^>]+>/g,"")})),
    herbs:r.herbs.map(h=>({herb:EHR_HERB[h.id]||h.pinyin, hanzi:h.hanzi, grams:h.dose, granuleGrams:h.granuleDose, note:prepNoteFor(h.id)}))};
}
function ehrSaveFormula(){ if(!S.rx.items.length){ toast("Add herbs before saving to the chart"); return; } if(ehrPost(ehrFormula())) toast("Choose the patient above, then confirm"); }

// ───────────────────────── Boot
function boot(){
  $("#h-ch").innerHTML = `<option value="">Any channel</option>`+Object.entries(CHANNELS).map(([k,v])=>`<option value="${k}">${v} (${k})</option>`).join("");
  $("#h-cat").innerHTML = `<option value="">Any category</option>`+Object.entries(HERB_CATS).map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join("");
  $("#rx-status").innerHTML = Object.entries(STATUSES).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
  $("#stat-line").textContent = `${HERBS.length} herbs · ${FORMULAS.length} formulas · ${PATTERNS.length} patterns`;
  if(EHR){ $("#btn-ehr").hidden=false; $("#btn-save").classList.remove("primary"); }
  loadState(); updateRxCount(); renderRx();
  setView(location.hash.slice(1)||"diagnose");
}
boot();
