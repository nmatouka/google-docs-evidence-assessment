/**
 * Suggestions.gs — Suggests sentences in the document worth checking against evidence.
 *
 * Off until someone turns it on for the document. The setting lives in
 * DocumentProperties, so collaborators share it, and a scan still runs only when
 * someone asks. A scan sends the document text to Climateshed one part at a time
 * (never the evidence appendix) and gets back sentences that make checkable
 * claims. Nothing in the document changes: the author picks which sentences to
 * assess. Sentences that already have an assessment are left out.
 *
 * Results are kept in the author's cache for six hours, keyed by each part's
 * text, so scanning again only sends the parts that changed.
 */

/**
 * @returns {Object} { enabled, changedBy, changedAt } for this document.
 */
function loadSuggestionsSetting() {
  var raw = PropertiesService.getDocumentProperties().getProperty(CONFIG.SUGGESTIONS_SETTING_KEY);
  try {
    var setting = raw ? JSON.parse(raw) : null;
    if (setting && typeof setting === 'object') {
      return {
        enabled: setting.enabled === true,
        changedBy: cleanString(setting.changedBy),
        changedAt: cleanString(setting.changedAt)
      };
    }
  } catch (e) {
    Logger.log('WARNING: Could not parse the sentence suggestions setting: ' + e.message);
  }
  return { enabled: false, changedBy: '', changedAt: '' };
}

/**
 * Returns whether sentence suggestions are on for this document. Called from the sidebar.
 * @returns {Object} { success, setting }
 */
function getSentenceSuggestionsSetting() {
  return runForSidebar(function() {
    return { success: true, setting: loadSuggestionsSetting() };
  });
}

/**
 * Turns sentence suggestions on or off for everyone who edits this document.
 * Turning them on doesn't read or send anything.
 * @param {boolean} enabled
 * @returns {Object} { success, setting }
 */
function setSentenceSuggestionsEnabled(enabled) {
  return runForSidebar(function() {
    var setting = { enabled: enabled === true, changedBy: getCurrentUserEmail(), changedAt: nowISO() };
    PropertiesService.getDocumentProperties().setProperty(CONFIG.SUGGESTIONS_SETTING_KEY, JSON.stringify(setting));
    return { success: true, setting: setting };
  });
}

/**
 * @param {Body} body
 * @returns {number} How many body blocks come before the evidence appendix.
 */
function countBlocksBeforeAppendix(body) {
  var appendixIndex = findAppendixSection(body);
  return typeof appendixIndex === 'number' && appendixIndex >= 0 ? appendixIndex : body.getNumChildren();
}

/**
 * Reads the document body before the evidence appendix into sections that start
 * at each heading. Tables and other blocks that aren't paragraphs are skipped.
 * @param {Document} doc
 * @returns {Object[]} [{ heading, paragraphs: [{ index, text }] }], where index is the block's position in the body.
 */
function collectDocumentSections(doc) {
  var body = doc.getBody();
  var count = countBlocksBeforeAppendix(body);
  var sections = [];
  var current = { heading: '', paragraphs: [] };

  for (var index = 0; index < count; index++) {
    var block = body.getChild(index);
    var heading = getHeadingText(block);
    if (heading) {
      if (current.paragraphs.length > 0) {
        sections.push(current);
      }
      current = { heading: heading, paragraphs: [] };
      continue;
    }
    var text = getBlockText(block);
    if (text) {
      current.paragraphs.push({ index: index, text: text.substring(0, CONFIG.SUGGESTIONS_PARAGRAPH_CHARS) });
    }
  }
  if (current.paragraphs.length > 0) {
    sections.push(current);
  }
  return sections;
}

/**
 * Splits sections into parts small enough for one request. A long section
 * becomes several parts with the same heading; a paragraph is never split.
 * @param {Object[]} sections - From collectDocumentSections().
 * @returns {Object[]} [{ heading, paragraphs }]
 */
