/**
 * LinkedVelocity - Promo Team webhook (intake + screening + field-day tracker).
 * Routes by the POST body's "type":
 *   no type / "intake"  -> appends an applicant to the FIRST tab (website form)
 *   "screening"         -> upserts a scored call into "Screening Results" by email
 *   "fieldday"          -> upserts an accepted marketer into "FieldDay-Marketer-Tracker" by email
 * All upserts match on email: same email overwrites in place, else appends. No duplicates.
 */

var INTAKE_COLUMNS = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'fullName', label: 'Full name' },
  { key: 'email', label: 'Email' },
  { key: 'contactNumber', label: 'Contact number' },
  { key: 'comfortApproaching', label: 'Comfort approaching (1-5)' },
  { key: 'handlesRejection', label: 'Handles rejection (1-5)' },
  { key: 'experience', label: 'Prior people-facing work' },
  { key: 'trialAvailability', label: 'Trial availability' },
  { key: 'source', label: 'Source' }
];

var SCREENING_TAB = 'Screening Results';
var SCREENING_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'callDate', label: 'Call date' },
  { key: 'comfortable', label: 'Comfortable w/ model' },
  { key: 'communicates', label: 'Communicates (1-5)' },
  { key: 'approaching', label: 'Approaching strangers (1-5)' },
  { key: 'rejection', label: 'Handles rejection (1-5)' },
  { key: 'reliable', label: 'Reliable / interested (1-5)' },
  { key: 'priorWork', label: 'Prior people-facing work' },
  { key: 'available', label: 'Available trial + onsite' },
  { key: 'verdict', label: 'Verdict' },
  { key: 'notes', label: 'Notes / quotes' },
  { key: 'recording', label: 'Recording link' },
  { key: 'linkedin', label: 'Familiar with LinkedIn' }
];

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
    if (data.type === 'screening') {
      upsertByEmail_(SCREENING_TAB, SCREENING_COLUMNS, data);
    } else if (data.type === 'fieldday') {
      upsertByEmail_(FIELDDAY_TAB, FIELDDAY_COLUMNS, data);
    } else {
      appendIntake_(data);
    }
    SpreadsheetApp.flush();
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function appendIntake_(data) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  ensureHeaders_(sheet, INTAKE_COLUMNS);
  sheet.appendRow(rowFor_(data, INTAKE_COLUMNS));
}

/**
 * Upsert a row into a named tab, matching on the "email" column.
 * Existing email -> overwrite that row; otherwise append. Tab is created if missing.
 */
function upsertByEmail_(tabName, columns, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tabName) || ss.insertSheet(tabName);
  ensureHeaders_(sheet, columns);

  var row = rowFor_(data, columns);
  var emailCol = 0;
  for (var c = 0; c < columns.length; c++) {
    if (columns[c].key === 'email') { emailCol = c + 1; break; }
  }
  var email = data.email ? String(data.email).trim().toLowerCase() : '';

  if (emailCol && email && sheet.getLastRow() > 1) {
    var emails = sheet.getRange(2, emailCol, sheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < emails.length; i++) {
      if (String(emails[i][0]).trim().toLowerCase() === email) {
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return;
      }
    }
  }
  sheet.appendRow(row);
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
