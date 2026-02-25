/**
 * Assessment.gs — Core assessment CRUD operations.
 */

/**
 * Gets the currently selected text in the document.
 * @returns {Object|null} { text, paragraphIndex, startOffset, endOffset } or null.
 */
function getSelectedText() {
  try {
    var doc = DocumentApp.getActiveDocument();
    var selection = doc.getSelection();

    if (!selection) {
      return null;
    }

    var elements = selection.getRangeElements();
    if (elements.length === 0) {
      return null;
    }

    var textParts = [];
    var firstElement = elements[0];
    var startOffset = firstElement.isPartial() ? firstElement.getStartOffset() : 0;
    var endOffset = 0;
    var paragraphIndex = 0;

    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      var el = element.getElement();

      // Handle TEXT, PARAGRAPH, and LIST_ITEM elements
      var textEl;
      if (el.getType() === DocumentApp.ElementType.TEXT) {
        textEl = el;
      } else if (el.getType() === DocumentApp.ElementType.PARAGRAPH ||
                 el.getType() === DocumentApp.ElementType.LIST_ITEM) {
        textEl = el.editAsText();
      } else {
        continue;
      }

      var text = textEl.getText();

      if (element.isPartial()) {
        text = text.substring(element.getStartOffset(), element.getEndOffsetInclusive() + 1);
        endOffset = element.getEndOffsetInclusive();
      } else {
        endOffset = text.length - 1;
      }

      // Walk up to find the direct child of body for paragraph index
      if (i === 0) {
        try {
          var body = doc.getBody();
          var parent = el;
          while (parent.getParent() && parent.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) {
            parent = parent.getParent();
          }
          paragraphIndex = body.getChildIndex(parent);
        } catch (indexErr) {
          paragraphIndex = 0;
        }
      }

      if (text) {
        textParts.push(text);
      }
    }

    var fullText = textParts.join(' ').trim();
    if (!fullText) {
      return null;
    }

    return {
      text: fullText,
      paragraphIndex: paragraphIndex,
      startOffset: startOffset,
      endOffset: endOffset
    };
  } catch (err) {
    Logger.log('getSelectedText error: ' + err.message);
    return null;
  }
}

/**
 * Builds the marker text to insert for a given assessment and doc config.
 * Superscript mode: returns Unicode superscript digits (e.g. "¹").
 * Parenthetical mode: returns formatted string (e.g. "(high confidence)").
 * @param {Object} assessment - The assessment object.
 * @param {Object} docConfig - The per-document config from loadDocConfig().
 * @returns {string} The marker text to insert.
 */
function buildMarkerText(assessment, docConfig) {
  if (!docConfig || docConfig.citationStyle !== CITATION_STYLE.PARENTHETICAL) {
    return toSuperscript(assessment.markerNumber);
  }

  var open = docConfig.parentheticalBracket === PARENTHETICAL_BRACKET.CURLY ? '{' : '(';
  var close = docConfig.parentheticalBracket === PARENTHETICAL_BRACKET.CURLY ? '}' : ')';

  var qualityLabels = {
    limited: 'limited evidence',
    medium: 'medium evidence',
    robust: 'robust evidence'
  };
  var agreementLabels = {
    low: 'low agreement',
    medium: 'medium agreement',
    high: 'high agreement'
  };

  var conf = (CONFIDENCE_LEVEL_LABELS[assessment.confidence.level] || assessment.confidence.level).toLowerCase();
  var detail = docConfig.parentheticalDetail || PARENTHETICAL_DETAIL.CONFIDENCE;

  if (detail === PARENTHETICAL_DETAIL.CONFIDENCE) {
    return open + conf + ' confidence' + close;
  }

  var qual = qualityLabels[assessment.evidence.quality] || assessment.evidence.quality;
  var agr = agreementLabels[assessment.agreement.level] || assessment.agreement.level;

  if (detail === PARENTHETICAL_DETAIL.EVIDENCE_AGREEMENT) {
    return open + qual + ', ' + agr + close;
  }

  // FULL: evidence + agreement + confidence
  return open + qual + ', ' + agr + ', ' + conf + ' confidence' + close;
}

