/**
 * Export.gs — CSV and JSON export of assessment data.
 * Creates a file in the user's Google Drive root folder.
 */

/**
 * Exports assessments to a file in the user's Google Drive.
 * Called from the manager dialog.
 * @param {string} format - "csv" or "json".
 * @returns {Object} { success: boolean, fileName: string, error: string }
 */
function handleExport(format) {
  return safeExecute(function() {
    var assessments = getAllAssessments();
    if (assessments.length === 0) {
      return { success: false, error: 'No assessments to export.' };
    }

    var docName = DocumentApp.getActiveDocument().getName();
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var content, fileName, mimeType;

    if (format === 'json') {
      content = buildJsonExport(assessments, docName);
      fileName = docName + ' - Evidence Assessments ' + timestamp + '.json';
      mimeType = 'application/json';
    } else {
      content = buildCsvExport(assessments);
      fileName = docName + ' - Evidence Assessments ' + timestamp + '.csv';
      mimeType = 'text/csv';
    }

    // Use Drive REST API v3 instead of DriveApp.createFile() because
    // DriveApp requires the full 'drive' scope, while the REST API
    // works with the narrower 'drive.file' scope.
    var metadata = JSON.stringify({ name: fileName, mimeType: mimeType });
    var boundary = 'evidence_export_boundary';
    var body = '--' + boundary + '\r\n' +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadata + '\r\n' +
      '--' + boundary + '\r\n' +
      'Content-Type: ' + mimeType + '\r\n\r\n' +
      content + '\r\n' +
      '--' + boundary + '--';

    UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'post',
      contentType: 'multipart/related; boundary=' + boundary,
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      payload: body,
      muteHttpExceptions: false
    });

    Logger.log('Exported ' + assessments.length + ' assessments to ' + fileName);

    return { success: true, fileName: fileName };
  }, 'Failed to export assessments.');
}

/**
 * Builds a JSON string with assessments and metadata.
 * @param {Object[]} assessments - The assessments to export.
 * @param {string} docName - The document name.
 * @returns {string} JSON string.
 */
function buildJsonExport(assessments, docName) {
  var exportData = {
    exportedAt: nowISO(),
    documentName: docName,
    version: CONFIG.VERSION,
    assessmentCount: assessments.length,
    assessments: assessments
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Builds a CSV string from assessments.
 * @param {Object[]} assessments - The assessments to export.
 * @returns {string} CSV string with headers.
 */
function buildCsvExport(assessments) {
  var headers = [
    'Marker #',
    'Claim Text',
    'Evidence Quality',
    'Sources',
    'Evidence Notes',
    'Agreement Level',
    'Agreement Notes',
    'Confidence Level',
    'Conditional Statement',
    'Created At',
    'Created By',
    'Last Modified'
  ];

  var rows = [headers.join(',')];

  for (var i = 0; i < assessments.length; i++) {
    var a = assessments[i];
    var row = [
      a.markerNumber || '',
      csvEscape(a.claimText || ''),
      a.evidence.quality || '',
      csvEscape((a.evidence.sources || []).join('; ')),
      csvEscape(a.evidence.notes || ''),
      a.agreement.level || '',
      csvEscape(a.agreement.notes || ''),
      a.confidence.level || '',
      csvEscape(a.confidence.conditional || ''),
      (a.metadata && a.metadata.createdAt) || '',
      (a.metadata && a.metadata.createdBy) || '',
      (a.metadata && a.metadata.lastModified) || ''
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Escapes a value for CSV: wraps in quotes if it contains commas, quotes, or newlines.
 * @param {string} value - The value to escape.
 * @returns {string} CSV-safe value.
 */
function csvEscape(value) {
  if (!value) return '';
  var str = String(value);
  if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
