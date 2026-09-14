/**
 * Assessment.gs — Assessment create/update/delete, markers, and renumbering.
 * Claims and markers are located through named ranges (see Anchors.gs).
 */

/**
 * @param {Object} docConfig - From loadDocConfig().
 * @returns {boolean} True if markers use the IPCC parenthetical style.
 */
function isParentheticalStyle(docConfig) {
  return !!docConfig && docConfig.citationStyle === CITATION_STYLE.PARENTHETICAL;
}

/**
 * Builds the marker text for an assessment.
 * Superscript mode: Unicode superscript digits (e.g. "¹").
 * Parenthetical mode: e.g. "(high confidence)".
 * @param {Object} assessment
 * @param {Object} docConfig - From loadDocConfig().
 * @returns {string}
 */
function buildMarkerText(assessment, docConfig) {
  if (!isParentheticalStyle(docConfig)) {
    return toSuperscript(assessment.markerNumber);
  }

  var curly = docConfig.parentheticalBracket === PARENTHETICAL_BRACKET.CURLY;
  var open = curly ? '{' : '(';
  var close = curly ? '}' : ')';

  var confidence = lowerCaseLabel(CONFIDENCE_LEVEL_LABELS, assessment.confidence.level) + ' confidence';
  var detail = docConfig.parentheticalDetail || PARENTHETICAL_DETAIL.CONFIDENCE;
  if (detail === PARENTHETICAL_DETAIL.CONFIDENCE) {
    return open + confidence + close;
  }

  var evidenceAndAgreement = lowerCaseLabel(EVIDENCE_QUALITY_LABELS, assessment.evidence.quality) + ' evidence, '
    + lowerCaseLabel(AGREEMENT_LEVEL_LABELS, assessment.agreement.level) + ' agreement';
  if (detail === PARENTHETICAL_DETAIL.EVIDENCE_AGREEMENT) {
    return open + evidenceAndAgreement + close;
  }

  return open + evidenceAndAgreement + ', ' + confidence + close;
}

/**
 * @param {Object} labels - A *_LABELS map from Config.gs.
 * @param {string} value
 * @returns {string} The label in lower case, or the raw value if unknown.
 */
function lowerCaseLabel(labels, value) {
  return String(labels[value] || value || '').toLowerCase();
}

/**
 * @param {Object} enumObject - An enum map from Config.gs.
 * @param {*} value
 * @returns {boolean} True if value is one of the enum's values.
 */
function isEnumValue(enumObject, value) {
  return Object.keys(enumObject).some(function(key) {
    return enumObject[key] === value;
  });
}

/**
 * @param {string} text
 * @returns {string} The first 40 characters, for error messages.
 */
function previewText(text) {
  text = text || '';
  return text.length > 40 ? text.substring(0, 40) + '...' : text;
}

/**
 * @param {*} value
 * @returns {string} Trimmed string; empty for null or undefined.
 */