/**
 * Inserts a marker string at the end of the assessed claim in the document.
 * @param {string} markerText - The text to insert (superscript chars or parenthetical string).
 * @param {Object} location - { paragraphIndex, endOffset } from the assessment.
 * @param {boolean} isParenthetical - If true, style as italic gray body text instead of small blue superscript.
 * @returns {boolean} True if marker was inserted successfully.
 */
function insertMarker(markerText, location, isParenthetical) {
  try {
    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();
    var paragraph = body.getChild(location.paragraphIndex);

    if (!paragraph) {
      Logger.log('insertMarker: paragraph not found at index ' + location.paragraphIndex);
      return false;
    }

    var text = paragraph.editAsText();

    // Insert a space before parenthetical markers for readability
    var prefix = isParenthetical ? ' ' : '';
    var fullInsert = prefix + markerText;

    var insertPos = location.endOffset + 1;
    var currentText = text.getText();

    if (insertPos > currentText.length) {
      insertPos = currentText.length;
    }

    text.insertText(insertPos, fullInsert);

    var markerStart = insertPos + prefix.length;
    var markerEnd = insertPos + fullInsert.length - 1;

    if (isParenthetical) {
      // Parenthetical style: body font size, gray, italic
      text.setForegroundColor(markerStart, markerEnd, '#555555');
      text.setItalic(markerStart, markerEnd, true);
      text.setBold(markerStart, markerEnd, false);
    } else {
      // Superscript style: 8pt, blue, bold
      text.setFontSize(markerStart, markerEnd, 8);
      text.setForegroundColor(markerStart, markerEnd, '#1a73e8');
      text.setBold(markerStart, markerEnd, true);
    }

    Logger.log('Marker "' + markerText + '" inserted at paragraph ' + location.paragraphIndex + ', offset ' + insertPos);
    return true;
  } catch (err) {
    Logger.log('insertMarker error: ' + err.message + '\n' + err.stack);
    return false;
  }
}

/**
 * Removes a marker from the document by searching for its exact text.
 * Works for both superscript (e.g. "¹") and parenthetical (e.g. "(high confidence)") markers.
 * For parenthetical markers, also removes the leading space that was inserted before them.
 * @param {string} markerText - The exact marker text to find and remove.
 * @returns {boolean} True if marker was found and removed.
 */
function removeMarker(markerText) {
  try {
    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();

    // For parenthetical markers, search including the leading space so we remove it too
    var searchText = markerText;
    var isParenthetical = markerText.charAt(0) === '(' || markerText.charAt(0) === '{';
    if (isParenthetical) {
      searchText = ' ' + markerText;
    }

    var found = body.findText(searchText);
    if (found) {
      var element = found.getElement().asText();
      var start = found.getStartOffset();
      var end = found.getEndOffsetInclusive();
      element.deleteText(start, end);
      Logger.log('Marker "' + markerText + '" removed from document.');
      return true;
    }

    // Fallback: try without leading space (in case it wasn't inserted with one)
    if (isParenthetical) {
      found = body.findText(markerText);
      if (found) {
        var el = found.getElement().asText();
        el.deleteText(found.getStartOffset(), found.getEndOffsetInclusive());
        Logger.log('Marker "' + markerText + '" removed (no-space fallback).');
        return true;
      }
    }

    Logger.log('Marker "' + markerText + '" not found in document.');
    return false;
  } catch (err) {
    Logger.log('removeMarker error: ' + err.message + '\n' + err.stack);
    return false;
  }
}

/**
 * Gets the marker text for an assessment, using the stored markerText field if available,
 * falling back to toSuperscript(markerNumber) for backward compatibility with older assessments.
 * @param {Object} assessment - The assessment object.
 * @returns {string} The marker text currently in (or expected in) the document.
 */
function getAssessmentMarkerText(assessment) {
  return assessment.markerText || toSuperscript(assessment.markerNumber);
}

