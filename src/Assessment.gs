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

    Logger.log('getSelectedText called. Selection exists: ' + (selection !== null));

    if (!selection) {
      // Fall back to cursor position — user may have clicked without dragging
      var cursor = doc.getCursor();
      Logger.log('No selection. Cursor exists: ' + (cursor !== null));
      if (cursor) {
        var surroundingText = cursor.getSurroundingText();
        if (surroundingText) {
          var text = surroundingText.getText();
          Logger.log('Cursor surrounding text: "' + text + '"');
        }
      }
      return null;
    }

    var elements = selection.getRangeElements();
    Logger.log('Range elements count: ' + elements.length);

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

      Logger.log('Element ' + i + ' type: ' + el.getType());

      // Get text content — handle both TEXT and PARAGRAPH elements
      var textEl;
      if (el.getType() === DocumentApp.ElementType.TEXT) {
        textEl = el;
      } else if (el.getType() === DocumentApp.ElementType.PARAGRAPH ||
                 el.getType() === DocumentApp.ElementType.LIST_ITEM) {
        // When a full paragraph is selected, the element is the paragraph itself
        textEl = el.editAsText();
      } else {
        Logger.log('Skipping unsupported element type: ' + el.getType());
        continue;
      }

      var text = textEl.getText();

      if (element.isPartial()) {
        text = text.substring(element.getStartOffset(), element.getEndOffsetInclusive() + 1);
        endOffset = element.getEndOffsetInclusive();
      } else {
        endOffset = text.length - 1;
      }

      // Get paragraph index — walk up to find direct child of body
      if (i === 0) {
        try {
          var body = doc.getBody();
          var parent = el;
          // Walk up until we find a direct child of body
          while (parent.getParent() && parent.getParent().getType() !== DocumentApp.ElementType.BODY_SECTION) {
            parent = parent.getParent();
          }
          paragraphIndex = body.getChildIndex(parent);
        } catch (indexErr) {
          Logger.log('Could not get paragraph index: ' + indexErr.message);
          paragraphIndex = 0;
        }
      }

      if (text) {
        textParts.push(text);
      }
    }

    var fullText = textParts.join(' ').trim();
    Logger.log('Extracted text: "' + fullText.substring(0, 100) + '"');

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
    Logger.log('getSelectedText error: ' + err.message + '\n' + err.stack);
    return null;
  }
}

/**
 * Inserts a superscript marker number at the end of the assessed claim in the document.
 * @param {number} markerNumber - The marker number to insert.
 * @param {Object} location - { paragraphIndex, endOffset } from the assessment.
 * @returns {boolean} True if marker was inserted successfully.
 */
function insertMarker(markerNumber, location) {
  try {
    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();
    var paragraph = body.getChild(location.paragraphIndex);

    if (!paragraph) {
      Logger.log('insertMarker: paragraph not found at index ' + location.paragraphIndex);
      return false;
    }

    var text = paragraph.editAsText();
    var markerText = toSuperscript(markerNumber);

    // Insert the superscript marker right after the end of the selection
    var insertPos = location.endOffset + 1;
    var currentText = text.getText();

    if (insertPos > currentText.length) {
      insertPos = currentText.length;
    }

    text.insertText(insertPos, markerText);

    // Style the inserted marker: make it superscript-sized and colored
    text.setFontSize(insertPos, insertPos + markerText.length - 1, 8);
    text.setForegroundColor(insertPos, insertPos + markerText.length - 1, '#1a73e8');
    text.setBold(insertPos, insertPos + markerText.length - 1, true);

    Logger.log('Marker ' + markerNumber + ' inserted at paragraph ' + location.paragraphIndex + ', offset ' + insertPos);
    return true;
  } catch (err) {
    Logger.log('insertMarker error: ' + err.message + '\n' + err.stack);
    return false;
  }
}

/**
 * Removes a marker from the document by searching for its superscript text.
 * @param {number} markerNumber - The marker number to remove.
 * @returns {boolean} True if marker was found and removed.
 */
function removeMarker(markerNumber) {
  try {
    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();
    var markerText = toSuperscript(markerNumber);

    var found = body.findText(markerText);
    if (found) {
      var element = found.getElement().asText();
      var start = found.getStartOffset();
      var end = found.getEndOffsetInclusive();
      element.deleteText(start, end);
      Logger.log('Marker ' + markerNumber + ' removed from document.');
      return true;
    }

    Logger.log('Marker ' + markerNumber + ' not found in document.');
    return false;
  } catch (err) {
    Logger.log('removeMarker error: ' + err.message + '\n' + err.stack);
    return false;
  }
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

    // Save to storage
    var assessments = loadAssessments();
    assessments.push(assessment);
    saveAssessments(assessments);

    // Insert superscript marker in the document
    insertMarker(markerNumber, assessment.location);

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

    // Remove marker from document
    removeMarker(assessment.markerNumber);

    // Delete from storage
    var deleted = deleteAssessment(id);
    if (!deleted) {
      return { success: false, error: 'Failed to delete assessment from storage.' };
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
  var assessments = loadAssessments();
  assessments.sort(function(a, b) {
    return (a.markerNumber || 0) - (b.markerNumber || 0);
  });
  return assessments;
}
