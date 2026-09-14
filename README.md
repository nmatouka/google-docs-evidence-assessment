# Evidence Assessment — Google Docs Add-on

A Google Docs add-on for systematic IPCC-style uncertainty communication in policy documents. Highlight claims, rate evidence quality, agreement, and confidence, then generate a structured evidence appendix.

## Features

- **Assess claims** — Select text, rate evidence quality (limited/medium/robust), agreement level (low/medium/high), and overall confidence (very low to very high)
- **Two citation styles** — Switch between superscript number markers (¹) or inline IPCC parenthetical markers *(high confidence)*
- **Parenthetical options** — Choose detail level (confidence only, evidence + agreement, or full) and bracket style (parentheses or curly braces per AR6 convention)
- **Evidence appendix** — Auto-generated, formatted appendix with all assessments, color-coded by confidence
- **IPCC consistency hints** — Non-blocking guidance when your confidence rating diverges from what evidence + agreement would suggest
- **Manage assessments** — View, edit, delete, and jump to any assessment from a management dialog
- **Marker sync** — Automatic renumbering when assessments are added or removed

## Quick Start

1. Open a Google Doc and install the add-on
2. Highlight a claim in the document
3. Click **Evidence Assessment → Assess Selected Text**
4. Fill in the assessment form and click **Save**
5. Repeat for additional claims
6. Click **Evidence Assessment → Generate Appendix** to create the summary

## Menu Items

| Item | Description |
|------|-------------|
| Assess Selected Text | Open the assessment sidebar |
| Manage Assessments | View, edit, delete, or jump to assessments |
| Generate Appendix | Create or update the evidence appendix |
| Sync Markers | Renumber markers if they get out of order |
| Citation Style | Switch between superscript and IPCC parenthetical markers |
| Help | Quick-reference guide |

## Two Add-ons in This Repo

| Folder | Add-on | Status |
|--------|--------|--------|
| `src/` | Evidence Assessment (free) | Published. Known structural issues are listed in [KNOWN_ISSUES.md](KNOWN_ISSUES.md) |
| `climateshed-plugin/src/` | Climateshed Evidence (requires a paid Climateshed account) | In development |

The two add-ons share function names and must never be pushed into the same Apps Script project. Push them with [clasp](https://github.com/google/clasp) through the guard script, which refuses any setup that could mix them:

```bash
scripts/push.sh free
```

```bash
scripts/push.sh climateshed
```

Each add-on's `.clasp.json` lives inside its own source folder. Copy `.clasp.json.example` there and set the script ID. Never create a `.clasp.json` at the repo root.

## Project Structure

```
src/
├── Code.gs              # Entry point, menu, sidebar/dialog launchers
├── Assessment.gs        # Assessment CRUD, markers, renumbering, style conversion
├── Appendix.gs          # Appendix generation and formatting
├── Export.gs            # CSV/JSON export (disabled pending scope fix)
├── Storage.gs           # DocumentProperties persistence layer
├── Utils.gs             # Helpers (UUID, error wrapper, superscript)
├── Config.gs            # Constants, enums, citation style defaults
├── UI/
│   ├── Sidebar.html     # Assessment form
│   ├── Manager.html     # Assessment list and management dialog
│   ├── CitationStyle.html # Citation style settings dialog
│   └── Styles.html      # Shared CSS
└── appsscript.json      # Apps Script manifest
```

## Data Model

Assessments are stored as JSON in DocumentProperties (no external servers). Each assessment includes:

- **Claim text** and document location
- **Evidence quality** — Limited, Medium, or Robust
- **Sources** and evidence notes
- **Agreement level** — Low, Medium, or High
- **Overall confidence** — Very Low through Very High
- **Conditional statement** — Optional qualifier (e.g., "Assumes 80%+ participation rate")
- **Metadata** — Created/modified timestamps and author

## Installation

### For development / personal use

1. Open a Google Doc
2. Go to **Extensions > Apps Script**
3. Copy each file from `src/` into the Apps Script editor (maintaining the `UI/` folder for HTML files)
4. Save and reload the Google Doc
5. The **Evidence Assessment** menu appears in the menu bar

### For distribution

See the [Google Workspace Marketplace](https://developers.google.com/workspace/marketplace) documentation for publishing as a public add-on.

## Permissions

| Scope | Purpose |
|-------|---------|
| `documents.currentonly` | Read/write the current document |
| `script.container.ui` | Display sidebar and dialogs |
| `drive.file` | Create export files in Google Drive (reserved for future use) |

## License

This project is open source. See [TERMS.md](TERMS.md) for terms of service and [PRIVACY.md](PRIVACY.md) for the privacy policy.
