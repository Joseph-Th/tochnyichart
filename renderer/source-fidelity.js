'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  normalizeRunId,
  readInputSnapshot,
  sourceLedgerPath,
  runSpecPath
} = require('./run-workspace');

const DECISIONS = new Set(['selected', 'omitted', 'merged']);
const ROLES = new Set(['primary', 'comparison', 'denominator', 'mechanism', 'consequence', 'context']);
const VALUE_MODES = new Set(['level', 'absolute-change', 'relative-change', 'rate', 'share', 'index']);
const LEVEL_AVAILABILITY = new Set(['reported', 'retrievable', 'unavailable', 'incomparable', 'not-applicable']);

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function loadJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} is missing: ${filePath}`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function exactAnchorExists(input, anchor) {
  return isText(anchor) && input.includes(anchor.trim());
}

function anchorRanges(input, anchor) {
  if (!isText(anchor)) return [];
  const excerpt = anchor.trim();
  const ranges = [];
  let start = input.indexOf(excerpt);
  while (start !== -1) {
    ranges.push([start, start + excerpt.length]);
    start = input.indexOf(excerpt, start + Math.max(1, excerpt.length));
  }
  return ranges;
}

function numericEvidence(input) {
  const matches = [];
  const expression = /\d+(?:[.,]\d+)*/g;
  let match = expression.exec(input);
  while (match) {
    matches.push({ value: match[0], start: match.index, end: match.index + match[0].length });
    match = expression.exec(input);
  }
  return matches;
}

function contextAround(input, start, end) {
  return input
    .slice(Math.max(0, start - 35), Math.min(input.length, end + 35))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedSeriesLabel(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sameSeriesSkeleton(first, second) {
  if (!first || !second || first.recipe !== second.recipe) return false;
  const firstLabels = Array.isArray(first.data)
    ? first.data.map((item) => normalizedSeriesLabel(item && item.label))
    : [];
  const secondLabels = Array.isArray(second.data)
    ? second.data.map((item) => normalizedSeriesLabel(item && item.label))
    : [];
  if (firstLabels.length < 2 || firstLabels.length !== secondLabels.length) return false;
  return firstLabels.every((label, index) => label && label === secondLabels[index]);
}

function candidatesShareAnchor(first, second) {
  const firstAnchors = new Set((first.anchors || []).filter(isText).map((anchor) => anchor.trim()));
  return (second.anchors || []).some((anchor) => isText(anchor) && firstAnchors.has(anchor.trim()));
}

function specsShareReportingContext(first, second) {
  const firstSource = first && first.source || {};
  const secondSource = second && second.source || {};
  const sourceNameMatches = isText(firstSource.name) && firstSource.name === secondSource.name;
  const sourcePeriodMatches = isText(firstSource.period) && firstSource.period === secondSource.period;
  const metadataPeriodMatches = isText(first?.metadata?.dataPeriod) &&
    first.metadata.dataPeriod === second?.metadata?.dataPeriod;
  return sourceNameMatches && sourcePeriodMatches && metadataPeriodMatches;
}

function validateRepresentationAudit(candidate, prefix, errors) {
  const audit = candidate.representationAudit;
  if (!audit || typeof audit !== 'object' || Array.isArray(audit)) {
    errors.push(`${prefix}.representationAudit is required for a selected story.`);
    return;
  }
  if (!VALUE_MODES.has(audit.selectedMode)) {
    errors.push(`${prefix}.representationAudit.selectedMode is invalid.`);
  }
  if (!LEVEL_AVAILABILITY.has(audit.levelAvailability)) {
    errors.push(`${prefix}.representationAudit.levelAvailability is invalid.`);
  }
  if (!isText(audit.rationale) || audit.rationale.length > 240) {
    errors.push(`${prefix}.representationAudit.rationale must be a non-empty string of 240 characters or fewer.`);
  }
  if (['relative-change', 'index'].includes(audit.selectedMode) &&
      ['reported', 'retrievable'].includes(audit.levelAvailability)) {
    errors.push(
      `${prefix}.representationAudit selects ${audit.selectedMode} even though actual levels are ${audit.levelAvailability}. ` +
      'Select level values for the primary geometry and keep percentage or indexed change as secondary context.'
    );
  }
  if (audit.selectedMode === 'level' &&
      ['unavailable', 'incomparable', 'not-applicable'].includes(audit.levelAvailability)) {
    errors.push(`${prefix}.representationAudit cannot select level when actual levels are ${audit.levelAvailability}.`);
  }
}

function validateSourceLedger(projectRoot, runId, options = {}) {
  const normalized = normalizeRunId(runId);
  const snapshot = readInputSnapshot(projectRoot);
  const ledgerPath = sourceLedgerPath(projectRoot, normalized);
  const ledger = loadJson(ledgerPath, 'Source ledger');
  const errors = [];

  if (ledger.version !== '1.1') errors.push('Source ledger version must be 1.1.');
  if (ledger.runId !== normalized) errors.push(`Source ledger runId must be ${normalized}.`);
  if (!ledger.input || ledger.input.path !== 'input.txt') errors.push('Source ledger must identify the project-root input.txt.');
  if (!ledger.input || ledger.input.sha256 !== snapshot.sha256 || ledger.input.bytes !== snapshot.bytes) {
    errors.push('input.txt changed after the source ledger was initialized. Restart the run or rebuild the ledger from the current input.');
  }
  if (ledger.inventoryComplete !== true) {
    errors.push('Source inventory is incomplete. Inventory every distinct quantitative story before selection or research.');
  }
  if (!Array.isArray(ledger.candidates) || ledger.candidates.length === 0) {
    errors.push('Source ledger must contain at least one candidate story.');
  }

  const ids = new Set();
  const selected = [];
  const merged = [];
  const coverageRanges = [];
  for (const [index, candidate] of (ledger.candidates || []).entries()) {
    const prefix = `candidates[${index}]`;
    if (!candidate || typeof candidate !== 'object') {
      errors.push(`${prefix} must be an object.`);
      continue;
    }
    if (!isText(candidate.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.id)) {
      errors.push(`${prefix}.id must be a kebab-case identifier.`);
    } else if (ids.has(candidate.id)) {
      errors.push(`${prefix}.id duplicates ${candidate.id}.`);
    } else {
      ids.add(candidate.id);
    }
    if (!isText(candidate.claim)) errors.push(`${prefix}.claim is required.`);
    if (!DECISIONS.has(candidate.decision)) errors.push(`${prefix}.decision must be selected, omitted, or merged.`);
    if (!Array.isArray(candidate.anchors) || candidate.anchors.length === 0) {
      errors.push(`${prefix}.anchors must contain exact excerpts from input.txt.`);
    } else {
      for (const [anchorIndex, anchor] of candidate.anchors.entries()) {
        if (!exactAnchorExists(snapshot.content, anchor)) {
          errors.push(`${prefix}.anchors[${anchorIndex}] is not an exact excerpt from input.txt.`);
        } else {
          coverageRanges.push(...anchorRanges(snapshot.content, anchor));
        }
      }
    }

    if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) {
      errors.push(`${prefix}.evidence must identify the facts supporting the decision.`);
    } else {
      let hasPrimaryInput = false;
      for (const [evidenceIndex, evidence] of candidate.evidence.entries()) {
        const evidencePrefix = `${prefix}.evidence[${evidenceIndex}]`;
        if (!evidence || typeof evidence !== 'object') {
          errors.push(`${evidencePrefix} must be an object.`);
          continue;
        }
        if (!isText(evidence.statement)) errors.push(`${evidencePrefix}.statement is required.`);
        if (!['input', 'external', 'derived'].includes(evidence.origin)) {
          errors.push(`${evidencePrefix}.origin must be input, external, or derived.`);
        }
        if (!ROLES.has(evidence.role)) errors.push(`${evidencePrefix}.role is invalid.`);
        if (evidence.origin === 'input') {
          if (!exactAnchorExists(snapshot.content, evidence.anchor)) {
            errors.push(`${evidencePrefix}.anchor must be an exact excerpt from input.txt.`);
          }
          if (evidence.role === 'primary') hasPrimaryInput = true;
        }
        if (evidence.origin === 'external') {
          if (evidence.role === 'primary') {
            errors.push(`${evidencePrefix} cannot be primary. External research may enrich an input-supported story but may not originate one.`);
          }
          if (!isText(evidence.source)) errors.push(`${evidencePrefix}.source is required for external evidence.`);
        }
        if (evidence.origin === 'derived' && !isText(evidence.formula)) {
          errors.push(`${evidencePrefix}.formula is required for derived evidence.`);
        }
      }
      if (candidate.decision === 'selected' && !hasPrimaryInput) {
        errors.push(`${prefix} is selected but has no primary evidence anchored in input.txt.`);
      }
    }

    if (candidate.decision === 'selected') {
      if (!isText(candidate.outputSlug)) errors.push(`${prefix}.outputSlug is required for a selected story.`);
      if (!isText(candidate.title)) errors.push(`${prefix}.title is required for a selected story.`);
      if (!exactAnchorExists(snapshot.content, candidate.titleBasis)) {
        errors.push(`${prefix}.titleBasis must be an exact input excerpt that directly supports the chart title.`);
      }
      if (Array.isArray(candidate.anchors) && !candidate.anchors.some((anchor) => {
        if (!isText(anchor) || !isText(candidate.titleBasis)) return false;
        const normalizedAnchor = anchor.trim();
        const normalizedBasis = candidate.titleBasis.trim();
        return normalizedAnchor.includes(normalizedBasis) || normalizedBasis.includes(normalizedAnchor);
      })) {
        errors.push(`${prefix}.titleBasis must be covered by one of the candidate anchors.`);
      }
      validateRepresentationAudit(candidate, prefix, errors);
      selected.push(candidate);
    } else if (candidate.decision === 'omitted') {
      if (!isText(candidate.reason)) errors.push(`${prefix}.reason is required for an omitted story.`);
    } else if (candidate.decision === 'merged') {
      if (!isText(candidate.mergedInto)) errors.push(`${prefix}.mergedInto is required for a merged story.`);
      merged.push({ prefix, candidate });
    }
  }

  for (const { prefix, candidate } of merged) {
    if (!ids.has(candidate.mergedInto)) {
      errors.push(`${prefix}.mergedInto must name another candidate ID in the same ledger.`);
    } else if (candidate.mergedInto === candidate.id) {
      errors.push(`${prefix}.mergedInto cannot point to itself.`);
    }
  }

  if (ledger.ignoredEvidence !== undefined && !Array.isArray(ledger.ignoredEvidence)) {
    errors.push('ignoredEvidence must be an array when present.');
  }
  for (const [index, ignored] of (ledger.ignoredEvidence || []).entries()) {
    const prefix = `ignoredEvidence[${index}]`;
    if (!ignored || typeof ignored !== 'object') {
      errors.push(`${prefix} must be an object.`);
      continue;
    }
    if (!exactAnchorExists(snapshot.content, ignored.anchor)) {
      errors.push(`${prefix}.anchor must be an exact excerpt from input.txt.`);
    } else {
      coverageRanges.push(...anchorRanges(snapshot.content, ignored.anchor));
    }
    if (!isText(ignored.reason)) errors.push(`${prefix}.reason is required.`);
  }

  for (const token of numericEvidence(snapshot.content)) {
    const covered = coverageRanges.some(([start, end]) => token.start >= start && token.end <= end);
    if (!covered) {
      errors.push(`Unassigned numeric evidence ${token.value} near "${contextAround(snapshot.content, token.start, token.end)}". Add the containing story to candidates or justify it in ignoredEvidence.`);
    }
  }

  let specificationsChecked = 0;
  if (options.requireSpecs) {
    const specRoot = runSpecPath(projectRoot, normalized);
    const specFiles = fs.existsSync(specRoot)
      ? fs.readdirSync(specRoot).filter((name) => name.endsWith('.json')).sort()
      : [];
    const selectedFiles = selected
      .filter((candidate) => isText(candidate.outputSlug))
      .map((candidate) => `${candidate.outputSlug}.json`)
      .sort();
    if (JSON.stringify(specFiles) !== JSON.stringify(selectedFiles)) {
      errors.push(`Selected source-ledger outputs must exactly match ChartSpecs. Ledger: ${selectedFiles.join(', ') || '(none)'}; specs: ${specFiles.join(', ') || '(none)'}.`);
    }
    const selectedSpecs = [];
    for (const candidate of selected) {
      if (!isText(candidate.outputSlug)) continue;
      const specPath = path.join(specRoot, `${candidate.outputSlug}.json`);
      if (!fs.existsSync(specPath)) continue;
      const spec = loadJson(specPath, `ChartSpec ${candidate.outputSlug}`);
      specificationsChecked += 1;
      if (spec.title !== candidate.title) {
        errors.push(`ChartSpec ${candidate.outputSlug} title must exactly match its source-ledger title.`);
      }
      const audit = candidate.representationAudit || {};
      if (spec.measure?.valueMode !== audit.selectedMode) {
        errors.push(
          `ChartSpec ${candidate.outputSlug} measure.valueMode must match representationAudit.selectedMode (${audit.selectedMode || 'missing'}).`
        );
      }
      if (spec.measure?.levelAvailability !== audit.levelAvailability) {
        errors.push(
          `ChartSpec ${candidate.outputSlug} measure.levelAvailability must match representationAudit.levelAvailability (${audit.levelAvailability || 'missing'}).`
        );
      }
      selectedSpecs.push({ candidate, spec });
    }

    for (let firstIndex = 0; firstIndex < selectedSpecs.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < selectedSpecs.length; secondIndex += 1) {
        const first = selectedSpecs[firstIndex];
        const second = selectedSpecs[secondIndex];
        if (!candidatesShareAnchor(first.candidate, second.candidate)) continue;
        if (!specsShareReportingContext(first.spec, second.spec)) continue;
        if (!sameSeriesSkeleton(first.spec, second.spec)) continue;
        errors.push(
          `Selected stories ${first.candidate.outputSlug} and ${second.candidate.outputSlug} repeat the same source passage, ` +
          'reporting context, recipe, and category/time skeleton. Consolidate them into one chart, move the secondary ' +
          'measure into supportingFacts, or mark one source-ledger candidate as merged.'
        );
      }
    }
  }

  if (errors.length) {
    const error = new Error(`Source fidelity validation failed:\n- ${errors.join('\n- ')}`);
    error.validationErrors = errors;
    throw error;
  }

  return {
    valid: true,
    runId: normalized,
    input: { bytes: snapshot.bytes, sha256: snapshot.sha256 },
    candidates: ledger.candidates.length,
    selected: selected.length,
    omitted: ledger.candidates.filter((item) => item.decision === 'omitted').length,
    merged: ledger.candidates.filter((item) => item.decision === 'merged').length,
    specificationsChecked
  };
}

module.exports = { validateSourceLedger };