/**
 * Validates form data for required fields.
 * @param {Object} formData - The form data from the sidebar.
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateAssessment(formData) {
  var errors = [];

  if (!formData.claimText || !formData.claimText.trim()) {
    errors.push('Claim text is required.');
  }

  if (!formData.evidence || !formData.evidence.quality) {
    errors.push('Evidence quality is required.');
  }

  if (!formData.agreement || !formData.agreement.level) {
    errors.push('Agreement level is required.');
  }

  if (!formData.confidence || !formData.confidence.level) {
    errors.push('Confidence level is required.');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Creates a new assessment from sidebar form data.
 * Called from client-side JS via google.script.run.
 * @param {Object} formData - The form data.
 * @returns {Object} { success: boolean, id: string, error: string }
 */
function handleCreateAssessment(formData) {
  return safeExecute(function() {
    // Validate
    var validation = validateAssessment(formData);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' ') };
    }

    var markerNumber = getNextMarkerNumber();
    var docConfig = loadDocConfig();

    var assessment = {
      id: generateId(),
      claimText: formData.claimText.trim(),
      markerNumber: markerNumber,
      location: formData.location || { paragraphIndex: 0, startOffset: 0, endOffset: 0 },
      evidence: {
        quality: formData.evidence.quality,
        sources: formData.evidence.sources || [],
        notes: formData.evidence.notes || ''
      },
      agreement: {
        level: formData.agreement.level,
        notes: formData.agreement.notes || ''
      },
      confidence: {
        level: formData.confidence.level,
        conditional: formData.confidence.conditional || ''
      },
      metadata: {
        createdAt: nowISO(),
        createdBy: getCurrentUserEmail(),
        lastModified: nowISO()
      }
    };

    // Compute and store the marker text for this citation style
    assessment.markerText = buildMarkerText(assessment, docConfig);

    // Save to storage
    var assessments = loadAssessments();
    assessments.push(assessment);
    saveAssessments(assessments);

    // Insert marker in the document
    var isParenthetical = docConfig.citationStyle === CITATION_STYLE.PARENTHETICAL;
    insertMarker(assessment.markerText, assessment.location, isParenthetical);

    Logger.log('Assessment created: ' + assessment.id + ' (marker #' + markerNumber + ')');

    return { success: true, id: assessment.id, markerNumber: markerNumber };
  }, 'Failed to create assessment.');
}

/**
 * Updates an existing assessment from sidebar form data.
 * Called from client-side JS via google.script.run.
 * @param {string} id - The assessment UUID.
 * @param {Object} formData - The updated form data.
 * @returns {Object} { success: boolean, error: string }
 */
function handleUpdateAssessment(id, formData) {
  return safeExecute(function() {
    var validation = validateAssessment(formData);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' ') };
    }

    // Get the current assessment before updating (needed for old marker text)
    var existing = getAssessmentById(id);
    if (!existing) {
      return { success: false, error: 'Assessment not found.' };
    }
    var oldMarkerText = getAssessmentMarkerText(existing);

    var updated = updateAssessment(id, {
      claimText: formData.claimText.trim(),
      evidence: {
        quality: formData.evidence.quality,
        sources: formData.evidence.sources || [],
        notes: formData.evidence.notes || ''
      },
      agreement: {
        level: formData.agreement.level,
        notes: formData.agreement.notes || ''
      },
      confidence: {
        level: formData.confidence.level,
        conditional: formData.confidence.conditional || ''
      }
    });

    if (!updated) {
      return { success: false, error: 'Assessment not found.' };
    }

    // In parenthetical mode the marker text encodes confidence/evidence/agreement,
    // so it may need to change when those fields are edited.
    var docConfig = loadDocConfig();
    var newMarkerText = buildMarkerText(updated, docConfig);
    if (newMarkerText !== oldMarkerText) {
      removeMarker(oldMarkerText);
      var isParenthetical = docConfig.citationStyle === CITATION_STYLE.PARENTHETICAL;
      insertMarker(newMarkerText, updated.location, isParenthetical);
      // Persist the updated markerText
      updateAssessment(id, { markerText: newMarkerText });
    }

    Logger.log('Assessment updated: ' + id);
    return { success: true };
  }, 'Failed to update assessment.');
}

