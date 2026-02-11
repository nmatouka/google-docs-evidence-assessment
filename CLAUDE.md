# Evidence Assessment Google Docs Add-on

## Project Overview

A Google Docs add-on for systematic IPCC-style uncertainty communication in policy documents. Users highlight claims, rate evidence quality/agreement/confidence, and generate a structured evidence appendix.

**Platform:** Google Apps Script (server-side .gs + client-side HTML/JS/CSS)
**Target users:** Policy analysts, researchers, legislative staff

## Architecture

### File Structure
```
src/
├── Code.gs                # Entry point, menu registration, onOpen/onInstall
├── Assessment.gs          # Assessment CRUD operations
├── Appendix.gs            # Appendix generation and formatting
├── Storage.gs             # DocumentProperties persistence layer
├── Utils.gs               # Helpers (UUID, date formatting, error wrapper)
├── Config.gs              # Constants, version, defaults
├── UI/
│   ├── Sidebar.html       # Assessment form (Google Templated HTML)
│   ├── Manager.html       # Assessment list/management dialog
│   └── Styles.html        # Shared CSS (inlined via <?!= ?>)
└── appsscript.json        # Apps Script manifest
```

### Key Technical Constraints
- **Storage:** DocumentProperties max 500KB → ~500 assessments per doc
- **Execution:** 6-minute script timeout per invocation
- **Quotas:** 50,000 property read/writes per user per day
- **No real footnote API** — use superscript markers linking to appendix
- **Sidebar width:** Fixed 300px by Google
- **No Ctrl+Z integration** — add-on changes aren't undoable via native undo
- **Templated HTML:** Use `<?= ?>` and `<?!= ?>` for server-to-client data passing

### Data Model
Assessment objects stored as JSON array in DocumentProperties under key `evidenceAssessments`:
```javascript
{
  id: "uuid",
  claimText: "string",
  markerNumber: 1,
  location: { paragraphIndex: 0, startOffset: 0, endOffset: 0 },
  evidence: {
    quality: "limited" | "medium" | "robust",
    sources: ["string"],
    notes: "string"
  },
  agreement: {
    level: "low" | "medium" | "high",
    notes: "string"
  },
  confidence: {
    level: "very-low" | "low" | "medium" | "high" | "very-high",
    conditional: "string"
  },
  metadata: {
    createdAt: "ISO-8601",
    createdBy: "email",
    lastModified: "ISO-8601"
  }
}
```

## Development Conventions
- **No external dependencies** — pure Apps Script + vanilla JS/CSS
- **Error handling:** Wrap public functions with `safeExecute()` from Utils.gs
- **Naming:** camelCase for functions/variables, UPPER_SNAKE for constants
- **Client-server calls:** Use `google.script.run.withSuccessHandler().withFailureHandler()`
- **HTML includes:** Use `<?!= include('Styles') ?>` pattern for CSS/JS injection
- **IDs:** UUIDs generated via `Utilities.getUuid()`
- **Logging:** `Logger.log()` for server-side, `console.log()` for client-side

## Code Quality & Best Practices
- **Clean, readable code:** Meaningful variable names, consistent formatting, clear structure
- **Follow language conventions:** Use established Apps Script / JavaScript patterns and idioms
- **Keep it DRY:** Extract reusable functions or components; avoid repetition
- **Handle errors gracefully:** Include try-catch (via `safeExecute()`), validation, and user-friendly error messages
- **Helpful comments:** Explain complex logic or non-obvious decisions; don't over-comment obvious code

## Review & Error Prevention
Before presenting code, check for:
- **Syntax errors:** Ensure the code will actually run in the Apps Script environment
- **Logic errors:** Verify the code does what it's supposed to do
- **Edge cases:** Empty inputs, null values, boundary conditions (no selection, storage full, etc.)
- **Type safety:** Validate data at boundaries (form input, storage reads, document API returns)
- **Security issues:** No exposed secrets, validate all user input, sanitize HTML output
- **Performance concerns:** Flag inefficient approaches (unnecessary full-document scans, unbatched property writes)

## Development Flow
- **Iterate quickly:** Provide working solutions first, then suggest improvements
- **Explain tradeoffs:** When multiple approaches exist, briefly note pros/cons
- **Offer next steps:** Suggest logical extensions or improvements after core functionality works
- **Test suggestions:** Recommend how to test the code and what edge cases to check

## Communication Style
- Keep explanations concise unless asked for detail
- Show complete, working code rather than fragments
- If something won't work as requested, explain why and offer alternatives
- Ask clarifying questions when requirements are ambiguous, but make reasonable assumptions to keep momentum

## Testing
- Manual testing against a standardized test document with 3+ sample claims and a references section
- Use Apps Script built-in debugger and Logger
- Test matrix covers: no selection, valid assessment, missing fields, edit, delete, appendix generation

## Deployment
- Development: Bound script in test Google Doc
- Distribution: Deploy as Google Workspace Add-on (or share script project directly for small teams)
