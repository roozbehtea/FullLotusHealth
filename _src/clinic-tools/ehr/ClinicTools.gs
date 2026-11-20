// ===== Clinic Tools: Formula Maker and Point Finder (added Nov 2026) =====
// Menu "Clinic Tools" opens either tool inside the sheet. "Save to chart" in the tool
// writes a draft formula (Formulas, FormulaItems, plus a check_formula request) or
// draft treatment rows. Nothing is set Active, Signed or sent.

var CT_SITE = 'https://www.fulllotushealth.com/clinic-tools/';
var CT_ORIGIN = 'https://www.fulllotushealth.com';

function addClinicToolsMenu_() {
  SpreadsheetApp.getUi().createMenu('Clinic Tools')
    .addItem('Formula Maker', 'openFormulaMaker')
    .addItem('Point Finder', 'openPointFinder')
    .addToUi();
}

function openFormulaMaker() { ctOpen_('formula-maker', 'Formula Maker'); }
function openPointFinder() { ctOpen_('point-finder', 'Point Finder'); }

function ctOpen_(tool, title) {
  var boot = {
    tool: tool,
    title: title,
    src: CT_SITE + tool + '/?ehr=1',
    origin: CT_ORIGIN,
    context: ctContext_()
  };
  var html = HtmlService.createHtmlOutput(ctDialogHtml_(boot)).setWidth(1280).setHeight(820);
  SpreadsheetApp.getUi().showModalDialog(html, title);
}

// The patient and visit of the row selected when the tool was opened, if any.
function ctContext_() {
  try {
    var sh = SpreadsheetApp.getActiveSheet();
    var name = sh.getName();
    var row = sh.getActiveRange().getRow();
    if (row < 2) return {};
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var vals = sh.getRange(row, 1, 1, head.length).getValues()[0];
    var get = function (h) { var i = head.indexOf(h); return i < 0 ? '' : String(vals[i] || ''); };
    if (name === 'Patients') return { patientId: get('PatientID') };
    if (['Visits', 'Formulas', 'Treatments'].indexOf(name) >= 0) {
      return { patientId: get('PatientID'), visitId: get('VisitID') };
    }
  } catch (e) {}
  return {};
}

function ctTable_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('The ' + name + ' tab is missing.');
  var values = sh.getDataRange().getValues();
  var head = values.shift();
  var idx = {};
  head.forEach(function (h, i) { idx[h] = i; });
  return { sheet: sh, head: head, idx: idx, rows: values };
}

function ctAppend_(name, record) {
  var t = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  var head = t.getRange(1, 1, 1, t.getLastColumn()).getValues()[0];
  var row = head.map(function (h) { return record.hasOwnProperty(h) ? record[h] : ''; });
  t.appendRow(row);
}

function ctId_(prefix) {
  return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
}

function ctDate_(d) {
  if (!(d instanceof Date)) return String(d || '');
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function ctText_(s, max) { return String(s == null ? '' : s).slice(0, max || 500); }

function ctNum_(n) {
  var v = Number(n);
  if (!isFinite(v) || v < 0 || v > 1000) throw new Error('A dose is not a valid number of grams.');
  return Math.round(v * 10) / 10;
}

// Called by the dialog: patients for the picker.
function ctPatients() {
  var t = ctTable_('Patients');
  var i = t.idx;
  return t.rows.filter(function (r) { return r[i.PatientID]; }).map(function (r) {
    var first = r[i.PreferredName] || r[i.FirstName] || '';
    return {
      id: String(r[i.PatientID]),
      name: [first, r[i.LastName] || ''].join(' ').trim() || String(r[i.PatientID]),
      status: String(r[i.Status] || ''),
      demo: String(r[i.IsDemo]).toUpperCase() === 'TRUE',
      last: ctDate_(r[i.LastVisitDate])
    };
  }).sort(function (a, b) {
    var aa = a.status === 'Active' ? 0 : 1, bb = b.status === 'Active' ? 0 : 1;
    return aa - bb || a.name.localeCompare(b.name);
  });
}

// Called by the dialog: one patient's visits, newest first.
function ctVisits(patientId) {
  var t = ctTable_('Visits');
  var i = t.idx;
  return t.rows.filter(function (r) { return String(r[i.PatientID]) === String(patientId); }).map(function (r) {
    return {
      id: String(r[i.VisitID]),
      date: ctDate_(r[i.VisitDate]),
      service: String(r[i.Service] || ''),
      status: String(r[i.Status] || '')
    };
  }).sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 25);
}

