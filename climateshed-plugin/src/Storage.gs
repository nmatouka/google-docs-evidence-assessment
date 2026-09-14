/**
 * Storage.gs — Persistence layer using DocumentProperties.
 *
 * Each assessment is stored under its own key (assessment_<id>). Apps Script
 * limits a single property value to 9KB, so one key per assessment makes that
 * limit apply per claim rather than to the whole document.
 */

/**
 * @param {string} id - The assessment UUID.
 * @returns {string} The DocumentProperties key for that assessment.
 */
function assessmentKey(id) {
  return CONFIG.ASSESSMENT_KEY_PREFIX + id;
}

/**
 * Loads all assessments with a single property read, sorted by marker number.
 * Unreadable entries are skipped and logged rather than failing the load.
 * @returns {Object[]} Array of assessment objects.
 */
function loadAssessments() {
  var properties = PropertiesService.getDocumentProperties().getProperties();
  var assessments = [];

  Object.keys(properties).forEach(function(key) {
    if (key.indexOf(CONFIG.ASSESSMENT_KEY_PREFIX) !== 0) {
      return;
    }
    var assessment = parseAssessment(properties[key], key);
    if (assessment) {
      assessments.push(assessment);
    }
  });

  assessments.sort(function(a, b) {
    return (a.markerNumber || 0) - (b.markerNumber || 0);
  });
  return assessments;
}

/**
 * Finds a single assessment by its ID.
 * @param {string} id - The assessment UUID.
 * @returns {Object|null} The assessment object, or null if not found.
 */
function getAssessmentById(id) {
  if (!id) {
    return null;
  }
  var key = assessmentKey(id);
  var raw = PropertiesService.getDocumentProperties().getProperty(key);
  return raw ? parseAssessment(raw, key) : null;
}

/**
 * Parses a stored assessment, returning null for malformed data.
 * @param {string} raw - Stored JSON.
 * @param {string} key - Property key, for logging.
 * @returns {Object|null}
 */
function parseAssessment(raw, key) {
  try {
    var assessment = JSON.parse(raw);
    if (assessment && typeof assessment === 'object' && assessment.id) {
      return assessment;
    }
    Logger.log('WARNING: Ignoring malformed assessment under ' + key);
  } catch (e) {
    Logger.log('WARNING: Could not parse assessment under ' + key + ': ' + e.message);
  }
  return null;
}

/**
 * Serializes an assessment, refusing anything over the per-property size limit.
 * Call before changing the document so an oversized assessment fails cleanly.
 * @param {Object} assessment
 * @returns {string} JSON string.
 * @throws {Error} With a user-facing message if the assessment is too large.
 */
function serializeAssessment(assessment) {
  var json = JSON.stringify(assessment);
  var bytes = Utilities.newBlob(json).getBytes().length;
  if (bytes > CONFIG.MAX_VALUE_BYTES) {
    throw new Error('This assessment is too large to save ('
      + formatKilobytes(bytes) + ' of ' + formatKilobytes(CONFIG.MAX_VALUE_BYTES)
      + ' allowed per claim). Shorten the notes or remove some sources.');
  }
  return json;
}

/**
 * Saves one assessment.
 * @param {Object} assessment
 */
function saveAssessment(assessment) {
  var json = serializeAssessment(assessment);
  PropertiesService.getDocumentProperties().setProperty(assessmentKey(assessment.id), json);
}

/**
 * Saves several assessments in one batched write. Every assessment is
 * serialized first, so an oversized one aborts before anything is written.
 * @param {Object[]} assessments
 */
function saveAssessments(assessments) {
  var values = {};
  assessments.forEach(function(assessment) {
    values[assessmentKey(assessment.id)] = serializeAssessment(assessment);
  });
  if (Object.keys(values).length > 0) {
    PropertiesService.getDocumentProperties().setProperties(values, false);
  }
}

/**
 * Merges updates into an existing assessment and saves it.
 * evidence, agreement and confidence are merged one level deep; other fields
 * are replaced. id and metadata cannot be overwritten.
 * @param {string} id - The assessment UUID.
 * @param {Object} updates - Fields to merge. Not modified.
 * @returns {Object|null} The updated assessment, or null if not found.
 */
function updateAssessment(id, updates) {
  var assessment = getAssessmentById(id);
  if (!assessment) {
    Logger.log('WARNING: Assessment not found for update: ' + id);
    return null;
  }

  var nestedFields = ['evidence', 'agreement', 'confidence'];
  Object.keys(updates).forEach(function(key) {
    if (key === 'id' || key === 'metadata') {
      return;
    }
    assessment[key] = nestedFields.indexOf(key) !== -1
      ? mergeObjects(assessment[key] || {}, updates[key])
      : updates[key];
  });

  assessment.metadata = assessment.metadata || {};
  assessment.metadata.lastModified = nowISO();

  saveAssessment(assessment);
  return assessment;
}

/**
 * Deletes an assessment by ID.
 * @param {string} id - The assessment UUID.
 * @returns {boolean} True if an assessment was deleted.
 */
function deleteAssessment(id) {
  if (!getAssessmentById(id)) {
    Logger.log('WARNING: Assessment not found for deletion: ' + id);
    return false;
  }
  PropertiesService.getDocumentProperties().deleteProperty(assessmentKey(id));
  return true;
}

/**
 * Returns the next marker number (1-based).
 * @param {Object[]} assessments - Currently stored assessments.
 * @returns {number}
 */
function getNextMarkerNumber(assessments) {
  return assessments.reduce(function(max, assessment) {
    return Math.max(max, assessment.markerNumber || 0);
  }, 0) + 1;
}

/**
 * Runs fn while holding the document lock, so two collaborators can't create,
 * delete, or renumber assessments at the same moment. Re-entrant: calls made
 * inside an operation that already holds the lock run directly.
 * @param {Function} fn
 * @returns {*} The return value of fn.
 */
function withDocumentLock(fn) {
  var lock = LockService.getDocumentLock();
  if (!lock || lock.hasLock()) {
    return fn();
  }
  if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
    throw new Error('Another change to this document\'s assessments is in progress. Try again in a moment.');
  }
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Loads the per-document config (citation style settings).
 * Falls back to DEFAULT_DOC_CONFIG if no config has been saved.
 * @returns {Object} Config object with citationStyle, parentheticalDetail, parentheticalBracket.
 */
function loadDocConfig() {
  var raw = PropertiesService.getDocumentProperties().getProperty(CONFIG.CONFIG_KEY);
  var defaults = mergeObjects(DEFAULT_DOC_CONFIG, {});
  if (!raw) {
    return defaults;
  }
  try {
    return mergeObjects(defaults, JSON.parse(raw));
  } catch (e) {
    Logger.log('WARNING: Failed to parse doc config, using defaults: ' + e.message);
    return defaults;
  }
}

/**
 * Saves the per-document config to DocumentProperties.
 * @param {Object} config - Config object to persist.
 */
function saveDocConfig(config) {
  PropertiesService.getDocumentProperties().setProperty(CONFIG.CONFIG_KEY, JSON.stringify(config));
}

/**
 * Shallow-merges two plain objects into a new object. Values from source win.
 * @param {Object} target
 * @param {Object} source
 * @returns {Object} Merged object.
 */
function mergeObjects(target, source) {
  var result = {};
  var key;
  for (key in target) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      result[key] = target[key];
    }
  }
  for (key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * @param {number} bytes
 * @returns {string} e.g. "8.7KB"
 */
function formatKilobytes(bytes) {
  return (bytes / 1024).toFixed(1) + 'KB';
}
