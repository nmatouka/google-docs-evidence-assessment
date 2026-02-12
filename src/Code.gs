/**
 * Code.gs — Entry point. Menu registration, sidebar/dialog launchers.
 */

/**
 * Runs when the document is opened. Creates the add-on menu.
 * Uses createAddonMenu() for Marketplace compatibility (runs in AuthMode.LIMITED).
 * @param {Object} e - The onOpen event object.
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Assess Selected Text', 'showAssessmentSidebar')
    .addItem('Manage Assessments', 'showManager')
    .addSeparator()
    .addItem('Generate Appendix', 'generateAppendix')
    .addItem('Export Assessments', 'showExportDialog')
    .addSeparator()
    .addItem('Sync Markers', 'syncMarkers')
    .addSeparator()
    .addItem('Help', 'showHelp')
    .addToUi();
}

/**
 * Runs when the add-on is installed. Delegates to onOpen.
 * @param {Object} e - The onInstall event object.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Opens the assessment sidebar for creating a new assessment.
 * With createAddonMenu, selection can't be captured here (AuthMode.LIMITED),
 * so the sidebar includes a "Capture Selection" button for the user to click
 * after they've selected text.
 */
function showAssessmentSidebar() {
  // Try to capture selection — works when called from full auth context
  // (e.g., from manager dialog or direct script run) but may return null
  // under AuthMode.LIMITED from the addon menu.
  var selectionData = getSelectedText();

  var template = HtmlService.createTemplateFromFile('UI/Sidebar');
  template.selectionData = selectionData ? JSON.stringify(selectionData) : 'null';
  template.editData = 'null';

  var html = template.evaluate().setTitle(CONFIG.SIDEBAR_TITLE);
  DocumentApp.getUi().showSidebar(html);
}

/**
 * Captures the currently selected text and returns it.
 * Called from the sidebar's "Capture Selection" button via google.script.run.
 * At this point the sidebar is already open and the call runs with full auth.
 * @returns {Object|null} Selection data or null.
 */
function captureSelection() {
  return getSelectedText();
}

/**
 * Opens the sidebar pre-populated with an existing assessment for editing.
 * @param {string} assessmentId - The UUID of the assessment to edit.
 */
function showEditSidebar(assessmentId) {
  var assessment = getAssessmentById(assessmentId);
  if (!assessment) {
    DocumentApp.getUi().alert('Error', 'Assessment not found.', DocumentApp.getUi().ButtonSet.OK);
    return;
  }

  var template = HtmlService.createTemplateFromFile('UI/Sidebar');
  template.selectionData = JSON.stringify({
    text: assessment.claimText,
    paragraphIndex: assessment.location.paragraphIndex,
    startOffset: assessment.location.startOffset,
    endOffset: assessment.location.endOffset
  });
  template.editData = JSON.stringify(assessment);

  var html = template.evaluate().setTitle('Edit Assessment');
  DocumentApp.getUi().showSidebar(html);
}

/**
 * Opens the assessment manager dialog.
 */
function showManager() {
  var html = HtmlService.createTemplateFromFile('UI/Manager')
    .evaluate()
    .setWidth(CONFIG.MANAGER_WIDTH)
    .setHeight(CONFIG.MANAGER_HEIGHT);

  DocumentApp.getUi().showModalDialog(html, CONFIG.MANAGER_TITLE);
}

/**
 * Shows a simple export dialog prompting the user for format choice.
 */
function showExportDialog() {
  return safeExecute(function() {
    var assessments = getAllAssessments();
    if (assessments.length === 0) {
      DocumentApp.getUi().alert(
        'No Assessments',
        'There are no assessments to export.',
        DocumentApp.getUi().ButtonSet.OK
      );
      return;
    }

    var ui = DocumentApp.getUi();
    var response = ui.prompt(
      'Export Assessments',
      'Enter format: "csv" or "json" (file will be saved to your Google Drive)',
      ui.ButtonSet.OK_CANCEL
    );

    if (response.getSelectedButton() !== ui.Button.OK) return;

    var format = response.getResponseText().trim().toLowerCase();
    if (format !== 'csv' && format !== 'json') {
      ui.alert('Invalid Format', 'Please enter "csv" or "json".', ui.ButtonSet.OK);
      return;
    }

    var result = handleExport(format);
    if (result && result.success) {
      ui.alert('Export Complete', 'File saved to your Google Drive:\n' + result.fileName, ui.ButtonSet.OK);
    }
  }, 'Failed to export assessments.');
}

/**
 * Syncs markers in the document with stored assessments.
 * Renumbers markers sequentially and reports any issues.
 */
function syncMarkers() {
  return safeExecute(function() {
    var result = renumberAllMarkers();
    var ui = DocumentApp.getUi();

    if (result.errors.length > 0) {
      ui.alert(
        'Sync Complete (with issues)',
        'Renumbered ' + result.updated + ' marker(s).\n\n'
          + 'Issues found:\n' + result.errors.join('\n'),
        ui.ButtonSet.OK
      );
    } else if (result.updated > 0) {
      ui.alert(
        'Markers Synced',
        'Successfully renumbered ' + result.updated + ' marker(s).',
        ui.ButtonSet.OK
      );
    } else {
      ui.alert(
        'Markers OK',
        'All ' + result.total + ' marker(s) are already in order.',
        ui.ButtonSet.OK
      );
    }
  }, 'Failed to sync markers.');
}

/**
 * Shows a quick-reference help dialog.
 */
function showHelp() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:13px;padding:8px;">'
    + '<h3 style="color:#1a73e8;margin-top:0;">Evidence Assessment v' + CONFIG.VERSION + '</h3>'
    + '<p>Systematic IPCC-style uncertainty communication for policy documents.</p>'
    + '<h4 style="margin-bottom:4px;">Quick Start</h4>'
    + '<ol style="padding-left:20px;">'
    + '<li>Open the sidebar: <b>Evidence Assessment → Assess Selected Text</b></li>'
    + '<li>Highlight a claim in your document</li>'
    + '<li>Click <b>Capture Selection</b> in the sidebar</li>'
    + '<li>Rate evidence quality, agreement, and confidence</li>'
    + '<li>Click Save — a numbered marker appears in the document</li>'
    + '<li><b>Evidence Assessment → Generate Appendix</b> to create the summary</li>'
    + '</ol>'
    + '<h4 style="margin-bottom:4px;">Menu Items</h4>'
    + '<ul style="padding-left:20px;">'
    + '<li><b>Assess Selected Text</b> — Open the assessment sidebar</li>'
    + '<li><b>Manage Assessments</b> — View, edit, or delete assessments</li>'
    + '<li><b>Generate Appendix</b> — Create/update the evidence appendix</li>'
    + '<li><b>Export Assessments</b> — Save assessments as CSV or JSON</li>'
    + '<li><b>Sync Markers</b> — Renumber markers if they get out of order</li>'
    + '</ul>'
    + '<h4 style="margin-bottom:4px;">Tips</h4>'
    + '<ul style="padding-left:20px;">'
    + '<li>Regenerate the appendix after editing assessments</li>'
    + '<li>Don\'t manually edit the appendix — it will be overwritten</li>'
    + '<li>Use Sync Markers if you notice numbering gaps</li>'
    + '</ul>'
    + '</div>'
  )
  .setWidth(400)
  .setHeight(400);

  DocumentApp.getUi().showModalDialog(html, 'Help — Evidence Assessment');
}