function cleanString(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

/**
 * Validates sidebar form data.
 * @param {Object} formData
 * @param {boolean} isNew - True when creating (a pending claim is required).
 * @returns {Object} { valid, errors: string[], sources: Object[] }
 */
function validateAssessment(formData, isNew) {
  if (!formData || typeof formData !== 'object') {
    return { valid: false, errors: ['No form data received.'], sources: [] };
  }

  var errors = [];
  var evidence = formData.evidence || {};
  var agreement = formData.agreement || {};
  var confidence = formData.confidence || {};

  if (isNew && !parsePendingRangeName(formData.pendingRangeName)) {
    errors.push('Select the claim in the document, then click Capture Selection.');
  }
  if (!isEnumValue(EVIDENCE_QUALITY, evidence.quality)) {
    errors.push('Evidence quality is required.');
  }
  if (!isEnumValue(AGREEMENT_LEVEL, agreement.level)) {
    errors.push('Agreement level is required.');
  }
  if (!isEnumValue(CONFIDENCE_LEVEL, confidence.level)) {
    errors.push('Confidence level is required.');
  }

  var sourceResult = normalizeSources(evidence.sources);
  errors = errors.concat(sourceResult.errors);

  return { valid: errors.length === 0, errors: errors, sources: sourceResult.sources };
}

/**
 * Builds the evidence, agreement and confidence fields from validated form data.
 * @param {Object} formData
 * @param {Object[]} sources - Normalized sources.
 * @returns {Object} { evidence, agreement, confidence }
 */
function buildRatingFields(formData, sources) {
  return {
    evidence: {
      quality: formData.evidence.quality,
      sources: sources,
      notes: cleanString(formData.evidence.notes)
    },
    agreement: {
      level: formData.agreement.level,
      notes: cleanString(formData.agreement.notes)
    },
    confidence: {
      level: formData.confidence.level,
      conditional: cleanString(formData.confidence.conditional)
    }
  };
}

/**
 * Creates a new assessment for a pending claim.
 * Called from the sidebar via google.script.run.
 * @param {Object} formData
 * @returns {Object} { success, id, markerNumber, error }
 */
function handleCreateAssessment(formData) {
  return safeExecute(function() {
    var validation = validateAssessment(formData, true);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' ') };
    }

    return withDocumentLock(function() {
      var doc = DocumentApp.getActiveDocument();
      var pendingRangeName = formData.pendingRangeName;
      var pending = getNamedRange(doc, pendingRangeName);
      var claimText = pending ? getRangeText(pending.getRange()) : '';
      if (!claimText) {
        return {
          success: false,
          error: 'The selected claim is no longer in the document. Select it again and click Capture Selection.'
        };
      }

      var docConfig = loadDocConfig();
      var fields = buildRatingFields(formData, validation.sources);
      var id = parsePendingRangeName(pendingRangeName).id;

      var assessment = {
        id: id,
        schemaVersion: CONFIG.SCHEMA_VERSION,
        claimText: claimText,
        markerNumber: getNextMarkerNumber(loadAssessments()),
        evidence: fields.evidence,
        agreement: fields.agreement,
        confidence: fields.confidence,
        metadata: {
          createdAt: nowISO(),
          createdBy: getCurrentUserEmail(),
          lastModified: nowISO()
        }
      };
      assessment.markerText = buildMarkerText(assessment, docConfig);

      // Fail on the size limit before changing the document.
      serializeAssessment(assessment);

      promotePendingClaim(doc, pendingRangeName);
      try {
        if (!insertMarkerAtClaim(doc, id, assessment.markerText, isParentheticalStyle(docConfig))) {
          throw new Error('Could not place a marker after the selected claim.');
        }
        saveAssessment(assessment);
      } catch (err) {
        removeMarker(doc, assessment);
        restorePendingClaim(doc, id, pendingRangeName);
        throw err;
      }

      Logger.log('Assessment created: ' + id + ' (marker #' + assessment.markerNumber + ')');
      return { success: true, id: id, markerNumber: assessment.markerNumber };
    });
  }, 'Failed to create assessment.');
}

/**
 * Updates an existing assessment's ratings, sources and notes.
 * The claim itself can't be changed; delete and re-assess to change it.
 * Called from the sidebar via google.script.run.
 * @param {string} id - The assessment UUID.
 * @param {Object} formData
 * @returns {Object} { success, warning, error }
 */
