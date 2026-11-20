// ───────────────────────── Reference
const CHS = [["LU","Lung","Hand Taiyin Lung","手太陰肺經",1],["LI","Large Intestine","Hand Yangming Large Intestine","手陽明大腸經",0],["ST","Stomach","Foot Yangming Stomach","足陽明胃經",0],["SP","Spleen","Foot Taiyin Spleen","足太陰脾經",1],
 ["HT","Heart","Hand Shaoyin Heart","手少陰心經",1],["SI","Small Intestine","Hand Taiyang Small Intestine","手太陽小腸經",0],["BL","Bladder","Foot Taiyang Bladder","足太陽膀胱經",0],["KI","Kidney","Foot Shaoyin Kidney","足少陰腎經",1],
 ["PC","Pericardium","Hand Jueyin Pericardium","手厥陰心包經",1],["SJ","San Jiao","Hand Shaoyang San Jiao","手少陽三焦經",0],["GB","Gallbladder","Foot Shaoyang Gallbladder","足少陽膽經",0],["LR","Liver","Foot Jueyin Liver","足厥陰肝經",1],
 ["GV","Governing Vessel","Du Mai","督脈",0],["CV","Conception Vessel","Ren Mai","任脈",1],["EX","Extra points","Extraordinary points","經外奇穴",0]];
const CH = Object.fromEntries(CHS.map(c=>[c[0],{id:c[0],name:c[1],full:c[2],cn:c[3],yin:!!c[4]}]));
const SHU = ["well","spring","stream","river","sea"];
const SHU_LABEL = {well:"Jing-well",spring:"Ying-spring",stream:"Shu-stream",river:"Jing-river",sea:"He-sea"};
const EL_YIN = {well:"Wood",spring:"Fire",stream:"Earth",river:"Metal",sea:"Water"}, EL_YANG={well:"Metal",spring:"Water",stream:"Wood",river:"Fire",sea:"Earth"};
const VESSEL = {Ren:"Ren mai",Du:"Du mai",Chong:"Chong mai",Dai:"Dai mai",YinQiao:"Yin Qiao mai",YangQiao:"Yang Qiao mai",YinWei:"Yin Wei mai",YangWei:"Yang Wei mai"};
const HUI = {qi:"qi",blood:"blood",vessels:"vessels",bone:"bone",sinews:"sinews",marrow:"marrow",zang:"zang organs",fu:"fu organs"};
const SEA = {qi:"Sea of qi",blood:"Sea of blood",grain:"Sea of water and grain",marrow:"Sea of marrow"};
const CAT_FILTERS = [["","Any category"],["shu","Five shu points"],["yuan","Yuan-source"],["luo","Luo-connecting"],["xi","Xi-cleft"],["mu","Front-mu"],["bshu","Back-shu"],["hui","Hui-meeting"],["conf","Confluent"],["lhe","Lower he-sea"],["sky","Window of Heaven"],["ghost","Sun Si-miao ghost points"],["star","Ma Dan-yang heavenly star"],["command","Command points"],["seas","Four seas"]];
const SIDES = {B:"Bilateral",L:"Left",R:"Right",M:"Midline"};
const TECH = {even:"Even",tonify:"Tonify",reduce:"Reduce",electro:"Electro",bleed:"Bleed",moxa:"Moxa",cup:"Cup"};
const NEEDLE_TECH = new Set(["even","tonify","reduce","electro"]);
const STATUSES = {draft:"Draft",final:"Final"};

// ───────────────────────── Data
function chOf(code){ const m=code.match(/^(LU|LI|ST|SP|HT|SI|BL|KI|PC|SJ|GB|LR|GV|CV)\d+$/); return m?m[1]:"EX"; }
const POINTS=[];
for(const r of [...PTS1,...PTS2,...PTS3]){ const ch=chOf(r[0]);
  POINTS.push({code:r[0],py:r[1],cn:r[2],en:r[3],loc:r[4],needle:r[5],cats:r[6].split(" ").filter(Boolean),act:r[7],ind:r[8],flags:r[9]||"",ch,tung:false,label:ch==="EX"?r[1]:r[0]}); }
for(const r of TUNG){ POINTS.push({code:r[0],py:r[1],cn:r[2],en:r[3],loc:r[4],needle:r[5],cats:[],act:r[7],ind:r[8],flags:r[9]||"",ch:"T"+r[6],zone:r[6],near:r[10]||"",tung:true,label:r[0].startsWith("DD.")?r[1]:r[0]}); }
const PT = Object.fromEntries(POINTS.map(p=>[p.code,p]));
const ZONES = Object.fromEntries(TUNG_ZONES);
const norm = s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9.\u4e00-\u9fff]/g,"");
const ALIAS = {REN:"CV",DU:"GV",TE:"SJ",TB:"SJ",TW:"SJ",LIV:"LR",UB:"BL",H:"HT",HE:"HT",P:"PC",K:"KI",KID:"KI",SPL:"SP",LV:"LR",G:"GB",S:"ST"};
function findPoint(raw){
  if(!raw) return null; let s=String(raw).trim();
  if(PT[s]) return s;
  const up=s.toUpperCase().replace(/[\s\-_]/g,"");
  const m=up.match(/^([A-Z]+)(\d+)$/); if(m){ const pre=ALIAS[m[1]]||m[1]; const c=pre+parseInt(m[2],10); if(PT[c]) return c; }
  const t=up.match(/^(\d{2,4})\.?(\d{1,2})$/); if(t){ const c=t[1]+"."+t[2].padStart(2,"0"); if(PT[c]) return c; }
  const n=norm(s); const hit=POINTS.find(p=>norm(p.py)===n||norm(p.code)===n||p.cn===s); return hit?hit.code:null;
}
const COMBOS_BY_PT = {}; COMBOS.forEach((c,i)=>c.points.forEach(p=>(COMBOS_BY_PT[p]=COMBOS_BY_PT[p]||[]).push(i)));

