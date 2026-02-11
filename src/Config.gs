/**
 * Config.gs — Constants, enums, and default values for the Evidence Assessment add-on.
 */

var CONFIG = {
  VERSION: '1.0.0',

  // DocumentProperties keys
  STORAGE_KEY: 'evidenceAssessments',
  CONFIG_KEY: 'evidenceConfig',
  BACKUP_KEY: 'evidenceAssessments_backup',

  // Appendix
  APPENDIX_TITLE: 'Evidence Assessment Appendix',

  // Sidebar
  SIDEBAR_TITLE: 'Assess Evidence',
  SIDEBAR_WIDTH: 300,

  // Manager dialog
  MANAGER_TITLE: 'Manage Assessments',
  MANAGER_WIDTH: 500,
  MANAGER_HEIGHT: 450
};

// IPCC-style evidence quality levels
var EVIDENCE_QUALITY = {
  LIMITED: 'limited',
  MEDIUM: 'medium',
  ROBUST: 'robust'
};

var EVIDENCE_QUALITY_LABELS = {
  limited: 'Limited',
  medium: 'Medium',
  robust: 'Robust'
};

// Level of agreement among sources
var AGREEMENT_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

var AGREEMENT_LEVEL_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High'
};

// Overall confidence (derived from evidence + agreement)
var CONFIDENCE_LEVEL = {
  VERY_LOW: 'very-low',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very-high'
};

var CONFIDENCE_LEVEL_LABELS = {
  'very-low': 'Very Low',
  'low': 'Low',
  'medium': 'Medium',
  'high': 'High',
  'very-high': 'Very High'
};

// Superscript Unicode digits for markers (0-9)
var SUPERSCRIPT_DIGITS = {
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
