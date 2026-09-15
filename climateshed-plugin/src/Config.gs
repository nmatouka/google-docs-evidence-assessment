/**
 * Config.gs — Constants, enums, and defaults for the Climateshed Evidence add-on.
 *
 * Top-level declarations here use const on purpose. The free add-on (src/)
 * declares the same names with var, so if both code sets are ever pushed into
 * one Apps Script project, the project fails to load ("Identifier has already
 * been declared") instead of silently running a mix of the two.
 * scripts/push.sh also checks for PLUGIN_EDITION to keep this code out of src/.
 */

const PLUGIN_EDITION = 'climateshed';

const CONFIG = {
  VERSION: '0.1.0',
  ADDON_NAME: 'Climateshed Evidence',
  SCHEMA_VERSION: 2,

  // DocumentProperties keys. Each assessment gets its own key because Apps
  // Script limits a single property value to 9KB (500KB for the whole store).
  ASSESSMENT_KEY_PREFIX: 'assessment_',
  CONFIG_KEY: 'evidenceConfig',

  // Kept under 9KB to leave room for the key and any difference in how
  // Google counts bytes.
  MAX_VALUE_BYTES: 8900,

  // Named ranges anchor claims and markers so they move with document edits.
  // A selection captured when the sidebar opens stays "pending" until saved.
  PENDING_RANGE_PREFIX: 'ea_pending_',
  CLAIM_RANGE_PREFIX: 'ea_claim_',
  MARKER_RANGE_PREFIX: 'ea_marker_',
  PENDING_RANGE_MAX_AGE_MS: 24 * 60 * 60 * 1000,

  // How long to wait for another collaborator's change to finish.
  LOCK_TIMEOUT_MS: 10000,

  MAX_SOURCES: 20,

  // Climateshed API. Points at the dev server during development. For release,
  // switch to https://api.climateshed.app and keep urlFetchWhitelist in
  // appsscript.json in step.
  API_BASE_URL: 'https://ca-climate-api-dev.fly.dev',
  ACCOUNT_URL: 'https://climateshed.app/account',
  PAID_TIERS: ['starter', 'pro'],
  EVIDENCE_RESULT_LIMIT: 8,

  // Source labels: the passages from one search are sent back to be labeled.
  // Keep in step with MAX_PASSAGES and MAX_PASSAGE_CHARS in app/evidence_relate.py.
  EVIDENCE_RELATE_MAX_PASSAGES: 10,
  EVIDENCE_RELATE_PASSAGE_CHARS: 12000,

  // Climateshed rating suggestions saved beside the author's ratings. Capped so
  // they can't push an assessment toward MAX_VALUE_BYTES on their own.
  SUGGESTION_REASON_CHARS: 500,
  SUGGESTION_TITLE_CHARS: 150,
  SUGGESTION_MAX_DOCUMENTS: 10,

  // Sentences to check (Suggestions.gs). The opt-in is shared by everyone who
  // edits the document; results are cached per author. A part must stay within
  // app/evidence_sentences.py's limits (15,000 characters, 80 paragraphs).
  SUGGESTIONS_SETTING_KEY: 'sentenceSuggestions',
  SUGGESTIONS_CACHE_PREFIX: 'sentenceSuggestions_',
  SUGGESTIONS_PART_CHARS: 12000,
  SUGGESTIONS_PART_PARAGRAPHS: 60,
  SUGGESTIONS_PARAGRAPH_CHARS: 5000,
  SUGGESTIONS_MAX_PER_PART: 40,

  // Results kept in each author's own script cache (readUserCache and writeUserCache
  // in Utils.gs), so repeating a request doesn't call Climateshed again.
  CACHE_SECONDS: 21600, // six hours, CacheService's maximum
  CACHE_MAX_CHARS: 90000, // CacheService allows 100KB per value
  EVIDENCE_SEARCH_CACHE_PREFIX: 'evidenceSearch_',
  EVIDENCE_LABELS_CACHE_PREFIX: 'evidenceLabels_',

  // Document context sent with a claim so search can tell what it's about.
  // At most this much of the document leaves it with each search.
  CONTEXT_TITLE_CHARS: 150,
  CONTEXT_HEADING_CHARS: 200,
  CONTEXT_PRECEDING_CHARS: 1150,

  // UserProperties keys: private to each Google user, never stored in the document.
  TOKEN_PROPERTY: 'climateshedToken',
  EMAIL_PROPERTY: 'climateshedEmail',

  // Appendix
  APPENDIX_TITLE: 'Evidence Assessment Appendix',

  // Sidebar
  SIDEBAR_TITLE: 'Assess Evidence',

  // Manager dialog
  MANAGER_TITLE: 'Manage Assessments',
  MANAGER_WIDTH: 500,
  MANAGER_HEIGHT: 450
};

// IPCC-style evidence quality levels
const EVIDENCE_QUALITY = {
  LIMITED: 'limited',
  MEDIUM: 'medium',
  ROBUST: 'robust'
};

const EVIDENCE_QUALITY_LABELS = {
  limited: 'Limited',
  medium: 'Medium',
  robust: 'Robust'
};

// Level of agreement among sources
const AGREEMENT_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

const AGREEMENT_LEVEL_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

// Overall confidence (a judgment informed by evidence + agreement)
const CONFIDENCE_LEVEL = {
  VERY_LOW: 'very-low',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very-high'
};

const CONFIDENCE_LEVEL_LABELS = {
  'very-low': 'Very Low',
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'very-high': 'Very High'
};

// Kinds of checkable claim that sentence suggestions return (app/evidence_sentences.py).
const SENTENCE_KIND_LABELS = {
  statistic: 'Statistic',
  trend: 'Trend',
  projection: 'Projection',
  cause_and_effect: 'Cause and effect',
  comparison: 'Comparison',
  study_finding: 'Study finding'
};

// Structured source fields. Only title is required.
const SOURCE_FIELDS = ['title', 'publisher', 'year', 'page', 'url'];

// Where a source came from, so the record shows which sources the author
// added from a Climateshed search.
const SOURCE_ORIGIN = {
  AUTHOR: 'author',
  CLIMATESHED: 'climateshed'
};

// Superscript Unicode digits for markers (0-9)
const SUPERSCRIPT_DIGITS = {
  '0': '\u2070',
  '1': '\u00B9',
  '2': '\u00B2',
  '3': '\u00B3',
  '4': '\u2074',
  '5': '\u2075',
  '6': '\u2076',
  '7': '\u2077',
  '8': '\u2078',
  '9': '\u2079'
};

// Citation style modes
const CITATION_STYLE = {
  SUPERSCRIPT: 'superscript',
  PARENTHETICAL: 'parenthetical'
};

// Parenthetical detail level options
const PARENTHETICAL_DETAIL = {
  CONFIDENCE: 'confidence',                 // e.g. "(high confidence)"
  EVIDENCE_AGREEMENT: 'evidence-agreement', // e.g. "(robust evidence, high agreement)"
  FULL: 'full'                              // e.g. "(robust evidence, high agreement, high confidence)"
};

// Parenthetical bracket style options
const PARENTHETICAL_BRACKET = {
  PARENTHESES: 'parentheses',  // (high confidence)
  CURLY: 'curly'               // {high confidence}
};

// Default per-document config
const DEFAULT_DOC_CONFIG = {
  citationStyle: CITATION_STYLE.SUPERSCRIPT,
  parentheticalDetail: PARENTHETICAL_DETAIL.CONFIDENCE,
  parentheticalBracket: PARENTHETICAL_BRACKET.PARENTHESES
};