function splitSectionsIntoParts(sections) {
  var parts = [];
  sections.forEach(function(section) {
    var part = null;
    var chars = 0;
    section.paragraphs.forEach(function(paragraph) {
      var full = part && (chars + paragraph.text.length > CONFIG.SUGGESTIONS_PART_CHARS
        || part.paragraphs.length >= CONFIG.SUGGESTIONS_PART_PARAGRAPHS);
      if (!part || full) {
        part = { heading: section.heading, paragraphs: [] };
        parts.push(part);
        chars = 0;
      }
      part.paragraphs.push(paragraph);
      chars += paragraph.text.length;
    });
  });
  return parts;
}

/**
 * Cleans a part sent back from the sidebar, clipping text the same way
 * collectDocumentSections() does.
 * @param {*} part
 * @returns {Object|null} { heading, paragraphs }, or null if it can't be sent.
 */
function cleanSuggestionPart(part) {
  if (!part || typeof part !== 'object' || !Array.isArray(part.paragraphs)
    || part.paragraphs.length === 0 || part.paragraphs.length > CONFIG.SUGGESTIONS_PART_PARAGRAPHS) {
    return null;
  }
  var chars = 0;
  var paragraphs = [];
  for (var i = 0; i < part.paragraphs.length; i++) {
    var paragraph = part.paragraphs[i] || {};
    var text = cleanString(paragraph.text).substring(0, CONFIG.SUGGESTIONS_PARAGRAPH_CHARS);
    var index = paragraph.index;
    if (!text || typeof index !== 'number' || Math.floor(index) !== index || index < 0) {
      return null;
    }
    chars += text.length;
    paragraphs.push({ index: index, text: text });
  }
  // A part from splitSectionsIntoParts() is at most SUGGESTIONS_PART_CHARS, or one paragraph.
  if (chars > Math.max(CONFIG.SUGGESTIONS_PART_CHARS, CONFIG.SUGGESTIONS_PARAGRAPH_CHARS)) {
    return null;
  }
  return { heading: cleanString(part.heading), paragraphs: paragraphs };
}

/**
 * Identifies a part by its text, so an unchanged part is recognised even if
 * paragraphs above it were added or removed.
 * @param {string} title
 * @param {Object} part
 * @returns {string}
 */
function suggestionPartDigest(title, part) {
  return digestOf([title, part.heading, part.paragraphs.map(function(paragraph) { return paragraph.text; })]);
}

/**
 * @param {Document} doc
 * @returns {Object} { digest: [{ offset, sentence, kind }] } from this author's recent scans of the document.
 */
function loadSuggestionCache(doc) {
  var cache = readUserCache(CONFIG.SUGGESTIONS_CACHE_PREFIX + doc.getId());
  return cache && typeof cache === 'object' && !Array.isArray(cache) ? cache : {};
}

/**
 * Saves scan results for six hours. If they're too large to cache, the next scan
 * just sends every part again.
 * @param {Document} doc
 * @param {Object} cache
 */
function saveSuggestionCache(doc, cache) {
  writeUserCache(CONFIG.SUGGESTIONS_CACHE_PREFIX + doc.getId(), cache);
}

/**
 * Keeps sentences that really are in the paragraph Climateshed named, once each, in document order.
 * @param {*} raw - The sentences Climateshed returned: [{ paragraph, sentence, kind }].
 * @param {Object} part - The part that was sent; paragraph is a position in part.paragraphs.
 * @returns {Object[]} [{ offset, sentence, kind }]
 */
function matchSuggestedSentences(raw, part) {
  var found = [];
  var seen = {};
  (Array.isArray(raw) ? raw : []).forEach(function(item) {
    if (!item || typeof item !== 'object' || !SENTENCE_KIND_LABELS.hasOwnProperty(item.kind)) {
      return;
    }
    var paragraph = typeof item.paragraph === 'number' ? part.paragraphs[item.paragraph] : null;
    var sentence = typeof item.sentence === 'string' ? item.sentence : '';
    var position = paragraph && sentence ? paragraph.text.indexOf(sentence) : -1;
    var key = item.paragraph + ':' + position + ':' + sentence.length;
    if (position === -1 || seen[key]) {
      return;
    }
    seen[key] = true;
    found.push({ offset: item.paragraph, position: position, sentence: sentence, kind: item.kind });
  });
  found.sort(function(a, b) {
    return a.offset - b.offset || a.position - b.position;
  });
  return found.slice(0, CONFIG.SUGGESTIONS_MAX_PER_PART).map(function(item) {
    return { offset: item.offset, sentence: item.sentence, kind: item.kind };
  });
}