function ctCheckTarget_(patientId, visitId, needVisit) {
  var p = ctTable_('Patients');
  var found = p.rows.some(function (r) { return String(r[p.idx.PatientID]) === String(patientId); });
  if (!found) throw new Error('That patient was not found. Reopen the tool and choose again.');
  if (!visitId) {
    if (needVisit) throw new Error('Choose a visit, or New visit today.');
    return null;
  }
  var v = ctTable_('Visits');
  var row = v.rows.filter(function (r) { return String(r[v.idx.VisitID]) === String(visitId); })[0];
  if (!row || String(row[v.idx.PatientID]) !== String(patientId)) throw new Error('That visit does not belong to this patient.');
  return { status: String(row[v.idx.Status] || '') };
}

function ctNewVisit_(patientId, service) {
  var id = ctId_('V-');
  var now = new Date();
  ctAppend_('Visits', { VisitID: id, PatientID: patientId, VisitDate: now, Service: service, Status: 'Draft', CreatedAt: now });
  return id;
}

// Called by the dialog: save a formula from Formula Maker.
function ctSaveFormula(req) {
  var p = req && req.payload;
  if (!p || p.kind !== 'formula' || !Array.isArray(p.herbs) || !p.herbs.length || p.herbs.length > 60) {
    throw new Error('The formula could not be read. Try Save to chart again.');
  }
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var visitId = req.visitId === 'new' ? null : ctText_(req.visitId, 40);
    ctCheckTarget_(req.patientId, visitId, false);
    if (req.visitId === 'new') visitId = ctNewVisit_(req.patientId, 'Herbal consultation');
    var gran = p.form === 'granule';
    var ratio = gran ? ctNum_(p.granuleRatio || 5) : null;
    var herbs = p.herbs.map(function (h) {
      return {
        herb: ctText_(h.herb, 60),
        grams: ctNum_(h.grams),
        gran: gran ? ctNum_(h.granuleGrams != null ? h.granuleGrams : Number(h.grams) / ratio) : null,
        note: ctText_(h.note, 200)
      };
    });
    var bags = Math.max(1, Math.min(180, parseInt(p.bags, 10) || 7));
    var rawTotal = herbs.reduce(function (a, h) { return a + h.grams; }, 0);
    var granTotal = gran ? herbs.reduce(function (a, h) { return a + h.gran; }, 0) : 0;
    var id = ctId_('F-');
    var reason = [];
    if (p.baseFormula) reason.push('Built in Formula Maker from ' + ctText_(p.baseFormula, 80) + (p.modifications ? ': ' + ctText_(p.modifications, 600) : '') + '.');
    else reason.push('Built in Formula Maker.');
    if (p.notes) reason.push(ctText_(p.notes, 1500));
    ctAppend_('Formulas', {
      FormulaID: id,
      PatientID: req.patientId,
      VisitID: visitId || '',
      DatePrescribed: new Date(),
      Name: ctText_(p.name, 120) || ctText_(p.baseFormula, 80) || 'Custom formula',
      BaseFormula: ctText_(p.baseFormula, 80),
      Form: gran ? 'Granules' : 'Raw decoction',
      IngredientsText: herbs.map(function (h) {
        return gran ? h.herb + ' ' + h.gran + ' g (' + h.grams + ' g raw)' : h.herb + ' ' + h.grams + ' g';
      }).join(', '),
      TotalGrams: gran ? Math.round(granTotal * 10) / 10 : Math.round(rawTotal * 10) / 10,
      DailyDose: gran ? (Math.round(granTotal * 10) / 10) + ' g granules a day (' + ratio + ':1)' : '1 bag a day',
      DaysSupplied: bags,
      ReasonForChange: reason.join(' '),
      Status: 'Draft'
    });
    herbs.forEach(function (h) {
      ctAppend_('FormulaItems', {
        ItemID: ctId_('FI-'),
        FormulaID: id,
        Herb: h.herb,
        Grams: gran ? h.gran : h.grams,
        Notes: [gran ? h.grams + ' g raw equivalent' : '', h.note].filter(String).join('; ')
      });
    });
    ctAppend_('Requests', {
      RequestID: ctId_('Q-'),
      CreatedAt: new Date(),
      Action: 'check_formula',
      PatientID: req.patientId,
      VisitID: visitId || '',
      RecordID: id,
      Status: 'Queued'
    });
    return { formulaId: id, visitId: visitId || '', herbs: herbs.length };
  } finally {
    lock.releaseLock();
  }
}

