/**
 * Assessment.gs — Core assessment operations.
 * Full creation/validation logic will be added in Session 2.
 */

/**
 * Gets the currently selected text in the document.
 * @returns {Object|null} { text, paragraphIndex, startOffset, endOffset } or null.
 */
function getSelectedText() {
  var selection = DocumentApp.getActiveDocument().getSelection();

  if (!selection) {
    return null;
  }

  var elements = selection.getRangeElements();
  if (elements.length === 0) {
    return null;
  }

  var textParts = [];
  var firstElement = elements[0];
  var paragraphIndex = null;
  var startOffset = firstElement.isPartial() ? firstElement.getStartOffset() : 0;
  var endOffset = null;

  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    var el = element.getElement();

    // Only handle text elements
    if (el.getType() !== DocumentApp.ElementType.TEXT) {
      continue;
    }

    var text = el.asText().getText();

    if (element.isPartial()) {
      text = text.substring(element.getStartOffset(), element.getEndOffsetInclusive() + 1);
      endOffset = element.getEndOffsetInclusive();
    } else {
      endOffset = text.length - 1;
    }

    // Get paragraph index from the first text element
    if (paragraphIndex === null) {
      var parent = el.getParent();
      var body = DocumentApp.getActiveDocument().getBody();
      paragraphIndex = body.getChildIndex(parent);
    }

    textParts.push(text);
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
}