function catPills(p){
  const out=[];
  for(const c of p.cats){
    if(SHU.includes(c)) out.push(`<span class="pill cat">${SHU_LABEL[c]}</span><span class="pill el">${(CH[p.ch].yin?EL_YIN:EL_YANG)[c]}</span>`);
    else if(c==="yuan") out.push(`<span class="pill cat">Yuan-source</span>`);
    else if(c==="luo") out.push(`<span class="pill cat">Luo</span>`);
    else if(c==="great-luo") out.push(`<span class="pill cat">Great luo of the spleen</span>`);
    else if(c==="xi") out.push(`<span class="pill cat">Xi-cleft</span>`);
    else if(c.startsWith("xi-")) out.push(`<span class="pill cat">Xi-cleft of ${VESSEL[c.slice(3)]}</span>`);
    else if(c.startsWith("mu-")) out.push(`<span class="pill cat">Front-mu of ${CH[c.slice(3)].name}</span>`);
    else if(c.startsWith("shu-")) out.push(`<span class="pill cat">Back-shu of ${CH[c.slice(4)].name}</span>`);
    else if(c.startsWith("hui-")) out.push(`<span class="pill cat">Hui of ${HUI[c.slice(4)]}</span>`);
    else if(c.startsWith("conf-")) out.push(`<span class="pill cat">Confluent of ${VESSEL[c.slice(5)]}</span>`);
    else if(c.startsWith("lhe-")) out.push(`<span class="pill cat">Lower he-sea of ${CH[c.slice(4)].name}</span>`);
    else if(c.startsWith("sea-")) out.push(`<span class="pill plain">${SEA[c.slice(4)]}</span>`);
    else if(c==="sky") out.push(`<span class="pill plain">Window of Heaven</span>`);
    else if(c==="ghost") out.push(`<span class="pill plain">Ghost point</span>`);
    else if(c==="star") out.push(`<span class="pill plain">Heavenly star</span>`);
    else if(c==="command") out.push(`<span class="pill plain">Command point</span>`);
  }
  return out.join("");
}
function flagPills(p){
  let s="";
  if(p.flags.includes("P")) s+=`<span class="pill bad">Pregnancy: avoid</span>`; else if(p.flags.includes("p")) s+=`<span class="pill warn">Pregnancy: caution</span>`;
  if(p.flags.includes("D")) s+=`<span class="pill warn">Needle with care</span>`;
  if(p.flags.includes("N")) s+=`<span class="pill bad">Do not needle</span>`;
  if(p.flags.includes("B")) s+=`<span class="pill plain">Bleeding</span>`;
  return s;
}
function catMatch(p,f){
  if(!f) return true; const c=p.cats;
  if(f==="shu") return c.some(x=>SHU.includes(x));
  if(f==="mu") return c.some(x=>x.startsWith("mu-")); if(f==="bshu") return c.some(x=>x.startsWith("shu-"));
  if(f==="hui") return c.some(x=>x.startsWith("hui-")); if(f==="conf") return c.some(x=>x.startsWith("conf-"));
  if(f==="lhe") return c.some(x=>x.startsWith("lhe-")); if(f==="seas") return c.some(x=>x.startsWith("sea-"));
  if(f==="xi") return c.some(x=>x==="xi"||x.startsWith("xi-")); if(f==="luo") return c.some(x=>x==="luo"||x==="great-luo");
  return c.includes(f);
}

