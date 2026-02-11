# Evidence Assessment Add-on — Implementation Plan

## Revisions from Original Scope

### What changed
1. **Dropped RTF scope doc** — replaced with this markdown plan and CLAUDE.md
2. **Simplified file structure** — flat `src/` directory, no nested UI subfolders beyond what's needed
3. **Deferred to v2.0:** Bibliography auto-detection, Zotero/Paperpile integration, templates, dashboard, export/import, AI-assisted features, collaboration features
4. **Marker strategy simplified** — superscript numbers only (no footnote or badge options for MVP)
5. **Session-chunked phases** — each session is scoped to what Claude Code can accomplish in one sitting (~20-30 min of active work)
6. **Config simplified** — hardcode sensible defaults, no user-configurable marker style for MVP

### What stayed
- Core data model (assessment objects in DocumentProperties)
- Sidebar-based assessment workflow
- Appendix generation with structured formatting
- Management dialog for viewing/editing/deleting
- Error handling patterns

---

## Phase 1: Skeleton & Storage (Session 1)

**Goal:** Project files created, menu working, data layer functional.

### Tasks
- [ ] Create `appsscript.json` manifest
- [ ] Create `Config.gs` with constants (version, property keys, confidence/evidence/agreement enums)
- [ ] Create `Utils.gs` with `safeExecute()` wrapper, `generateId()`, `include()` helper
- [ ] Create `Storage.gs` with full CRUD: `loadAssessments()`, `saveAssessments()`, `getAssessmentById()`, `updateAssessment()`, `deleteAssessment()`
- [ ] Create `Code.gs` with `onOpen()`, `onInstall()`, menu registration
- [ ] Create minimal `Sidebar.html` placeholder (just confirms sidebar opens)

### Milestone
Menu appears in Google Docs. Sidebar opens. Storage functions work (testable via Apps Script debugger).

---

## Phase 2: Assessment Creation (Session 2)

**Goal:** User can highlight text, fill out the sidebar form, and save an assessment.

### Tasks
- [ ] Create `Styles.html` with sidebar CSS (300px layout, form styling, validation states)
- [ ] Build full `Sidebar.html` form: claim display, evidence quality radios, sources textarea, agreement radios, confidence dropdown, conditional text field, save/cancel buttons
- [ ] Create `Assessment.gs` with `getSelectedText()`, `createAssessment()`, `validateAssessment()`
- [ ] Wire client-side JS: form submission → `google.script.run` → server-side save
- [ ] Show success/error feedback in sidebar

### Milestone
End-to-end: highlight text → open sidebar → fill form → save → assessment stored in DocumentProperties.

---

## Phase 3: Document Markers (Session 3)

**Goal:** Superscript numbered markers appear in the document after saving an assessment.

### Tasks
- [ ] Implement `insertMarker()` in Assessment.gs — insert superscript number at end of selection
- [ ] Implement marker numbering logic (sequential, based on document order)
- [ ] Hook marker insertion into `createAssessment()` flow
- [ ] Handle edge cases: cursor at end of paragraph, selection spanning multiple paragraphs
- [ ] Store marker number and precise location in assessment object

### Milestone
After saving an assessment, a superscript number (e.g., ¹) appears at the end of the highlighted claim.

---

## Phase 4: Appendix Generation (Session 4)

**Goal:** "Generate Appendix" creates a formatted evidence section at the end of the document.

### Tasks
- [ ] Create `Appendix.gs` with `generateAppendix()`, `findOrCreateAppendixSection()`, `formatAppendixEntry()`
- [ ] Implement appendix structure: heading, numbered entries with claim, evidence quality, agreement, confidence, conditional
- [ ] Apply document styling (Heading 1 for title, structured text with indentation for entries)
- [ ] Sort entries by marker number
- [ ] Handle regeneration: clear existing appendix content before rebuilding
- [ ] Add "Generate Appendix" to menu

### Milestone
Click menu item → formatted appendix appears at document end with all saved assessments.

---

## Phase 5: Management Dialog (Session 5)

**Goal:** Users can view all assessments, edit them, and delete them.

### Tasks
- [ ] Create `Manager.html` — dialog listing all assessments with summary info (marker #, claim snippet, confidence level)
- [ ] Add "Edit" action: opens sidebar pre-populated with existing assessment data
- [ ] Add "Delete" action with confirmation prompt
- [ ] Implement edit mode in Sidebar.html (detect edit vs. create, "Update" button)
- [ ] Implement `editAssessment()` and wire update flow in Assessment.gs
- [ ] On delete: remove assessment from storage, remove marker from document
- [ ] Add "Manage Assessments" to menu

### Milestone
Full CRUD: create, read (via manager), update (via edit mode), delete with marker cleanup.

---

## Phase 6: Marker Sync & Renumbering (Session 6)

**Goal:** Markers stay consistent when assessments are added, edited, or deleted.

### Tasks
- [ ] Implement `renumberMarkers()` — scan document, update superscript numbers to match assessment order
- [ ] Implement `syncMarkersWithDocument()` — detect orphaned markers or missing markers
- [ ] Call renumber after delete operations
- [ ] Add "Sync Markers" option to menu
- [ ] Basic integrity check before appendix generation
- [ ] Show warning dialog if issues detected

### Milestone
Delete assessment #2 of 5 → remaining markers renumber to 1-4 → appendix regenerates correctly.

---

## Phase 7: Error Handling & Polish (Session 7)

**Goal:** Robust error handling, edge case coverage, and UI refinements.

### Tasks
- [ ] Audit all server-side functions for `safeExecute()` wrapping
- [ ] Handle: no text selected, storage quota warnings, document locked states
- [ ] Add loading indicators in sidebar and manager dialog
- [ ] Improve form validation UX (red outlines, inline error messages)
- [ ] Add "Jump to claim" from manager dialog (scroll to marker position)
- [ ] Test full workflow end-to-end with 5+ assessments
- [ ] Fix any bugs found during testing

### Milestone
Tool handles all common error states gracefully. Smooth UX for the full workflow.

---

## Phase 8: Documentation & Deployment Prep (Session 8)

**Goal:** Ready for real use.

### Tasks
- [ ] Create test document with sample policy text and 3+ pre-made assessments
- [ ] Run through complete test matrix (see CLAUDE.md)
- [ ] Write brief user guide (as comments in Code.gs or a simple help dialog)
- [ ] Clean up any debug logging
- [ ] Verify manifest scopes are minimal (only document access)
- [ ] Document deployment steps for binding to a Google Doc or publishing

### Milestone
Tool is usable, documented, and ready to deploy to a real policy document.

---

## Future (v2.0+)

These features are deferred but the architecture supports them:

| Feature | Effort | Value |
|---------|--------|-------|
| Bibliography auto-detection | 1-2 sessions | High if user has references section |
| CSV/JSON export | 1 session | Medium for team sharing |
| Assessment templates | 1 session | Medium for repetitive claim types |
| Summary dashboard | 1 session | Nice-to-have |
| Validation checks (mismatched confidence/evidence) | 1 session | Quality improvement |
| Zotero/Paperpile integration | 2-3 sessions | High for academic users |

---

## Session Expectations

Each session is designed to be completable in one Claude Code sitting:
- **Scope:** 3-7 files created or modified
- **Complexity:** One major feature per session
- **Testing:** Each session ends with a testable milestone
- **Dependencies:** Sessions are sequential — each builds on the previous

**Between sessions:** Deploy the script to your test doc, manually verify the milestone works, and note any issues to address in the next session.
