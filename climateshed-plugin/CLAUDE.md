# Climateshed Evidence Add-on

A paid Google Docs add-on built from the free Evidence Assessment add-on (`../src/`). It requires a Climateshed account and will connect to the Climateshed backend (`commercial-CA-climate-rag`) to suggest evidence and citations. The root `CLAUDE.md` conventions apply; this file covers what differs.

## Keep the two add-ons apart

- They are separate products with separate Apps Script projects and Marketplace listings. Don't copy code between `src/` and `climateshed-plugin/src/` without checking what differs.
- Deploy only with `scripts/push.sh climateshed`. Each add-on's `.clasp.json` lives inside its own source folder. Never create one at the repo root or directly in `climateshed-plugin/`: clasp searches parent folders, and a config there could push both add-ons into one project.
- Top-level declarations in `Config.gs` use `const` on purpose. If this code is ever loaded alongside the free add-on (which uses `var`), the project fails with "Identifier has already been declared" instead of running a mix. Don't change them to `var`.
- `PLUGIN_EDITION` must appear only in this folder. `push.sh` refuses to push if it shows up in `src/`.

## Climateshed connection (`Climateshed.gs`, `UI/EvidencePanel.html`)

- Sign-in uses the Climateshed email-code login (`/auth/otp/request`, then `/auth/otp/verify`). The 30-day session token is stored in UserProperties, which only that Google user can read, and never in the document.
- `CONFIG.API_BASE_URL` points at the dev API (`ca-climate-api-dev.fly.dev`). Every host the plugin calls must also be listed in `urlFetchWhitelist` in `appsscript.json`.
- Evidence search (`POST /evidence/search` in `commercial-CA-climate-rag`, `app/evidence.py`) needs an active Starter or Pro subscription plus `users.evidence_access`, granted by hand in Supabase. The server enforces this; the plugin pre-checks it only to show a clearer message.
- The search runs when the author opens a claim. The plugin sends the claim plus a short piece of context: the document title, the nearest heading above the claim, and the text just before it (`getClaimContext` in `Anchors.gs`, capped by `CONTEXT_*_CHARS` in `Config.gs`). Nothing else from the document is sent.
- The backend has Claude rewrite the claim into a standalone query using that context. The panel shows the searched text and lets the author edit it and search again; an edited search is sent without context and searched as written.
- The backend recognizes local plans by filename (`CA_City_<Place>_<Year>.pdf`). When the claim is about a place, that place's plans are also searched. Results show their place and are ordered: same place, then the same name at a different level (a city plan for a county claim, labeled "Related place"), then statewide and general sources, then other places' plans labeled "Different place from your claim". At most 2 passages come from any one document.
- When the claim is about a California city or county and refers to a climate measure, a "Climate projections" card appears above the passages. It shows LOCA2 CMIP6 data for the matching jurisdiction (a county claim never gets the city's numbers), with all three scenarios, every measure the wording could mean, and a decade picker that starts at the claim's decade or the 2050s. The backend's rewrite only picks the measures and decade. The numbers are passed through, rounded for display, and the panel works out the change from 1981–2010. An edited search keeps the claim's card. Regional and statewide claims get no card.
- Source labels run only when the author clicks "How do these sources relate?" (`relateClimateshedEvidence`, `POST /evidence/relate`, `app/evidence_relate.py`). The plugin sends the claim, the searched text, and that search's passages with their titles and places. A passage from another place's local plan ("Different place from your claim") is never sent to Claude and always counts as not addressing the claim. Each passage comes back labeled Supports, Qualifies, or Contradicts with a quote the server found in that passage, or unlabeled when no quote could be confirmed. Passages that don't address the claim are hidden, with a count. Labels live only on the search result in the panel and are never stored. The climate projections card is never labeled.
- Rating suggestions come back with the source labels. Evidence quality is Climateshed's suggestion (limited, medium, or robust) with a reason and the labeled passages it rests on; the server drops it when no passage with a kept label supports it. Agreement is worked out in the panel from the labels by `suggestAgreement`, counting documents rather than passages: High when none contradict and at least as many support as qualify, Low when as many or more contradict as support, Medium otherwise, and no suggestion when fewer than two documents address the claim. Each suggestion appears beside its field with "Use this", which only selects the rating. Confidence is never suggested.
- The panel tidies passage line breaks and PDF symbol glyphs for display only; the words are unchanged.
- Passages come back verbatim, with no ratings. A source is added only when the author clicks "Add as source", and it is stored with `origin: 'climateshed'`.
- Manual assessment works without signing in. Only the evidence panel needs an account.
- Sidebar functions in `Climateshed.gs` return `{ success, error }` instead of using `safeExecute()`, so network errors show inline rather than as a modal dialog.

**Before release:**
- Switch `API_BASE_URL` and `urlFetchWhitelist` to `https://api.climateshed.app`.
- Sign-in calls come from Google's shared servers, so the backend's per-IP limit (5 code requests a minute) is shared by every plugin user and needs a different key.
- Recheck the relevance cutoff (`_MIN_RELEVANCE` in `app/evidence.py`, set to 0.5 from a dev calibration run of 11 claims on 2026-09-15) against real pilot claims and after corpus changes.

## What the AI may and may not do (evidence search, source labels, and rating suggestions built)

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
- Optional `evidence.suggestion` (`{ level, reason, basedOn[], suggestedAt }`) and `agreement.suggestion` (`{ level, counts, suggestedAt }`) record what Climateshed suggested, beside the author's own ratings. `buildRatingFields()` keeps only known fields; an update without a new suggestion keeps the stored one. The appendix doesn't show them.

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