function handleUpdateAssessment(id, formData) {
  return safeExecute(function() {
    var validation = validateAssessment(formData, false);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(' ') };
    }

    return withDocumentLock(function() {
      var existing = getAssessmentById(id);
      if (!existing) {
        return { success: false, error: 'Assessment not found.' };
      }

      var docConfig = loadDocConfig();
      var fields = buildRatingFields(formData, validation.sources);
      var newMarkerText = buildMarkerText(mergeObjects(existing, fields), docConfig);

      updateAssessment(id, {
        evidence: fields.evidence,
        agreement: fields.agreement,
        confidence: fields.confidence,
        markerText: newMarkerText
      });

      // Parenthetical markers show the ratings, so they change when ratings do.
      var warning = '';
      if (newMarkerText !== existing.markerText) {
        var doc = DocumentApp.getActiveDocument();
        if (removeMarker(doc, existing) === 'modified') {
          warning = 'The old marker had been edited by hand, so it was left in the document.';
        }
        if (!insertMarkerAtClaim(doc, id, newMarkerText, isParentheticalStyle(docConfig))) {
          warning = (warning ? warning + ' ' : '') + 'The claim text is no longer in the document, so no marker was added.';
        }
      }

      Logger.log('Assessment updated: ' + id);
      return { success: true, warning: warning };
    });
  }, 'Failed to update assessment.');
}

/**
 * Deletes an assessment, its marker, and its claim anchor.
 * Called from the manager dialog via google.script.run.
 * @param {string} id - The assessment UUID.
 * @returns {Object} { success, warning, error }
 */
function handleDeleteAssessment(id) {
  return safeExecute(function() {
    return withDocumentLock(function() {
      var assessment = getAssessmentById(id);
      if (!assessment) {
        return { success: false, error: 'Assessment not found.' };
      }

      var doc = DocumentApp.getActiveDocument();
      var markerStatus = removeMarker(doc, assessment);
      removeClaimAnchor(doc, id);
      deleteAssessment(id);

      if (loadAssessments().length > 0) {
        renumberAllMarkers();
      } else {
        removeAppendixSection();
      }

      Logger.log('Assessment deleted: ' + id);
      return {
        success: true,
        warning: markerStatus === 'modified'
          ? 'The marker had been edited by hand, so it was left in the document. Delete it manually.'
          : ''
      };
    });
  }, 'Failed to delete assessment.');
}

/**
 * Returns all assessments sorted by marker number.
 * Called from the manager dialog and appendix generation.
 * @returns {Object[]}
 */
function getAllAssessments() {
  return safeExecute(function() {
    return loadAssessments();
  }, 'Failed to load assessments.') || [];
}

/**
 * Selects an assessment's claim in the document.
 * Called from the manager dialog's "jump to claim" action.
 * @param {string} assessmentId
 * @returns {Object} { success, error }
 */
function jumpToAssessmentMarker(assessmentId) {
  return safeExecute(function() {
    if (!getAssessmentById(assessmentId)) {
      return { success: false, error: 'Assessment not found.' };
    }
    if (!selectClaim(DocumentApp.getActiveDocument(), assessmentId)) {
      return { success: false, error: 'The claim text is no longer in the document.' };
    }
    return { success: true };
  }, 'Failed to jump to claim.');
}

/**
 * Renumbers markers 1, 2, 3... in the order their claims appear in the
 * document. Only markers whose text changes, or that are missing, are rewritten.
 * @returns {Object} { total, updated, errors: string[] }
 */