/**
 * Deletes an assessment and returns the result.
 * Called from client-side JS via google.script.run.
 * @param {string} id - The assessment UUID.
 * @returns {Object} { success: boolean, error: string }
 */
function handleDeleteAssessment(id) {
  return safeExecute(function() {
    // Get the assessment first so we can remove its marker
    var assessment = getAssessmentById(id);
    if (!assessment) {
      return { success: false, error: 'Assessment not found.' };
    }

    // Remove marker from document (works for both superscript and parenthetical)
    removeMarker(getAssessmentMarkerText(assessment));

    // Delete from storage
    var deleted = deleteAssessment(id);
    if (!deleted) {
      return { success: false, error: 'Failed to delete assessment from storage.' };
    }

    // If assessments remain, renumber markers; otherwise remove the appendix
    var remaining = loadAssessments();
    if (remaining.length > 0) {
      renumberAllMarkers();
    } else {
      removeAppendixSection();
    }

    Logger.log('Assessment deleted: ' + id);
    return { success: true };
  }, 'Failed to delete assessment.');
}

/**
 * Returns all assessments sorted by marker number.
 * Called from manager dialog.
 * @returns {Object[]} Sorted assessment array.
 */
function getAllAssessments() {
  return safeExecute(function() {
    var assessments = loadAssessments();
    assessments.sort(function(a, b) {
      return (a.markerNumber || 0) - (b.markerNumber || 0);
    });
    return assessments;
  }, 'Failed to load assessments.') || [];
}

/**
 * Scrolls the document cursor to the marker location for a given assessment.
 * Called from the manager dialog's "Jump to Claim" action.
 * @param {string} assessmentId - The assessment UUID.
 * @returns {Object} { success: boolean, error: string }
 */
function jumpToAssessmentMarker(assessmentId) {
  return safeExecute(function() {
    var assessment = getAssessmentById(assessmentId);
    if (!assessment) {
      return { success: false, error: 'Assessment not found.' };
    }

    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();

    // Search for the marker using stored text (supports both superscript and parenthetical)
    var searchText = getAssessmentMarkerText(assessment);
    // Parenthetical markers were inserted with a leading space; include it in the search
    var isParenthetical = searchText.charAt(0) === '(' || searchText.charAt(0) === '{';
    var found = body.findText(isParenthetical ? ' ' + searchText : searchText);
    if (!found) {
      return { success: false, error: 'Marker not found in document. Try Sync Markers.' };
    }

    var element = found.getElement();
    var offset = found.getStartOffset();
    var position = doc.newPosition(element, offset);
    doc.setCursorPosition(position);

    return { success: true };
  }, 'Failed to jump to marker.');
}

/**
 * Renumbers all markers sequentially (1, 2, 3...) based on document order.
 * Removes old markers from the document, reassigns numbers, and inserts new ones.
 * @returns {Object} { total, updated, errors[] }
 */
