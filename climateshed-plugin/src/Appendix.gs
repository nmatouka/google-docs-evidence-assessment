/**
 * Appendix.gs — Generates and formats the Evidence Assessment Appendix
 * at the end of the document.
 */

/**
 * Generates (or regenerates) the evidence assessment appendix.
 * Clears any existing appendix content and rebuilds from stored assessments.
 */
function generateAppendix() {
  return safeExecute(function() {
    var ui = DocumentApp.getUi();
    var assessments = getAllAssessments();

    if (assessments.length === 0) {
      ui.alert(
        'No Assessments',
        'There are no assessments to include in the appendix. Use "Assess Selected Text" to create one.',
        ui.ButtonSet.OK
      );
      return;
    }

    // Quick integrity check — offer to sync if claims or markers are missing
    var integrity = checkMarkerIntegrity();
    if (!integrity.valid) {
      var problems = [];
      if (integrity.missingMarkers.length > 0) {
        problems.push('Marker(s) ' + integrity.missingMarkers.join(', ') + ' are missing or were edited.');
      }
      if (integrity.missingClaims.length > 0) {
        problems.push('The claim text for marker(s) ' + integrity.missingClaims.join(', ') + ' is no longer in the document.');
      }
      var response = ui.alert(
        'Marker Problems',
        problems.join('\n') + '\n\nRun Sync Markers to fix what it can before generating the appendix?',
        ui.ButtonSet.YES_NO
      );
      if (response === ui.Button.YES) {
        renumberAllMarkers();
        assessments = getAllAssessments();
      }
    }

    var body = DocumentApp.getActiveDocument().getBody();
    var appendixIndex = findAppendixSection(body);

    if (appendixIndex !== null) {
      clearAppendixContent(body, appendixIndex);
    } else {
      body.appendPageBreak();
    }

    var heading = body.appendParagraph(CONFIG.APPENDIX_TITLE);
    heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    heading.setAlignment(DocumentApp.HorizontalAlignment.LEFT);

    var timestamp = body.appendParagraph(
      'Generated: ' + new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    );
    timestamp.setFontSize(9);
    timestamp.setForegroundColor('#888888');
    timestamp.setItalic(true);

    body.appendParagraph('');

    for (var i = 0; i < assessments.length; i++) {
      formatAppendixEntry(body, assessments[i], i + 1);
    }

    Logger.log('Appendix generated with ' + assessments.length + ' assessments.');

    ui.alert('Appendix Generated', assessments.length + ' assessment(s) added to the appendix.', ui.ButtonSet.OK);
  }, 'Failed to generate appendix.');
}

/**
 * Searches the document body for the appendix heading.
 * @param {Body} body - The document body.
 * @returns {number|null} The child index of the appendix heading, or null if not found.
 */
function findAppendixSection(body) {
  var numChildren = body.getNumChildren();
  for (var i = 0; i < numChildren; i++) {
    var child = body.getChild(i);
    if (child.getType() === DocumentApp.ElementType.PARAGRAPH
      && child.asParagraph().getText().trim() === CONFIG.APPENDIX_TITLE) {
      return i;
    }
  }
  return null;
}

/**
 * Removes the entire appendix section from the document (heading + all content).
 * Called when the last assessment is deleted.
 */
function removeAppendixSection() {
  try {
    var body = DocumentApp.getActiveDocument().getBody();
    var appendixIndex = findAppendixSection(body);
    if (appendixIndex !== null) {
      clearAppendixContent(body, appendixIndex);
      Logger.log('Appendix section removed.');
    }
  } catch (err) {
    Logger.log('removeAppendixSection error: ' + err.message);
  }
}

/**
 * Removes all content from the appendix heading to the end of the document.
 * @param {Body} body - The document body.
 * @param {number} startIndex - The child index of the appendix heading.
 */
function clearAppendixContent(body, startIndex) {
  // Google Docs requires at least one child in the body at all times.
  // Append a temporary blank paragraph first so we can safely remove everything.
  body.appendParagraph('');

  var numChildren = body.getNumChildren();
  for (var i = numChildren - 2; i >= startIndex; i--) {
    body.removeChild(body.getChild(i));
  }
}