function renumberAllMarkers() {
  return withDocumentLock(function() {
    var doc = DocumentApp.getActiveDocument();
    var docConfig = loadDocConfig();
    var isParenthetical = isParentheticalStyle(docConfig);
    var assessments = loadAssessments();
    var errors = [];
    var updated = 0;

    var ordered = assessments.map(function(assessment) {
      return { assessment: assessment, position: getClaimPosition(doc, assessment.id) };
    });
    ordered.sort(function(x, y) {
      return compareDocumentPositions(x.position, y.position);
    });

    ordered.forEach(function(item, index) {
      var assessment = item.assessment;
      var newNumber = index + 1;
      var newText = buildMarkerText(mergeObjects(assessment, { markerNumber: newNumber }), docConfig);

      if (!item.position) {
        errors.push('The claim for marker ' + assessment.markerNumber + ' ("'
          + previewText(assessment.claimText) + '") is no longer in the document.');
      } else {
        if (newText !== assessment.markerText || !isMarkerIntact(doc, assessment)) {
          if (removeMarker(doc, assessment) === 'modified') {
            errors.push('Marker ' + assessment.markerNumber + ' had been edited by hand and was left in place. Delete the old text manually.');
          }
          if (!insertMarkerAtClaim(doc, assessment.id, newText, isParenthetical)) {
            errors.push('Could not insert marker ' + newNumber + ' for "' + previewText(assessment.claimText) + '".');
          }
        }
      }

      if (assessment.markerNumber !== newNumber || assessment.markerText !== newText) {
        assessment.markerNumber = newNumber;
        assessment.markerText = newText;
        assessment.metadata = assessment.metadata || {};
        assessment.metadata.lastModified = nowISO();
        updated++;
      }
    });

    saveAssessments(assessments);

    Logger.log('Renumber complete: ' + assessments.length + ' assessments, '
      + updated + ' updated, ' + errors.length + ' errors.');
    return { total: assessments.length, updated: updated, errors: errors };
  });
}

/**
 * Checks that every assessment's claim and marker are still in the document.
 * @returns {Object} { valid, missingMarkers: number[], missingClaims: number[] }
 */
function checkMarkerIntegrity() {
  var doc = DocumentApp.getActiveDocument();
  var missingMarkers = [];
  var missingClaims = [];

  loadAssessments().forEach(function(assessment) {
    if (!getClaimPosition(doc, assessment.id)) {
      missingClaims.push(assessment.markerNumber);
      return;
    }
    if (!isMarkerIntact(doc, assessment)) {
      missingMarkers.push(assessment.markerNumber);
    }
  });

  return {
    valid: missingMarkers.length === 0 && missingClaims.length === 0,
    missingMarkers: missingMarkers,
    missingClaims: missingClaims
  };
}

/**
 * Converts every marker to a new citation style and saves the style.
 * Called from the Citation Style dialog.
 * @param {string} newStyle - 'superscript' or 'parenthetical'.
 * @param {string} newDetail - 'confidence', 'evidence-agreement', or 'full'.
 * @param {string} newBracket - 'parentheses' or 'curly'.
 * @returns {Object} { success, converted, errors: string[], error }
 */
function convertMarkerStyle(newStyle, newDetail, newBracket) {
  return safeExecute(function() {
    var newConfig = {
      citationStyle: newStyle,
      parentheticalDetail: newDetail || PARENTHETICAL_DETAIL.CONFIDENCE,
      parentheticalBracket: newBracket || PARENTHETICAL_BRACKET.PARENTHESES
    };
    if (!isEnumValue(CITATION_STYLE, newConfig.citationStyle)
      || !isEnumValue(PARENTHETICAL_DETAIL, newConfig.parentheticalDetail)
      || !isEnumValue(PARENTHETICAL_BRACKET, newConfig.parentheticalBracket)) {
      return { success: false, error: 'Unknown citation style option.' };
    }

    return withDocumentLock(function() {
      var doc = DocumentApp.getActiveDocument();
      var isParenthetical = isParentheticalStyle(newConfig);
      var assessments = loadAssessments();
      var errors = [];

      assessments.forEach(function(assessment) {
        var newText = buildMarkerText(assessment, newConfig);

        if (removeMarker(doc, assessment) === 'modified') {
          errors.push('Marker ' + assessment.markerNumber + ' had been edited by hand and was left in place.');
        }
        if (!insertMarkerAtClaim(doc, assessment.id, newText, isParenthetical)) {
          errors.push('Could not insert a marker for "' + previewText(assessment.claimText) + '" (claim text not found).');
        }

        assessment.markerText = newText;
      });

      saveDocConfig(newConfig);
      saveAssessments(assessments);

      Logger.log('convertMarkerStyle: converted ' + assessments.length + ' markers to ' + newStyle);
      return { success: true, converted: assessments.length, errors: errors };
    });
  }, 'Failed to convert marker style.');
}
