/**
 * Utils.gs — Helper functions: error wrapper, ID generation, HTML includes.
 */

/**
 * Wraps a function with try-catch and shows a user-friendly alert on failure.
 * @param {Function} operation - The function to execute.
 * @param {string} errorMessage - Message to show the user if it fails.
 * @returns {*} The return value of operation(), or null on error.
 */
function safeExecute(operation, errorMessage) {
  try {
    return operation();
  } catch (error) {
    Logger.log('ERROR: ' + errorMessage);
    Logger.log(error.stack || error.message);

    try {
      DocumentApp.getUi().alert(
        'Error',
        errorMessage + '\n\nDetails: ' + error.message,
        DocumentApp.getUi().ButtonSet.OK
      );
    } catch (uiError) {
      // UI not available (e.g., running from trigger), just log
      Logger.log('Could not display error alert: ' + uiError.message);
    }

    return null;
  }
}

/**
 * Generates a unique ID for an assessment.
 * @returns {string} UUID string.
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Includes an HTML file's content for use in templated HTML.
 * Used in HTML files as: <?!= include('Styles') ?>
 * @param {string} filename - The HTML file name (without path prefix).
 * @returns {string} The raw HTML content.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile('UI/' + filename).getContent();
}

/**
 * Converts a number to its Unicode superscript representation.
 * e.g., 12 → "¹²"
 * @param {number} num - The number to convert.
 * @returns {string} Superscript string.
 */
function toSuperscript(num) {
  return String(num)
    .split('')
    .map(function(digit) {
      return SUPERSCRIPT_DIGITS[digit] || digit;
    })
    .join('');
}

/**
 * Returns the current user's email, or 'unknown' if unavailable.
 * @returns {string} Email address.
 */
function getCurrentUserEmail() {
  try {
    return Session.getActiveUser().getEmail() || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Returns the current timestamp in ISO-8601 format.
 * @returns {string} ISO timestamp.
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * A short, stable key for a JSON-serializable value: its SHA-256 digest in base64.
 * @param {*} value
 * @returns {string}
 */
function digestOf(value) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(value), Utilities.Charset.UTF_8));
}

/**
 * Reads a value saved with writeUserCache(). The cache is private to this Google
 * user and entries expire after CONFIG.CACHE_SECONDS.
 * @param {string} key
 * @returns {*} The value, or null if there isn't one.
 */
function readUserCache(key) {
  try {
    var raw = CacheService.getUserCache().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    Logger.log('readUserCache: ' + e.message);
    return null;
  }
}

/**
 * Saves a JSON-serializable value in this user's cache. A value too large for
 * CacheService is skipped, so the work is simply done again next time.
 * @param {string} key
 * @param {*} value
 */
function writeUserCache(key, value) {
  var json = JSON.stringify(value);
  if (json.length > CONFIG.CACHE_MAX_CHARS) {
    Logger.log('writeUserCache: ' + key + ' is too large to cache (' + json.length + ' characters)');
    return;
  }
  try {
    CacheService.getUserCache().put(key, json, CONFIG.CACHE_SECONDS);
  } catch (e) {
    Logger.log('writeUserCache: ' + e.message);
  }
}