/**
 * @param {string} text
 * @returns {string} Lower case, whitespace collapsed, for comparing sentences with claims.
 */
function normalizeForMatch(text) {
  return cleanString(text).replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Turns found sentences into suggestions for the sidebar, placed at the current
 * paragraphs, leaving out sentences that already have an assessment.
 * @param {Object[]} found - From matchSuggestedSentences().
 * @param {Object} part
 * @param {Object[]} assessments
 * @returns {Object[]} [{ index, sentence, kind, heading }]
 */
function placeSuggestions(found, part, assessments) {
  var claims = assessments
    .map(function(assessment) { return normalizeForMatch(assessment.claimText); })
    .filter(function(claim) { return claim; });

  var placed = [];
  found.forEach(function(item) {
    var paragraph = part.paragraphs[item.offset];
    if (!paragraph || paragraph.text.indexOf(item.sentence) === -1) {
      return;
    }
    var sentence = normalizeForMatch(item.sentence);
    var assessed = claims.some(function(claim) {
      // A claim can be the whole sentence or part of it; very short claims don't count.
      return claim.indexOf(sentence) !== -1 || (claim.length >= 20 && sentence.indexOf(claim) !== -1);
    });
    if (!assessed) {
      placed.push({ index: paragraph.index, sentence: item.sentence, kind: item.kind, heading: part.heading });
    }
  });
  return placed;
}

/**
 * Prepares a scan: splits the document into parts and fills in results for
 * parts that haven't changed since this author's last scan. Called from the sidebar.
 * @returns {Object} { success, title, parts: [{ heading, paragraphs, suggestions }] }, where
 *   suggestions is null for parts that still need to be sent; or { success: false, notEnabled, error }.
 */
function planSentenceSuggestions() {
  return runForSidebar(function() {
    if (!loadSuggestionsSetting().enabled) {
      return { success: false, notEnabled: true, error: 'Sentence suggestions are off for this document.' };
    }

    var doc = DocumentApp.getActiveDocument();
    var title = clipText(doc.getName(), CONFIG.CONTEXT_TITLE_CHARS, false);
    var parts = splitSectionsIntoParts(collectDocumentSections(doc));
    var cache = loadSuggestionCache(doc);
    var current = {};
    var assessments = loadAssessments();

    parts.forEach(function(part) {
      var digest = suggestionPartDigest(title, part);
      part.suggestions = null;
      if (Array.isArray(cache[digest])) {
        current[digest] = cache[digest];
        part.suggestions = placeSuggestions(cache[digest], part, assessments);
      }
    });
    // Drop results for text that's no longer in the document.
    saveSuggestionCache(doc, current);

    return { success: true, title: title, parts: parts };
  });
}

/**
 * Asks Climateshed for sentences worth checking in one part of the document.
 * Sends only the document title, the part's heading, and its paragraphs.
 * Called from the sidebar for each part without results.
 * @param {string} title - From planSentenceSuggestions().
 * @param {Object} part - { heading, paragraphs: [{ index, text }] } from planSentenceSuggestions().
 * @returns {Object} { success, suggestions: [{ index, sentence, kind, heading }] }, or
 *   { success: false, error, notEnabled?, signedOut?, accessDenied?, permissionRequired?, accountUrl? }
 */
function findSentencesInPart(title, part) {
  return runForSidebar(function() {
    var missingPermission = checkConnectPermission();
    if (missingPermission) {
      return missingPermission;
    }
    if (!loadSuggestionsSetting().enabled) {
      return { success: false, notEnabled: true, error: 'Sentence suggestions are off for this document.' };
    }
    var token = getStoredToken();
    if (!token) {
      return { success: false, signedOut: true, error: 'Sign in to Climateshed to find sentences to check.' };
    }
    var clean = cleanSuggestionPart(part);
    if (!clean) {
      return { success: false, error: 'This part of the document couldn\'t be read. Scan again.' };
    }

    var doc = DocumentApp.getActiveDocument();
    var cleanTitle = clipText(title, CONFIG.CONTEXT_TITLE_CHARS, false);
    var response = callClimateshedApi('post', '/evidence/sentences', {
      document_title: cleanTitle,
      section_heading: clipText(clean.heading, CONFIG.CONTEXT_HEADING_CHARS, false),
      paragraphs: clean.paragraphs.map(function(paragraph, offset) {
        return { id: offset, text: paragraph.text };
      })
    }, token);
    var failure = evidenceApiFailure(response,
      'Too many requests in a short time. Wait a minute, then click Try again.',
      'Climateshed couldn\'t read this part of the document right now. Try again in a moment.');
    if (failure) {
      return failure;
    }

    var found = matchSuggestedSentences(response.body.sentences, clean);
    var cache = loadSuggestionCache(doc);
    cache[suggestionPartDigest(cleanTitle, clean)] = found;
    saveSuggestionCache(doc, cache);

    return { success: true, suggestions: placeSuggestions(found, clean, loadAssessments()) };
  });
}

/**
 * Finds a suggested sentence, looking first at the block it was found in, then
 * at every paragraph before the appendix. Selects it; the text isn't changed.
 * @param {Document} doc
 * @param {Object} suggestion - { index, sentence }
 * @returns {Range|null} The sentence's range, or null if it's no longer in the document as written.
 */
function selectSentence(doc, suggestion) {
  var sentence = suggestion && typeof suggestion.sentence === 'string' ? suggestion.sentence : '';
  if (!sentence) {
    return null;
  }
  var body = doc.getBody();
  var count = countBlocksBeforeAppendix(body);
  var hint = suggestion && typeof suggestion.index === 'number' ? suggestion.index : -1;
  var order = hint >= 0 && hint < count ? [hint] : [];
  for (var i = 0; i < count; i++) {
    if (i !== hint) {
      order.push(i);
    }
  }

  for (var k = 0; k < order.length; k++) {
    var block = body.getChild(order[k]);
    var type = block.getType();
    if (type !== DocumentApp.ElementType.PARAGRAPH && type !== DocumentApp.ElementType.LIST_ITEM) {
      continue;
    }
    var text = block.editAsText();
    var start = text.getText().indexOf(sentence);
    if (start !== -1) {
      var range = doc.newRange().addElement(text, start, start + sentence.length - 1).build();
      doc.setSelection(range);
      return range;
    }
  }
  return null;
}

/**
 * Selects a suggested sentence in the document. Called from the sidebar.
 * @param {Object} suggestion - { index, sentence }
 * @returns {Object} { success, error }
 */
function selectSuggestedSentence(suggestion) {
  return runForSidebar(function() {
    return selectSentence(DocumentApp.getActiveDocument(), suggestion)
      ? { success: true }
      : { success: false, error: 'That sentence isn\'t in the document as written anymore. Scan again.' };
  });
}

/**
 * Selects a suggested sentence and opens the assessment sidebar for it, which
 * replaces the Sentences to Check sidebar. Called from the sidebar.
 * @param {Object} suggestion - { index, sentence }
 * @returns {Object} { success, error }
 */
function assessSuggestedSentence(suggestion) {
  return runForSidebar(function() {
    var doc = DocumentApp.getActiveDocument();
    var range = selectSentence(doc, suggestion);
    if (!range) {
      return { success: false, error: 'That sentence isn\'t in the document as written anymore. Scan again.' };
    }
    var selectionData = withDocumentLock(function() {
      cleanupOrphanedAnchors(doc, loadAssessments());
      return anchorPendingClaim(doc, range);
    });
    DocumentApp.getUi().showSidebar(buildSidebar(selectionData, null));
    return { success: true };
  });
}
