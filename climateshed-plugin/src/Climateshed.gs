/**
 * Climateshed.gs — Sign-in and evidence search against the Climateshed API.
 *
 * The session token is stored in UserProperties, which only the signed-in
 * Google user can read. It is never written to the document, so collaborators
 * can't see or use it.
 *
 * Functions called from the sidebar return { success, ... } objects instead of
 * using safeExecute(), so a failed network call shows inline in the evidence
 * panel rather than as a modal dialog over the document.
 */

/**
 * Runs a sidebar operation, turning thrown errors into { success: false, error }.
 * @param {Function} operation
 * @returns {Object}
 */
function runForSidebar(operation) {
  try {
    return operation();
  } catch (err) {
    Logger.log('Climateshed error: ' + (err.stack || err.message));
    return { success: false, error: err.message };
  }
}

/**
 * @returns {string|null} The stored Climateshed session token.
 */
function getStoredToken() {
  return PropertiesService.getUserProperties().getProperty(CONFIG.TOKEN_PROPERTY);
}

/**
 * Forgets the stored session token and email.
 */
function clearStoredSession() {
  var props = PropertiesService.getUserProperties();
  props.deleteProperty(CONFIG.TOKEN_PROPERTY);
  props.deleteProperty(CONFIG.EMAIL_PROPERTY);
}

/**
 * Calls the Climateshed API. HTTP errors are returned, not thrown.
 * @param {string} method - 'get' or 'post'.
 * @param {string} path - e.g. '/auth/me'.
 * @param {Object|null} payload - JSON body for POST requests.
 * @param {string|null} token - Session token, if the call needs one.
 * @returns {Object} { status: number, body: Object|null }
 * @throws {Error} If Climateshed can't be reached at all.
 */
function callClimateshedApi(method, path, payload, token) {
  var options = {
    method: method,
    muteHttpExceptions: true,
    headers: {}
  };
  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  if (token) {
    options.headers.Authorization = 'Bearer ' + token;
  }

  var response;
  try {
    response = UrlFetchApp.fetch(CONFIG.API_BASE_URL + path, options);
  } catch (err) {
    Logger.log('Climateshed request to ' + path + ' failed: ' + err.message);
    throw new Error(describeFetchFailure(err.message));
  }

  var body = null;
  try {
    body = JSON.parse(response.getContentText());
  } catch (e) {
    body = null;
  }
  return { status: response.getResponseCode(), body: body };
}

/**
 * Turns a UrlFetchApp exception into a message that says what to do.
 * Apps Script throws (instead of returning a status) when the script lacks
 * permission, when the URL isn't in urlFetchWhitelist, or when the host can't
 * be reached. Each needs a different fix, so the original error is kept.
 * @param {string} message - The exception message.
 * @returns {string}
 */
function describeFetchFailure(message) {
  var detail = message || 'unknown error';
  if (/permission|authoriz/i.test(detail)) {
    return 'The plugin needs your permission to connect to Climateshed. Reload the document, choose '
      + CONFIG.ADDON_NAME + ' > Assess Selected Text, and approve the request. (' + detail + ')';
  }
  if (/whitelist|allowlist|not allowed/i.test(detail)) {
    return 'The Climateshed address isn\'t in the plugin\'s list of allowed URLs. (' + detail + ')';
  }
  return 'Could not reach Climateshed. Check your connection and try again. (' + detail + ')';
}

/**
 * Pulls a readable message out of an API error body.
 * FastAPI sends detail as a string, an object with a message, or a list of
 * validation errors.
 * @param {Object|null} body
 * @param {string} fallback
 * @returns {string}
 */
function apiErrorMessage(body, fallback) {
  var detail = body && body.detail;
  if (typeof detail === 'string') {
    return detail;
  }
  if (detail && typeof detail.message === 'string') {
    return detail.message;
  }
  return fallback;
}

/**
 * Describes whether an account can use evidence search. The server enforces
 * this too; checking here lets the panel explain before a search is tried.
 * @param {Object} me - Response body from /auth/me.
 * @returns {Object} { allowed, message, accountUrl }
 */
function describeEvidenceAccess(me) {
  var hasPaidPlan = CONFIG.PAID_TIERS.indexOf(me.tier) !== -1 && me.subscription_status === 'active';
  if (!hasPaidPlan) {
    return {
      allowed: false,
      message: 'Evidence search needs an active Climateshed Starter or Pro subscription.',
      accountUrl: CONFIG.ACCOUNT_URL
    };
  }
  if (me.evidence_access !== true) {
    return {
      allowed: false,
      message: 'Evidence search isn\'t enabled on your Climateshed account yet. Contact Climateshed to request access.',
      accountUrl: CONFIG.ACCOUNT_URL
    };
  }
  return { allowed: true, message: '', accountUrl: CONFIG.ACCOUNT_URL };
}