// ───────────────────────── Helpers
const $=(s,el=document)=>el.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}}, safeSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
let toastT; function toast(m){ let t=$(".toast"); if(!t){t=document.createElement("div");t.className="toast";t.setAttribute("role","status");document.body.append(t);} t.textContent=m; t.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>t.hidden=true,2600); }
async function copyText(text,label){ try{ await navigator.clipboard.writeText(text); toast(label+" copied"); }catch(e){ const ta=$("#copy-fallback"); ta.hidden=false; ta.value=text; ta.focus(); ta.select(); toast("Select all and copy from the box below the plan"); } }
function hl(text,terms){ let s=esc(text); for(const t of terms){ if(t.length<3) continue; s=s.replace(new RegExp("("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig"),"<mark>$1</mark>"); } return s; }

// ───────────────────────── State
function newPlan(){ return {name:"",caseRef:"",notes:"",items:[],docId:null,status:"draft",createdAt:null}; }
const S={view:"points",ch:"LU",q:"",cat:"",safePreg:false,open:null,plan:newPlan(),example:false,saved:[],dbState:"loading",confirmDel:null,suggest:null,caseText:""};
function loadState(){
  const raw=safeGet("pf-state");
  if(raw){ try{ const d=JSON.parse(raw); if(d.plan){S.plan=Object.assign(newPlan(),d.plan); S.plan.items=S.plan.items.filter(i=>PT[i.code]);} S.ch=d.ch||"LU"; S.caseText=d.caseText||""; return; }catch(e){} }
  if(EHR) return; // inside the EHR, start empty so an example is never saved to a patient
  S.example=true;
  S.plan=Object.assign(newPlan(),{name:"Example: insomnia with liver constraint",items:[
    {code:"LI4",side:"B",tech:"even"},{code:"LR3",side:"B",tech:"reduce"},{code:"HT7",side:"B",tech:"even"},{code:"SP6",side:"B",tech:"tonify"},{code:"Yintang",side:"M",tech:"even"},{code:"Anmian",side:"B",tech:"even"}]});
}
let persistT; function persist(){ clearTimeout(persistT); persistT=setTimeout(()=>safeSet("pf-state",JSON.stringify({plan:S.plan,ch:S.ch,caseText:S.caseText})),250); }

// ───────────────────────── Plan ops
const midline = p=>p.ch==="GV"||p.ch==="CV"||["Yintang","Haiquan","Shiqizhui","Yaoqi","Jinjin_Yuye"].includes(p.code)||/^(1010\.0[1-8]|1010\.12)$/.test(p.code)||p.code.startsWith("DD.");
function addPoint(code, side, tech){
  const p=PT[code]; if(!p) return false;
  if(S.example){ S.plan=newPlan(); S.example=false; }
  if(S.plan.items.some(i=>i.code===code)) return false;
  S.plan.items.push({code, side: side||(midline(p)?"M":"B"), tech: tech||(p.flags.includes("N")?"moxa":p.flags.includes("B")&&p.needle.toLowerCase().startsWith("prick")?"bleed":"even")});
  return true;
}
function afterPlan(){ persist(); renderPlan(); updateCount(); if(S.view==="points") renderList(); }
function updateCount(){ document.querySelectorAll(".plan-n").forEach(e=>e.textContent=S.plan.items.length); }
function needleCount(){ return S.plan.items.reduce((a,i)=>a+(NEEDLE_TECH.has(i.tech)?(i.side==="B"?2:1):0),0); }
function planChecks(){
  const ids=new Set(S.plan.items.map(i=>i.code)), out=[];
  const P_=S.plan.items.filter(i=>PT[i.code].flags.includes("P")).map(i=>PT[i.code].label);
  const p_=S.plan.items.filter(i=>PT[i.code].flags.includes("p")).map(i=>PT[i.code].label);
  if(P_.length) out.push({sev:"warn",html:`<b>Contraindicated in pregnancy:</b> ${esc(P_.join(", "))}`});
  if(p_.length) out.push({sev:"info",html:`Use caution in pregnancy: ${esc(p_.join(", "))}`});
  for(const i of S.plan.items){ const p=PT[i.code];
    if(p.flags.includes("N") && NEEDLE_TECH.has(i.tech)) out.push({sev:"bad",html:`<b>${esc(p.label)} is not needled.</b> ${esc(p.needle)}`});
    else if(p.flags.includes("D") && NEEDLE_TECH.has(i.tech)) out.push({sev:"warn",html:`<b>${esc(p.label)}:</b> ${esc(p.needle)}`});
  }
  if(ids.has("11.24")&&ids.has("11.06")) out.push({sev:"info",html:`Fu Ke and Huan Chao: put them on opposite hands and alternate sides each visit.`});
  const tg=["88.01","88.02","88.03"].filter(c=>ids.has(c)); if(tg.length>2) out.push({sev:"warn",html:`Tong Guan, Tong Shan and Tong Tian: Tung advised no more than two of the three per leg.`});
  if(ids.has("11.17")) out.push({sev:"info",html:`Mu Huo: retain only about 5 minutes, shortening on later visits.`});
  for(const i of S.plan.items){ const p=PT[i.code]; if(p.tung && /contralateral/i.test(p.act) && i.side==="B") out.push({sev:"info",html:`${esc(p.py)} (${esc(p.code)}) is usually needled contralateral to the problem rather than bilaterally.`}); }
  for(const i of S.plan.items){ const p=PT[i.code]; if(p.near && ids.has(p.near)) out.push({sev:"info",html:`${esc(p.py)} (${esc(p.code)}) sits at or beside ${esc(PT[p.near].label)}, which is also in the plan.`}); }
  const order={bad:0,warn:1,info:2}; return out.sort((a,b)=>order[a.sev]-order[b.sev]);
}

// ───────────────────────── Views
const WIDE=window.matchMedia("(min-width:1080px)");
function setView(v){
  if(!["points","special","combos","saved","plan"].includes(v)) v="points";
  if(v==="plan" && WIDE.matches){ v=S.prevView||"points"; setTimeout(()=>$("#plan-name")?.focus(),0); }
  if(v!=="plan") S.prevView=v;
  if(S.view!==v) window.scrollTo(0,0);
  S.view=v; document.body.className="view-"+(v==="plan"?"rx":v);
  document.querySelectorAll("nav.tabs a").forEach(a=>a.setAttribute("aria-current",a.dataset.view===v?"page":"false"));
  for(const id of ["points","special","combos","saved"]) $("#v-"+id).hidden=(id!==v);
  if(v==="points") renderPoints(); if(v==="special") renderSpecial(); if(v==="combos") renderCombos(); if(v==="saved") renderSaved(); if(v==="plan") renderPlan();
}
function gotoPoint(code){
  const p=PT[code]; if(!p) return; S.ch=p.ch; S.q=""; S.cat=""; S.open=code;
  if(location.hash!=="#points") location.hash="points"; else renderPoints();
  setTimeout(()=>{ const el=document.getElementById("pt-"+cssId(code)); el?.scrollIntoView({block:"center"}); },30);
}
const cssId = c=>c.replace(/[^A-Za-z0-9_-]/g,"_");

// Points
function renderPoints(){
  $("#p-q").value=S.q; $("#p-cat").value=S.cat; $("#p-safe").checked=S.safePreg;
  $("#ch-main").innerHTML = `<span class="lbl">Channels</span>`+["ALL",...CHS.filter(c=>c[0]!=="EX").map(c=>c[0]),"EX"].map(c=>`<button class="chip code" aria-pressed="${S.ch===c}" data-act="ch" data-id="${c}" title="${c==="ALL"?"All points":esc(CH[c].name)}">${c==="ALL"?"All":c==="EX"?"Extra":c}</button>`).join("");
  $("#ch-tung").innerHTML = `<span class="lbl">Tung</span>`+TUNG_ZONES.map(([z,n])=>`<button class="chip code" aria-pressed="${S.ch==="T"+z}" data-act="ch" data-id="T${z}" title="${esc(n)}">${z==="DD"?"Back":z}</button>`).join("")+`<button class="chip code" aria-pressed="${S.ch==="TALL"}" data-act="ch" data-id="TALL">All Tung</button>`;
  renderList();
}
function pointMatches(){
  const terms=S.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let list=POINTS.filter(p=> S.ch==="ALL" || p.ch===S.ch || (S.ch==="TALL"&&p.tung));
  if(S.q.trim()){ // search spans everything, the channel chips stop limiting
    list=POINTS; const direct=findPoint(S.q.trim());
    const scored=list.map(p=>{ let sc=0; if(p.code===direct) sc+=100;
      const n=norm(p.py), en=p.en.toLowerCase(), body=(p.ind+" "+p.act+" "+p.loc).toLowerCase();
      for(const t of terms){ const tn=norm(t); if(!tn) continue;
        if(n.startsWith(tn)) sc+=30; else if(n.includes(tn)) sc+=15;
        if(p.cn.includes(t)) sc+=30; if(en.includes(t)) sc+=12;
        if(p.ind.toLowerCase().includes(t)) sc+=8; else if(body.includes(t)) sc+=3; else if(!(n.includes(tn)||en.includes(t)||p.cn.includes(t)||norm(p.code).includes(tn))) sc-=1000; }
      return {p,sc}; }).filter(x=>x.sc>0).sort((a,b)=>b.sc-a.sc);
    list=scored.map(x=>x.p);
  }
  if(S.cat) list=list.filter(p=>catMatch(p,S.cat));
  if(S.safePreg) list=list.filter(p=>!/[Pp]/.test(p.flags));
  return {list,terms};
}
function renderList(){
  const {list,terms}=pointMatches();
  const head=$("#ch-head");
  if(S.q.trim()) head.innerHTML=`<div><h3>Search results</h3></div><span class="muted">${list.length} point${list.length===1?"":"s"} for “${esc(S.q.trim())}”</span>`;
  else if(S.ch==="ALL") head.innerHTML=`<div><h3>All points</h3></div><span class="muted">${list.length} points</span>`;
  else if(S.ch==="TALL") head.innerHTML=`<div><h3>Master Tung points</h3></div><span class="muted">${list.length} core points</span>`;
  else if(S.ch.startsWith("T")) head.innerHTML=`<div><h3>Tung zone ${esc(S.ch.slice(1)==="DD"?"":S.ch.slice(1))} <span class="muted" style="font-family:var(--f-body);font-size:1rem">${esc(ZONES[S.ch.slice(1)])}</span></h3></div><span class="muted">${list.length} points</span>`;
  else { const c=CH[S.ch]; head.innerHTML=`<div><h3>${esc(c.full)}<span class="han">${esc(c.cn)}</span></h3></div><span class="muted">${list.length} points</span>`; }
  const tungNote = (S.ch.startsWith("T")||list.some(p=>p.tung)) ? "" : "";
  $("#p-list").innerHTML = list.slice(0,200).map(p=>{
    const open=S.open===p.code, inPlan=S.plan.items.some(i=>i.code===p.code);
    const snip = S.q.trim() && terms.some(t=>p.ind.toLowerCase().includes(t)) ? `<span class="snip">${hl(p.ind,terms)}</span>` : "";
    return `<article class="pt" id="pt-${cssId(p.code)}">
      <div class="pt-row" role="button" tabindex="0" aria-expanded="${open}" data-act="open" data-id="${esc(p.code)}">
        <span class="pt-code${p.tung?" tung":""}">${esc(p.ch==="EX"?"Extra":p.code.startsWith("DD.")?"Back":p.code)}</span>
        <span class="pt-name"><span class="py">${esc(p.py)}</span><span class="han">${esc(p.cn)}</span><span class="en">${esc(p.en)}</span>
          <span class="pills">${catPills(p)}${flagPills(p)}${p.tung?`<span class="pill plain">Tung ${esc(ZONES[p.zone])}</span>`:""}</span>${snip}</span>
        ${inPlan?`<button class="btn sm" data-act="plan-remove" data-id="${esc(p.code)}" aria-label="Remove ${esc(p.py)} from the plan">In plan ✓</button>`:`<button class="btn sm primary" data-act="plan-add" data-id="${esc(p.code)}">Add</button>`}
      </div>
      ${open?detailHtml(p):""}
    </article>`; }).join("") || `<div class="empty">No points match. Try a code (LI4, 22.05), a pinyin name, or a symptom.</div>`;
}
function detailHtml(p){
  const combos=(COMBOS_BY_PT[p.code]||[]).map(i=>COMBOS[i]);
  return `<div class="pt-body">
    <dl><div><dt>Location</dt><dd>${esc(p.loc)}</dd></div>
        <div><dt>Needling</dt><dd>${esc(p.needle)}</dd></div>
        ${p.near?`<div><dt>At or near</dt><dd><button class="linkish" data-act="goto" data-id="${esc(p.near)}">${esc(PT[p.near].label)} ${esc(PT[p.near].py)}</button></dd></div>`:""}</dl>
    <dl>${p.act?`<div><dt>${p.tung?"Notes":"Actions"}</dt><dd>${esc(p.act)}</dd></div>`:""}
        ${p.ind?`<div><dt>Indications</dt><dd>${esc(p.ind)}</dd></div>`:""}
        ${combos.length?`<div><dt>Combinations</dt><dd>${combos.map(c=>`<button class="linkish" data-act="goto-combo" data-id="${esc(c.name)}">${esc(c.name)}</button>`).join(", ")}</dd></div>`:""}</dl>
  </div>`;
}

// Special points
function renderSpecial(){
  const chs=CHS.slice(0,12);
  const by=(ch,pred)=>POINTS.filter(p=>p.ch===ch&&pred(p));
  const cell=(arr,elFn)=>arr.map(p=>`<button class="linkish" data-act="goto" data-id="${p.code}">${p.code}</button>${elFn?`<span class="el">${elFn(p)}</span>`:""}`).join(" ");
  const shuCols=SHU.map(s=>`<th>${SHU_LABEL[s]}</th>`).join("");
  $("#sp-table").innerHTML = `<table class="grid"><thead><tr><th>Channel</th>${shuCols}<th>Yuan</th><th>Luo</th><th>Xi-cleft</th><th>Front-mu</th><th>Back-shu</th><th>Lower he</th></tr></thead><tbody>
   ${chs.map(([c])=>{ const ch=CH[c]; const els=ch.yin?EL_YIN:EL_YANG;
     return `<tr><td>${esc(ch.name)} <span class="muted mono">${c}</span></td>
       ${SHU.map(s=>`<td>${cell(by(c,p=>p.cats.includes(s)),()=>els[s])}</td>`).join("")}
       <td>${cell(by(c,p=>p.cats.includes("yuan")))}</td><td>${cell(by(c,p=>p.cats.includes("luo")))}</td><td>${cell(by(c,p=>p.cats.includes("xi")))}</td>
       <td>${cell(POINTS.filter(p=>p.cats.includes("mu-"+c)))}</td><td>${cell(POINTS.filter(p=>p.cats.includes("shu-"+c)))}</td><td>${cell(POINTS.filter(p=>p.cats.includes("lhe-"+c)))}</td></tr>`; }).join("")}
   </tbody></table>`;
  const listSec=(title,items)=>`<section class="card"><h3>${esc(title)}</h3><div class="kv">${items.map(([k,codes])=>`<span>${esc(k)}</span><span>${codes.map(c=>`<button class="pchip" data-act="goto" data-id="${c}"><b>${esc(PT[c].label)}</b>${esc(PT[c].py)}</button>`).join(" ")}</span>`).join("")}</div></section>`;
  const find=pred=>POINTS.filter(pred).map(p=>p.code);
  $("#sp-lists").innerHTML = [
    listSec("Hui-meeting points",Object.entries(HUI).map(([k,v])=>[v[0].toUpperCase()+v.slice(1),find(p=>p.cats.includes("hui-"+k))])),
    listSec("Confluent points of the extraordinary vessels",Object.entries(VESSEL).map(([k,v])=>[v,find(p=>p.cats.includes("conf-"+k))])),
    listSec("Xi-cleft points of the extraordinary vessels",["YinQiao","YangQiao","YinWei","YangWei"].map(k=>[VESSEL[k],find(p=>p.cats.includes("xi-"+k))])),
    listSec("Four seas",Object.entries(SEA).map(([k,v])=>[v,find(p=>p.cats.includes("sea-"+k))])),
    listSec("Command points",[["Abdomen","ST36"],["Back","BL40"],["Head and nape","LU7"],["Face and mouth","LI4"]].map(([k,c])=>[k,[c]])),
    listSec("Window of Heaven points",[["Points",find(p=>p.cats.includes("sky"))]]),
    listSec("Sun Si-miao ghost points",[["Points",find(p=>p.cats.includes("ghost"))]]),
    listSec("Ma Dan-yang heavenly star points",[["Points",find(p=>p.cats.includes("star"))]]),
    listSec("Luo points of the Ren, Du and great luo",[["Points",find(p=>(p.ch==="CV"||p.ch==="GV")&&p.cats.includes("luo")).concat(find(p=>p.cats.includes("great-luo")))]])
  ].join("");
}

// Combinations
function renderCombos(){
  const card=(c)=>`<article class="card" id="combo-${cssId(c.name)}"><div class="eyebrow">${c.kind==="tung"?"Master Tung":"Classical"}</div><h3>${esc(c.name)}</h3>
    <div class="pchips">${c.points.map(p=>`<button class="pchip" data-act="goto" data-id="${esc(p)}"><b>${esc(PT[p].label)}</b>${esc(PT[p].py)}</button>`).join("")}</div>
    <div class="use">${esc(c.use)}</div>${c.note?`<div class="note">${esc(c.note)}</div>`:""}
    <div><button class="btn sm primary" data-act="combo-add" data-id="${esc(c.name)}">Add to plan</button></div></article>`;
  $("#combo-classical").innerHTML=COMBOS.filter(c=>c.kind==="classical").map(card).join("");
  $("#combo-tung").innerHTML=COMBOS.filter(c=>c.kind==="tung").map(card).join("");
}

// Plan slip
function renderPlan(){
  const pl=S.plan, nm=$("#plan-name"); if(document.activeElement!==nm) nm.value=pl.name;
  const setv=(id,v)=>{const el=$(id); if(el && document.activeElement!==el) el.value=v;};
  setv("#plan-case",pl.caseRef); setv("#plan-notes",pl.notes); setv("#case-text",S.caseText); $("#plan-status").value=pl.status;
  $("#plan-ex").hidden=!S.example;
  const body=$("#plan-body");
  if(!pl.items.length){ body.innerHTML=`<div class="rx-empty">No points yet. Add points from the browser, a combination, or the box below.</div>${adderHtml()}`; renderPlanActions(); return; }
  const checks=planChecks();
  body.innerHTML = `<div class="rx-sec">
    <div class="plan-count"><span><b>${pl.items.length}</b> points</span><span><b>${needleCount()}</b> needles</span></div>
    <table class="lines"><tbody>${pl.items.map((it,idx)=>{ const p=PT[it.code];
      return `<tr><td class="h"><span class="hp"><span class="code${p.tung?" tung":""}">${esc(p.ch==="EX"?"Ex":p.code.startsWith("DD.")?"Back":p.code)}</span>${esc(p.py)}</span><span class="hc han">${esc(p.cn)}</span></td>
        <td class="sel"><select id="side-${idx}" data-act="side" data-i="${idx}" aria-label="Side for ${esc(p.py)}">${Object.entries(SIDES).map(([k,v])=>`<option value="${k}"${it.side===k?" selected":""}>${v}</option>`).join("")}</select></td>
        <td class="sel"><select id="tech-${idx}" data-act="tech" data-i="${idx}" aria-label="Technique for ${esc(p.py)}">${Object.entries(TECH).map(([k,v])=>`<option value="${k}"${it.tech===k?" selected":""}>${v}</option>`).join("")}</select></td>
        <td class="del"><button class="x-btn" data-act="plan-remove" data-id="${esc(p.code)}" aria-label="Remove ${esc(p.py)}">×</button></td></tr>`; }).join("")}</tbody></table>
    ${adderHtml()}</div>
    <div class="rx-sec"><h4>Checks</h4>${checks.length?`<ul class="warns">${checks.map(c=>`<li class="${c.sev}">${c.html}</li>`).join("")}</ul>`:`<div class="muted" style="font-size:.84rem">No pregnancy cautions or needling hazards in this plan.</div>`}</div>
    ${suggestHtml()}`;
  renderPlanActions();
}
function adderHtml(){ return `<div class="adder"><input type="search" id="plan-add" placeholder="Add a point: LI4, Hegu, 22.05, Ling Gu" autocomplete="off" aria-label="Add a point"><div class="suggest" id="plan-suggest" hidden></div></div>`; }
function suggestHtml(){
  const r=S.suggest; if(!r) return "";
  if(r.state==="busy") return `<div class="rx-sec"><h4>Claude's suggestion</h4><div class="review muted">Thinking… <button class="btn ghost sm" data-act="sug-stop">Stop</button></div></div>`;
  if(r.state==="error") return `<div class="rx-sec"><h4>Claude's suggestion</h4><div class="review muted">${esc(r.msg)}</div></div>`;
  const d=r.data;
  return `<div class="rx-sec"><h4>Claude's suggestion <button class="btn ghost sm" data-act="sug-close">Dismiss</button></h4><div class="review">
    <div>${esc(d.rationale||"")}</div>
    ${(d.points||[]).map((s,i)=>{ const code=findPoint(s.code)||findPoint(s.name); const have=code&&S.plan.items.some(x=>x.code===code);
      return `<div class="sug"><span><b>${esc(code?PT[code].label+" "+PT[code].py:(s.code||s.name))}</b>${s.side?` · ${esc(s.side)}`:""}${s.technique?` · ${esc(s.technique)}`:""}. ${esc(s.reason||"")}${!code?` <span class="muted">(not in this point list)</span>`:""}</span>${code&&!have?`<button class="btn sm" data-act="sug-apply" data-i="${i}">Add</button>`:have?`<span class="muted" style="font-size:.8rem">In plan</span>`:""}</div>`; }).join("")}
    ${(d.points||[]).some(s=>{const c=findPoint(s.code)||findPoint(s.name); return c&&!S.plan.items.some(x=>x.code===c);})?`<button class="btn sm" data-act="sug-all">Add all</button>`:""}
    <div class="muted" style="font-size:.76rem">Suggestions from Claude. Check them against your own judgement before treating.</div></div></div>`;
}
function renderPlanActions(){
  const st=$("#plan-save-state"), pl=S.plan;
  st.textContent = db?.local ? (pl.docId?"Saved in this browser.":"Not saved yet. Saves stay in this browser.") : S.dbState==="none" ? "Saving to your library works on the published page. This plan stays in this browser."
    : pl.docId ? "Saved to your library." : "Not saved yet.";
  $("#btn-plan-save").disabled = S.dbState==="none" || !pl.items.length;
  $("#btn-plan-save").textContent = pl.docId ? "Update saved" : "Save plan";
}

// Saved
function renderSaved(){
  const el=$("#saved-list");
  if(S.dbState==="none"){ el.innerHTML=`<div class="empty">Saved plans live with the published page and need you to be signed in. Your current plan is kept in this browser.</div>`; return; }
  if(S.dbState==="loading"){ el.innerHTML=`<div class="empty">Loading saved plans…</div>`; return; }
  if(S.dbState==="error"){ el.innerHTML=`<div class="empty">Saved plans could not be loaded. Reload the page to try again.</div>`; return; }
  const localNote = db?.local ? `<div class="banner info"><span>Plans saved here stay in this browser only. Clearing site data removes them.</span></div>` : "";
  if(!S.saved.length){ el.innerHTML=localNote+`<div class="empty">No saved plans yet. Build one in the plan and choose <b>Save plan</b>.</div>`; return; }
  el.innerHTML=localNote+S.saved.map(s=>`<article class="saved">
    <div><div class="nm">${esc(s.name||"Untitled plan")}</div><div class="meta">${s.caseRef?esc(s.caseRef)+" · ":""}${(s.points||[]).length} points · ${s.needles||0} needles · ${s.updatedAt?new Date(s.updatedAt).toLocaleDateString():""}</div></div>
    <div class="acts"><button class="btn sm primary" data-act="open-saved" data-id="${s.id}">Open</button><button class="btn sm" data-act="dup-saved" data-id="${s.id}">Duplicate</button>
      ${S.confirmDel===s.id?`<button class="btn sm danger" data-act="del-saved" data-id="${s.id}">Confirm delete</button><button class="btn ghost sm" data-act="del-cancel">Keep</button>`:`<button class="btn ghost sm danger" data-act="del-ask" data-id="${s.id}">Delete</button>`}</div>
    <div class="herbs-line">${(s.points||[]).map(p=>`${esc(p.label||p.code)} ${esc(SIDES[p.side]||"")}${p.technique&&p.technique!=="even"?" ("+esc(TECH[p.technique]||p.technique)+")":""}`).join(" · ")}</div></article>`).join("");
}

// ───────────────────────── Export and storage
function planRecord(){
  const pl=S.plan;
  return {name:pl.name||"Untitled plan", caseRef:pl.caseRef||"", status:pl.status, notes:pl.notes||"", needles:needleCount(),
    points:pl.items.map(i=>({code:i.code,label:PT[i.code].label,pinyin:PT[i.code].py,hanzi:PT[i.code].cn,side:i.side,technique:i.tech,tung:PT[i.code].tung}))};
}
function planText(){
  const r=planRecord(), lines=[`Treatment: ${r.name}`]; if(r.caseRef) lines.push(`Case: ${r.caseRef}`); lines.push("");
  r.points.forEach(p=>lines.push(`${p.label}${p.label!==p.pinyin?" "+p.pinyin:""} ${p.hanzi}: ${SIDES[p.side]}, ${TECH[p.technique]}`));
  lines.push(""); lines.push(`${r.points.length} points, ${r.needles} needles`);
  const ch=planChecks().filter(c=>c.sev!=="info"); if(ch.length){ lines.push(""); lines.push("Cautions:"); ch.forEach(c=>lines.push("- "+c.html.replace(/<[^>]+>/g,""))); }
  if(r.notes){ lines.push(""); lines.push("Notes: "+r.notes); }
  return lines.join("\n");
}
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
let db=null, sample=null, sugCtl=null;
(async()=>{ try{ db=await window.claude?.use?.("db") ?? null; }catch(e){ db=null; }
  if(!db) db=localDb("pf-library");
  db.collection("plans").orderBy("updatedAt","desc").onSnapshot(snap=>{ S.saved=snap.docs.map(d=>({id:d.id,...d.data()})); S.dbState="ready"; $("#saved-count").textContent=S.saved.length||""; if(S.view==="saved") renderSaved(); renderPlanActions(); }, ()=>{ S.dbState="error"; renderSaved(); });
})();
(async()=>{ try{ sample=await window.claude?.use?.("sample") ?? null; }catch(e){ sample=null; } document.querySelectorAll(".needs-claude").forEach(el=>el.hidden=!sample); })();
const sampleErr=e=>({not_granted:"Claude isn't allowed on this page. You can allow it from the page's permissions.",rate_limited:"Claude is busy or you've hit a usage limit. Try again in a little while.",sampling_disabled:"Claude isn't available on this account.",invalid_json:"Claude's answer couldn't be read. Try again.",refused:"Claude declined this request. Rephrase the case and try again.",session_expired:"Sign in again to use Claude."}[e?.code]||"Something went wrong reaching Claude. Try again.");
async function savePlan(){
  if(!db) return; const rec=planRecord(), now=new Date().toISOString(); rec.updatedAt=now; rec.createdAt=S.plan.createdAt||now;
  const b=$("#btn-plan-save"); b.disabled=true;
  try{ if(S.plan.docId) await db.collection("plans").doc(S.plan.docId).set(rec); else { const ref=db.collection("plans").doc(); await ref.set(rec); S.plan.docId=ref.id; } S.plan.createdAt=rec.createdAt; clearTimeout(persistT); safeSet("pf-state",JSON.stringify({plan:S.plan,ch:S.ch,caseText:S.caseText})); toast(db.local?"Saved in this browser":"Saved to your library"); }
  catch(e){ toast(e?.code==="invalid_argument"?"You can view this library but not change it.":e?.code==="quota_exceeded"?"The library is full. Delete old plans to save new ones.":"Saving failed. Try again."); }
  b.disabled=false; renderPlanActions();
}
function openSaved(id,dup){
  const s=S.saved.find(x=>x.id===id); if(!s) return;
  S.plan=Object.assign(newPlan(),{name:dup?s.name+" (copy)":s.name,caseRef:s.caseRef||"",notes:s.notes||"",status:dup?"draft":(s.status||"draft"),docId:dup?null:s.id,createdAt:dup?null:s.createdAt,
    items:(s.points||[]).filter(p=>PT[p.code]).map(p=>({code:p.code,side:p.side||"B",tech:p.technique||"even"}))});
  S.example=false; S.suggest=null; afterPlan(); toast(dup?"Copy opened in the plan":"Opened in the plan");
  if(!WIDE.matches) location.hash="plan";
}
async function suggestPoints(){
  if(!sample) return; const text=S.caseText.trim(); if(!text){ toast("Describe the case first"); return; }
  sugCtl?.abort(); sugCtl=new AbortController(); S.suggest={state:"busy"}; renderPlan();
  const extras=POINTS.filter(p=>p.ch==="EX").map(p=>p.py).join(", ");
  const tung=POINTS.filter(p=>p.tung).map(p=>`${p.code} ${p.py}`).join("; ");
  const prompt=`You are assisting a licensed acupuncturist (L.Ac.) in choosing an acupuncture point prescription. They practice classical channel acupuncture and Master Tung acupuncture.
Case description: """${text.slice(0,4000)}"""
Points already in the plan: ${S.plan.items.map(i=>PT[i.code].label+" "+SIDES[i.side]+" "+TECH[i.tech]).join("; ")||"none"}

Suggest a focused prescription of 6 to 12 points that complements what is already chosen. Use WHO codes for channel points (LI4, GV20, CV12, SJ5, LR3), these names for extra points: ${extras}; and these Tung codes for Master Tung points: ${tung}.
Note pregnancy contraindications or needling hazards where relevant.
Reply with only JSON: {"rationale":"2-4 sentences on the treatment principle","points":[{"code":"LI4","side":"bilateral|left|right|contralateral|midline","technique":"even|tonify|reduce|bleed|moxa","reason":"short"}]}`;
  try{ const d=await sample.json(prompt,{signal:sugCtl.signal,modelTier:"complex"}); S.suggest={state:"done",data:d&&typeof d==="object"?d:{rationale:String(d)}}; }
  catch(e){ S.suggest=e?.code==="cancelled"?null:{state:"error",msg:sampleErr(e)}; }
  renderPlan();
}
function applySug(s){
  const code=findPoint(s.code)||findPoint(s.name); if(!code) return false;
  const sd=String(s.side||"").toLowerCase(); const side=sd.startsWith("l")?"L":sd.startsWith("r")?"R":sd.startsWith("m")?"M":sd.startsWith("c")?"L":null;
  const tk=String(s.technique||"").toLowerCase(); const tech=TECH[tk]?tk:null;
  return addPoint(code, side, tech);
}

// ───────────────────────── Events
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-act]"); if(!b) return; if(b.tagName==="SELECT"||b.tagName==="INPUT") return;
  const act=b.dataset.act, id=b.dataset.id;
  switch(act){
    case "ch": S.ch=id; S.q=""; S.open=null; persist(); renderPoints(); break;
    case "open": if(e.target.closest("button")) break; S.open=S.open===id?null:id; renderList(); break;
    case "plan-add": e.stopPropagation(); if(addPoint(id)) toast(PT[id].label+" added"); afterPlan(); break;
    case "plan-remove": e.stopPropagation(); S.plan.items=S.plan.items.filter(i=>i.code!==id); afterPlan(); break;
    case "goto": gotoPoint(id); break;
    case "goto-combo": location.hash="combos"; setTimeout(()=>document.getElementById("combo-"+cssId(id))?.scrollIntoView({block:"center"}),50); break;
    case "combo-add": { const c=COMBOS.find(x=>x.name===id); let n=0; c.points.forEach(p=>{ if(addPoint(p)) n++; }); toast(n?`Added ${n} point${n===1?"":"s"} from ${c.name}`:"Already in the plan"); afterPlan(); break; }
    case "pick-point": addPoint(id); $("#plan-add").value=""; afterPlan(); setTimeout(()=>$("#plan-add")?.focus(),0); break;
    case "plan-copy": copyText(planText(),"Plan"); break;
    case "ehr-save": ehrSavePlan(); break;
    case "plan-save": savePlan(); break;
    case "plan-new": S.plan=newPlan(); S.example=false; S.suggest=null; afterPlan(); toast("New empty plan"); break;
    case "clear-example": S.plan=newPlan(); S.example=false; afterPlan(); break;
    case "suggest": suggestPoints(); break;
    case "sug-stop": sugCtl?.abort(); S.suggest=null; renderPlan(); break;
    case "sug-close": S.suggest=null; renderPlan(); break;
    case "sug-apply": { const s=S.suggest?.data?.points?.[+b.dataset.i]; if(s&&applySug(s)) toast("Added"); afterPlan(); break; }
    case "sug-all": { let n=0; (S.suggest?.data?.points||[]).forEach(s=>{ if(applySug(s)) n++; }); toast(`Added ${n} point${n===1?"":"s"}`); afterPlan(); break; }
    case "open-saved": openSaved(id,false); break; case "dup-saved": openSaved(id,true); break;
    case "del-ask": S.confirmDel=id; renderSaved(); break; case "del-cancel": S.confirmDel=null; renderSaved(); break;
    case "del-saved": (async()=>{ try{ await db.collection("plans").doc(id).delete(); if(S.plan.docId===id){S.plan.docId=null; persist();} toast("Deleted"); }catch(err){ toast("Delete failed. Try again."); } S.confirmDel=null; renderSaved(); renderPlanActions(); })(); break;
  }
});
document.addEventListener("keydown",e=>{
  if(e.target.classList?.contains("pt-row") && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); const id=e.target.dataset.id; S.open=S.open===id?null:id; renderList(); document.getElementById("pt-"+cssId(id))?.querySelector(".pt-row")?.focus(); }
  if(e.target.id==="plan-add"){ const btns=[...document.querySelectorAll("#plan-suggest button")];
    if(e.key==="ArrowDown"&&btns.length){e.preventDefault(); sugIdx=Math.min(sugIdx+1,btns.length-1); renderAdd(e.target.value);}
    if(e.key==="ArrowUp"&&btns.length){e.preventDefault(); sugIdx=Math.max(sugIdx-1,0); renderAdd(e.target.value);}
    if(e.key==="Enter"&&btns[sugIdx]){e.preventDefault(); btns[sugIdx].click();}
    if(e.key==="Escape") $("#plan-suggest").hidden=true; }
});
let sugIdx=0, qT;
document.addEventListener("input",e=>{
  const el=e.target;
  if(el.id==="p-q"){ S.q=el.value; S.open=null; clearTimeout(qT); qT=setTimeout(renderList,120); }
  if(el.id==="plan-name"){ S.plan.name=el.value; S.example=false; $("#plan-ex").hidden=true; persist(); }
  if(el.id==="plan-case"){ S.plan.caseRef=el.value; persist(); }
  if(el.id==="plan-notes"){ S.plan.notes=el.value; persist(); }
  if(el.id==="case-text"){ S.caseText=el.value; persist(); }
  if(el.id==="plan-add"){ sugIdx=0; renderAdd(el.value); }
});
document.addEventListener("change",e=>{
  const el=e.target;
  if(el.id==="p-cat"){ S.cat=el.value; renderList(); }
  if(el.id==="p-safe"){ S.safePreg=el.checked; renderList(); }
  if(el.id==="plan-status"){ S.plan.status=el.value; persist(); }
  if(el.dataset.act==="side"){ S.plan.items[+el.dataset.i].side=el.value; afterPlan(); }
  if(el.dataset.act==="tech"){ S.plan.items[+el.dataset.i].tech=el.value; afterPlan(); }
});
document.addEventListener("focusout",e=>{ if(e.target.id==="plan-add") setTimeout(()=>{ const b=$("#plan-suggest"); if(b&&!b.contains(document.activeElement)) b.hidden=true; },150); });
function renderAdd(v){
  const box=$("#plan-suggest"); if(!box) return; const q=v.trim(); if(!q){ box.hidden=true; return; }
  const direct=findPoint(q), n=norm(q);
  let list=POINTS.filter(p=>p.code===direct||norm(p.code).startsWith(n)||norm(p.py).includes(n)||p.cn.includes(q)||p.en.toLowerCase().includes(q.toLowerCase()));
  list.sort((a,b)=>(a.code===direct?-1:0)-(b.code===direct?-1:0)||(norm(a.code).startsWith(n)?0:1)-(norm(b.code).startsWith(n)?0:1)); list=list.slice(0,8);
  box.innerHTML=list.map((p,i)=>`<button class="${i===sugIdx?"on":""}" data-act="pick-point" data-id="${esc(p.code)}"><span><span class="mono">${esc(p.label)}</span> ${esc(p.py)} <span class="han muted">${esc(p.cn)}</span>${S.plan.items.some(x=>x.code===p.code)?" ✓":""}</span><small>${esc(p.tung?"Tung "+ZONES[p.zone]:CH[p.ch].name)}</small></button>`).join("")||`<div class="muted" style="padding:8px 10px;font-size:.86rem">No point matches “${esc(q)}”.</div>`;
  box.hidden=false;
}
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

