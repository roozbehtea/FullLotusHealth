/**
 * Benefits check for the Full Lotus Health /insurance form.
 *
 * Paste this into the Apps Script project that already runs the scheduler
 * (tea sits and booking), because that project holds the Stedi key.
 * Setup is in apps-script/README.md next to this file.
 *
 * The website never sees the Stedi key. It posts JSON here and receives
 * only {status: "active"|"inactive"|"unknown"}.
 *
 * If this project already has a Stedi eligibility function, call that from
 * insStedi_() instead of the request written below, and map its result to
 * active, inactive, or unknown. Do not return the raw Stedi body.
 *
 * Endpoint checked against Stedi's public docs (legacy JSON still published):
 *   POST https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3
 *   Authorization: <api-key>     (no "Key " prefix on this healthcare endpoint)
 *   https://www.stedi.com/docs/healthcare/api-reference/post-healthcare-eligibility-legacy
 *   https://www.stedi.com/docs/healthcare/send-eligibility-checks
 * Request fields: tradingPartnerServiceId, provider.organizationName,
 * provider.npi, subscriber.firstName, subscriber.lastName,
 * subscriber.dateOfBirth (YYYYMMDD), subscriber.memberId,
 * encounter.serviceTypeCodes.
 * Aetna's primary payer ID on Stedi's payer page is 60054
 * (https://www.stedi.com/healthcare/network/aetna). Stedi payer ID HPQRS
 * is an alias. Keep the id a string.
 *
 * Service type: Stedi maps acupuncture procedure codes 97810–97814 to STC 64,
 * then 1 (Medical Care). STC AL is Vision, so this file does not send AL.
 * Aetna's published supported-STC list includes 30 and 1, and does not list 64.
 * This check sends 30 (Health Benefit Plan Coverage), which is also Stedi's
 * default, so the result is whether the plan is active. It does not quote
 * acupuncture benefits, copays, or deductibles.
 *
 * Stedi also publishes a newer endpoint, POST
 * https://healthcare.us.stedi.com/2026-06-01/eligibility-check, with payerId
 * and a YYYY-MM-DD date of birth. Use the call this project already has
 * if it points there.
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

function doGet() {
  return insJson_({ ok: true });
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
  var npi = insProp_('PROVIDER_NPI').replace(/\D/g, '');
  if (!key || npi.length !== 10) return { status: 'unknown', summary: 'not checked (missing script property)' };
  try {
    var data = insStedi_(key, npi, payerId, lead);
    var status = insStatus_(data);
    return { status: status, summary: status };
  } catch (err) {
    return { status: 'unknown', summary: 'not checked (request failed)' };
  }
}

function insStedi_(key, npi, payerId, lead) {
  var payload = {
    tradingPartnerServiceId: payerId,
    provider: { organizationName: INS_ORG, npi: npi },
    subscriber: {
      firstName: lead.firstName,
      lastName: lead.lastName,
      dateOfBirth: lead.dob.replace(/-/g, ''),
      memberId: lead.memberId
    },
    encounter: { serviceTypeCodes: [INS_SERVICE_TYPE] }
  };
  var res = UrlFetchApp.fetch(INS_STEDI_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: key },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText() || '';
  if (code < 200 || code >= 300) throw new Error('stedi http ' + code);
  return JSON.parse(text);
}

function insStatus_(data) {
  if (!data || typeof data !== 'object') return 'unknown';
  if (data.errors && data.errors.length) return 'unknown';
  var active = false;
  var inactive = false;
  var plans = data.planStatus || [];
  var i;
  for (i = 0; i < plans.length; i++) {
    insMark_(plans[i].statusCode, plans[i].status, function (kind) {
      if (kind === 'active') active = true;
      if (kind === 'inactive') inactive = true;
    });
  }
  var benefits = data.benefitsInformation || [];
  for (i = 0; i < benefits.length; i++) {
    if (String(benefits[i].code || '') === '1') active = true;
    if (String(benefits[i].code || '') === '6') inactive = true;
  }
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
  var id = insProp_('LEADS_SHEET_ID');
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
  var to = insProp_('NOTIFY_EMAIL');
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
