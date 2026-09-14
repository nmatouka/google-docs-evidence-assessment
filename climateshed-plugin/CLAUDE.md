# Climateshed Evidence Add-on

A paid Google Docs add-on built from the free Evidence Assessment add-on (`../src/`). It requires a Climateshed account and will connect to the Climateshed backend (`commercial-CA-climate-rag`) to suggest evidence and citations. The root `CLAUDE.md` conventions apply; this file covers what differs.

## Keep the two add-ons apart

- They are separate products with separate Apps Script projects and Marketplace listings. Don't copy code between `src/` and `climateshed-plugin/src/` without checking what differs.
- Deploy only with `scripts/push.sh climateshed`. Each add-on's `.clasp.json` lives inside its own source folder. Never create one at the repo root or directly in `climateshed-plugin/`: clasp searches parent folders, and a config there could push both add-ons into one project.
- Top-level declarations in `Config.gs` use `const` on purpose. If this code is ever loaded alongside the free add-on (which uses `var`), the project fails with "Identifier has already been declared" instead of running a mix. Don't change them to `var`.
- `PLUGIN_EDITION` must appear only in this folder. `push.sh` refuses to push if it shows up in `src/`.

## What the AI may and may not do (not built yet)

The AI supports the author's decision and never makes it.

- It never changes document text. Its output stays in the sidebar until the author accepts it.
- Suggestions sit beside form fields and are never pre-filled. Each suggestion is accepted individually.
- It never suggests a confidence level. Evidence quality and agreement are the only ratings it proposes.
- It runs only when the author opens a claim to assess. Suggesting sentences to check is an opt-in, per-document setting.
- It searches only the Climateshed corpus and Climateshed data. Anything else is added by the author.
- Every citation or flag must include a quote that the server has confirmed appears in the retrieved passage.
- "Not covered by Climateshed" is a different result from "limited evidence."
- The stored record keeps "suggested by AI" separate from "accepted by <author>."

## Storage

- One DocumentProperties key per assessment (`assessment_<id>`). Apps Script allows 9KB per value and 500KB per store.
- `serializeAssessment()` enforces the size limit. Call it before changing the document, so an oversized assessment fails without leaving a marker behind.
- Schema version 2 adds `schemaVersion`, stored `markerText`, and structured `evidence.sources[]` of `{ title, publisher, year, page, url }` (only `title` required). There is no `location` field; positions come from named ranges.

## Anchors (`Anchors.gs`)

- Claims and markers are found only through named ranges: `ea_claim_<id>` and `ea_marker_<id>`. Never locate them with `findText()`, which treats its argument as a regular expression (see `../KNOWN_ISSUES.md`).
- Removing a marker deletes only the stored `markerText` characters, plus the leading space for parenthetical markers. Text typed next to a marker stays. If the marker text itself was changed, nothing is deleted and the problem is reported.
- A selection captured when the sidebar opens is held as `ea_pending_<id>_<timestampMs>` until saved. `cleanupOrphanedAnchors()` removes pending ranges after 24 hours, plus anchors whose assessment no longer exists.
- Operations that create, delete, renumber or restyle markers run inside `withDocumentLock()`.
- Template data printed into `<script>` blocks goes through `toScriptJson()`, never plain `JSON.stringify()`.

## Manual test checklist

In a bound test document with sample claims:

1. Create an assessment with two structured sources. Check the marker and the appendix citation format.
2. Add paragraphs above an assessed claim, then delete a different assessment. Every marker should stay attached to its own claim.
3. Put the words "high confidence" in ordinary prose, then switch between superscript and parenthetical styles several times. The prose must be untouched.
4. Create 11+ superscript markers out of document order, then run Sync Markers. Numbers should follow document order, with no stray digits.
5. Type inside a marker, then run Sync Markers. The edited text should stay, with a warning.
6. Type a period right after a marker, then switch citation style. The period should stay and only the marker should change.
7. Delete a claim's text, then generate the appendix. You should get the missing-claim warning.
8. Add many sources with long notes. Saving should show the size error, and no marker should be inserted.
9. Open the sidebar and cancel. The pending range should be removed on a later open, once it's older than 24 hours.
10. Click a claim in Manage Assessments. It should be selected in the document.
