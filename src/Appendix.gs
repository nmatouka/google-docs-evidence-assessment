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
    var assessments = getAllAssessments();

    if (assessments.length === 0) {
      DocumentApp.getUi().alert(
        'No Assessments',
        'There are no assessments to include in the appendix. Use "Assess Selected Text" to create one.',
        DocumentApp.getUi().ButtonSet.OK
      );
      return;
    }

    // Quick integrity check — warn if markers are missing
    var integrity = checkMarkerIntegrity();
    if (!integrity.valid) {
      var ui = DocumentApp.getUi();
      var response = ui.alert(
        'Missing Markers',
        'Marker(s) ' + integrity.missingMarkers.join(', ') + ' not found in the document.\n\n'
          + 'Would you like to run Sync Markers to fix this before generating the appendix?',
        ui.ButtonSet.YES_NO
      );
      if (response === ui.Button.YES) {
        renumberAllMarkers();
        // Reload assessments after renumber
        assessments = getAllAssessments();
      }
    }

    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();

    // Find or create the appendix section
    var appendixIndex = findAppendixSection(body);

    if (appendixIndex !== null) {
      // Clear existing appendix content (everything from the heading onward)
      clearAppendixContent(body, appendixIndex);
    }

    // Add a page break before the appendix if it's new
    if (appendixIndex === null) {
      body.appendPageBreak();
    }

    // Add appendix heading
    var heading = body.appendParagraph(CONFIG.APPENDIX_TITLE);
    heading.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    heading.setAlignment(DocumentApp.HorizontalAlignment.LEFT);

    // Add generation timestamp
    var timestamp = body.appendParagraph(
      'Generated: ' + new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    );
    timestamp.setFontSize(9);
    timestamp.setForegroundColor('#888888');
    timestamp.setItalic(true);

    // Add a blank line
    body.appendParagraph('');

    // Generate each assessment entry
    for (var i = 0; i < assessments.length; i++) {
      formatAppendixEntry(body, assessments[i], i + 1);
    }

    Logger.log('Appendix generated with ' + assessments.length + ' assessments.');

    DocumentApp.getUi().alert(
      'Appendix Generated',
      assessments.length + ' assessment(s) added to the appendix.',
      DocumentApp.getUi().ButtonSet.OK
    );
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
    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      var text = child.asParagraph().getText().trim();
      if (text === CONFIG.APPENDIX_TITLE) {
        return i;
      }
    }
  }
  return null;
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

  // Full claim text (italic)
  var claimPara = body.appendParagraph('Claim: "' + assessment.claimText + '"');
  claimPara.setItalic(true);
  claimPara.setIndentStart(18);
  claimPara.setFontSize(10);
  claimPara.setForegroundColor('#555555');

  // Evidence Quality
  var qualityLabel = EVIDENCE_QUALITY_LABELS[assessment.evidence.quality] || assessment.evidence.quality;
  var evidencePara = body.appendParagraph('Evidence Quality: ' + qualityLabel);
  evidencePara.setIndentStart(18);
  styleFieldLabel(evidencePara, 'Evidence Quality: ');

  // Sources
  if (assessment.evidence.sources && assessment.evidence.sources.length > 0) {
    for (var s = 0; s < assessment.evidence.sources.length; s++) {
      var sourcePara = body.appendParagraph('\u2514\u2500 ' + assessment.evidence.sources[s]);
      sourcePara.setIndentStart(36);
      sourcePara.setFontSize(10);
      sourcePara.setForegroundColor('#555555');
    }
  }

  // Evidence notes
  if (assessment.evidence.notes) {
    var notesPara = body.appendParagraph('\u2514\u2500 ' + assessment.evidence.notes);
    notesPara.setIndentStart(36);
    notesPara.setFontSize(10);
    notesPara.setForegroundColor('#555555');
    notesPara.setItalic(true);
  }

  // Agreement Level
  var agreementLabel = AGREEMENT_LEVEL_LABELS[assessment.agreement.level] || assessment.agreement.level;
  var agreementPara = body.appendParagraph('Agreement: ' + agreementLabel);
  agreementPara.setIndentStart(18);
  styleFieldLabel(agreementPara, 'Agreement: ');

  // Agreement notes
  if (assessment.agreement.notes) {
    var agrNotesPara = body.appendParagraph('\u2514\u2500 ' + assessment.agreement.notes);
    agrNotesPara.setIndentStart(36);
    agrNotesPara.setFontSize(10);
    agrNotesPara.setForegroundColor('#555555');
    agrNotesPara.setItalic(true);
  }

  // Overall Confidence
  var confidenceLabel = CONFIDENCE_LEVEL_LABELS[assessment.confidence.level] || assessment.confidence.level;
  var confPara = body.appendParagraph('Overall Confidence: ' + confidenceLabel);
  confPara.setIndentStart(18);
  styleFieldLabel(confPara, 'Overall Confidence: ');
  // Color-code confidence
  var confColor = getConfidenceColor(assessment.confidence.level);
  var confText = confPara.editAsText();
  var labelLen = 'Overall Confidence: '.length;
  confText.setForegroundColor(labelLen, confPara.getText().length - 1, confColor);
  confText.setBold(labelLen, confPara.getText().length - 1, true);

  // Conditional statement
  if (assessment.confidence.conditional) {
    var condPara = body.appendParagraph('\u2514\u2500 Conditional on: ' + assessment.confidence.conditional);
    condPara.setIndentStart(36);
    condPara.setFontSize(10);
    condPara.setForegroundColor('#555555');
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