// Called by the dialog: save a point plan from Point Finder.
function ctSaveTreatment(req) {
  var p = req && req.payload;
  if (!p || p.kind !== 'points' || !Array.isArray(p.points) || !p.points.length || p.points.length > 80) {
    throw new Error('The treatment could not be read. Try Save to chart again.');
  }
  var lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    var visitId = req.visitId;
    if (visitId === 'new') {
      ctCheckTarget_(req.patientId, null, false);
      visitId = ctNewVisit_(req.patientId, 'Acupuncture');
    } else {
      visitId = ctText_(visitId, 40);
      var v = ctCheckTarget_(req.patientId, visitId, true);
      if (v.status === 'Signed') throw new Error('That visit is signed. Choose an unsigned visit or New visit today.');
    }
    var groups = {};
    var order = [];
    p.points.forEach(function (pt) {
      var key = [pt.modality, pt.side, pt.technique].join('|');
      if (!groups[key]) { groups[key] = { modality: ctText_(pt.modality, 40), side: ctText_(pt.side, 20), technique: ctText_(pt.technique, 20), codes: [] }; order.push(key); }
      groups[key].codes.push(ctText_(pt.code, 40));
    });
    var notes = [p.name ? 'From Point Finder: ' + ctText_(p.name, 120) : 'From Point Finder', ctText_(p.notes, 1000)].filter(String).join('. ');
    var ids = [];
    order.forEach(function (key, n) {
      var g = groups[key];
      var tid = ctId_('T-');
      ids.push(tid);
      ctAppend_('Treatments', {
        TreatmentID: tid,
        VisitID: visitId,
        PatientID: req.patientId,
        Modality: g.modality,
        Points: g.codes.join(', '),
        Side: g.side,
        Technique: g.technique,
        Notes: n === 0 ? notes : '',
        Status: 'Draft'
      });
    });
    return { visitId: visitId, rows: ids.length, points: p.points.length };
  } finally {
    lock.releaseLock();
  }
}

function ctDialogHtml_(boot) {
  var data = JSON.stringify(boot).replace(/</g, '\\u003c');
  return CT_DIALOG_HTML.replace('/*BOOT*/', 'var BOOT = ' + data + ';');
}