/**
 * Checks that the author has allowed the plugin to connect to outside services.
 * Google's consent screen lets people untick individual permissions, and a
 * sidebar can't show the consent prompt itself, so the panel offers a link.
 * @returns {Object|null} { success: false, permissionRequired, authorizationUrl, error }
 *   if the permission is missing; otherwise null.
 */
function checkConnectPermission() {
  try {
    var info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL,
      ['https://www.googleapis.com/auth/script.external_request']);
    if (info.getAuthorizationStatus() !== ScriptApp.AuthorizationStatus.REQUIRED) {
      return null;
    }
    return {
      success: false,
      permissionRequired: true,
      authorizationUrl: info.getAuthorizationUrl() || '',
      error: CONFIG.ADDON_NAME + ' needs your permission to connect to an external service (Climateshed).'
    };
  } catch (err) {
    // If this check isn't available, carry on: the request itself reports the problem.
    Logger.log('checkConnectPermission: ' + err.message);
    return null;
  }
}

/**
 * Returns the author's Climateshed sign-in state and evidence access.
 * Called from the evidence panel.
 * @returns {Object} { success, signedIn, expired, email, access, error }
 */
function getClimateshedAccount() {
  return runForSidebar(function() {
    var missingPermission = checkConnectPermission();
    if (missingPermission) {
      return missingPermission;
    }

    var token = getStoredToken();
    if (!token) {
      return { success: true, signedIn: false };
    }

    var response = callClimateshedApi('get', '/auth/me', null, token);
    if (response.status === 401) {
      clearStoredSession();
      return { success: true, signedIn: false, expired: true };
    }
    if (response.status !== 200 || !response.body) {
      throw new Error(apiErrorMessage(response.body, 'Climateshed is unavailable right now. Try again in a moment.'));
    }

    return {
      success: true,
      signedIn: true,
      email: PropertiesService.getUserProperties().getProperty(CONFIG.EMAIL_PROPERTY) || '',
      access: describeEvidenceAccess(response.body)
    };
  });
}

/**
 * Emails a sign-in code. Climateshed responds the same way whether or not the
 * email has an account, so this can't be used to discover accounts.
 * @param {string} email
 * @returns {Object} { success, error }
 */
function requestClimateshedCode(email) {
  return runForSidebar(function() {
    var missingPermission = checkConnectPermission();
    if (missingPermission) {
      return missingPermission;
    }

    var cleanEmail = cleanString(email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Enter a valid email address.');
    }

    var response = callClimateshedApi('post', '/auth/otp/request', { email: cleanEmail }, null);
    if (response.status === 429) {
      throw new Error('Too many sign-in attempts. Wait a minute and try again.');
    }
    if (response.status !== 200) {
      throw new Error(apiErrorMessage(response.body, 'Could not send a sign-in code. Try again in a moment.'));
    }
    return { success: true };
  });
}

/**
 * Exchanges an emailed code for a session token, then returns the account state.
 * @param {string} email
 * @param {string} code - The 6-digit code.
 * @returns {Object} Same shape as getClimateshedAccount(), or { success: false, error }.
 */
function verifyClimateshedCode(email, code) {
  var result = runForSidebar(function() {
    var missingPermission = checkConnectPermission();
    if (missingPermission) {
      return missingPermission;
    }

    var cleanEmail = cleanString(email).toLowerCase();
    var cleanCode = cleanString(code);
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new Error('Enter the 6-digit code from the email.');
    }

    var response = callClimateshedApi('post', '/auth/otp/verify', { email: cleanEmail, code: cleanCode }, null);
    if (response.status === 400) {
      throw new Error('That code is invalid or has expired. Request a new one.');
    }
    if (response.status === 429) {
      throw new Error('Too many sign-in attempts. Wait a minute and try again.');
    }
    if (response.status !== 200 || !response.body || !response.body.token) {
      throw new Error(apiErrorMessage(response.body, 'Could not sign in. Try again in a moment.'));
    }

    var session = {};
    session[CONFIG.TOKEN_PROPERTY] = response.body.token;
    session[CONFIG.EMAIL_PROPERTY] = cleanEmail;
    PropertiesService.getUserProperties().setProperties(session, false);
    return { success: true };
  });

  return result.success ? getClimateshedAccount() : result;
}

