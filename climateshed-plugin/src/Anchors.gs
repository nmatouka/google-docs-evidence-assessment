/**
 * Anchors.gs — Named ranges that tie assessments to document text.
 *
 * Each saved assessment has two named ranges:
 *   ea_claim_<id>    the claim text the author selected
 *   ea_marker_<id>   the marker inserted after it (with a leading space in
 *                    parenthetical mode)
 *
 * Named ranges move with the text as the document is edited, so markers are
 * never located by saved offsets or by searching for their text. A selection
 * captured when the sidebar opens is held as ea_pending_<id>_<timestampMs>
 * until the assessment is saved.
 */

/**
 * @param {string} id - Assessment UUID.
 * @returns {string} Named range name for the claim.
 */
function claimRangeName(id) {
  return CONFIG.CLAIM_RANGE_PREFIX + id;
}

/**
 * @param {string} id - Assessment UUID.
 * @returns {string} Named range name for the marker.
 */
function markerRangeName(id) {
  return CONFIG.MARKER_RANGE_PREFIX + id;
}

/**
 * @param {Document} doc
 * @param {string} name
 * @returns {NamedRange|null} The first named range with this name.
 */
function getNamedRange(doc, name) {
  var ranges = doc.getNamedRanges(name);
  return ranges.length > 0 ? ranges[0] : null;
}

/**
 * Parses a pending range name created by capturePendingClaim().
 * Also used to validate names sent back from the sidebar.
 * @param {*} name
 * @returns {Object|null} { id, createdAt } or null if the name isn't a pending range.
 */
function parsePendingRangeName(name) {
  if (typeof name !== 'string' || name.indexOf(CONFIG.PENDING_RANGE_PREFIX) !== 0) {
    return null;
  }
  var match = name.substring(CONFIG.PENDING_RANGE_PREFIX.length).match(/^([0-9a-fA-F-]{36})_(\d+)$/);
  return match ? { id: match[1], createdAt: Number(match[2]) } : null;
}

/**
 * Anchors the current selection as a pending claim.
 * @returns {Object|null} { pendingRangeName, text }, or null if no text is selected.
 */
function capturePendingClaim() {
  var doc = DocumentApp.getActiveDocument();
  var selection = doc.getSelection();
  if (!selection) {
    return null;
  }

  var builder = doc.newRange();
  var elementCount = 0;

  selection.getRangeElements().forEach(function(rangeElement) {
    var element = rangeElement.getElement();
    var type = element.getType();

    if (type === DocumentApp.ElementType.TEXT && rangeElement.isPartial()) {
      builder.addElement(element.asText(), rangeElement.getStartOffset(), rangeElement.getEndOffsetInclusive());
      elementCount++;
    } else if (type === DocumentApp.ElementType.TEXT
      || type === DocumentApp.ElementType.PARAGRAPH
      || type === DocumentApp.ElementType.LIST_ITEM) {
      builder.addElement(element);
      elementCount++;
    }
  });

  if (elementCount === 0) {
    return null;
  }

  return anchorPendingClaim(doc, builder.build());
}

/**
 * Anchors a range as a pending claim. Used for the selection and for a
 * suggested sentence opened from Sentences to Check.
 * @param {Document} doc
 * @param {Range} range
 * @returns {Object|null} { pendingRangeName, text }, or null if the range has no text.
 */
function anchorPendingClaim(doc, range) {
  var text = getRangeText(range);
  if (!text) {
    return null;
  }
  var pendingRangeName = CONFIG.PENDING_RANGE_PREFIX + generateId() + '_' + Date.now();
  doc.addNamedRange(pendingRangeName, range);
  return { pendingRangeName: pendingRangeName, text: text };
}

/**
 * Converts a pending claim into a permanent claim anchor.
 * @param {Document} doc
 * @param {string} pendingRangeName
 * @returns {string|null} The assessment id, or null if the pending range is gone.
 */
function promotePendingClaim(doc, pendingRangeName) {
  var parsed = parsePendingRangeName(pendingRangeName);
  var pending = parsed ? getNamedRange(doc, pendingRangeName) : null;
  if (!pending || pending.getRange().getRangeElements().length === 0) {
    return null;
  }
  doc.addNamedRange(claimRangeName(parsed.id), pending.getRange());
  pending.remove();
  return parsed.id;
}

