/**
 * Kristen Robertson website -> Google Sheets endpoint.
 * Deploy as a Web App (Execute as: Me, Who has access: Anyone). See README.md.
 * No API keys or secrets are needed in the website code.
 */
var SHEET_NAME = 'Inquiries';
var HEADERS = ['Submitted At (server)','Submitted At (browser, UTC)','Inquiry Type','Property Address','City','State','ZIP',
  'Property Type','Bedrooms','Bathrooms','Square Footage','Property Condition','Improvements','Selling Timeline',
  'Reason for Selling','Additional Notes','Full Name','Email','Phone','Preferred Contact Method','Consent Status'];

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.website) return out({ ok: true });            // honeypot: silently ignore bots
    if (!d.fullName || !d.email || !d.phone) return out({ ok: false, error: 'Missing required fields' });
    var lock = LockService.getScriptLock(); lock.waitLock(10000);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) { sh.appendRow(HEADERS); sh.setFrozenRows(1); }
    sh.appendRow([new Date(), d.submittedAt, d.inquiryType, d.address, d.city, d.state, d.zip, d.propertyType,
      d.bedrooms, d.bathrooms, d.squareFootage, d.condition, d.improvements, d.timeline, d.reason, d.notes,
      d.fullName, d.email, d.phone, d.contactMethod, d.consent].map(safe));
    lock.releaseLock();
    return out({ ok: true });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}
function doGet() { return out({ ok: true, message: 'Endpoint is live. Forms submit via POST.' }); }
function safe(v) { v = (v == null) ? '' : String(v); return /^[=+\-@]/.test(v) ? "'" + v : v; } // blocks formula injection
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
