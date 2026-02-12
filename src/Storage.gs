/**
 * Storage.gs — Persistence layer using DocumentProperties.
 * All assessments are stored as a JSON array under CONFIG.STORAGE_KEY.
 */

/**
 * Loads all assessments from DocumentProperties.
 * Returns an empty array if none exist or data is corrupted.
 * @returns {Object[]} Array of assessment objects.
 */
function loadAssessments() {
  var props = PropertiesService.getDocumentProperties();
  var raw = props.getProperty(CONFIG.STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    var assessments = JSON.parse(raw);
    if (!Array.isArray(assessments)) {
      Logger.log('WARNING: Stored assessments is not an array, resetting.');
      return [];
    }
    return assessments;
  } catch (e) {
    Logger.log('ERROR: Failed to parse stored assessments: ' + e.message);
    return [];
  }
}

/**
 * Saves the full assessments array to DocumentProperties.
 * Creates a backup of existing data before overwriting.
 * @param {Object[]} assessments - Array of assessment objects.
 * @returns {boolean} True if save succeeded.
 */
function saveAssessments(assessments) {
  var props = PropertiesService.getDocumentProperties();

  // Backup current data before overwriting
  var existing = props.getProperty(CONFIG.STORAGE_KEY);
  if (existing) {
    props.setProperty(CONFIG.BACKUP_KEY, existing);
  }

  var json = JSON.stringify(assessments);

  // Warn if approaching the 500KB storage limit
  var sizeKB = json.length / 1024;
  if (sizeKB > 480) {
    try {
      DocumentApp.getUi().alert(
        'Storage Almost Full',
        'Assessment data is ' + sizeKB.toFixed(0) + 'KB of the 500KB limit. '
          + 'Consider exporting and removing old assessments.',
        DocumentApp.getUi().ButtonSet.OK
      );
    } catch (e) { /* UI not available */ }
  } else if (sizeKB > 400) {
    Logger.log('WARNING: Assessment data is ' + sizeKB.toFixed(1) + 'KB (limit: 500KB)');
  }

  props.setProperty(CONFIG.STORAGE_KEY, json);
  return true;
}

/**
 * Finds a single assessment by its ID.
 * @param {string} id - The assessment UUID.
 * @returns {Object|null} The assessment object, or null if not found.
 */
function getAssessmentById(id) {
  var assessments = loadAssessments();
  for (var i = 0; i < assessments.length; i++) {
    if (assessments[i].id === id) {
      return assessments[i];
    }
  }
  return null;
}

/**
 * Updates an existing assessment by ID. Merges provided fields into the existing object.
 * @param {string} id - The assessment UUID.
 * @param {Object} updates - Fields to merge (shallow merge at top level, deep merge for nested).
 * @returns {Object|null} The updated assessment, or null if not found.
 */
function updateAssessment(id, updates) {
  var assessments = loadAssessments();
  var found = false;

  for (var i = 0; i < assessments.length; i++) {
    if (assessments[i].id === id) {
      // Deep merge for nested objects (evidence, agreement, confidence, metadata)
      var a = assessments[i];
      if (updates.evidence) {
        a.evidence = mergeObjects(a.evidence || {}, updates.evidence);
        delete updates.evidence;
      }
      if (updates.agreement) {
        a.agreement = mergeObjects(a.agreement || {}, updates.agreement);
        delete updates.agreement;
      }
      if (updates.confidence) {
        a.confidence = mergeObjects(a.confidence || {}, updates.confidence);
        delete updates.confidence;
      }
      // Shallow merge remaining top-level fields
      for (var key in updates) {
        if (updates.hasOwnProperty(key) && key !== 'metadata') {
          a[key] = updates[key];
        }
      }
      // Always update lastModified
      a.metadata = a.metadata || {};
      a.metadata.lastModified = nowISO();

      assessments[i] = a;
      found = true;
      break;
    }
  }

  if (!found) {
    Logger.log('WARNING: Assessment not found for update: ' + id);
    return null;
  }

  saveAssessments(assessments);
  return assessments.filter(function(a) { return a.id === id; })[0];
}

/**
 * Deletes an assessment by ID.
 * @param {string} id - The assessment UUID.
 * @returns {boolean} True if an assessment was deleted.
 */
function deleteAssessment(id) {
  var assessments = loadAssessments();
  var originalLength = assessments.length;

  assessments = assessments.filter(function(a) {
    return a.id !== id;
  });

  if (assessments.length === originalLength) {
    Logger.log('WARNING: Assessment not found for deletion: ' + id);
    return false;
  }

  saveAssessments(assessments);
  return true;
}

/**
 * Returns the next available marker number (1-based, sequential).
 * @returns {number} The next marker number.
 */
function getNextMarkerNumber() {
  var assessments = loadAssessments();
  if (assessments.length === 0) {
    return 1;
  }
  var maxMarker = 0;
  for (var i = 0; i < assessments.length; i++) {
    var num = assessments[i].markerNumber || 0;
    if (num > maxMarker) {
      maxMarker = num;
    }
  }
  return maxMarker + 1;
}

/**
 * Shallow-merges two plain objects. Values from source overwrite target.
 * @param {Object} target
 * @param {Object} source
 * @returns {Object} Merged object.
 */
function mergeObjects(target, source) {
  var result = {};
  var key;
  for (key in target) {
    if (target.hasOwnProperty(key)) {
      result[key] = target[key];
    }
  }
  for (key in source) {
    if (source.hasOwnProperty(key)) {
      result[key] = source[key];
    }
  }
  return result;
}