/**
 * Reverses promotePendingClaim() after a failed save, so the author can retry.
 * @param {Document} doc
 * @param {string} id
 * @param {string} pendingRangeName
 */
function restorePendingClaim(doc, id, pendingRangeName) {
  var claim = getNamedRange(doc, claimRangeName(id));
  if (claim && !getNamedRange(doc, pendingRangeName)) {
    doc.addNamedRange(pendingRangeName, claim.getRange());
  }
  removeClaimAnchor(doc, id);
}

/**
 * Removes an assessment's claim anchor. Document text is not changed.
 * @param {Document} doc
 * @param {string} id
 */
function removeClaimAnchor(doc, id) {
  doc.getNamedRanges(claimRangeName(id)).forEach(function(namedRange) {
    namedRange.remove();
  });
}

/**
 * Returns the plain text covered by a range, with runs of whitespace collapsed.
 * @param {Range} range
 * @returns {string}
 */
function getRangeText(range) {
  var parts = [];
  range.getRangeElements().forEach(function(rangeElement) {
    var element = rangeElement.getElement();
    var type = element.getType();

    if (type === DocumentApp.ElementType.TEXT) {
      var text = element.asText().getText();
      parts.push(rangeElement.isPartial()
        ? text.substring(rangeElement.getStartOffset(), rangeElement.getEndOffsetInclusive() + 1)
        : text);
    } else if (type === DocumentApp.ElementType.PARAGRAPH) {
      parts.push(element.asParagraph().getText());
    } else if (type === DocumentApp.ElementType.LIST_ITEM) {
      parts.push(element.asListItem().getText());
    }
  });
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Returns a sortable position for a claim: the child index at each level from
 * the top of the document down to the claim's first element, followed by the
 * character offset.
 * @param {Document} doc
 * @param {string} id
 * @returns {number[]|null} Null if the claim text is no longer in the document.
 */
function getClaimPosition(doc, id) {
  var namedRange = getNamedRange(doc, claimRangeName(id));
  var elements = namedRange ? namedRange.getRange().getRangeElements() : [];
  if (elements.length === 0) {
    return null;
  }

  var first = elements[0];
  var path = [first.isPartial() ? first.getStartOffset() : 0];
  var node = first.getElement();
  var parent = node.getParent();
  // Stop at the body: anything above it isn't a container with child indexes.
  while (parent && typeof parent.getChildIndex === 'function') {
    path.unshift(parent.getChildIndex(node));
    node = parent;
    parent = node.getParent();
  }
  return path;
}

/**
 * Orders positions from getClaimPosition(). Missing claims (null) sort last.
 * @param {number[]|null} a
 * @param {number[]|null} b
 * @returns {number}
 */
function compareDocumentPositions(a, b) {
  if (!a || !b) {
    return (a ? 0 : 1) - (b ? 0 : 1);
  }
  for (var i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return a[i] - b[i];
    }
  }
  return a.length - b.length;
}

/**
 * Returns the document position immediately after a claim.
 * @param {Document} doc
 * @param {string} id
 * @returns {Position|null}
 */
function getClaimEndPosition(doc, id) {
  var namedRange = getNamedRange(doc, claimRangeName(id));
  var elements = namedRange ? namedRange.getRange().getRangeElements() : [];
  if (elements.length === 0) {
    return null;
  }

  var last = elements[elements.length - 1];
  var element = last.getElement();

  if (element.getType() === DocumentApp.ElementType.TEXT) {
    var text = element.asText();
    var offset = last.isPartial() ? last.getEndOffsetInclusive() + 1 : text.getText().length;
    return doc.newPosition(text, offset);
  }

  // A whole paragraph or list item was selected: go after its last text run.
  var lastText = findLastTextChild(element);
  return lastText ? doc.newPosition(lastText, lastText.getText().length) : null;
}

/**
 * @param {Element} element - A paragraph or list item.
 * @returns {Text|null} Its last direct Text child.
 */
