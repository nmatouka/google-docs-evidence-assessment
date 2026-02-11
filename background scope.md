{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 Project Plan for Claude Code Implementation\
\
---\
\
## Executive Summary\
\
Build a Google Docs add-on that enables systematic uncertainty communication following IPCC-style frameworks. The plugin will help policy analysts, researchers, and legislative staff document the evidence quality behind quantitative claims in their documents.\
\
**Development Approach:** Build as standalone Google Apps Script add-on with optional integration points for existing citation managers (Zotero, Paperpile).\
\
**Timeline:** 4-6 weeks for MVP  \
**Target User:** Policy analysts writing legislative analysis, agency reports, or research briefs\
\
---\
\
## Phase 1: Foundation & Architecture (Week 1)\
\
### 1.1 Project Setup\
\
**Deliverables:**\
\
- Initialize Google Apps Script project\
- Set up version control structure\
- Create development/testing Google Doc environment\
- Document folder structure and naming conventions\
\
**Technical Tasks:**\
\
```\
project/\
\uc0\u9500 \u9472 \u9472  Code.gs                 # Main entry point, menu setup\
\uc0\u9500 \u9472 \u9472  Assessment.gs          # Core assessment logic\
\uc0\u9500 \u9472 \u9472  Appendix.gs           # Appendix generation\
\uc0\u9500 \u9472 \u9472  Storage.gs            # Document properties management\
\uc0\u9500 \u9472 \u9472  UI/\
\uc0\u9474    \u9500 \u9472 \u9472  Sidebar.html      # Main assessment interface\
\uc0\u9474    \u9500 \u9472 \u9472  Sidebar.js        # Client-side logic\
\uc0\u9474    \u9492 \u9472 \u9472  Styles.html       # CSS styling\
\uc0\u9500 \u9472 \u9472  Utils.gs              # Helper functions\
\uc0\u9492 \u9472 \u9472  Config.gs             # Configuration constants\
```\
\
**Key Decisions to Document:**\
\
- Data storage strategy (DocumentProperties vs. custom document structure)\
- Marker format for citations (superscript numbers, footnotes, or inline badges)\
- Appendix placement (end of document, separate section, or floating)\
\
### 1.2 Data Model Design\
\
**Core Data Structures:**\
\
```javascript\
// Assessment object stored in DocumentProperties\
\{\
  id: "uuid-string",\
  claimText: "Program will reduce emissions by 25%",\
  location: \{\
    paragraphIndex: 5,\
    offset: 120\
  \},\
  evidence: \{\
    quality: "medium",  // limited | medium | robust\
    sources: ["Smith et al. 2023", "CARB Report 2024"],\
    qualityNotes: "Single modeling study, not validated against CA data"\
  \},\
  agreement: \{\
    level: "high",      // low | medium | high\
    notes: "4 of 5 expert interviews concurred"\
  \},\
  confidence: \{\
    level: "medium",    // very-low | low | medium | high | very-high\
    conditional: "Assumes 80%+ program participation rate"\
  \},\
  metadata: \{\
    createdAt: "2025-02-10T10:30:00Z",\
    createdBy: "user@example.com",\
    lastModified: "2025-02-10T11:15:00Z"\
  \}\
\}\
\
// Configuration object\
\{\
  version: "1.0.0",\
  markerStyle: "superscript-number",  // or "footnote" or "inline-badge"\
  appendixTitle: "Evidence Assessment Appendix",\
  appendixLocation: "end",            // or "after-references"\
  citationStyle: "apa"                // for future integration\
\}\
```\
\
**Storage Strategy:**\
\
- Use `PropertiesService.getDocumentProperties()` for assessment data\
- Store as JSON array under key `"evidenceAssessments"`\
- Maximum 500KB storage (Google limit) = ~500-1000 assessments\
- Implement basic versioning for future compatibility\
\
### 1.3 Integration Planning\
\
**Zotero Integration (Optional - Phase 3):**\
\
- Research Zotero API for Google Docs\
- Document structure: How Zotero stores citation data in doc\
- Plan: Read Zotero's citation store, offer as source dropdown\
- Fallback: Manual citation entry if Zotero not detected\
\
**Paperpile Integration (Optional - Phase 3):**\
\
- Similar approach to Zotero\
- Research their Google Docs plugin architecture\
- May require user permission to access their data\
\
**Manual Bibliography Parsing (Phase 2):**\
\
- Regex patterns for common citation formats (APA, MLA, Chicago)\
- Search document for "References", "Bibliography", "Works Cited" sections\
- Parse into structured list for dropdown selection\
\
---\
\
## Phase 2: Core Functionality (Weeks 2-3)\
\
### 2.1 Basic Menu & UI Setup\
\
**File: Code.gs**\
\
```javascript\
// Implement these functions:\
function onOpen(e) \{\
  // Create custom menu\
  // Add items: "Assess Selected Text", "Manage Assessments", "Generate Appendix"\
\}\
\
function onInstall(e) \{\
  // Run onOpen for installation\
\}\
\
function showSidebar() \{\
  // Display assessment sidebar\
\}\
\
function showManagementDialog() \{\
  // Show list of all assessments for editing/deletion\
\}\
```\
\
**File: UI/Sidebar.html** Create HTML template with:\
\
- Selected text display (read-only)\
- Evidence Quality radio buttons/dropdown\
- Sources field (text area initially, dropdown in Phase 2.3)\
- Agreement Level radio buttons\
- Confidence Level dropdown\
- Conditional statement field (optional)\
- Save/Cancel buttons\
\
**Design Specifications:**\
\
- Width: 300px sidebar (Google Docs standard)\
- Responsive layout for different screen sizes\
- Clear visual hierarchy (claim \uc0\u8594  evidence \u8594  agreement \u8594  confidence)\
- Validation indicators (red outline for required fields)\
\
### 2.2 Assessment Creation Workflow\
\
**File: Assessment.gs**\
\
```javascript\
// Implement these core functions:\
\
function createAssessment(formData) \{\
  // 1. Validate form data\
  // 2. Get current cursor/selection position\
  // 3. Generate unique ID\
  // 4. Create assessment object\
  // 5. Store in DocumentProperties\
  // 6. Insert marker in document\
  // 7. Return success/error status\
\}\
\
function getSelectedText() \{\
  // Extract currently selected text\
  // Handle edge cases: no selection, multiple selections\
  // Return: \{text, position\} or null\
\}\
\
function insertMarker(assessmentId, position) \{\
  // Insert superscript number at position\
  // Link to assessment via ID\
  // Handle: consecutive numbers, gaps in sequence\
\}\
\
function validateAssessment(data) \{\
  // Required: claimText, evidence.quality, agreement.level, confidence.level\
  // Optional: sources, notes, conditional\
  // Return: \{valid: boolean, errors: []\}\
\}\
```\
\
**User Workflow:**\
\
1. User highlights text: "Program will reduce emissions by 25%"\
2. User clicks "Assess Selected Text" from menu\
3. Sidebar opens with claim pre-filled\
4. User completes form fields\
5. User clicks "Save"\
6. System validates \uc0\u8594  inserts marker\'b9 \u8594  stores data \u8594  closes sidebar\
7. User sees numbered marker in document\
\
**Error Handling:**\
\
- No text selected \uc0\u8594  Show error message, keep sidebar open\
- Invalid data \uc0\u8594  Highlight problematic fields, prevent save\
- Storage full \uc0\u8594  Warn user, offer to export/archive old assessments\
- Document structure changed \uc0\u8594  Warn that markers may be misaligned\
\
### 2.3 Bibliography Detection & Source Selection\
\
**File: Utils.gs**\
\
```javascript\
// Implement bibliography scanning:\
\
function findBibliography() \{\
  // 1. Search document for section headings: "References", "Bibliography", "Works Cited"\
  // 2. Extract text from that section to end of doc (or next major heading)\
  // 3. Return: \{found: boolean, startIndex: number, entries: []\}\
\}\
\
function parseBibliographyEntry(text) \{\
  // Basic pattern matching for common formats:\
  // APA: "Author, A. A. (Year). Title. Journal, Volume(Issue), pages."\
  // MLA: "Author. "Title." Journal Volume.Issue (Year): pages."\
  // Return: \{author, year, title, raw\} or null\
\}\
\
function extractCitations() \{\
  // Call findBibliography()\
  // Parse each entry\
  // Return array of citation objects for dropdown\
\}\
```\
\
**UI Update:** Modify Sidebar.html sources field:\
\
```html\
<!-- Phase 2.1: Simple text area -->\
<textarea id="sources" placeholder="Enter citation(s)"></textarea>\
\
<!-- Phase 2.3: Dropdown + text area combo -->\
<div id="sources-container">\
  <label>Select from Bibliography:</label>\
  <select id="source-dropdown" multiple size="5">\
    <!-- Populated from extractCitations() -->\
  </select>\
  <label>Or enter manually:</label>\
  <textarea id="manual-sources"></textarea>\
</div>\
```\
\
**Fallback Logic:**\
\
- If no bibliography found \uc0\u8594  Show only manual entry\
- If bibliography found but unparseable \uc0\u8594  Show raw text with warning\
- If Zotero/Paperpile detected (future) \uc0\u8594  Prioritize their data\
\
### 2.4 Storage & Retrieval System\
\
**File: Storage.gs**\
\
```javascript\
// Implement robust data management:\
\
function saveAssessments(assessments) \{\
  // Serialize array to JSON\
  // Store in DocumentProperties\
  // Handle: size limits, encoding issues\
  // Return: success boolean\
\}\
\
function loadAssessments() \{\
  // Retrieve from DocumentProperties\
  // Parse JSON\
  // Handle: missing data, corrupted data, version mismatches\
  // Return: assessment array or []\
\}\
\
function getAssessmentById(id) \{\
  // Load all assessments\
  // Find by ID\
  // Return: assessment object or null\
\}\
\
function updateAssessment(id, updates) \{\
  // Load assessments\
  // Find by ID\
  // Merge updates\
  // Save back\
  // Update marker if needed\
\}\
\
function deleteAssessment(id) \{\
  // Load assessments\
  // Remove by ID\
  // Save remaining\
  // Remove marker from document\
\}\
\
function migrateDataVersion(oldVersion, newVersion) \{\
  // Future-proofing for schema changes\
  // Transform old data structure to new\
\}\
```\
\
**Data Integrity Measures:**\
\
- Validate JSON structure on every load\
- Implement "repair" function for corrupted data\
- Keep backup in separate property key before major operations\
- Log operations for debugging (use Logger or console in Apps Script)\
\
---\
\
## Phase 3: Appendix Generation (Week 4)\
\
### 3.1 Appendix Structure & Formatting\
\
**File: Appendix.gs**\
\
```javascript\
// Core appendix generation:\
\
function generateAppendix() \{\
  // 1. Load all assessments\
  // 2. Sort by document order (using location data)\
  // 3. Find or create appendix section\
  // 4. Clear existing appendix content\
  // 5. Generate formatted entries\
  // 6. Apply styling\
\}\
\
function findOrCreateAppendixSection() \{\
  // Search for existing section with title "Evidence Assessment Appendix"\
  // If found: return paragraph index\
  // If not: create at end of document, return new index\
  // Handle: multiple matches, document structure changes\
\}\
\
function formatAppendixEntry(assessment, index) \{\
  // Generate formatted text for single assessment\
  // Return: array of paragraph objects to insert\
\}\
```\
\
**Appendix Format Design:**\
\
```\
EVIDENCE ASSESSMENT APPENDIX\
\
[1] Program emissions reduction claim\
    Claim: "Program will reduce emissions by 25%"\
    \
    Evidence Quality: Medium\
    \uc0\u9492 \u9472  Single modeling study (Smith et al. 2023)\
    \uc0\u9492 \u9472  Not validated against CA-specific data\
    \
    Agreement: High  \
    \uc0\u9492 \u9472  4 of 5 expert interviews concurred with magnitude\
    \
    Overall Confidence: Medium\
    \uc0\u9492 \u9472  Conditional on: Assumes 80%+ program participation rate\
\
[2] Implementation cost estimate\
    Claim: "Implementation will cost $50 million over 5 years"\
    \
    Evidence Quality: Limited\
    \uc0\u9492 \u9472  Rough extrapolation from Oregon program (Jones 2022)\
    \
    Agreement: Medium\
    \uc0\u9492 \u9472  LAO estimate 40% higher ($70M)\
    \
    Overall Confidence: Low\
    \uc0\u9492 \u9472  High sensitivity to actual participation rates and enforcement costs\
```\
\
**Styling Options:**\
\
- Heading 1: "EVIDENCE ASSESSMENT APPENDIX"\
- Heading 3: Each numbered entry\
- Normal text with left indent: Details\
- Tree characters (\uc0\u9492 \u9472 ) or bullets for sub-items\
- Monospace or distinct font for claim text\
\
### 3.2 Smart Appendix Features\
\
**Auto-Numbering:**\
\
```javascript\
function renumberAssessments() \{\
  // When assessments are added/deleted, renumber markers\
  // Update document markers sequentially\
  // Regenerate appendix with correct numbers\
\}\
```\
\
**Conditional Display:**\
\
```javascript\
function generateFilteredAppendix(filters) \{\
  // Optional: Generate appendix with only certain confidence levels\
  // Use case: "Show only Low/Very Low confidence claims"\
  // Or: "Show only claims without sources"\
\}\
```\
\
**Update Detection:**\
\
```javascript\
function detectStaleMarkers() \{\
  // Scan document for markers\
  // Cross-reference with stored assessments\
  // Flag: markers without assessments, assessments without markers\
  // Return: \{orphanedMarkers: [], missingMarkers: []\}\
\}\
```\
\
### 3.3 Document Synchronization\
\
**Challenge:** Document edits can break marker positioning\
\
**File: Utils.gs**\
\
```javascript\
function syncMarkersWithDocument() \{\
  // 1. Find all superscript numbers in document\
  // 2. Extract their current positions\
  // 3. Match with stored assessments\
  // 4. Update location data in storage\
  // 5. Flag any mismatches for user review\
\}\
\
function validateDocumentIntegrity() \{\
  // Run before appendix generation\
  // Check: markers exist, locations accurate, no duplicates\
  // Return: \{valid: boolean, issues: []\}\
\}\
```\
\
**User Warning System:**\
\
```javascript\
function showIntegrityWarning(issues) \{\
  // Display dialog: "We detected X issues with evidence markers"\
  // Options: "Fix automatically", "Review manually", "Ignore"\
  // If auto-fix: Run syncMarkersWithDocument()\
\}\
```\
\
---\
\
## Phase 4: Management & Editing (Week 5)\
\
### 4.1 Assessment Management Dialog\
\
**File: UI/ManagementDialog.html**\
\
Create management interface showing:\
\
```\
Evidence Assessment Manager\
\
[Search: _______________] [Filter: All \uc0\u9660 ]\
\
\uc0\u9484 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9488 \
\uc0\u9474  [1] Program emissions reduction claim   \u9474 \
\uc0\u9474  Confidence: Medium | Sources: 1         \u9474 \
\uc0\u9474  [Edit] [Delete] [Jump to claim]        \u9474 \
\uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
\uc0\u9474  [2] Implementation cost estimate        \u9474 \
\uc0\u9474  Confidence: Low | Sources: 1            \u9474 \
\uc0\u9474  [Edit] [Delete] [Jump to claim]        \u9474 \
\uc0\u9500 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9508 \
\uc0\u9474  [3] Stakeholder engagement timeline     \u9474 \
\uc0\u9474  Confidence: High | Sources: 2           \u9474 \
\uc0\u9474  [Edit] [Delete] [Jump to claim]        \u9474 \
\uc0\u9492 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9472 \u9496 \
\
[Regenerate All Markers] [Export Data] [Close]\
```\
\
**Features:**\
\
- List all assessments with summary info\
- Search by claim text or source\
- Filter by confidence level\
- Quick actions: Edit, Delete, Navigate to claim\
- Bulk actions: Export, Regenerate markers\
\
### 4.2 Editing Functionality\
\
**File: Assessment.gs**\
\
```javascript\
function editAssessment(id) \{\
  // 1. Load assessment by ID\
  // 2. Populate sidebar form with existing data\
  // 3. Change "Save" button to "Update"\
  // 4. On update: validate \uc0\u8594  save \u8594  refresh marker if needed\
\}\
\
function showEditSidebar(assessmentId) \{\
  // Load assessment data\
  // Pass to sidebar template\
  // Set form to "edit mode"\
\}\
```\
\
**Edit Mode UI Differences:**\
\
- Show "Editing assessment [X]" header\
- Pre-populate all fields\
- "Update" button instead of "Save"\
- "Cancel" returns to view mode without changes\
- Allow editing claim text (but warn: "This doesn't change the document")\
\
### 4.3 Export & Import\
\
**File: Utils.gs**\
\
```javascript\
function exportAssessments() \{\
  // 1. Load all assessments\
  // 2. Convert to CSV or JSON\
  // 3. Create downloadable file\
  // Options: CSV for Excel, JSON for backup/transfer\
\}\
\
function importAssessments(fileContent) \{\
  // 1. Parse CSV or JSON\
  // 2. Validate structure\
  // 3. Merge with existing (with conflict resolution)\
  // 4. Offer to regenerate markers\
\}\
```\
\
**Export Format (CSV):**\
\
```csv\
Number,Claim,Evidence Quality,Sources,Agreement,Confidence,Conditional\
1,"Program will reduce emissions by 25%",Medium,"Smith et al. 2023",High,Medium,"Assumes 80%+ participation"\
2,"Implementation cost $50M",Limited,"Jones 2022",Medium,Low,"High sensitivity to participation"\
```\
\
**Use Cases:**\
\
- Backup before major document edits\
- Share assessments across team\
- External analysis in Excel/R\
- Archive for future reference\
\
---\
\
## Phase 5: Polish & Advanced Features (Week 6)\
\
### 5.1 Templates for Common Claim Types\
\
**File: Templates.gs**\
\
```javascript\
// Pre-configured assessment templates:\
\
const TEMPLATES = \{\
  "cost-estimate": \{\
    name: "Cost Estimate",\
    prompts: \{\
      evidenceQuality: "Is this a detailed budget analysis or rough estimate?",\
      sources: "Budget document, comparable program, or expert estimate?",\
      agreement: "Does LAO or fiscal analysis concur?",\
      conditional: "What assumptions affect the cost? (participation, timeline, etc.)"\
    \},\
    defaults: \{\
      confidence: "medium"  // Most cost estimates start here\
    \}\
  \},\
  \
  "emissions-reduction": \{\
    name: "Emissions/Environmental Impact",\
    prompts: \{\
      evidenceQuality: "Based on modeling, empirical data, or both?",\
      sources: "Peer-reviewed study? CARB/EPA report?",\
      agreement: "Do multiple models/studies agree?",\
      conditional: "Dependent on climate scenarios or behavior change?"\
    \}\
  \},\
  \
  "legal-analysis": \{\
    name: "Legal/Regulatory Impact",\
    prompts: \{\
      evidenceQuality: "Based on case law, statutory analysis, or expert opinion?",\
      sources: "Court decisions, AG opinions, legal scholarship?",\
      agreement: "Consensus view or contested interpretation?",\
      conditional: "Subject to judicial review or regulatory approval?"\
    \}\
  \}\
\};\
\
function loadTemplate(templateId) \{\
  // Populate sidebar with template-specific prompts\
  // Pre-fill defaults\
  // Show contextual help text\
\}\
```\
\
**UI Addition:**\
\
```html\
<!-- Add to top of sidebar -->\
<div id="template-selector">\
  <label>Claim Type (optional):</label>\
  <select id="template" onchange="loadTemplate(this.value)">\
    <option value="">-- Select template --</option>\
    <option value="cost-estimate">Cost Estimate</option>\
    <option value="emissions-reduction">Emissions Reduction</option>\
    <option value="legal-analysis">Legal Analysis</option>\
    <option value="custom">Custom</option>\
  </select>\
</div>\
```\
\
### 5.2 Summary Dashboard\
\
**File: Dashboard.gs**\
\
```javascript\
function generateSummaryStats() \{\
  // Analyze all assessments\
  // Return statistics for display\
  \
  return \{\
    total: 15,\
    byConfidence: \{\
      veryHigh: 2,\
      high: 5,\
      medium: 6,\
      low: 2,\
      veryLow: 0\
    \},\
    withoutSources: 3,\
    conditional: 8,\
    averageSourcesPerClaim: 1.4,\
    lastUpdated: "2025-02-10"\
  \};\
\}\
```\
\
**Dashboard UI (Dialog):**\
\
```\
Document Evidence Summary\
\
Total Assessments: 15\
\
Confidence Distribution:\
  Very High: 2  (13%)  \uc0\u9608 \u9608 \u9608 \u9608 \
  High:      5  (33%)  \uc0\u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \
  Medium:    6  (40%)  \uc0\u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \u9608 \
  Low:       2  (13%)  \uc0\u9608 \u9608 \u9608 \u9608 \
  Very Low:  0  ( 0%)  \
\
Quality Flags:\
  \uc0\u9888  3 claims without sources\
  \uc0\u9888  8 claims have conditional statements\
\
Average sources per claim: 1.4\
Last assessment: 10 Feb 2025\
\
[View All Claims] [Export Report] [Close]\
```\
\
### 5.3 Validation & Quality Checks\
\
**File: Validation.gs**\
\
```javascript\
function runQualityChecks() \{\
  // Identify potential issues:\
  \
  const issues = [];\
  const assessments = loadAssessments();\
  \
  assessments.forEach(a => \{\
    // Check: High confidence but no sources\
    if ((a.confidence.level === "high" || a.confidence.level === "very-high") \
        && a.evidence.sources.length === 0) \{\
      issues.push(\{\
        type: "missing-sources-high-confidence",\
        assessmentId: a.id,\
        message: "High confidence claim lacks sources"\
      \});\
    \}\
    \
    // Check: Robust evidence but low confidence (unusual)\
    if (a.evidence.quality === "robust" && \
        (a.confidence.level === "low" || a.confidence.level === "very-low")) \{\
      issues.push(\{\
        type: "evidence-confidence-mismatch",\
        assessmentId: a.id,\
        message: "Robust evidence rated low confidence - review?"\
      \});\
    \}\
    \
    // Check: Old assessments (>90 days)\
    const age = Date.now() - new Date(a.metadata.createdAt);\
    if (age > 90 * 24 * 60 * 60 * 1000) \{\
      issues.push(\{\
        type: "stale-assessment",\
        assessmentId: a.id,\
        message: "Assessment >90 days old - verify still accurate"\
      \});\
    \}\
  \});\
  \
  return issues;\
\}\
\
function showQualityReport(issues) \{\
  // Display dialog with flagged issues\
  // Allow user to jump to each issue for review\
\}\
```\
\
**When to Run:**\
\
- Before generating appendix (automatic)\
- User clicks "Validate Document" from menu\
- On document close (optional, can be annoying)\
\
### 5.4 Keyboard Shortcuts & Productivity\
\
**File: Code.gs**\
\
```javascript\
function registerKeyboardShortcuts() \{\
  // Google Apps Script doesn't support custom keyboard shortcuts directly\
  // Workaround: Document in help, users can use Google Docs built-in:\
  //   Ctrl+Alt+M for custom menu\
  \
  // But we can optimize workflow:\
  // - Remember last used values in sidebar (stored in UserProperties)\
  // - Auto-focus on first empty field\
  // - Tab navigation optimized\
\}\
\
function rememberLastValues() \{\
  // Store user's typical choices:\
  const props = PropertiesService.getUserProperties();\
  \
  return \{\
    lastEvidenceQuality: props.getProperty('lastEvidenceQuality') || 'medium',\
    lastAgreementLevel: props.getProperty('lastAgreementLevel') || 'medium',\
    frequentSources: JSON.parse(props.getProperty('frequentSources') || '[]')\
  \};\
\}\
\
function saveUserPreferences(preferences) \{\
  // After each assessment, update preferences\
  // Next time sidebar opens, pre-select common values\
\}\
```\
\
---\
\
## Phase 6: Testing & Documentation (Week 6)\
\
### 6.1 Testing Strategy\
\
**Test Document Creation:** Create standardized test document:\
\
```\
California Climate Policy Analysis - Test Document\
\
This program will reduce emissions by 25% by 2030.[Should become assessment 1]\
\
The implementation cost is estimated at $50 million over 5 years, based on \
the Oregon program experience.[Assessment 2]\
\
Stakeholder engagement will require 18 months, according to our timeline \
analysis.[Assessment 3]\
\
References:\
Smith, J. et al. (2023). "Emission Reduction Modeling for California." \
  Journal of Climate Policy, 45(2), 123-145.\
Jones, A. (2022). "Oregon Clean Energy Program Cost Analysis." \
  State Budget Office Report.\
Wilson, M. (2024). "Stakeholder Engagement Best Practices." \
  Public Administration Review, 67(1), 23-40.\
```\
\
**Test Cases:**\
\
|Test #|Scenario|Expected Outcome|Priority|\
|---|---|---|---|\
|T1|Open sidebar with no selection|Error message shown|High|\
|T2|Open sidebar with text selected|Claim pre-filled correctly|High|\
|T3|Save assessment with all required fields|Marker inserted, data saved|High|\
|T4|Save assessment missing required field|Validation error, no save|High|\
|T5|Generate appendix with 3 assessments|Properly formatted appendix|High|\
|T6|Edit existing assessment|Changes reflected in appendix|Medium|\
|T7|Delete assessment|Marker removed, appendix updated|Medium|\
|T8|Bibliography detected|Sources appear in dropdown|Medium|\
|T9|No bibliography found|Manual entry only|Low|\
|T10|Storage limit reached (500KB)|Warning displayed|Low|\
|T11|Document edited, markers moved|Sync function identifies issues|Medium|\
|T12|Export to CSV|Valid CSV with all data|Low|\
|T13|Import from CSV|Assessments loaded correctly|Low|\
|T14|Multiple users editing (permissions)|No data loss|Medium|\
\
**Testing Tools:**\
\
- Google Apps Script debugger (built-in)\
- Logger for console output\
- Manual testing checklist (above)\
- Beta user testing group (3-5 people)\
\
### 6.2 Error Handling Patterns\
\
**Implement throughout:**\
\
```javascript\
// Standard error handling wrapper:\
function safeExecute(operation, errorMessage) \{\
  try \{\
    return operation();\
  \} catch (error) \{\
    Logger.log(`ERROR: $\{errorMessage\}`);\
    Logger.log(error.stack);\
    \
    // Show user-friendly message\
    DocumentApp.getUi().alert(\
      'Error',\
      `$\{errorMessage\}\\n\\nTechnical details: $\{error.message\}`,\
      DocumentApp.getUi().ButtonSet.OK\
    );\
    \
    return null;\
  \}\
\}\
\
// Usage example:\
function createAssessment(formData) \{\
  return safeExecute(\
    () => \{\
      // ... actual creation logic\
    \},\
    "Failed to create assessment. Please try again."\
  );\
\}\
```\
\
**Common Error Scenarios:**\
\
- Document locked by another user \uc0\u8594  Retry with exponential backoff\
- Storage quota exceeded \uc0\u8594  Offer export/archive option\
- Invalid JSON in storage \uc0\u8594  Attempt repair, fallback to empty state\
- Network timeout \uc0\u8594  Cache operation, retry when online\
- Permission denied \uc0\u8594  Clear instructions for document owner\
\
### 6.3 Documentation\
\
**User Documentation (Google Doc):**\
\
```\
Evidence Assessment Plugin - User Guide\
\
TABLE OF CONTENTS\
1. Installation\
2. Quick Start (5-minute tutorial)\
3. Creating Assessments\
4. Managing Assessments  \
5. Generating Appendices\
6. Advanced Features\
7. Troubleshooting\
8. FAQ\
\
QUICK START\
\
Step 1: Install the add-on\
  - Open your Google Doc\
  - Extensions \uc0\u8594  Add-ons \u8594  Get add-ons\
  - Search "Evidence Assessment"\
  - Click Install\
\
Step 2: Assess your first claim\
  - Highlight text: "Program will reduce emissions by 25%"\
  - Extensions \uc0\u8594  Evidence Assessment \u8594  Assess Selected Text\
  - Fill in the form:\
    * Evidence Quality: Medium\
    * Sources: Smith et al. 2023\
    * Agreement: High\
    * Confidence: Medium\
  - Click Save\
\
Step 3: Generate appendix\
  - Extensions \uc0\u8594  Evidence Assessment \u8594  Generate Appendix\
  - A formatted appendix appears at the end of your document\
\
DETAILED INSTRUCTIONS\
[... continue with screenshots and examples ...]\
\
TROUBLESHOOTING\
\
Problem: "No text selected" error\
Solution: Make sure text is highlighted before opening assessment form\
\
Problem: Markers disappeared after editing\
Solution: Extensions \uc0\u8594  Evidence Assessment \u8594  Sync Markers\
\
Problem: Appendix formatting looks wrong\
Solution: Don't manually edit the appendix - regenerate instead\
```\
\
**Developer Documentation (README.md):**\
\
```markdown\
# Evidence Assessment Plugin - Developer Guide\
\
## Architecture Overview\
\
This Google Apps Script add-on provides systematic uncertainty \
communication for policy documents, following IPCC frameworks.\
\
### File Structure\
- `Code.gs` - Entry point, menu registration\
- `Assessment.gs` - Core assessment CRUD operations\
- `Appendix.gs` - Appendix generation logic\
- `Storage.gs` - Data persistence layer\
- `Utils.gs` - Helper functions\
- `Templates.gs` - Pre-configured assessment templates\
- `Validation.gs` - Data quality checks\
- `UI/` - HTML/CSS/JS for user interface\
\
### Data Model\
See Phase 1.2 for complete schema. Key points:\
- Assessments stored in DocumentProperties as JSON\
- Max 500KB storage = ~500 assessments\
- Each assessment has unique UUID\
- Location tracked by paragraph index + offset\
\
### Key Functions\
\
`createAssessment(formData)` - Creates new assessment\
  Input: \{claimText, evidence, agreement, confidence\}\
  Output: \{success: boolean, id: string\}\
  Side effects: Inserts marker, saves to storage\
\
`generateAppendix()` - Regenerates appendix section\
  Input: none\
  Output: \{success: boolean, count: number\}\
  Side effects: Replaces appendix content\
\
[... continue with all public APIs ...]\
\
## Testing\
\
Run tests from Apps Script editor:\
1. Open script project\
2. Select test function from dropdown\
3. Click Run\
4. Check Logs for results\
\
## Deployment\
\
1. Update version number in Config.gs\
2. Test thoroughly in development doc\
3. Extensions \uc0\u8594  Apps Script \u8594  Deploy \u8594  New deployment\
4. Choose "Add-on" deployment type\
5. Set version notes\
6. Deploy\
\
## Contributing\
\
[Guidelines for future development]\
```\
\
---\
\
## Implementation Checklist\
\
### Pre-Development\
\
- [ ] Review IPCC guidance document thoroughly\
- [ ] Analyze 2-3 existing Google Docs add-ons for UX patterns\
- [ ] Create test documents with sample policy text\
- [ ] Set up Google Apps Script project structure\
- [ ] Initialize version control/backup strategy\
\
### Phase 1: Foundation (Week 1)\
\
- [ ] Create project file structure\
- [ ] Define data models and storage schema\
- [ ] Document integration points for Zotero/Paperpile (research only)\
- [ ] Create development roadmap document\
- [ ] Set up test environment\
\
### Phase 2: Core Features (Weeks 2-3)\
\
- [ ] Implement menu and basic UI\
- [ ] Build assessment creation workflow\
- [ ] Add text selection handling\
- [ ] Implement marker insertion\
- [ ] Create storage/retrieval functions\
- [ ] Add bibliography detection\
- [ ] Build source selection UI\
- [ ] Test with sample documents\
\
### Phase 3: Appendix (Week 4)\
\
- [ ] Design appendix format\
- [ ] Implement generation logic\
- [ ] Add formatting and styling\
- [ ] Build auto-numbering system\
- [ ] Add update detection\
- [ ] Test appendix with multiple assessments\
\
### Phase 4: Management (Week 5)\
\
- [ ] Create management dialog\
- [ ] Implement edit functionality\
- [ ] Add delete with confirmation\
- [ ] Build export to CSV/JSON\
- [ ] Add import functionality\
- [ ] Test full CRUD workflow\
\
### Phase 5: Polish (Week 6)\
\
- [ ] Create assessment templates\
- [ ] Build summary dashboard\
- [ ] Implement validation checks\
- [ ] Add user preferences\
- [ ] Optimize performance\
- [ ] Conduct user testing\
\
### Phase 6: Launch\
\
- [ ] Complete all testing\
- [ ] Write user documentation\
- [ ] Write developer documentation\
- [ ] Create tutorial video (optional)\
- [ ] Deploy to Google Workspace Marketplace (optional)\
- [ ] Gather feedback from beta users\
\
---\
\
## Technical Constraints & Considerations\
\
### Google Apps Script Limitations\
\
**Storage:**\
\
- Max 500KB per DocumentProperties\
- Solution: Implement data archiving for documents with >500 assessments\
- Warning system when approaching limit\
\
**Execution Time:**\
\
- 6-minute timeout for scripts\
- Solution: Break long operations into chunks, use triggers for background work\
\
**Quotas:**\
\
- 50,000 reads/writes per day (per user)\
- Solution: Batch operations, cache frequently accessed data\
\
**No Real-Time Collaboration:**\
\
- Can't detect when another user is editing simultaneously\
- Solution: Add refresh button, version stamps, conflict warnings\
\
### Google Docs API Limitations\
\
**No Direct Footnote API:**\
\
- Can insert superscript text but not "real" footnotes\
- Solution: Use superscript numbers that link to appendix\
\
**Limited Styling Control:**\
\
- Can't apply all CSS properties\
- Solution: Use document styles (Heading 1, Normal Text, etc.)\
\
**No Undo Integration:**\
\
- Add-on changes can't be undone with Ctrl+Z\
- Solution: Warn users, provide delete/rollback functions\
\
### Security & Privacy\
\
**Data Storage:**\
\
- All data stored in user's document (not external server)\
- No PII collected by add-on\
- User controls sharing/permissions via Google Docs\
\
**Permissions Required:**\
\
- Read/write access to current document\
- No email, calendar, or drive access needed\
\
**Publishing:**\
\
- If published to Marketplace, requires OAuth verification\
- Privacy policy required\
- Terms of service recommended\
\
---\
\
## Extension Points for Future Development\
\
### Phase 7: Advanced Integrations (Future)\
\
**Zotero Integration:**\
\
```javascript\
// Pseudo-code for Zotero integration:\
function detectZoteroData() \{\
  // Search document for Zotero field codes\
  // Parse bibliography data structure\
  // Return: \{detected: boolean, citations: []\}\
\}\
\
function linkToZoteroItem(citationKey) \{\
  // Create link from assessment to Zotero item\
  // Enable: Click marker \uc0\u8594  Open in Zotero\
\}\
```\
\
**Paperpile Integration:**\
\
- Similar approach to Zotero\
- May use different field structure\
- Check Paperpile API documentation\
\
**Mendeley/EndNote:**\
\
- Lower priority but similar pattern\
- Focus on bibliography parsing over deep integration\
\
### Phase 8: AI-Assisted Features (Future)\
\
**Suggested Assessments:**\
\
```javascript\
function suggestAssessments() \{\
  // Use Google's Cloud Natural Language API\
  // Identify quantitative claims in document\
  // Flag: unsupported assertions, weasel words\
  // Suggest: "This looks like a claim - assess it?"\
\}\
```\
\
**Evidence Quality Hints:**\
\
```javascript\
function analyzeSourceQuality(citation) \{\
  // Check if source is:\
  // - Peer-reviewed journal (high quality signal)\
  // - Government report (medium-high)\
  // - News article (medium-low)\
  // - Blog post (low)\
  // Suggest appropriate evidence quality rating\
\}\
```\
\
**Conditional Statement Detection:**\
\
```javascript\
function detectConditionals(claimText) \{\
  // Look for: "if", "assumes", "depends on", "given that"\
  // Suggest: "This claim seems conditional - add context?"\
\}\
```\
\
### Phase 9: Collaboration Features (Future)\
\
**Multi-Reviewer Mode:**\
\
- Allow multiple people to assess same claim\
- Show confidence distribution: 3 said "High", 2 said "Medium"\
- Resolve conflicts through discussion notes\
\
**Comment Integration:**\
\
- Link assessments to Google Docs comments\
- Discussion thread about evidence quality\
- Tag experts for review: "@Sarah can you verify this source?"\
\
**Approval Workflow:**\
\
- Draft assessments require senior review\
- "Approve" button for supervisors\
- Track: who assessed, who approved, when\
\
### Phase 10: Output Formats (Future)\
\
**Word Export:**\
\
- Convert appendix to Word-compatible format\
- Preserve formatting and structure\
- Use track changes for assessments\
\
**PDF Generation:**\
\
- Create standalone PDF of evidence appendix\
- Include: document metadata, assessment details\
- Use case: Submit to journal, archive for records\
\
**HTML/Web:**\
\
- Interactive web version of document\
- Click marker \uc0\u8594  Pop up evidence details\
- Filter view: Show only low confidence claims\
\
**LaTeX Integration:**\
\
- For academic papers\
- Convert to BibTeX format\
- Custom citation styles\
\
---\
\
## Success Metrics\
\
### Usage Metrics (Track via Google Analytics in add-on)\
\
- Installations\
- Active users (weekly/monthly)\
- Assessments created per user\
- Appendices generated\
- Feature usage (templates, export, validation)\
\
### Quality Metrics\
\
- Average time to create assessment (target: <2 minutes)\
- User-reported bugs (target: <1 per 100 users per month)\
- Positive reviews in Marketplace (target: 4.5+ stars)\
\
### Impact Metrics (Survey users after 30 days)\
\
- "Has this changed how you document evidence?" (Yes/No)\
- "Has this improved document quality?" (1-5 scale)\
- "Would you recommend to colleagues?" (NPS score)\
\
---\
\
## Cost Estimate (If Outsourcing Development)\
\
|Phase|Hours|Rate|Cost|\
|---|---|---|---|\
|1. Foundation|20|$75-150|$1,500-3,000|\
|2. Core Features|40|$75-150|$3,000-6,000|\
|3. Appendix|20|$75-150|$1,500-3,000|\
|4. Management|20|$75-150|$1,500-3,000|\
|5. Polish|20|$75-150|$1,500-3,000|\
|6. Testing/Docs|20|$75-150|$1,500-3,000|\
|**Total**|**140**||**$10,500-21,000**|\
\
**Cost Reduction Strategies:**\
\
- Build Phases 1-2 yourself, outsource 3-6\
- Hire contractor for specific components only\
- Use freelancer platforms (Upwork) for lower rates\
- Trade: Defer Phase 5 features to v2.0\
\
---\
\
## Next Steps for Claude Code Implementation\
\
1. **Start with Phase 1.1-1.2:** Set up project structure and data models\
2. **Implement Phase 2.1-2.2:** Get basic workflow functioning\
3. **Test early and often:** Use test document throughout\
4. **Iterate based on real usage:** Don't gold-plate until core works\
\
**First Session with Claude Code:**\
\
- Create project structure\
- Implement `Code.gs` with menu\
- Build basic sidebar HTML\
- Get "hello world" assessment working\
\
**Subsequent Sessions:**\
\
- One phase at a time\
- Test after each component\
- Document decisions and trade-offs\
- Commit working code before major refactors\
\
This plan is designed to be implemented incrementally - you can stop after any phase and have a working tool. Good luck building this!\
\
\
Implementation Timeline\
# Realistic Timeline for Building with Claude Pro\
\
## TL;DR: 8-12 weeks of part-time work, with significant limitations\
\
You'll hit Claude Pro's limits hard on this project. The constraints will slow you down substantially compared to what's technically feasible.\
\
---\
\
## Claude Pro Limits (As of Feb 2025)\
\
**Message Limits:**\
\
- ~45-50 messages per 5 hours with Sonnet 4.5\
- Resets on a rolling 5-hour window\
- No weekly cap, just the rolling window\
\
**Practical Reality:**\
\
- Each coding session = 10-20 messages (back-and-forth debugging)\
- 2-3 productive sessions per day maximum\
- Frequent "you've reached your limit" breaks\
\
---\
\
## Revised Timeline with Claude Pro Constraints\
\
### Week 1-2: Foundation (Phase 1)\
\
**What you'll accomplish:**\
\
- Set up project structure\
- Define data models\
- Create basic menu system\
- Get "hello world" working\
\
**Claude Pro sessions needed:** 6-8 sessions **Your time investment:** 8-12 hours **Bottlenecks:**\
\
- Learning Google Apps Script syntax (lots of clarifying questions)\
- Debugging setup issues (burns through messages quickly)\
- Understanding data model implications (iterative discussion)\
\
**Realistic daily progress:**\
\
- Day 1: Project setup + menu (2 sessions, hit limit)\
- Day 2: Data model design (1-2 sessions, discussion-heavy)\
- Day 3: Basic storage functions (2 sessions, debugging)\
- Day 4-5: First working assessment creation (3 sessions, lots of iteration)\
\
### Week 3-5: Core Features (Phase 2)\
\
**What you'll accomplish:**\
\
- Assessment creation workflow\
- Text selection handling\
- Marker insertion\
- Storage/retrieval\
- Basic sidebar UI\
\
**Claude Pro sessions needed:** 12-15 sessions **Your time investment:** 20-30 hours **Bottlenecks:**\
\
- UI debugging (HTML/CSS issues eat messages)\
- Google Apps Script API quirks (lots of "why doesn't this work?" back-and-forth)\
- Integration between components (each connection point needs testing)\
\
**Why this takes longer:**\
\
- Each bug fix cycle = 3-5 messages\
- "It's not working" \uc0\u8594  Claude asks questions \u8594  You test \u8594  Report back \u8594  Fix\
- You'll hit limits mid-debugging, lose momentum\
- Need to context-switch between sessions (re-explaining problem)\
\
**Realistic weekly progress:**\
\
- Week 3: Sidebar UI working (5 sessions)\
- Week 4: Assessment creation mostly working (4-5 sessions)\
- Week 5: Debugging edge cases, polish (5 sessions)\
\
### Week 6-8: Appendix Generation (Phase 3)\
\
**What you'll accomplish:**\
\
- Appendix formatting\
- Generation logic\
- Auto-numbering\
- Update detection\
\
**Claude Pro sessions needed:** 8-10 sessions **Your time investment:** 15-20 hours **Bottlenecks:**\
\
- Document manipulation is finicky (lots of trial and error)\
- Formatting issues require iterative refinement\
- Testing with multiple assessments reveals edge cases\
\
**Why this is medium complexity:**\
\
- Fewer new concepts than Phase 2\
- But document API is unintuitive (burns messages on "how do I...")\
- Formatting requires lots of "try this, see if it looks right" cycles\
\
### Week 9-10: Management UI (Phase 4)\
\
**What you'll accomplish:**\
\
- Management dialog\
- Edit/delete functionality\
- Basic export\
\
**Claude Pro sessions needed:** 8-10 sessions **Your time investment:** 12-18 hours **Bottlenecks:**\
\
- Building a second UI component (management dialog)\
- CRUD operations need thorough testing\
- Export formatting issues\
\
### Week 11-12: Polish & Testing (Phase 5-6)\
\
**What you'll accomplish:**\
\
- Bug fixes\
- Error handling\
- Basic documentation\
- User testing\
\
**Claude Pro sessions needed:** 6-8 sessions **Your time investment:** 10-15 hours\
\
**What you'll probably skip:**\
\
- Templates (Phase 5.1)\
- Dashboard (Phase 5.2)\
- Advanced validation (Phase 5.3)\
- These are "nice to have" - defer to v2.0\
\
---\
\
## Total Timeline Summary\
\
|Component|Sessions|Your Hours|Calendar Time|\
|---|---|---|---|\
|Foundation|6-8|8-12|1-2 weeks|\
|Core Features|12-15|20-30|3 weeks|\
|Appendix|8-10|15-20|2 weeks|\
|Management|8-10|12-18|2 weeks|\
|Polish|6-8|10-15|2 weeks|\
|**Total**|**40-51**|**65-95**|**10-12 weeks**|\
\
**Assumptions:**\
\
- You work on this 3-5 days per week\
- 1-2 hour sessions each time\
- You can handle file operations, testing, running scripts\
- Claude writes all actual code\
\
---\
\
## The Claude Pro Limit Problem\
\
### What burns through messages fastest:\
\
**1. Debugging (3-7 messages per bug):**\
\
```\
You: "I get error: Cannot read property 'xyz' of undefined"\
Claude: "Can you show me the code around line 45?"\
You: [paste code]\
Claude: "Ah, the issue is... Try this fix:"\
You: "Now I get a different error..."\
Claude: "That's because... Try this instead:"\
You: "Still not working, here's what I see..."\
Claude: "One more thing to check..."\
```\
\
**2. UI iteration (5-10 messages per component):**\
\
```\
You: "The sidebar looks weird, here's a screenshot"\
Claude: "Try this CSS..."\
You: "Better but now the button is cut off"\
Claude: "Adjust this..."\
You: "Can we make the spacing bigger?"\
Claude: "Sure, change..."\
```\
\
**3. Requirement clarification (2-4 messages):**\
\
```\
You: "How should we handle deleted assessments?"\
Claude: [asks 3 clarifying questions]\
You: [answer]\
Claude: [proposes solution]\
You: "What if the user wants to restore it?"\
Claude: [revised approach]\
```\
\
### Strategies to conserve messages:\
\
**Batch your questions:** \uc0\u10060  Bad:\
\
- Session 1: "How do I get selected text?"\
- Session 2: "Now how do I insert a marker?"\
- Session 3: "Now how do I save data?"\
\
\uc0\u9989  Good:\
\
- Session 1: "I need to: 1) get selected text, 2) insert marker, 3) save data. Give me all three functions."\
\
**Test thoroughly between sessions:**\
\
- Don't come back with "it doesn't work"\
- Come back with: "Lines 20-30 throw error X when I do Y"\
\
**Provide complete context:** Include in each session start:\
\
- Relevant code files\
- Error messages (full stack trace)\
- What you expected vs what happened\
- What you've already tried\
\
**Use Claude for architecture, Google for syntax:**\
\
- Claude: "How should I structure the storage system?"\
- Google: "Google Apps Script DocumentProperties syntax"\
\
This saves messages for hard problems, not documentation lookups.\
\
---\
\
## Realistic Scope Reduction for Claude Pro\
\
### MVP (Minimum Viable Product) - Achievable in 8 weeks:\
\
**Include:**\
\
- \uc0\u9989  Basic assessment creation (Phase 2.1-2.2)\
- \uc0\u9989  Simple storage (Phase 2.4)\
- \uc0\u9989  Manual source entry (no bibliography parsing)\
- \uc0\u9989  Appendix generation (Phase 3.1)\
- \uc0\u9989  Edit/delete (Phase 4.1-4.2)\
\
**Skip for v1.0:**\
\
- \uc0\u10060  Bibliography detection (Phase 2.3)\
- \uc0\u10060  Templates (Phase 5.1)\
- \uc0\u10060  Dashboard (Phase 5.2)\
- \uc0\u10060  Advanced validation (Phase 5.3)\
- \uc0\u10060  Export/import (Phase 4.3)\
\
**Why this works:**\
\
- Core workflow functional: assess \uc0\u8594  mark \u8594  appendix\
- You can add features later without rebuilding\
- Each skipped feature = 3-5 sessions saved\
- Total sessions reduced from 40-51 to ~30-35\
\
### Development Strategy for Limit Management\
\
**Week-by-week cadence:**\
\
**Monday:** Big coding session (10-15 messages)\
\
- Start with Phase X implementation\
- Get basic structure working\
- Stop when you hit limit\
\
**Tuesday:** Test & document what works\
\
- No Claude needed\
- Write notes on bugs/issues\
- Prepare detailed bug reports\
\
**Wednesday:** Bug fix session (8-12 messages)\
\
- Fix issues from Monday\
- Test edge cases\
- Stop when hit limit\
\
**Thursday:** Test more, refine requirements\
\
- Use the tool yourself\
- Find usability issues\
- Prepare feature requests\
\
**Friday:** Polish & small improvements (5-8 messages)\
\
- Minor tweaks\
- Documentation\
- Prepare for next phase\
\
**Weekend:** User testing or break\
\
This rhythm works with Claude Pro limits:\
\
- 2-3 coding sessions per week (Monday, Wednesday, Friday)\
- Testing/planning days between (Tuesday, Thursday)\
- Preserves momentum without constant limit-hitting frustration\
\
---\
\
## Alternative: Hybrid Approach\
\
### What if you learned JUST enough to help?\
\
**Minimal JavaScript knowledge needed:**\
\
- Variables and functions (30 min tutorial)\
- Objects and arrays (30 min tutorial)\
- Basic debugging (30 min tutorial)\
\
**Total learning time:** 2-3 hours\
\
**What this enables:**\
\
- Fix obvious typos yourself (don't waste messages on "you forgot a semicolon")\
- Add console.log() statements for debugging (give Claude better error info)\
- Tweak simple values (change text, adjust spacing)\
- Copy-paste between files more confidently\
\
**Impact on timeline:**\
\
- Reduces sessions by ~20% (saves 8-10 sessions)\
- Each session becomes more productive\
- New timeline: 6-8 weeks instead of 10-12\
\
**Resources:**\
\
- JavaScript for Beginners (freeCodeCamp - just first 3 hours)\
- Google Apps Script 101 (official Google tutorial - 1 hour)\
\
**Is it worth it?**\
\
- Probably yes - 3 hours of learning saves 15-20 hours of waiting for Claude\
- You'll understand your own tool better\
- Easier to maintain/modify later\
\
---\
\
## Month-by-Month Realistic Plan\
\
### Month 1: MVP Core (Weeks 1-4)\
\
**Goal:** Basic assessment workflow functioning\
\
**Week 1:**\
\
- Project setup + basic menu (2 sessions)\
- Data model + storage (2 sessions)\
\
**Week 2:**\
\
- Sidebar UI (2-3 sessions)\
- Assessment creation (2 sessions)\
\
**Week 3:**\
\
- Marker insertion (2 sessions)\
- Bug fixes (2 sessions)\
\
**Week 4:**\
\
- Appendix generation (3 sessions)\
- Testing (1 session)\
\
**Milestone:** Can assess claims and generate appendix\
\
### Month 2: Management + Polish (Weeks 5-8)\
\
**Goal:** Full CRUD operations and usability\
\
**Week 5:**\
\
- Edit functionality (2 sessions)\
- Delete functionality (1 session)\
- Bug fixes (1 session)\
\
**Week 6:**\
\
- Management dialog UI (2 sessions)\
- List all assessments (1 session)\
- Testing (1 session)\
\
**Week 7:**\
\
- Error handling (2 sessions)\
- Edge cases (2 sessions)\
\
**Week 8:**\
\
- Documentation (1 session)\
- User testing + fixes (2 sessions)\
- Final polish (1 session)\
\
**Milestone:** Usable tool, ready for real work\
\
### Month 3 (Optional): Advanced Features\
\
**Goal:** Add deferred features as needed\
\
Only pursue if:\
\
- You're actually using the tool regularly\
- You hit specific pain points\
- You have time/energy for it\
\
**Candidates:**\
\
- Bibliography parsing (if you use citations heavily)\
- Templates (if assessing many similar claims)\
- Export (if sharing with team)\
\
---\
\
## Reality Check: Obstacles You'll Face\
\
### Technical Obstacles (Claude Pro helps here):\
\
- Google Apps Script quirks \uc0\u9888 \u65039  (frustrating but solvable)\
- UI layout issues \uc0\u9888 \u65039  (tedious but manageable)\
- Data structure evolution \uc0\u9888 \u65039  (requires thoughtful design)\
\
### Process Obstacles (Claude Pro doesn't help):\
\
- \uc0\u10060  Hitting message limits mid-debugging (very frustrating)\
- \uc0\u10060  Losing context between sessions (requires good notes)\
- \uc0\u10060  Testing taking longer than coding (you must do all QA)\
- \uc0\u10060  Motivation waning around week 6-7 (natural for long projects)\
\
### Mitigation Strategies:\
\
**For message limits:**\
\
- Work on this project early in your "Claude day" (fresh limits)\
- Have a second project ready for when you hit limits\
- Use Thursday/Friday when you've built up limit space\
\
**For context loss:**\
\
- Keep a development journal (one file: DevLog.md)\
- After each session, write: What worked, what didn't, next steps\
- Start each session by pasting last entry to Claude\
\
**For testing burden:**\
\
- Create a standard test document (reuse every session)\
- Make a checklist of things to test (don't rely on memory)\
- Test immediately after each change (don't accumulate bugs)\
\
**For motivation:**\
\
- Use the tool yourself as soon as possible (dogfooding)\
- Show progress to colleagues (external accountability)\
- Set micro-milestones (celebrate small wins)\
\
---\
\
## Final Recommendation\
\
**Go for MVP in 8 weeks with Claude Pro:**\
\
**Weeks 1-4:** Core functionality\
\
- Assessment creation\
- Marker insertion\
- Appendix generation\
- Basic storage\
\
**Weeks 5-8:** Usability\
\
- Edit/delete\
- Management UI\
- Error handling\
- Documentation\
\
**Skip for now:**\
\
- Bibliography parsing\
- Templates\
- Dashboard\
- Export/import\
- Advanced validation\
\
**After 8 weeks, evaluate:**\
\
- Are you using it? \uc0\u8594  Add features based on pain points\
- Not using it? \uc0\u8594  Maybe it wasn't needed (valuable insight!)\
- Want to share? \uc0\u8594  Polish and document more\
\
**Cost-benefit analysis:**\
\
- 70-80 hours of your time over 8 weeks\
- $0 out of pocket (using existing Claude Pro)\
- Working tool for your climate research\
- Potential value to broader policy community\
- Useful learning experience\
\
**Alternative if 8 weeks feels too long:**\
\
- Build weeks 1-4 yourself (MVP core)\
- Hire contractor for weeks 5-8 (polish) = ~$2,000-3,000\
- Total time: 4 weeks instead of 8\
- You learn the core, professional handles UI/UX\
\
What's your timeline constraint? If you need this for a specific research project with a deadline, the hybrid approach might make sense. If it's a longer-term tool, the full DIY path is very doable with Claude Pro.}