var CT_DIALOG_HTML = '<!DOCTYPE html><html><head><base target="_blank"><meta charset="utf-8">' +
'<style>' +
'*{box-sizing:border-box}html,body{margin:0;height:100%;font:14px/1.4 "IBM Plex Sans",system-ui,sans-serif;color:#1C2220;background:#ECEEE6}body{display:flex;flex-direction:column;position:relative}' +
'#bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:8px 12px;border-bottom:1px solid #C6CCC1;background:#F8F9F4}' +
'#bar label{font-size:12px;color:#68716C;font-weight:600}' +
'#bar input,#bar select{font:inherit;padding:5px 8px;border:1px solid #C6CCC1;border-radius:6px;background:#fff;color:#1C2220}' +
'#pq{width:150px}#pt{min-width:240px;max-width:320px}#vs{min-width:230px}' +
'#msg{margin-left:auto;font-size:13px;color:#47514C}#msg.err{color:#AE3923}' +
'#wrap{flex:1;min-height:0}iframe{width:100%;height:100%;border:0;display:block}' +
'#ov{position:absolute;inset:0;background:rgba(28,34,32,.35);display:flex;align-items:flex-start;justify-content:center;padding-top:60px}' +
'#ov[hidden]{display:none}' +
'#card{background:#F8F9F4;border:1px solid #47514C;border-radius:10px;width:min(560px,92%);max-height:80%;overflow:auto;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.25)}' +
'#card h2{font:400 20px/1.25 "Young Serif",Georgia,serif;margin:0 0 4px}#card .who{color:#47514C;margin-bottom:10px}' +
'#card ul{margin:6px 0 10px;padding-left:18px}#card li{margin:2px 0}' +
'.chk{font-size:13px;padding:6px 9px;border-radius:6px;background:#E1E5DB;margin:4px 0}.chk.warn{background:#F3E6CA}.chk.bad{background:#F4DED7}' +
'.row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}' +
'button{font:inherit;font-weight:500;padding:6px 14px;border-radius:6px;border:1px solid #C6CCC1;background:#fff;cursor:pointer}' +
'button.primary{background:#1C2220;color:#ECEEE6;border-color:#1C2220}button[disabled]{opacity:.5;cursor:default}' +
'.demo{font-size:12px;color:#93600E}' +
'</style></head><body>' +
'<div id="bar"><label for="pq">Patient</label><input id="pq" type="search" placeholder="Filter by name">' +
'<select id="pt"><option value="">Loading patients…</option></select>' +
'<label for="vs">Visit</label><select id="vs" disabled><option value="">Choose a patient first</option></select>' +
'<span id="msg"></span></div>' +
'<div id="wrap"><iframe id="tool" title="Clinic tool" allow="clipboard-write"></iframe></div>' +
'<div id="ov" hidden><div id="card" role="dialog" aria-modal="true" aria-labelledby="ct-h"></div></div>' +
'<script>/*BOOT*/' +
'var patients=[],pending=null,frame=document.getElementById("tool");' +
'function $(id){return document.getElementById(id)}' +
'function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}' +
'function say(t,err){var m=$("msg");m.textContent=t||"";m.className=err?"err":""}' +
'function reply(type,message){try{frame.contentWindow.postMessage({source:"fl-ehr",type:type,message:message},BOOT.origin)}catch(e){}}' +
'function fillPatients(){var q=$("pq").value.toLowerCase(),sel=$("pt"),cur=sel.value;' +
' var list=patients.filter(function(p){return !q||p.name.toLowerCase().indexOf(q)>=0});' +
' sel.innerHTML="<option value=\\"\\">Choose a patient</option>"+list.map(function(p){return "<option value=\\""+esc(p.id)+"\\">"+esc(p.name)+(p.demo?" (demo)":"")+(p.status&&p.status!=="Active"?" · "+esc(p.status):"")+"</option>"}).join("");' +
' if(cur&&list.some(function(p){return p.id===cur}))sel.value=cur}' +
'function loadVisits(pid,want){var vs=$("vs");vs.disabled=true;vs.innerHTML="<option>Loading…</option>";if(!pid){vs.innerHTML="<option value=\\"\\">Choose a patient first</option>";return}' +
' google.script.run.withSuccessHandler(function(v){var opts=BOOT.tool==="formula-maker"?"<option value=\\"\\">No visit</option>":"<option value=\\"\\">Choose a visit</option>";' +
'  opts+="<option value=\\"new\\">New visit today</option>";' +
'  opts+=v.map(function(x){return "<option value=\\""+esc(x.id)+"\\">"+esc(x.date)+" · "+esc(x.service||"Visit")+" · "+esc(x.status)+"</option>"}).join("");' +
'  vs.innerHTML=opts;vs.disabled=false;if(want&&v.some(function(x){return x.id===want}))vs.value=want})' +
' .withFailureHandler(function(e){say(e.message,true)}).ctVisits(pid)}' +
'$("pq").addEventListener("input",fillPatients);' +
'$("pt").addEventListener("change",function(){loadVisits(this.value)});' +
'google.script.run.withSuccessHandler(function(list){patients=list;fillPatients();var c=BOOT.context||{};' +
' if(c.patientId&&patients.some(function(p){return p.id===c.patientId})){$("pt").value=c.patientId;loadVisits(c.patientId,c.visitId)}})' +
' .withFailureHandler(function(e){say(e.message,true)}).ctPatients();' +
'frame.src=BOOT.src;' +
'window.addEventListener("message",function(e){if(e.origin!==BOOT.origin||e.source!==frame.contentWindow)return;var d=e.data;' +
' if(!d||d.source!=="fl-clinic-tools"||!d.payload)return;var p=d.payload;' +
' if(p.kind!=="formula"&&p.kind!=="points")return;pending=p;showConfirm()});' +
'function showConfirm(){var p=pending,pid=$("pt").value,vid=$("vs").value,pat=patients.filter(function(x){return x.id===pid})[0];' +
' var card=$("card"),html="";' +
' if(!pat){html="<h2 id=\\"ct-h\\">Choose a patient first</h2><p>Pick the patient at the top of this window, then press Save to chart again.</p><div class=\\"row\\"><button class=\\"primary\\" id=\\"cx\\">OK</button></div>";card.innerHTML=html;$("ov").hidden=false;$("cx").onclick=close;$("cx").focus();return}' +
' if(p.kind==="points"&&!vid){html="<h2 id=\\"ct-h\\">Choose a visit first</h2><p>Treatments belong to a visit. Pick one at the top, or New visit today.</p><div class=\\"row\\"><button class=\\"primary\\" id=\\"cx\\">OK</button></div>";card.innerHTML=html;$("ov").hidden=false;$("cx").onclick=close;$("cx").focus();return}' +
' var vlabel=vid==="new"?"New visit today":vid?$("vs").options[$("vs").selectedIndex].text:"No visit";' +
' if(p.kind==="formula"){var gran=p.form==="granule";' +
'  html="<h2 id=\\"ct-h\\">Save formula to chart</h2><div class=\\"who\\">"+esc(pat.name)+(pat.demo?" <span class=\\"demo\\">demo patient</span>":"")+" · "+esc(vlabel)+"</div>"+' +
'  "<div><b>"+esc(p.name||p.baseFormula||"Custom formula")+"</b> · "+(gran?"Granules "+esc(p.granuleRatio)+":1, "+esc(p.granulePerDay)+" g a day":"Raw decoction, 1 bag a day")+" · "+esc(p.bags)+" days</div>"+' +
'  "<ul>"+p.herbs.map(function(h){return "<li>"+esc(h.herb)+" "+esc(gran?h.granuleGrams:h.grams)+" g"+(h.note?" <span style=\\"color:#68716C\\">("+esc(h.note)+")</span>":"")+"</li>"}).join("")+"</ul>"+' +
'  "<p style=\\"font-size:13px;color:#47514C\\">Saved as a Draft formula. The safety check runs within about a minute. It is not set Active until you dispense it.</p>"}' +
' else{html="<h2 id=\\"ct-h\\">Save treatment to chart</h2><div class=\\"who\\">"+esc(pat.name)+(pat.demo?" <span class=\\"demo\\">demo patient</span>":"")+" · "+esc(vlabel)+"</div>"+' +
'  "<ul>"+p.points.map(function(x){return "<li>"+esc(x.code)+" "+esc(x.pinyin)+" · "+esc(x.side)+", "+esc(x.technique)+"</li>"}).join("")+"</ul>"+' +
'  "<p style=\\"font-size:13px;color:#47514C\\">Saved as Draft treatment rows on this visit. They become Final when you sign the visit.</p>"}' +
' var chk=(p.checks||[]).filter(function(c){return c.level!=="info"});' +
' if(chk.length)html+=chk.map(function(c){return "<div class=\\"chk "+esc(c.level)+"\\">"+esc(c.text)+"</div>"}).join("");' +
' html+="<div class=\\"row\\"><button id=\\"cx\\">Cancel</button><button class=\\"primary\\" id=\\"ok\\">Save to "+esc(pat.name)+"</button></div>";' +
' card.innerHTML=html;$("ov").hidden=false;$("cx").onclick=close;$("ok").onclick=save;$("ok").focus()}' +
'function close(){$("ov").hidden=true;pending=null}' +
'document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("ov").hidden)close()});' +
'function save(){var p=pending,pid=$("pt").value,vid=$("vs").value,b=$("ok");b.disabled=true;b.textContent="Saving…";' +
' var req={patientId:pid,visitId:vid,payload:p};' +
' var ok=function(r){close();if(r.visitId&&vid==="new")loadVisits(pid,r.visitId);' +
'  var m=p.kind==="formula"?"Formula saved as a draft. Safety check queued.":"Treatment saved: "+r.points+" points on the visit.";say(m);reply("saved",m)};' +
' var bad=function(e){b.disabled=false;b.textContent="Try again";say(e.message,true);reply("error",e.message)};' +
' var run=google.script.run.withSuccessHandler(ok).withFailureHandler(bad);' +
' if(p.kind==="formula")run.ctSaveFormula(req);else run.ctSaveTreatment(req)}' +
'</script></body></html>';
