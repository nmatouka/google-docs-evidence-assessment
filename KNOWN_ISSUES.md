# Known Issues — Free Add-on (`src/`)

Structural problems in the free add-on (v1.2.0), found on 2026-09-14 while starting the Climateshed add-on. They are fixed in `climateshed-plugin/src/` and deliberately **not yet fixed here**. Each entry notes the smallest fix that would work for the free version.

## 1. Storage holds far fewer assessments than documented

**Where:** `src/Storage.gs` — `saveAssessments()` writes every assessment into a single property value.

**Why:** Apps Script limits each property *value* to 9KB. The 500KB limit is for the whole property store. CLAUDE.md's "~500 assessments per doc" figure doesn't account for the per-value limit.

**Estimated capacity** (measured from realistic assessment JSON; confirm with the test below):

| Content per assessment | Size | Assessments that fit |
|---|---|---|
| Claim only, no sources or notes | ~650 bytes | ~14 |
| 2 sources, short notes | ~1.2KB | ~7 |
| 5 sources, fuller notes | ~2.1KB | ~4 |

**What users see:** "Failed to create assessment" once the limit is reached. Existing data is not lost, because the save fails before a marker is inserted. The "Storage Almost Full" warning (at 480KB) can never appear.

**Fix:** Store one property per assessment (`assessment_<id>`). Read them all with a single `getProperties()` call, and check each value's byte size before saving. See `climateshed-plugin/src/Storage.gs`.

## 2. Markers are re-inserted at stale positions

**Where:** `src/Assessment.gs` — `renumberAllMarkers()` and `convertMarkerStyle()` remove every marker, then call `insertMarker()` with the `location` saved when each claim was first assessed.

**Why:** `paragraphIndex` and the character offsets are never updated as the document is edited.

**When it happens:** after text is added or removed above an assessed claim, followed by any of the following:
- deleting an assessment (which triggers renumbering)
- changing citation style
- editing ratings in parenthetical mode

Markers can land mid-word or in the wrong paragraph.

**Also:** for a selection spanning several paragraphs, `getSelectedText()` takes `paragraphIndex` from the first element but `endOffset` from the last, so the marker goes into the first paragraph at the wrong offset.

**Fix:** Anchor each claim and marker with a `NamedRange`, which moves with the text. Find positions by reading the named range at the moment they're needed. See `climateshed-plugin/src/Assessment.gs`.

## 3. Marker search treats marker text as a regular expression

**Where:** `src/Assessment.gs` — `removeMarker()`, `jumpToAssessmentMarker()`, `checkMarkerIntegrity()` all pass marker text to `body.findText()`.

**Why:** `findText()` interprets its argument as a regular expression. Parenthetical markers contain `(`, `)`, `{` and `}`, so they are not matched literally.

**Possible effect (unconfirmed):**
- Deleting or converting a parenthetical marker may remove the words "high confidence" from ordinary prose elsewhere in the document.
- Or it may fail to find the marker and leave empty brackets behind.

Superscript mode is unaffected by this issue.

**Smallest fix:** escape the pattern before searching:

```javascript
function escapeForFindText(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

## 4. Superscript markers can match inside larger numbers

**Where:** `src/Assessment.gs` — `removeMarker()` deletes the first `findText()` match.

**Why:** Searching for `¹` also matches the first digit of `¹¹`. Marker numbers come from `getNextMarkerNumber()` (highest number + 1), not document order, so marker `¹¹` can appear earlier in the document than marker `¹`.

**When it happens:** only with 10 or more assessments, which issue 1 usually prevents.

**Fix:** named-range anchors (as in issue 2) remove the need to search by text at all.

## 5. Document text is printed unescaped into sidebar scripts

**Where:** `src/Code.gs` — `showAssessmentSidebar()`, `showEditSidebar()` and `showCitationStyleDialog()` pass `JSON.stringify(...)` output to templates. The templates print it inside `<script>` with `<?!= ?>` (e.g. `src/UI/Sidebar.html`, `var selectionData = <?!= selectionData ?>;`).

**Why:** `JSON.stringify` doesn't escape `<`. If claim text, notes or sources contain `</script>`, the browser ends the script element there and treats the rest as HTML.

**When it happens:** only if someone with edit access writes that text into the document or an assessment. Any injected script runs inside the add-on's sidebar, where it can call the add-on's server functions.

**Fix:** escape `<` (and U+2028/U+2029) when serializing, as `toScriptJson()` does in `climateshed-plugin/src/Code.gs`.

## Test to confirm issues 1 and 3

Run in a **blank throwaway document** (Extensions → Apps Script), then check the execution log.

```javascript
function testFoundationLimits() {
  // Issue 1: largest single value DocumentProperties accepts
  var props = PropertiesService.getDocumentProperties();
  [8000, 9000, 9500, 12000, 20000].forEach(function(n) {
    try {
      props.setProperty('sizeTest', new Array(n + 1).join('x'));
      Logger.log(n + ' bytes: OK');
    } catch (e) {
      Logger.log(n + ' bytes: FAILED (' + e.message + ')');
    }
  });
  props.deleteProperty('sizeTest');

  // Issue 3: what a parenthetical marker search actually matches
  var body = DocumentApp.getActiveDocument().getBody();
  body.appendParagraph('We have high confidence in this. Second claim (high confidence)');
  try {
    var found = body.findText(' (high confidence)');
    if (found) {
      var text = found.getElement().asText().getText();
      Logger.log('Matched: "' + text.substring(found.getStartOffset(), found.getEndOffsetInclusive() + 1) + '"');
    } else {
      Logger.log('No match');
    }
  } catch (e) {
    Logger.log('findText threw: ' + e.message);
  }
}
```

If issue 3 is real, the log shows `Matched: " high confidence"`, meaning it matched the prose instead of the marker.