/**
 * Signs the author out of Climateshed on this Google account.
 * @returns {Object} { success }
 */
function signOutOfClimateshed() {
  return runForSidebar(function() {
    clearStoredSession();
    return { success: true };
  });
}

/**
 * Searches the Climateshed corpus for passages related to a claim.
 *
 * Sends the claim plus a short piece of the surrounding document (its title,
 * the nearest heading above the claim, and the text just before it) so
 * Climateshed can tell what the claim is about. Nothing else from the document
 * is sent. If the author edited the search text, that is sent instead of the
 * context and searched as written.
 * @param {Object|string} request - { claimText, pendingRangeName?, assessmentId?, query?, place? }.
 *   A plain string is treated as the claim text.
 * @returns {Object} { success, results, documentCount, searchQuery, querySource, claimPlace } or
 *   { success: false, error, signedOut?, accessDenied?, permissionRequired?, accountUrl? }
 */
function searchClimateshedEvidence(request) {
  return runForSidebar(function() {
    var missingPermission = checkConnectPermission();
    if (missingPermission) {
      return missingPermission;
    }

    var token = getStoredToken();
    if (!token) {
      return { success: false, signedOut: true, error: 'Sign in to Climateshed to search.' };
    }

    if (typeof request === 'string') {
      request = { claimText: request };
    }
    request = request || {};

    var claim = cleanString(request.claimText).replace(/\s+/g, ' ');
    if (claim.length < 10) {
      return { success: false, error: 'Select a longer claim to search (at least 10 characters).' };
    }
    if (claim.length > 2000) {
      return { success: false, error: 'This claim is too long to search (2,000 characters at most). Select a shorter passage.' };
    }

    var payload = { claim: claim, top_k: CONFIG.EVIDENCE_RESULT_LIMIT };
    var query = cleanString(request.query).replace(/\s+/g, ' ');
    if (query) {
      if (query.length < 10 || query.length > 2000) {
        return { success: false, error: 'Search text must be between 10 and 2,000 characters.' };
      }
      payload.query = query;
      var place = cleanString(request.place);
      if (place) {
        payload.place = place.substring(0, 100);
      }
    } else {
      var context = getSearchContext(request);
      if (context) {
        payload.context = context;
      }
    }

    var response = callClimateshedApi('post', '/evidence/search', payload, token);
    var detail = response.body && response.body.detail;

    // 403 without a reason code means the token itself was rejected.
    if (response.status === 401 || (response.status === 403 && !(detail && detail.code))) {
      clearStoredSession();
      return { success: false, signedOut: true, error: 'Your Climateshed session expired. Sign in again.' };
    }
    if (response.status === 403) {
      return { success: false, accessDenied: true, error: detail.message, accountUrl: CONFIG.ACCOUNT_URL };
    }
    if (response.status === 429) {
      return { success: false, error: 'Too many searches in a short time. Wait a minute and try again.' };
    }
    if (response.status !== 200 || !response.body) {
      return {
        success: false,
        error: apiErrorMessage(response.body, 'Climateshed search is unavailable right now. Try again in a moment.')
      };
    }

    return {
      success: true,
      results: Array.isArray(response.body.results) ? response.body.results : [],
      documentCount: response.body.document_count || 0,
      searchQuery: response.body.search_query || query || claim,
      querySource: response.body.query_source || (query ? 'author' : 'claim'),
      claimPlace: response.body.claim_place || null,
      data: response.body.data || null
    };
  });
}

/**
 * Finds the claim's anchor from a search request and collects its document context.
 * @param {Object} request - { pendingRangeName?, assessmentId? }
 * @returns {Object|null} Context with at least one non-empty field, or null.
 */
function getSearchContext(request) {
  var rangeName = null;
  if (parsePendingRangeName(request.pendingRangeName)) {
    rangeName = request.pendingRangeName;
  } else if (typeof request.assessmentId === 'string' && /^[0-9a-fA-F-]{36}$/.test(request.assessmentId)) {
    rangeName = claimRangeName(request.assessmentId);
  }
  if (!rangeName) {
    return null;
  }

  try {
    var context = getClaimContext(DocumentApp.getActiveDocument(), rangeName);
    return context.document_title || context.section_heading || context.preceding_text ? context : null;
  } catch (err) {
    // Search the claim on its own rather than fail the search.
    Logger.log('getSearchContext: ' + err.message);
    return null;
  }
}