function findLastTextChild(element) {
  var type = element.getType();
  var container = type === DocumentApp.ElementType.PARAGRAPH ? element.asParagraph()
    : type === DocumentApp.ElementType.LIST_ITEM ? element.asListItem()
    : null;
  if (!container) {
    return null;
  }
  for (var i = container.getNumChildren() - 1; i >= 0; i--) {
    var child = container.getChild(i);
    if (child.getType() === DocumentApp.ElementType.TEXT) {
      return child.asText();
    }
  }
  return null;
}

/**
 * Collects the text around a claim so evidence search can tell what the claim
 * is about: the document title, the nearest heading above it, and the text
 * just before it (earlier in its paragraph, then the previous paragraph).
 * Read-only: nothing in the document changes. Lengths are capped by the
 * CONTEXT_*_CHARS settings, because this text leaves the document.
 * @param {Document} doc
 * @param {string} rangeName - The claim's named range (claim or pending).
 * @returns {Object} { document_title, section_heading, preceding_text }
 */
function getClaimContext(doc, rangeName) {
  var context = {
    document_title: clipText(doc.getName(), CONFIG.CONTEXT_TITLE_CHARS, false),
    section_heading: '',
    preceding_text: ''
  };

  var namedRange = getNamedRange(doc, rangeName);
  var elements = namedRange ? namedRange.getRange().getRangeElements() : [];
  if (elements.length === 0) {
    return context;
  }

  var first = elements[0];
  var paragraph = findParagraphAncestor(first.getElement());
  if (!paragraph) {
    return context;
  }

  var before = [textBeforeInParagraph(paragraph, first)];
  var sibling = paragraph.getPreviousSibling();
  var steps = 0;

  // Walk back to the nearest heading, keeping the first non-empty paragraph on the way.
  while (sibling && steps < 200) {
    steps++;
    var heading = getHeadingText(sibling);
    if (heading) {
      context.section_heading = clipText(heading, CONFIG.CONTEXT_HEADING_CHARS, false);
      break;
    }
    if (before.length < 2) {
      var text = getBlockText(sibling);
      if (text) {
        before.unshift(text);
      }
    }
    sibling = sibling.getPreviousSibling();
  }

  context.preceding_text = clipText(before.join(' '), CONFIG.CONTEXT_PRECEDING_CHARS, true);
  return context;
}

/**
 * Collapses whitespace and caps length.
 * @param {string} text
 * @param {number} maxChars
 * @param {boolean} keepEnd - Keep the end (text nearest the claim) instead of the start.
 * @returns {string}
 */
function clipText(text, maxChars, keepEnd) {
  var clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) {
    return clean;
  }
  return (keepEnd ? clean.substring(clean.length - maxChars) : clean.substring(0, maxChars)).trim();
}

/**
 * @param {Element} element
 * @returns {Paragraph|ListItem|null} The paragraph or list item containing the element.
 */
function findParagraphAncestor(element) {
  var node = element;
  while (node) {
    var type = node.getType();
    if (type === DocumentApp.ElementType.PARAGRAPH) {
      return node.asParagraph();
    }
    if (type === DocumentApp.ElementType.LIST_ITEM) {
      return node.asListItem();
    }
    node = node.getParent();
  }
  return null;
}

/**
 * Text in the same paragraph before the start of a claim.
 * @param {Paragraph|ListItem} paragraph
 * @param {RangeElement} rangeElement - The claim's first range element.
 * @returns {string}
 */
function textBeforeInParagraph(paragraph, rangeElement) {
  var element = rangeElement.getElement();
  if (element.getType() !== DocumentApp.ElementType.TEXT) {
    return ''; // The claim starts at the beginning of the paragraph.
  }

  try {
    var parts = [];
    var index = paragraph.getChildIndex(element);
    for (var i = 0; i < index; i++) {
      var child = paragraph.getChild(i);
      if (child.getType() === DocumentApp.ElementType.TEXT) {
        parts.push(child.asText().getText());
      }
    }
    if (rangeElement.isPartial()) {
      parts.push(element.asText().getText().substring(0, rangeElement.getStartOffset()));
    }
    return parts.join('');
  } catch (err) {
    Logger.log('textBeforeInParagraph: ' + err.message);
    return '';
  }
}

