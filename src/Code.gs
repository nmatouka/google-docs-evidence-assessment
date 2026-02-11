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

// Placeholder stubs for menu items not yet implemented.

function generateAppendix() {
  DocumentApp.getUi().alert('Appendix generation will be implemented in Session 4.');
}

function syncMarkers() {
  DocumentApp.getUi().alert('Marker sync will be implemented in Session 6.');
}
