/**
 * Code.gs — Entry point. Menu registration, sidebar/dialog launchers.
 */

/**
 * Runs when the document is opened. Creates a top-level menu.
 * @param {Object} e - The onOpen event object.
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createMenu(CONFIG.ADDON_NAME)
    .addItem('Assess Selected Text', 'showAssessmentSidebar')
    .addItem('Suggest Sentences to Check', 'showSuggestionsSidebar')
    .addItem('Manage Assessments', 'showManager')
    .addSeparator()
    .addItem('Generate Appendix', 'generateAppendix')
    .addSeparator()
    .addItem('Sync Markers', 'syncMarkers')
    .addItem('Citation Style', 'showCitationStyleDialog')
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
 * Serializes a value for a <script> block in a templated HTML file.
 * JSON.stringify leaves "<" unescaped, so claim text or notes containing
 * "</script>" could otherwise end the script element and inject markup.
 * @param {*} value
 * @returns {string} JSON safe to print with <?!= ?>.
 */
function toScriptJson(value) {
  return JSON.stringify(value === undefined ? null : value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Builds the assessment sidebar.
 * @param {Object|null} selectionData - { pendingRangeName, text } for a new claim, or { text } when editing.
 * @param {Object|null} editData - The assessment being edited, or null.
 * @returns {HtmlOutput}
 */
function buildSidebar(selectionData, editData) {
  var template = HtmlService.createTemplateFromFile('UI/Sidebar');
  template.selectionData = toScriptJson(selectionData);
  template.editData = toScriptJson(editData);
  template.maxSources = toScriptJson(CONFIG.MAX_SOURCES);
  return template.evaluate().setTitle(editData ? 'Edit Assessment' : CONFIG.SIDEBAR_TITLE);
}

/**
 * Opens the assessment sidebar for the current selection.
 * If nothing is selected, the sidebar shows a Capture Selection button.
 */
function showAssessmentSidebar() {
  DocumentApp.getUi().showSidebar(buildSidebar(captureSelectionForSidebar(), null));
}

/**
 * Opens the Sentences to Check sidebar. Nothing is read or sent until the
 * document's setting is on and someone starts a scan (see Suggestions.gs).
 */
function showSuggestionsSidebar() {
  var template = HtmlService.createTemplateFromFile('UI/Suggestions');
  template.kindLabels = toScriptJson(SENTENCE_KIND_LABELS);
  DocumentApp.getUi().showSidebar(template.evaluate().setTitle('Sentences to Check'));
}

/**
 * Tidies leftover anchors, then anchors the current selection as a pending claim.
 * Errors are logged rather than shown, so the sidebar still opens and the
 * author can use Capture Selection.
 * @returns {Object|null} { pendingRangeName, text } or null.
 */
function captureSelectionForSidebar() {
  try {
    return withDocumentLock(function() {
      cleanupOrphanedAnchors(DocumentApp.getActiveDocument(), loadAssessments());
      return capturePendingClaim();
    });
  } catch (err) {
    Logger.log('captureSelectionForSidebar error: ' + err.message);
    return null;
  }
}

/**
 * Anchors the current selection. Called from the sidebar's Capture Selection button.
 * @returns {Object|null} { pendingRangeName, text } or null.
 */
function captureSelection() {
  return capturePendingClaim();
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
  DocumentApp.getUi().showSidebar(buildSidebar({ text: assessment.claimText }, assessment));
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
 * Renumbers markers in document order, restores missing ones, and reports problems.
 */
function syncMarkers() {
  return safeExecute(function() {
    var result = withDocumentLock(function() {
      cleanupOrphanedAnchors(DocumentApp.getActiveDocument(), loadAssessments());
      return renumberAllMarkers();
    });
    var ui = DocumentApp.getUi();

    if (result.errors.length > 0) {
      ui.alert(
        'Sync Complete (with issues)',
        'Updated ' + result.updated + ' marker(s).\n\n'
          + 'Issues found:\n' + result.errors.join('\n'),
        ui.ButtonSet.OK
      );
    } else if (result.updated > 0) {
      ui.alert('Markers Synced', 'Successfully updated ' + result.updated + ' marker(s).', ui.ButtonSet.OK);
    } else {
      ui.alert('Markers OK', 'All ' + result.total + ' marker(s) are already in order.', ui.ButtonSet.OK);
    }
  }, 'Failed to sync markers.');
}

/**
 * Opens the Citation Style settings dialog.
 * Lets users switch between superscript and IPCC parenthetical marker modes.
 */
function showCitationStyleDialog() {
  var template = HtmlService.createTemplateFromFile('UI/CitationStyle');
  template.currentConfig = toScriptJson(loadDocConfig());
  var html = template.evaluate().setWidth(440).setHeight(360);
  DocumentApp.getUi().showModalDialog(html, 'Citation Style');
}

/**
 * Shows a quick-reference help dialog.
 */
function showHelp() {
  var html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:13px;padding:8px;">'
    + '<h3 style="color:#1a73e8;margin-top:0;">' + CONFIG.ADDON_NAME + ' v' + CONFIG.VERSION + '</h3>'
    + '<p>Systematic IPCC-style uncertainty communication for policy documents.</p>'
    + '<h4 style="margin-bottom:4px;">Quick Start</h4>'
    + '<ol style="padding-left:20px;">'
    + '<li>Highlight a claim in your document</li>'
    + '<li>Click <b>' + CONFIG.ADDON_NAME + ' → Assess Selected Text</b></li>'
    + '<li>Add sources, then rate evidence quality, agreement, and confidence</li>'
    + '<li>Click Save — a marker appears after the claim</li>'
    + '<li><b>' + CONFIG.ADDON_NAME + ' → Generate Appendix</b> to create the summary</li>'
    + '</ol>'
    + '<h4 style="margin-bottom:4px;">Menu Items</h4>'
    + '<ul style="padding-left:20px;">'
    + '<li><b>Assess Selected Text</b> — Open the assessment sidebar</li>'
    + '<li><b>Suggest Sentences to Check</b> — Find sentences worth assessing (off until turned on for the document)</li>'
    + '<li><b>Manage Assessments</b> — View, edit, or delete assessments</li>'
    + '<li><b>Generate Appendix</b> — Create/update the evidence appendix</li>'
    + '<li><b>Sync Markers</b> — Renumber markers in document order and restore missing ones</li>'
    + '</ul>'
    + '<h4 style="margin-bottom:4px;">Tips</h4>'
    + '<ul style="padding-left:20px;">'
    + '<li>Markers stay attached to their claims as you edit the document</li>'
    + '<li>Regenerate the appendix after editing assessments</li>'
    + '<li>Don\'t manually edit the appendix — it will be overwritten</li>'
    + '</ul>'
    + '</div>'
  )
  .setWidth(400)
  .setHeight(420);

  DocumentApp.getUi().showModalDialog(html, 'Help — ' + CONFIG.ADDON_NAME);
}