/**
 * @param {Element} element - A body-level block.
 * @returns {string} The heading text if the block is a non-empty heading, else ''.
 */
function getHeadingText(element) {
  if (element.getType() !== DocumentApp.ElementType.PARAGRAPH) {
    return '';
  }
  var paragraph = element.asParagraph();
  return paragraph.getHeading() !== DocumentApp.ParagraphHeading.NORMAL ? paragraph.getText().trim() : '';
}

/**
 * @param {Element} element - A body-level block.
 * @returns {string} Its text if it's a paragraph or list item, else ''.
 */
function getBlockText(element) {
  var type = element.getType();
  if (type === DocumentApp.ElementType.PARAGRAPH) {
    return element.asParagraph().getText().trim();
  }
  if (type === DocumentApp.ElementType.LIST_ITEM) {
    return element.asListItem().getText().trim();
  }
  return '';
}

/**
 * Inserts a marker immediately after a claim and anchors it with a named range.
 * @param {Document} doc
 * @param {string} id - Assessment UUID.
 * @param {string} markerText - Superscript digits or a parenthetical statement.
 * @param {boolean} isParenthetical - Styles as italic gray text instead of a blue superscript.
 * @returns {boolean} True if the marker was inserted.
 */
function insertMarkerAtClaim(doc, id, markerText, isParenthetical) {
  var position = getClaimEndPosition(doc, id);
  if (!position) {
    return false;
  }

  // Position.insertText() creates a separate Text element, so the marker can be
  // styled and anchored without touching the surrounding text.
  var marker = position.insertText((isParenthetical ? ' ' : '') + markerText);
  if (isParenthetical) {
    marker.setForegroundColor('#555555');
    marker.setItalic(true);
    marker.setBold(false);
  } else {
    marker.setFontSize(8);
    marker.setForegroundColor('#1a73e8');
    marker.setBold(true);
  }

  doc.addNamedRange(markerRangeName(id), doc.newRange().addElement(marker).build());
  return true;
}

/**
 * Removes an assessment's marker from the document.
 *
 * Only the marker's own characters are deleted. If the named range has grown
 * to include text the author typed next to the marker, that text stays. If the
 * marker text itself was changed (or appears twice), nothing is deleted.
 * @param {Document} doc
 * @param {Object} assessment - Must have id and markerText.
 * @returns {string} 'removed'; 'missing' if there was no marker; or 'modified'
 *   if the anchor was removed but the changed text was left in place.
 */
