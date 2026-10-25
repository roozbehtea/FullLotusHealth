/**
 * Full Lotus Health: email signup endpoint.
 * Saves one email per row to the "Signups" sheet of the spreadsheet this script is attached to.
 * Stores only: date added, email, and where the signup came from. No health details.
 */
var SHEET_NAME = 'Signups';

function doPost(e) {
  var p = (e && e.parameter) || {};
  if (p.website) return reply_('ok');                       // hidden trap field: bots fill it, people don't
  var email = String(p.email || '').trim().toLowerCase();
  var valid = email.length <= 254 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !/^[=+\-@]/.test(email);
  if (!valid) return reply_('invalid');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(['Added', 'Email', 'Source']);
      sh.setFrozenRows(1);
    }
    var existing = sh.getLastRow() > 1 ? sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues() : [];
    var seen = existing.some(function (row) { return row[0] === email; });
    if (!seen) sh.appendRow([new Date(), email, String(p.source || '').slice(0, 40)]);
  } finally {
    lock.releaseLock();
  }
  return reply_('ok');
}

function doGet() {
  return reply_('Full Lotus Health signup is running.');
}

function reply_(text) {
  return ContentService.createTextOutput(text);
}
