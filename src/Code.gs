/**
 * Code.gs — Entry point. Menu registration, sidebar/dialog launchers.
 */

/**
 * Runs when the document is opened. Creates the add-on menu.
 * @param {Object} e - The onOpen event object.
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createAddonMenu()
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
 */
function showAssessmentSidebar() {
  var html = HtmlService.createTemplateFromFile('UI/Sidebar')
    .evaluate()
    .setTitle(CONFIG.SIDEBAR_TITLE);

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
// These will be replaced in later sessions.

function generateAppendix() {
  DocumentApp.getUi().alert('Appendix generation will be implemented in Session 4.');
}

function syncMarkers() {
  DocumentApp.getUi().alert('Marker sync will be implemented in Session 6.');
}
