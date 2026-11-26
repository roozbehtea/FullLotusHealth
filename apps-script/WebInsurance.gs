/**
 * WebInsurance.gs - website benefits-check + email capture for fulllotushealth.com/insurance.
 * Added to the "Full Lotus Clinic" project. Reuses STEDI_API_KEY, STEDI_ELIGIBILITY_URL,
 * stediList_, stediSummary_ and settingStr_ from Code.gs. Leads go to the "Insurance Leads"
 * tab of the clinic spreadsheet (SPREADSHEET_ID) unless LEADS_SHEET_ID is set.
 * The website only ever receives {status: "active"|"inactive"|"unknown"}.
 */
var INS_STEDI_URL = 'https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3';
var INS_PAYERS = { 'Aetna PPO': '60054' };
var INS_SERVICE_TYPE = '30';
var INS_ORG = 'Full Lotus Health';
var INS_TAB = 'Insurance Leads';
var INS_HEADERS = ['Timestamp', 'First name', 'Last name', 'Date of birth', 'Email', 'Phone', 'Carrier', 'Member ID', 'Eligibility result'];

function insProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function insJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return insJson_({ status: 'unknown' });
  }
  return insJson_(insCheck_(body));
}

/**
 * Callable from the scheduler project's existing doPost if you cannot keep
 * a second doPost in this file:
 *   if (body.action === 'insurance_check') return json_(insCheck_(body));
 */
function insCheck_(body) {
  try {
    if (String(body.website || '').trim()) return { status: 'unknown' };
    var lead = insLead_(body);
    if (!lead) return { status: 'unknown' };
    var checked = insDecide_(lead);
    insSave_(lead, checked.summary);
    insNotify_(lead, checked.summary);
    return { status: checked.status };
  } catch (err) {
    console.error(err && err.message ? err.message : err);
    return { status: 'unknown' };
  }
}

function insLead_(body) {
  var first = insText_(body.firstName, 60);
  var last = insText_(body.lastName, 60);
  var email = String(body.email || '').trim().toLowerCase();
  var dob = String(body.dob || '').trim();
  var carrier = String(body.carrier || '').trim();
  var memberId = insText_(body.memberId, 40);
  var phone = insText_(body.phone, 30);
  var consent = body.consent === true || body.consent === 'true' || body.consent === 'on';
  if (!consent) return null;
  if (!first || !last || !memberId) return null;
  if (carrier !== 'Aetna PPO' && carrier !== 'Other PPO') return null;
  if (!insEmail_(email) || !insDob_(dob)) return null;
  return {
    firstName: first,
    lastName: last,
    dob: dob,
    email: email,
    phone: phone,
    carrier: carrier,
    memberId: memberId
  };
}

function insDecide_(lead) {
  var payerId = INS_PAYERS[lead.carrier];
  if (!payerId) return { status: 'unknown', summary: 'not checked (other PPO)' };
  var key = insProp_('STEDI_API_KEY');
  if (!key) return { status: 'unknown', summary: 'not checked (missing STEDI_API_KEY)' };
  var npi = '';
  try { npi = settingStr_('PROVIDER_NPI'); } catch (err) { npi = ''; }
  npi = String(npi || insProp_('PROVIDER_NPI') || '1205389913').replace(/\D/g, '');
  try {
    var data = insStedi_(key, npi, payerId, lead);
    var status = insStatus_(data);
    var summary = status;
    try { summary = status + ' | ' + stediSummary_(data).slice(0, 1500); } catch (e2) {}
    return { status: status, summary: summary };
  } catch (err) {
    return { status: 'unknown', summary: 'not checked (' + String(err && err.message || err).slice(0, 200) + ')' };
  }
}

// Uses the same Stedi endpoint and request shape as actionVerifyInsurance_ in Code.gs.
function insStedi_(key, npi, payerId, lead) {
  var payload = {
    payerId: payerId,
    provider: { npi: npi },
    subscriber: {
      memberId: lead.memberId,
      dateOfBirth: lead.dob,
      name: { person: { firstName: lead.firstName, lastName: lead.lastName } }
    },
    encounter: { services: [{ system: 'STC', value: INS_SERVICE_TYPE }] }
  };
  var res = UrlFetchApp.fetch(STEDI_ELIGIBILITY_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText() || '';
  if (code < 200 || code >= 300) throw new Error('stedi http ' + code + ': ' + text.slice(0, 150));
  return JSON.parse(text);
}

function insStatus_(data) {
  if (!data || typeof data !== 'object') return 'unknown';
  var active = false, inactive = false;
  var plans = stediList_(data.plans);
  plans.forEach(function (pl) {
    var b = pl.benefits || {};
    stediList_(b.statuses).forEach(function (s) {
      var st = String(s.status || '').toUpperCase();
      if (st.indexOf('INACTIVE') >= 0) inactive = true;
      else if (st.indexOf('ACTIVE') >= 0) active = true;
    });
  });
  // Legacy-shaped responses, just in case.
  stediList_(data.planStatus).forEach(function (p) {
    insMark_(p.statusCode, p.status, function (k) { if (k === 'active') active = true; if (k === 'inactive') inactive = true; });
  });
  if (active) return 'active';
  if (inactive) return 'inactive';
  return 'unknown';
}

function insMark_(code, name, set) {
  code = String(code || '');
  name = String(name || '');
  if (code === '1' || name.indexOf('Active') === 0) set('active');
  else if (code === '6' || name.indexOf('Inactive') === 0) set('inactive');
}

function insSave_(lead, summary) {
  var id = insProp_('LEADS_SHEET_ID') || insProp_('SPREADSHEET_ID');
  if (!id) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ss = SpreadsheetApp.openById(id);
    var sh = ss.getSheetByName(INS_TAB) || ss.insertSheet(INS_TAB);
    if (sh.getLastRow() === 0) {
      sh.appendRow(INS_HEADERS);
      sh.setFrozenRows(1);
    }
    sh.appendRow([
      new Date(),
      insCell_(lead.firstName),
      insCell_(lead.lastName),
      insCell_(lead.dob),
      insCell_(lead.email),
      insCell_(lead.phone),
      insCell_(lead.carrier),
      insCell_(lead.memberId),
      insCell_(summary)
    ]);
  } finally {
    lock.releaseLock();
  }
}

function insNotify_(lead, summary) {
  var to = insProp_('NOTIFY_EMAIL') || Session.getEffectiveUser().getEmail();
  if (!to) return;
  try {
    MailApp.sendEmail({
      to: to,
      subject: 'Insurance benefits check: ' + lead.carrier,
      name: 'Full Lotus Health',
      replyTo: lead.email,
      body: [
        'Someone asked for a benefits check on the website.',
        '',
        'Name: ' + lead.firstName + ' ' + lead.lastName,
        'Email: ' + lead.email,
        'Phone: ' + (lead.phone || '(none)'),
        'Carrier: ' + lead.carrier,
        'Result: ' + summary,
        '',
        'Date of birth and member ID are in the Insurance Leads sheet, not in this email.',
        'Eligibility is not a guarantee of payment.'
      ].join('\n')
    });
  } catch (err) {
    console.error(err && err.message ? err.message : err);
  }
}

function insText_(value, max) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function insEmail_(email) {
  return email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function insDob_(dob) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return false;
  var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (y < 1900) return false;
  var dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return false;
  return dt.getTime() <= Date.now();
}

function insCell_(value) {
  var s = String(value || '');
  if (/^[=+\-@]/.test(s)) return "'" + s;
  return s;
}
