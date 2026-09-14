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
    throw new Error('Could not reach Climateshed. Check your connection and try again.');
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
 * Returns the author's Climateshed sign-in state and evidence access.
 * Called from the evidence panel.
 * @returns {Object} { success, signedIn, expired, email, access, error }
 */
function getClimateshedAccount() {
  return runForSidebar(function() {
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
 * Only the claim text is sent; nothing else from the document leaves it.
 * @param {string} claimText
 * @returns {Object} { success, results, documentCount } or
 *   { success: false, error, signedOut?, accessDenied?, accountUrl? }
 */
function searchClimateshedEvidence(claimText) {
  return runForSidebar(function() {
    var token = getStoredToken();
    if (!token) {
      return { success: false, signedOut: true, error: 'Sign in to Climateshed to search.' };
    }

    var claim = cleanString(claimText).replace(/\s+/g, ' ');
    if (claim.length < 10) {
      return { success: false, error: 'Select a longer claim to search (at least 10 characters).' };
    }
    if (claim.length > 2000) {
      return { success: false, error: 'This claim is too long to search (2,000 characters at most). Select a shorter passage.' };
    }

    var response = callClimateshedApi('post', '/evidence/search',
      { claim: claim, top_k: CONFIG.EVIDENCE_RESULT_LIMIT }, token);
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
      documentCount: response.body.document_count || 0
    };
  });
}