function renumberAllMarkers() {
  var assessments = loadAssessments();
  var errors = [];
  var updated = 0;

  if (assessments.length === 0) {
    return { total: 0, updated: 0, errors: [] };
  }

  // Sort by document position (paragraph index, then start offset)
  assessments.sort(function(a, b) {
    var locA = a.location || {};
    var locB = b.location || {};
    if ((locA.paragraphIndex || 0) !== (locB.paragraphIndex || 0)) {
      return (locA.paragraphIndex || 0) - (locB.paragraphIndex || 0);
    }
    return (locA.startOffset || 0) - (locB.startOffset || 0);
  });

  var docConfig = loadDocConfig();
  var isParenthetical = docConfig.citationStyle === CITATION_STYLE.PARENTHETICAL;

  // First pass: remove all existing markers from the document
  for (var i = 0; i < assessments.length; i++) {
    removeMarker(getAssessmentMarkerText(assessments[i]));
  }

  // Second pass: assign new sequential numbers and insert markers
  for (var j = 0; j < assessments.length; j++) {
    var newNumber = j + 1;
    var oldNum = assessments[j].markerNumber;

    if (oldNum !== newNumber) {
      updated++;
    }

    assessments[j].markerNumber = newNumber;
    assessments[j].metadata = assessments[j].metadata || {};
    assessments[j].metadata.lastModified = nowISO();

    // Recompute marker text for new number / current style
    assessments[j].markerText = buildMarkerText(assessments[j], docConfig);

    // Insert the new marker
    var inserted = insertMarker(assessments[j].markerText, assessments[j].location, isParenthetical);
    if (!inserted) {
      errors.push('Could not insert marker ' + newNumber + ' for "' +
        assessments[j].claimText.substring(0, 40) + '..."');
    }
  }

  // Save updated assessments
  saveAssessments(assessments);

  Logger.log('Renumber complete: ' + assessments.length + ' assessments, ' + updated + ' renumbered, ' + errors.length + ' errors.');
  return { total: assessments.length, updated: updated, errors: errors };
}

/**
 * Checks document integrity: finds orphaned markers and missing markers.
 * Called before appendix generation for a quick sanity check.
 * @returns {Object} { valid, orphanedMarkers[], missingMarkers[] }
 */
function checkMarkerIntegrity() {
  var assessments = loadAssessments();
  var doc = DocumentApp.getActiveDocument();
  var body = doc.getBody();
  var missingMarkers = [];

  // Check each assessment's marker exists in the document
  for (var i = 0; i < assessments.length; i++) {
    var markerText = getAssessmentMarkerText(assessments[i]);
    // Parenthetical markers are preceded by a space; search with it included
    var isParenthetical = markerText.charAt(0) === '(' || markerText.charAt(0) === '{';
    var found = body.findText(isParenthetical ? ' ' + markerText : markerText);
    if (!found) {
      missingMarkers.push(assessments[i].markerNumber);
    }
  }

  return {
    valid: missingMarkers.length === 0,
    missingMarkers: missingMarkers
  };
}

/**
 * Converts all existing markers in the document to a new citation style.
 * Called from the Citation Style settings dialog when the user clicks Apply.
 * @param {string} newStyle - 'superscript' or 'parenthetical'.
 * @param {string} newDetail - 'confidence', 'evidence-agreement', or 'full'.
 * @param {string} newBracket - 'parentheses' or 'curly'.
 * @returns {Object} { success: boolean, converted: number, errors: string[] }
 */
function convertMarkerStyle(newStyle, newDetail, newBracket) {
  return safeExecute(function() {
    var assessments = loadAssessments();
    var newConfig = {
      citationStyle: newStyle,
      parentheticalDetail: newDetail || PARENTHETICAL_DETAIL.CONFIDENCE,
      parentheticalBracket: newBracket || PARENTHETICAL_BRACKET.PARENTHESES
    };
    var isParenthetical = newStyle === CITATION_STYLE.PARENTHETICAL;
    var errors = [];

    for (var i = 0; i < assessments.length; i++) {
      var a = assessments[i];

      // Remove old marker using stored text (backward-compat fallback to superscript)
      removeMarker(getAssessmentMarkerText(a));

      // Compute and insert new marker text
      var newText = buildMarkerText(a, newConfig);
      var inserted = insertMarker(newText, a.location, isParenthetical);
      if (!inserted) {
        errors.push('Could not insert marker for "' + a.claimText.substring(0, 40) + '..."');
      }

      a.markerText = newText;
    }

    saveDocConfig(newConfig);
    saveAssessments(assessments);

    Logger.log('convertMarkerStyle: converted ' + assessments.length + ' markers to ' + newStyle);
    return { success: true, converted: assessments.length, errors: errors };
  }, 'Failed to convert marker style.');
}