function removeMarker(doc, assessment) {
  var status = 'missing';

  doc.getNamedRanges(markerRangeName(assessment.id)).forEach(function(namedRange) {
    var pieces = getTextPieces(namedRange.getRange());
    namedRange.remove();
    if (pieces.length === 0) {
      return;
    }

    var currentText = joinPieces(pieces);
    var start = findSingleOccurrence(currentText, assessment.markerText);
    if (start === -1) {
      status = 'modified';
      return;
    }

    var end = start + assessment.markerText.length;
    // Parenthetical markers were inserted with a leading space; remove it too.
    if (/^[({]/.test(assessment.markerText) && currentText.charAt(start - 1) === ' ') {
      start--;
    }

    deleteCharacters(pieces, start, end);
    if (status !== 'modified') {
      status = 'removed';
    }
  });

  return status;
}

/**
 * True if the assessment's marker is in the document with its text unchanged.
 * Text typed immediately next to the marker doesn't count as a change.
 * @param {Document} doc
 * @param {Object} assessment
 * @returns {boolean}
 */
function isMarkerIntact(doc, assessment) {
  var marker = getNamedRange(doc, markerRangeName(assessment.id));
  if (!marker) {
    return false;
  }
  return findSingleOccurrence(joinPieces(getTextPieces(marker.getRange())), assessment.markerText) !== -1;
}

/**
 * @param {string} text
 * @param {string} search
 * @returns {number} Index of search in text if it appears exactly once, else -1.
 */
function findSingleOccurrence(text, search) {
  if (!search) {
    return -1;
  }
  var index = text.indexOf(search);
  return index !== -1 && text.indexOf(search, index + 1) === -1 ? index : -1;
}

/**
 * @param {Object[]} pieces - From getTextPieces().
 * @returns {string} The text the pieces cover, joined.
 */
function joinPieces(pieces) {
  return pieces.map(function(piece) { return piece.value; }).join('');
}

/**
 * Deletes characters [start, end) of the pieces' joined text, mapping offsets
 * back to each Text element. Deletes backwards so earlier offsets stay valid.
 * @param {Object[]} pieces - From getTextPieces().
 * @param {number} start - Inclusive.
 * @param {number} end - Exclusive.
 */
function deleteCharacters(pieces, start, end) {
  var spans = [];
  var pieceStart = 0;

  pieces.forEach(function(piece) {
    var length = piece.end - piece.start + 1;
    var from = Math.max(start, pieceStart);
    var to = Math.min(end, pieceStart + length);
    if (from < to) {
      spans.push({
        text: piece.text,
        start: piece.start + (from - pieceStart),
        end: piece.start + (to - pieceStart) - 1
      });
    }
    pieceStart += length;
  });

  for (var i = spans.length - 1; i >= 0; i--) {
    spans[i].text.deleteText(spans[i].start, spans[i].end);
  }
}

/**
 * Splits a range into the Text elements and offsets it covers.
 * @param {Range} range
 * @returns {Object[]} [{ text, start, end, value }] with inclusive end offsets.
 */
function getTextPieces(range) {
  var pieces = [];
  range.getRangeElements().forEach(function(rangeElement) {
    var element = rangeElement.getElement();
    if (element.getType() !== DocumentApp.ElementType.TEXT) {
      return;
    }
    var text = element.asText();
    var fullText = text.getText();
    var start = rangeElement.isPartial() ? rangeElement.getStartOffset() : 0;
    var end = rangeElement.isPartial() ? rangeElement.getEndOffsetInclusive() : fullText.length - 1;
    if (end >= start) {
      pieces.push({ text: text, start: start, end: end, value: fullText.substring(start, end + 1) });
    }
  });
  return pieces;
}

/**
 * Selects a claim in the document.
 * @param {Document} doc
 * @param {string} id
 * @returns {boolean} False if the claim text is no longer in the document.
 */
function selectClaim(doc, id) {
  var namedRange = getNamedRange(doc, claimRangeName(id));
  if (!namedRange || namedRange.getRange().getRangeElements().length === 0) {
    return false;
  }
  doc.setSelection(namedRange.getRange());
  return true;
}

/**
 * Removes named ranges left by cancelled sidebars or deleted assessments.
 * Pending claims are kept for a day in case a sidebar is still open. Only
 * named ranges are removed; document text is never changed.
 * @param {Document} doc
 * @param {Object[]} assessments - Currently stored assessments.
 * @returns {number} Number of named ranges removed.
 */
function cleanupOrphanedAnchors(doc, assessments) {
  var knownIds = {};
  assessments.forEach(function(assessment) {
    knownIds[assessment.id] = true;
  });

  var now = Date.now();
  var removed = 0;

  doc.getNamedRanges().forEach(function(namedRange) {
    var name = namedRange.getName();
    var pending = parsePendingRangeName(name);
    var isOrphan = false;

    if (pending) {
      isOrphan = now - pending.createdAt > CONFIG.PENDING_RANGE_MAX_AGE_MS;
    } else if (name.indexOf(CONFIG.CLAIM_RANGE_PREFIX) === 0) {
      isOrphan = !knownIds[name.substring(CONFIG.CLAIM_RANGE_PREFIX.length)];
    } else if (name.indexOf(CONFIG.MARKER_RANGE_PREFIX) === 0) {
      isOrphan = !knownIds[name.substring(CONFIG.MARKER_RANGE_PREFIX.length)];
    }

    if (isOrphan) {
      namedRange.remove();
      removed++;
    }
  });

  if (removed > 0) {
    Logger.log('Removed ' + removed + ' orphaned named range(s).');
  }
  return removed;
}
