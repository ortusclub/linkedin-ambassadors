/**
 * LinkedVelocity — Promo Team application intake (Google Apps Script)
 *
 * Receives POSTs from the site's /api/field-marketing/apply route and appends
 * one row per applicant to the bound spreadsheet.
 *
 * Column order is FIXED and append-only: the original 5 columns keep their
 * positions (so any IMPORTDATA references stay valid) and the 5 screening
 * columns are appended at the end. The header row self-heals — if the sheet
 * already has the old 5 columns, the 5 new labels are added automatically.
 *
 * Setup:
 *   1. Open the intake Google Sheet → Extensions → Apps Script.
 *   2. Replace the code with this file and Save.
 *   3a. If a web app is ALREADY deployed (the webhook already worked before):
 *       Deploy → Manage deployments → edit (pencil) → Version: New version →
 *       Deploy. The /exec URL stays the same, so no env change is needed.
 *   3b. If deploying fresh:
 *       Deploy → New deployment → Web app → Execute as: Me,
 *       Who has access: Anyone → Deploy → copy the /exec URL, then set it as
 *       FIELD_MARKETING_SHEET_WEBHOOK in Vercel and redeploy the site.
 */

var COLUMNS = [
  { key: 'timestamp',          label: 'Timestamp' },
  { key: 'fullName',           label: 'Full name' },
  { key: 'email',              label: 'Email' },
  { key: 'contactNumber',      label: 'Contact number' },
  { key: 'comfortApproaching', label: 'Comfort approaching (1-5)' },
  { key: 'handlesRejection',   label: 'Handles rejection (1-5)' },
  { key: 'experience',         label: 'Prior people-facing work' },
  { key: 'trialAvailability',  label: 'Trial availability' },
  { key: 'source',             label: 'Source' },
];

function doPost(e) {
  // Serialize concurrent submissions — a burst (e.g. from a blast) can otherwise
  // drop a row when several writes hit the sheet at the same instant.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    var data = JSON.parse(e.postData.contents);
    // First tab of the bound spreadsheet. Change to
    // getSheetByName('YourTabName') if your intake tab is not the first.
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    ensureHeaders_(sheet);

    var row = COLUMNS.map(function (c) {
      var v = data[c.key];
      return (v === undefined || v === null) ? '' : v;
    });
    sheet.appendRow(row);
    SpreadsheetApp.flush();

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Ensure row 1 exactly matches the current column labels (self-correcting). */
function ensureHeaders_(sheet) {
  var labels = COLUMNS.map(function (c) { return c.label; });
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
