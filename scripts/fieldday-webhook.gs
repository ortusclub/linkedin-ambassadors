/**
 * LinkedVelocity - Field Day Marketer Tracker webhook (STANDALONE).
 * Separate from the landing-page / screening script. Writes only to the
 * "FieldDay-Marketer-Tracker" tab of the Promo Staff / Street Team sheet.
 * Upserts by email: same email overwrites its row, otherwise appends. No duplicates.
 *
 * Deploy: script.google.com -> New project -> paste this -> Save ->
 * Deploy -> New deployment -> Web app -> Execute as: Me,
 * Who has access: Anyone -> Deploy -> authorize -> copy the /exec URL.
 */

var SHEET_ID = '1Y1VsokIGqva5Jt9I2NTVAcfUsbXPjf-7-9p1alVQbTo';
var FIELDDAY_TAB = 'FieldDay-Marketer-Tracker';

var FIELDDAY_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'mobile', label: 'Mobile / WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'area', label: 'Area / Location' },
  { key: 'source', label: 'Source' },
  { key: 'group', label: 'Group' },
  { key: 'priorExp', label: 'Prior promo exp (Y/N)' },
  { key: 'interviewDate', label: 'Interview done (date)' },
  { key: 'status', label: 'Status' },
  { key: 'dayAssigned', label: 'Day assigned' },
  { key: 'locationAssigned', label: 'Location assigned' },
  { key: 'shiftConfirmed', label: 'Shift confirmed (night before)' },
  { key: 'attended', label: 'Attended' },
  { key: 'signups', label: 'Sign-ups' },
  { key: 'reinvite', label: 'Re-invite?' },
  { key: 'dayRate', label: 'Day rate' },
  { key: 'paymentMethod', label: 'Payment method' },
  { key: 'paymentDetails', label: 'Payment details' },
  { key: 'paidDate', label: 'Paid (date)' },
  { key: 'notes', label: 'Notes' }
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(FIELDDAY_TAB) || ss.insertSheet(FIELDDAY_TAB);
    ensureHeaders_(sheet, FIELDDAY_COLUMNS);

    var row = rowFor_(data, FIELDDAY_COLUMNS);
    var email = data.email ? String(data.email).trim().toLowerCase() : '';

    if (email && sheet.getLastRow() > 1) {
      var emails = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < emails.length; i++) {
        if (String(emails[i][0]).trim().toLowerCase() === email) {
          sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
          SpreadsheetApp.flush();
          return json_({ ok: true, action: 'updated' });
        }
      }
    }
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return json_({ ok: true, action: 'appended' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function rowFor_(data, columns) {
  return columns.map(function (c) {
    var v = data[c.key];
    return (v === undefined || v === null) ? '' : v;
  });
}

function ensureHeaders_(sheet, columns) {
  var labels = columns.map(function (c) { return c.label; });
  var header = sheet.getRange(1, 1, 1, labels.length);
  var current = header.getValues()[0];
  var matches = current.length === labels.length && labels.every(function (l, i) {
    return current[i] === l;
  });
  if (!matches) {
    header.setValues([labels]).setFontWeight('bold');
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