const MODALITY = {even:"Acupuncture",tonify:"Acupuncture",reduce:"Acupuncture",electro:"Electroacupuncture",bleed:"Bloodletting",moxa:"Moxibustion",cup:"Cupping"};
function ehrPlan(){
  const r=planRecord();
  return {kind:"points", name:r.name, notes:r.notes, needles:r.needles,
    checks:planChecks().map(w=>({level:w.sev, text:w.html.replace(/<[^>]+>/g,"")})),
    points:S.plan.items.map(i=>({code:EHR_CODES[i.code]||PT[i.code].label, pinyin:PT[i.code].py, hanzi:PT[i.code].cn, side:SIDES[i.side], technique:TECH[i.tech], modality:MODALITY[i.tech]||"Acupuncture", tung:PT[i.code].tung}))};
}
function ehrSavePlan(){ if(!S.plan.items.length){ toast("Add points before saving to the chart"); return; } if(ehrPost(ehrPlan())) toast("Choose the patient and visit above, then confirm"); }

// ───────────────────────── Boot
$("#p-cat").innerHTML=CAT_FILTERS.map(([k,v])=>`<option value="${k}">${esc(v)}</option>`).join("");
$("#plan-status").innerHTML=Object.entries(STATUSES).map(([k,v])=>`<option value="${k}">${v}</option>`).join("");
$("#stat-line").textContent=`${POINTS.filter(p=>p.ch!=="EX"&&!p.tung).length} channel points · ${POINTS.filter(p=>p.ch==="EX").length} extra · ${POINTS.filter(p=>p.tung).length} Tung`;
if(EHR){ $("#btn-ehr").hidden=false; $("#btn-plan-save").classList.remove("primary"); }
loadState(); updateCount(); renderPlan(); setView(location.hash.slice(1)||"points");
