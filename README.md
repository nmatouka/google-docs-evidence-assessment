# Evidence Assessment — Google Docs Add-on

A Google Docs add-on for systematic IPCC-style uncertainty communication in policy documents. Highlight claims, rate evidence quality, agreement, and confidence, then generate a structured evidence appendix.

## Features

- **Assess claims** — Select text, rate evidence quality (limited/medium/robust), agreement level (low/medium/high), and overall confidence (very low to very high)
- **Superscript markers** — Numbered markers are inserted at each assessed claim, linking to the appendix
- **Evidence appendix** — Auto-generated, formatted appendix with all assessments, color-coded by confidence
- **IPCC consistency hints** — Non-blocking guidance when your confidence rating diverges from what evidence + agreement would suggest
- **Manage assessments** — View, edit, delete, and jump to any assessment from a management dialog
- **Export** — Save assessments as CSV or JSON to Google Drive
- **Marker sync** — Automatic renumbering when assessments are added or removed

## Quick Start

1. Open a Google Doc and install the add-on
2. Go to **Extensions > Evidence Assessment > Assess Selected Text**
3. Highlight a claim in the document
4. Click **Capture Selection** in the sidebar
5. Fill in the assessment form and click **Save**
6. Repeat for additional claims
7. Go to **Extensions > Evidence Assessment > Generate Appendix** to create the summary

## Menu Items

| Item | Description |
|------|-------------|
| Assess Selected Text | Open the assessment sidebar |
| Manage Assessments | View, edit, delete, or jump to assessments |
| Generate Appendix | Create or update the evidence appendix |
| Export Assessments | Save assessments as CSV or JSON |
| Sync Markers | Renumber markers if they get out of order |
| Help | Quick-reference guide |

## Project Structure

```
src/
├── Code.gs              # Entry point, menu, sidebar/dialog launchers
├── Assessment.gs        # Assessment CRUD, markers, renumbering
├── Appendix.gs          # Appendix generation and formatting
├── Export.gs            # CSV/JSON export to Google Drive
├── Storage.gs           # DocumentProperties persistence layer
├── Utils.gs             # Helpers (UUID, error wrapper, superscript)
├── Config.gs            # Constants, enums, version
├── UI/
│   ├── Sidebar.html     # Assessment form with capture selection
│   ├── Manager.html     # Assessment list and management dialog
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
5. The **Evidence Assessment** menu appears under **Extensions**

### For distribution

See the [Google Workspace Marketplace](https://developers.google.com/workspace/marketplace) documentation for publishing as a public add-on.

## Permissions

| Scope | Purpose |
|-------|---------|
| `documents.currentonly` | Read/write the current document |
| `script.container.ui` | Display sidebar and dialogs |
| `drive.file` | Create export files in Google Drive |

## License

This project is open source. See [TERMS.md](TERMS.md) for terms of service and [PRIVACY.md](PRIVACY.md) for the privacy policy.
