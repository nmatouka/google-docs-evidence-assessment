/**
 * Code.gs — Entry point. Menu registration, sidebar/dialog launchers.
 */

/**
 * Runs when the document is opened. Creates the add-on menu.
 * @param {Object} e - The onOpen event object.
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createMenu('Evidence Assessment')
    .addItem('Assess Selected Text', 'showAssessmentSidebar')
    .addItem('Manage Assessments', 'showManager')
    .addSeparator()
    .addItem('Generate Appendix', 'generateAppendix')
    .addSeparator()
    .addItem('Sync Markers', 'syncMarkers')
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
 * Captures the selected text BEFORE opening the sidebar (selection is lost on sidebar open).
 */
function showAssessmentSidebar() {
  var selectionData = getSelectedText();
  Logger.log('Selection data: ' + JSON.stringify(selectionData));

  var template = HtmlService.createTemplateFromFile('UI/Sidebar');
  template.selectionData = selectionData ? JSON.stringify(selectionData) : 'null';
  template.editData = 'null';

  var html = template.evaluate().setTitle(CONFIG.SIDEBAR_TITLE);
  DocumentApp.getUi().showSidebar(html);
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