/**
 * Appends an indented detail line under an appendix field.
 * @param {Body} body
 * @param {string} text
 * @param {boolean} italic
 */
function appendDetailLine(body, text, italic) {
  var paragraph = body.appendParagraph('\u2514\u2500 ' + text);
  paragraph.setIndentStart(36);
  paragraph.setFontSize(10);
  paragraph.setForegroundColor('#555555');
  paragraph.setItalic(!!italic);
}

/**
 * Appends a single formatted assessment entry to the document body.
 * @param {Body} body - The document body.
 * @param {Object} assessment - The assessment object.
 * @param {number} displayNumber - The display number (1-based).
 */
function formatAppendixEntry(body, assessment, displayNumber) {
  // Entry heading: [1] Claim text (truncated)
  var claimPreview = assessment.claimText;
  if (claimPreview.length > 80) {
    claimPreview = claimPreview.substring(0, 77) + '...';
  }

  var entryHeading = body.appendParagraph('[' + displayNumber + '] ' + claimPreview);
  entryHeading.setHeading(DocumentApp.ParagraphHeading.HEADING3);
  entryHeading.setForegroundColor('#1a73e8');

  var claimPara = body.appendParagraph('Claim: "' + assessment.claimText + '"');
  claimPara.setItalic(true);
  claimPara.setIndentStart(18);
  claimPara.setFontSize(10);
  claimPara.setForegroundColor('#555555');

  // Evidence quality, sources, notes
  var qualityLabel = EVIDENCE_QUALITY_LABELS[assessment.evidence.quality] || assessment.evidence.quality;
  var evidencePara = body.appendParagraph('Evidence Quality: ' + qualityLabel);
  evidencePara.setIndentStart(18);
  styleFieldLabel(evidencePara, 'Evidence Quality: ');

  (assessment.evidence.sources || []).forEach(function(source) {
    appendDetailLine(body, formatSourceCitation(source), false);
  });

  if (assessment.evidence.notes) {
    appendDetailLine(body, assessment.evidence.notes, true);
  }

  // Agreement
  var agreementLabel = AGREEMENT_LEVEL_LABELS[assessment.agreement.level] || assessment.agreement.level;
  var agreementPara = body.appendParagraph('Agreement: ' + agreementLabel);
  agreementPara.setIndentStart(18);
  styleFieldLabel(agreementPara, 'Agreement: ');

  if (assessment.agreement.notes) {
    appendDetailLine(body, assessment.agreement.notes, true);
  }

  // Overall confidence, color-coded
  var confidenceLabel = CONFIDENCE_LEVEL_LABELS[assessment.confidence.level] || assessment.confidence.level;
  var confPara = body.appendParagraph('Overall Confidence: ' + confidenceLabel);
  confPara.setIndentStart(18);
  styleFieldLabel(confPara, 'Overall Confidence: ');
  var confText = confPara.editAsText();
  var labelLen = 'Overall Confidence: '.length;
  confText.setForegroundColor(labelLen, confPara.getText().length - 1, getConfidenceColor(assessment.confidence.level));
  confText.setBold(labelLen, confPara.getText().length - 1, true);

  if (assessment.confidence.conditional) {
    appendDetailLine(body, 'Conditional on: ' + assessment.confidence.conditional, false);
  }

  // Spacer between entries
  body.appendParagraph('');
}

/**
 * Bolds the label portion of a paragraph (e.g., "Evidence Quality: ").
 * @param {Paragraph} paragraph - The paragraph element.
 * @param {string} labelText - The label text to bold.
 */
function styleFieldLabel(paragraph, labelText) {
  var text = paragraph.editAsText();
  text.setBold(0, labelText.length - 1, true);
  text.setFontSize(11);
}

/**
 * Returns a color hex code based on confidence level.
 * @param {string} level - The confidence level.
 * @returns {string} Hex color code.
 */
function getConfidenceColor(level) {
  switch (level) {
    case 'very-high': return '#137333'; // dark green
    case 'high':      return '#1e8e3e'; // green
    case 'medium':    return '#e37400'; // orange
    case 'low':       return '#d93025'; // red
    case 'very-low':  return '#a50e0e'; // dark red
    default:          return '#333333';
  }
}
