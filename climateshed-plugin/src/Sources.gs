/**
 * Sources.gs — Validation and citation formatting for structured sources.
 *
 * A source is { title, publisher, year, page, url }. Only title is required.
 */

/**
 * Cleans and validates sources received from the sidebar.
 * Rows where every field is blank are dropped.
 * @param {*} rawSources - Value received from the client.
 * @returns {Object} { sources: Object[], errors: string[] }
 */
function normalizeSources(rawSources) {
  var sources = [];
  var errors = [];

  if (!Array.isArray(rawSources)) {
    return { sources: sources, errors: errors };
  }

  rawSources.forEach(function(raw) {
    if (!raw || typeof raw !== 'object') {
      return;
    }

    var source = {};
    SOURCE_FIELDS.forEach(function(field) {
      source[field] = raw[field] === undefined || raw[field] === null ? '' : String(raw[field]).trim();
    });

    var isBlank = SOURCE_FIELDS.every(function(field) { return !source[field]; });
    if (isBlank) {
      return;
    }

    var label = 'Source ' + (sources.length + 1);
    if (!source.title) {
      errors.push(label + ' needs a title.');
    }
    if (source.year && !/^\d{4}$/.test(source.year)) {
      errors.push(label + ': year must be four digits.');
    }
    if (source.url && !/^https?:\/\/\S+$/i.test(source.url)) {
      errors.push(label + ': URL must start with http:// or https://.');
    }

    sources.push(source);
  });

  if (sources.length > CONFIG.MAX_SOURCES) {
    errors.push('An assessment can have at most ' + CONFIG.MAX_SOURCES + ' sources.');
  }

  return { sources: sources, errors: errors };
}

/**
 * Formats a source as a one-line citation, e.g.
 * "IPCC (2021). Climate Change 2021: The Physical Science Basis, p. 12. https://..."
 * @param {Object} source
 * @returns {string}
 */
function formatSourceCitation(source) {
  var lead = source.publisher || '';
  if (source.year) {
    lead = lead ? lead + ' (' + source.year + ')' : '(' + source.year + ')';
  }

  var body = source.title || '';
  var page = formatPageReference(source.page);
  if (page) {
    body = body ? body + ', ' + page : page;
  }

  var citation = [lead, body].filter(function(part) { return part; }).join('. ');
  if (citation && !/[.?!]$/.test(citation)) {
    citation += '.';
  }
  if (source.url) {
    citation += (citation ? ' ' : '') + source.url;
  }
  return citation;
}

/**
 * Adds "p." or "pp." to plain page numbers and ranges. Anything else
 * ("Section 4.2", "SPM A.3.1") is returned as written.
 * @param {string} page
 * @returns {string}
 */
function formatPageReference(page) {
  if (!page) {
    return '';
  }
  if (/^\d+$/.test(page)) {
    return 'p. ' + page;
  }
  if (/^\d+\s*[-\u2013]\s*\d+$/.test(page)) {
    return 'pp. ' + page.replace(/\s*[-\u2013]\s*/, '\u2013');
  }
  return page;
}
