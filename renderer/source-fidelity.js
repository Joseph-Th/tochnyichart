'use strict';

const fs = require('node:fs');
const path = require('node:path');
const TochnyiMaps = require('../lib/tochnyi-maps');
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
const RESEARCH_SOURCE_TYPES = new Set([
  'supplied-source',
  'official-dataset',
  'company-filing',
  'market-data',
  'industry-dataset',
  'authoritative-report'
]);
const DATA_BEARING_SOURCE_TYPES = new Set([
  'official-dataset',
  'company-filing',
  'market-data',
  'industry-dataset'
]);
const GEOGRAPHY_ROLES = new Set(['none', 'categorical', 'explanatory']);
const CHART_WORKFLOWS = new Set(['standard-chart', 'regional-breakdown']);
const CONFLICT_STATUSES = new Set(['none', 'material']);
const ORIENTATION_ANCHOR_ROLES = new Set(['threshold', 'benchmark', 'baseline', 'limit', 'target', 'denominator']);
const COUNT_UNIT_PATTERN = /\b(?:count|counts|people|persons?|models?|stations?|facilities?|locations?|stores?|shops?|sites?|vehicles?|trucks?|aircraft|companies|businesses|cases|events?|incidents?|workers?|employees?|jobs?|schools?|hospitals?|buildings?|projects?)\b/i;
const BENCHMARK_EVIDENCE_PATTERN = /\b(?:benchmark|baseline|total|population|capacity|available|target|limit|threshold|cap|ceiling|floor|maximum|minimum|network|fleet|market)\b/i;
const THRESHOLD_STORY_PATTERN = /\b(?:break[- ]?even|breakeven|profitability\s+(?:threshold|floor)|threshold|floor|ceiling|limit|cap|cutoff|trigger|minimum|maximum)\b/i;
const SPATIAL_FINDING_PATTERN = /\b(?:across|border|borderland|frontier|spread|cluster|adjacent|neighbor|neighbour|geograph|spatial|regional pattern|corridor|distributed|concentrat|east|west|north|south)\b/i;
const ADMIN_LABEL_PATTERN = /\b(?:oblast|krai|republic|federal district|region|district|city)\b/i;
const PENDING_RESEARCH_TEXT = /\b(?:to be checked|to check|pending|not yet checked|not yet reviewed|will check|needs? checking|needs? review|follow up|tbd|todo|unknown source|generic search)\b/i;
const GENERIC_RESEARCH_LOCATOR = /^(?:homepage|website|search|web search|database|dataset|report|article|filing|statistics|table)$/i;
const PUBLIC_AGGREGATE_SHARE_PATTERN = /(?:\b(?:share|accounts? for|represents?|makes? up)\b[^.]{0,60}\b(?:of|in)\s+(?:the\s+)?(?:[a-z-]+\s+){0,3}(?:economy|gdp|gross domestic product|population|workforce|employment|exports?|imports?|production|capacity)\b|\b(?:\d+(?:[.,]\d+)?\s*%|\d+(?:[.,]\d+)?\s*percent|one[- ](?:tenth|fifth|quarter|third|half))\s+(?:of|in)\s+(?:the\s+)?(?:[a-z-]+\s+){0,3}(?:economy|gdp|gross domestic product|population|workforce|employment|exports?|imports?|production|capacity)\b|\b(?:economy|gdp|gross domestic product|population|workforce|employment|exports?|imports?|production|capacity)\s+(?:share|percentage)\b)/i;
const COVERAGE_TEXT = /\b(?:coverage|covers? only|days? of (?:consumption|demand|need)|share of need|monthly (?:consumption|demand|need)|daily consumption|shortage response|replacement suppl(?:y|ies))\b/i;
const PRICE_STORY_TEXT = /\b(?:price|prices|pricing|cost|costs|tariff|tariffs|freight|margin|margins|profitability)\b/i;
const PERCENT_VALUE_TEXT = /\d+(?:[.,]\d+)?\s*%/i;
const FORECAST_STORY_TEXT = /\b(?:forecast|target|outlook|projection|guidance|expected range|scenario range)\b/i;
const REALIZED_RATE_TEXT = /\b(?:actual|realized|current|latest|so far|to date|year[- ]to[- ]date)\b[^.]{0,100}\d+(?:[.,]\d+)?\s*%/i;
const TANGIBLE_CURRENCY_LEVEL_TEXT = /(?:[$€£₽¥]\s*\d|\b\d[\d\s,.]*\s*(?:rubles?|roubles?|rubs?|usd|dollars?|euros?|eur|pounds?|gbp|yuan|cny)\b)/i;
const VOLUME_NUMBER = String.raw`\d+(?:[\s,]\d{3})*(?:[.,]\d+)?`;
const PHYSICAL_VOLUME_PATTERN = new RegExp(
  String.raw`\b${VOLUME_NUMBER}(?:\s*(?:-|–|—|to)\s*${VOLUME_NUMBER})?\s*(?:thousand|million|billion)?\s*(?:metric\s+)?(?:tons?|tonnes?|barrels?|liters?|litres?|gallons?|cubic\s+meters?|cubic\s+metres?|m3|m³)\b`,
  'gi'
);

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function numericValuesNearThresholdCues(text) {
  if (!isText(text) || !THRESHOLD_STORY_PATTERN.test(text)) return [];
  const cueExpression = new RegExp(THRESHOLD_STORY_PATTERN.source, 'gi');
  const numberExpression = /\d{1,3}(?:[ ,\u00a0\u202f]\d{3})*(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;
  const cues = [...String(text).matchAll(cueExpression)];
  const numbers = [...String(text).matchAll(numberExpression)];
  const values = [];
  cues.forEach((cue) => {
    const cueStart = cue.index || 0;
    const cueEnd = cueStart + cue[0].length;
    let nearest = null;
    let nearestDistance = Infinity;
    numbers.forEach((number) => {
      const numberStart = number.index || 0;
      const numberEnd = numberStart + number[0].length;
      const distance = numberEnd <= cueStart
        ? cueStart - numberEnd
        : numberStart >= cueEnd
          ? numberStart - cueEnd
          : 0;
      if (distance < nearestDistance) {
        nearest = number;
        nearestDistance = distance;
      }
    });
    if (!nearest || nearestDistance > 48) return;
    const token = nearest[0].replace(/[\s\u00a0\u202f]/g, '');
    const groupedInteger = /^\d{1,3}(?:,\d{3})+$/.test(token);
    const normalized = groupedInteger ? token.replace(/,/g, '') : token.replace(',', '.');
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && !values.some((value) => Math.abs(value - parsed) <= Math.max(1, Math.abs(value), Math.abs(parsed)) * 1e-9)) {
      values.push(parsed);
    }
  });
  return values;
}

function validateOrientationAnchorAudit(candidate, prefix, errors) {
  const audit = candidate?.visualEvidenceAudit;
  if (!audit || typeof audit !== 'object' || Array.isArray(audit)) return;
  const thresholdValues = numericValuesNearThresholdCues(candidateNarrative(candidate));
  const anchors = audit.orientationAnchors;
  if (thresholdValues.length && (!Array.isArray(anchors) || anchors.length === 0)) {
    errors.push(
      `${prefix}.visualEvidenceAudit.orientationAnchors is required because the story is defined by a numeric threshold, floor, ceiling, limit, cap, minimum, maximum, or breakeven value. ` +
      'Record that anchor before recipe selection so before/after observations cannot displace the number that defines the finding.'
    );
    return;
  }
  if (anchors === undefined) return;
  if (!Array.isArray(anchors)) {
    errors.push(`${prefix}.visualEvidenceAudit.orientationAnchors must be an array when provided.`);
    return;
  }
  anchors.forEach((anchor, index) => {
    const anchorPrefix = `${prefix}.visualEvidenceAudit.orientationAnchors[${index}]`;
    if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) {
      errors.push(`${anchorPrefix} must be an object.`);
      return;
    }
    for (const field of ['label', 'quantity', 'unit', 'period']) {
      if (!isText(anchor[field])) errors.push(`${anchorPrefix}.${field} is required.`);
    }
    if (!Number.isFinite(anchor.value)) errors.push(`${anchorPrefix}.value must be a finite number.`);
    if (!ORIENTATION_ANCHOR_ROLES.has(anchor.role)) {
      errors.push(`${anchorPrefix}.role must be one of ${Array.from(ORIENTATION_ANCHOR_ROLES).join(', ')}.`);
    }
  });
  thresholdValues.forEach((thresholdValue) => {
    const matching = anchors.some((anchor) =>
      Number.isFinite(anchor?.value) &&
      Math.abs(anchor.value - thresholdValue) <= Math.max(1, Math.abs(anchor.value), Math.abs(thresholdValue)) * 1e-9
    );
    if (!matching) {
      errors.push(
        `${prefix}.visualEvidenceAudit.orientationAnchors does not inventory the title-defining threshold ${thresholdValue}. ` +
        'Record the actual numeric anchor rather than leaving it only in prose.'
      );
    }
  });
}

function relationshipItemTerms(item) {
  return normalizedSeriesLabel(`${item?.label || ''} ${item?.quantity || ''}`)
    .split(' ')
    .filter((term) => term.length >= 4 && ![
      'reported', 'change', 'share', 'rate', 'value', 'amount', 'period', 'current'
    ].includes(term));
}

function relationshipEvidenceMentionsItem(statement, item, peers = []) {
  if (!isText(statement) || !item || typeof item !== 'object') return false;
  const normalizedStatement = normalizedSeriesLabel(statement);
  const normalizedLabel = normalizedSeriesLabel(item.label);
  if (normalizedLabel && normalizedStatement.includes(normalizedLabel)) return true;

  const statementNumbers = new Set(
    (String(statement).match(/\d+(?:[.,]\d+)*/g) || [])
      .map((token) => Number(token.replace(/,/g, '')))
      .filter(Number.isFinite)
      .map(String)
  );
  const itemNumbers = [item.value, item.low, item.high]
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .map((value) => String(Number(value)));
  if (itemNumbers.some((value) => statementNumbers.has(value))) return true;

  const terms = relationshipItemTerms(item);
  const peerTerms = new Set(peers.flatMap(relationshipItemTerms));
  const distinctiveTerms = terms.filter((term) => !peerTerms.has(term));
  if (distinctiveTerms.some((term) => normalizedStatement.includes(term))) return true;
  return terms.filter((term) => normalizedStatement.includes(term)).length >= 2;
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

function candidateNarrative(candidate) {
  return [
    candidate?.claim,
    candidate?.title,
    candidate?.titleBasis,
    ...(candidate?.anchors || []),
    ...(candidate?.evidence || []).map((item) => item?.statement)
  ].filter(isText).join(' ');
}

function normalizePlaceText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[.()]/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/[^a-z0-9-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function russianRegionEntries() {
  const regionSet = TochnyiMaps.getRegionSet('russia');
  if (!regionSet || !regionSet.regions) return [];
  return Object.entries(regionSet.regions)
    .filter(([, name]) => isText(name))
    .map(([id, name]) => [id, normalizePlaceText(name)])
    .filter(([, name]) => name.length >= 4);
}

const RUSSIAN_REGION_ENTRIES = russianRegionEntries();

const RUSSIAN_REGION_ALIASES = Object.freeze([
  ['moskva', 'RU-MOS'],
  ['moscow oblast', 'RU-MOS'],
  ['moscow region', 'RU-MOS'],
  ['st petersburg', 'RU-SPE'],
  ['saint petersburg', 'RU-SPE'],
  ['petersburg', 'RU-SPE']
]);

function geographicRegionsInLabel(label) {
  if (!isText(label)) return [];
  const normalized = normalizePlaceText(label);
  const regions = new Set();
  RUSSIAN_REGION_ENTRIES.forEach(([id, name]) => {
    if (normalized.includes(name)) regions.add(id);
  });
  RUSSIAN_REGION_ALIASES.forEach(([alias, id]) => {
    if (normalized.includes(alias)) regions.add(id);
  });
  const moscowWithoutOblast = normalized
    .replace(/moscow oblast/g, ' ')
    .replace(/moscow region/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/\bmoscow\b/.test(moscowWithoutOblast)) regions.add('RU-MOW');
  if (regions.size === 0 && ADMIN_LABEL_PATTERN.test(label)) {
    regions.add(`admin:${normalized}`);
  }
  return [...regions];
}

function looksGeographicLabel(label) {
  if (!isText(label)) return false;
  return geographicRegionsInLabel(label).length > 0;
}

function geographicObservationCount(candidate) {
  const observations = candidate?.visualEvidenceAudit?.comparableObservations;
  if (!Array.isArray(observations)) return 0;
  const regions = new Set();
  observations.forEach((observation) => {
    geographicRegionsInLabel(observation?.label || observation?.specLabel)
      .forEach((region) => regions.add(region));
  });
  return regions.size;
}

function geographicSpecCount(spec) {
  const regions = new Set();
  (spec?.data || []).forEach((item) => {
    geographicRegionsInLabel(item?.label).forEach((region) => regions.add(region));
  });
  return regions.size;
}

function validateRoutingAudit(candidate, prefix, errors) {
  const audit = candidate.routingAudit;
  if (!audit || typeof audit !== 'object' || Array.isArray(audit)) {
    errors.push(`${prefix}.routingAudit is required for every selected story so geography-first routing is explicit and machine-checkable.`);
    return;
  }
  if (!GEOGRAPHY_ROLES.has(audit.geographyRole)) {
    errors.push(`${prefix}.routingAudit.geographyRole must be none, categorical, or explanatory.`);
  }
  if (!CHART_WORKFLOWS.has(audit.workflow)) {
    errors.push(`${prefix}.routingAudit.workflow must be standard-chart or regional-breakdown.`);
  }
  if (!isText(audit.rationale) || audit.rationale.length > 240) {
    errors.push(`${prefix}.routingAudit.rationale must explain the routing decision in 240 characters or fewer.`);
  }

  const geographicCount = geographicObservationCount(candidate);
  const narrative = candidateNarrative(candidate);
  if (geographicCount >= 2 && audit.geographyRole === 'none') {
    errors.push(
      `${prefix}.routingAudit.geographyRole cannot be none because the evidence contains ${geographicCount} named administrative geographies. ` +
      'Classify them as categorical labels or explanatory geography before choosing a workflow.'
    );
  }
  if (geographicCount >= 3 && audit.geographyRole !== 'explanatory') {
    errors.push(
      `${prefix}.routingAudit must classify geography as explanatory because the comparable evidence contains ${geographicCount} named administrative regions. ` +
      'Three or more administrative regions on one comparable measure constitute a regional distribution even when the prose calls it a ranking or comparison and does not use an explicit spatial cue. Route it through regional-breakdown.'
    );
  } else if (geographicCount >= 2 && SPATIAL_FINDING_PATTERN.test(narrative) && audit.geographyRole !== 'explanatory') {
    errors.push(
      `${prefix}.routingAudit must classify geography as explanatory because the story combines multiple named regions with a spatial finding such as spread, border contrast, clustering, distribution, or concentration.`
    );
  }
  if (audit.geographyRole === 'explanatory' && audit.workflow !== 'regional-breakdown') {
    errors.push(`${prefix}.routingAudit.workflow must be regional-breakdown when geographyRole is explanatory.`);
  }
  if (audit.workflow === 'regional-breakdown') {
    if (audit.geographyRole !== 'explanatory') {
      errors.push(`${prefix}.routingAudit.geographyRole must be explanatory for regional-breakdown.`);
    }
    if (audit.regionSet !== 'russia') {
      errors.push(`${prefix}.routingAudit.regionSet must be russia for the available regional workflow.`);
    }
  } else if (audit.regionSet !== undefined) {
    errors.push(`${prefix}.routingAudit.regionSet is only valid for regional-breakdown.`);
  }
}

function validateExactCountCandidateReadiness(candidate, prefix, errors) {
  const observations = candidate?.visualEvidenceAudit?.comparableObservations;
  if (!Array.isArray(observations) || observations.length < 2 || observations.length > 4) return;
  const exactCounts = observations.every((observation) => {
    const unitText = `${observation?.quantity || ''} ${observation?.unit || ''}`;
    return Number.isInteger(observation?.value) && observation.value >= 0 && COUNT_UNIT_PATTERN.test(unitText);
  });
  if (!exactCounts) return;
  const observedValues = observations.map((observation) => observation.value);
  const countSum = observations.reduce((sum, observation) => sum + observation.value, 0);
  const evidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
  function containsIndependentNumber(statement) {
    const values = String(statement || '').match(/\d+(?:[.,]\d+)*/g) || [];
    return values.some((value) => {
      const parsed = Number(value.replace(/,/g, ''));
      return Number.isFinite(parsed) &&
        Math.abs(parsed - countSum) > 1e-9 &&
        !observedValues.some((observed) => Math.abs(parsed - observed) <= 1e-9);
    });
  }
  const hasDenominator = evidence.some((item) =>
    item?.role === 'denominator' && containsIndependentNumber(item?.statement) && COUNT_UNIT_PATTERN.test(String(item?.statement || ''))
  );
  const hasBenchmark = evidence.some((item) =>
    ['comparison', 'denominator'].includes(item?.role) &&
    containsIndependentNumber(item?.statement) &&
    COUNT_UNIT_PATTERN.test(String(item?.statement || '')) &&
    BENCHMARK_EVIDENCE_PATTERN.test(String(item?.statement || ''))
  );
  if (hasDenominator || hasBenchmark) return;
  if (observations.length === 2) {
    errors.push(
      `${prefix} has only two exact count observations and no independent tangible denominator or benchmark. ` +
      'Research a third comparable count, population/network total, independent benchmark, or time series before selecting the story; otherwise merge or omit it. The sum of the two counts is derived from the observations and does not count as an anchor.'
    );
    return;
  }
  const tinyMagnitude = Math.max(...observedValues) <= 12;
  const lowVariation = new Set(observedValues).size <= 2;
  if (tinyMagnitude || lowVariation) {
    errors.push(
      `${prefix} has only ${observations.length} small exact-count observations and no independent tangible anchor. ` +
      'A short sequence of tiny integers is visually self-evident and does not become informative merely because it can be drawn as a line. ' +
      'Research a portfolio/universe total, population/network denominator, reviewed set, capacity, affected sales/volume/value, or a richer quantitative series; use event/timeline structure when chronology carries more information than the counts.'
    );
  }
}

function validateRoutingSpecCoverage(candidate, spec, errors) {
  const audit = candidate?.routingAudit || {};
  const specGeographicCount = geographicSpecCount(spec);
  if (audit.workflow === 'regional-breakdown') {
    if (spec?.recipe !== 'map.regional') {
      errors.push(
        `ChartSpec ${candidate.outputSlug} must use map.regional because routingAudit selected regional-breakdown. ` +
        'A ranking or bar chart cannot bypass an explanatory geography decision.'
      );
    }
    if (spec?.map?.regionSet !== audit.regionSet) {
      errors.push(`ChartSpec ${candidate.outputSlug} map.regionSet must match routingAudit.regionSet (${audit.regionSet || 'missing'}).`);
    }
  } else if (audit.workflow === 'standard-chart') {
    if (spec?.recipe === 'map.regional') {
      errors.push(`ChartSpec ${candidate.outputSlug} uses map.regional even though routingAudit selected standard-chart.`);
    }
    if (specGeographicCount >= 3) {
      errors.push(
        `ChartSpec ${candidate.outputSlug} encodes ${specGeographicCount} named administrative regions in a standard chart. ` +
        'Dense administrative-region evidence is a regional distribution and must be inventoried as explanatory geography and rendered with map.regional; a ranking or comparison cannot bypass the regional workflow.'
      );
    }
  }
}

function validateNormalizedCandidateReadiness(candidate, prefix, errors) {
  const representation = candidate?.representationAudit || {};
  if (!['rate', 'share'].includes(representation.selectedMode)) return;
  if (!['unavailable', 'incomparable'].includes(representation.basisAvailability)) return;
  const observations = candidate?.visualEvidenceAudit?.comparableObservations;
  if (!Array.isArray(observations) || observations.length !== 1) return;
  errors.push(
    `${prefix} has only one independent ${representation.selectedMode} observation while its tangible basis is ${representation.basisAvailability}. ` +
    'A derived complement such as 100% minus the reported share is not an independent comparator and does not make a standalone chart informative. ' +
    'Recover a same-unit peer, regional observation, prior/current point, benchmark, target, or other independent orientation from the full source or underlying dataset; merge the claim into a richer same-topic chart when that evidence already exists, otherwise omit it.'
  );
}

function validateOrientationAnchorSpecCoverage(candidate, spec, errors) {
  const anchors = candidate?.visualEvidenceAudit?.orientationAnchors;
  if (!Array.isArray(anchors) || anchors.length === 0) return;
  const data = Array.isArray(spec?.data) ? spec.data : [];
  const references = Array.isArray(spec?.references) ? spec.references : [];
  anchors.forEach((anchor) => {
    if (!Number.isFinite(anchor?.value)) return;
    const visibleAsReference = references.some((reference) => Number.isFinite(reference?.value) && Math.abs(reference.value - anchor.value) <= Math.max(1, Math.abs(reference.value), Math.abs(anchor.value)) * 1e-9);
    const visibleAsBenchmark = data.some((item) => Number.isFinite(item?.benchmark) && Math.abs(item.benchmark - anchor.value) <= Math.max(1, Math.abs(item.benchmark), Math.abs(anchor.value)) * 1e-9);
    const visibleAsData = data.some((item) =>
      (Number.isFinite(item?.value) && Math.abs(item.value - anchor.value) <= Math.max(1, Math.abs(item.value), Math.abs(anchor.value)) * 1e-9) ||
      (Number.isFinite(item?.low) && Math.abs(item.low - anchor.value) <= Math.max(1, Math.abs(item.low), Math.abs(anchor.value)) * 1e-9) ||
      (Number.isFinite(item?.high) && Math.abs(item.high - anchor.value) <= Math.max(1, Math.abs(item.high), Math.abs(anchor.value)) * 1e-9)
    );
    if (visibleAsReference || visibleAsBenchmark || visibleAsData) return;
    errors.push(
      `ChartSpec ${candidate.outputSlug} drops the source-ledger orientation anchor "${anchor.label}" (${anchor.value}). ` +
      'Thresholds, breakeven levels, limits, baselines, denominators, and other story-defining anchors must remain in primary geometry as a reference, benchmark, or plotted threshold mark.'
    );
  });
}

function isPublicAggregateShareCandidate(candidate) {
  return PUBLIC_AGGREGATE_SHARE_PATTERN.test([candidate?.claim, candidate?.title].filter(isText).join(' '));
}

function isCoverageCandidate(candidate) {
  return COVERAGE_TEXT.test(candidateNarrative(candidate));
}

function hasRecoverablePriceLevelInInput(candidate) {
  const headline = [candidate?.claim, candidate?.title].filter(isText).join(' ');
  if (!PRICE_STORY_TEXT.test(headline)) return false;
  return (candidate?.anchors || []).some((anchor) =>
    isText(anchor) &&
    PRICE_STORY_TEXT.test(anchor) &&
    PERCENT_VALUE_TEXT.test(anchor) &&
    TANGIBLE_CURRENCY_LEVEL_TEXT.test(anchor)
  );
}

function physicalVolumePhrases(candidate) {
  const phrases = [];
  for (const anchor of candidate?.anchors || []) {
    if (!isText(anchor)) continue;
    const matches = String(anchor).matchAll(new RegExp(PHYSICAL_VOLUME_PATTERN.source, PHYSICAL_VOLUME_PATTERN.flags));
    for (const match of matches) {
      const phrase = match[0].trim();
      if (phrase && !phrases.includes(phrase)) phrases.push(phrase);
    }
  }
  return phrases;
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
  if (isPublicAggregateShareCandidate(candidate)) {
    if (!LEVEL_AVAILABILITY.has(audit.basisAvailability)) {
      errors.push(
        `${prefix}.representationAudit.basisAvailability is required for a share of a named public aggregate such as GDP, population, exports, production, capacity, demand, or consumption.`
      );
    } else if (!['reported', 'retrievable'].includes(audit.basisAvailability)) {
      errors.push(
        `${prefix}.representationAudit cannot mark the public aggregate denominator ${audit.basisAvailability}. ` +
        'Research the named total, derive the tangible numerator range, and select level geometry; otherwise omit the story.'
      );
    }
    if (!isText(audit.basisRationale) || audit.basisRationale.length > 240) {
      errors.push(`${prefix}.representationAudit.basisRationale must explain the public aggregate denominator in 240 characters or fewer.`);
    }
    if (!isText(audit.basisTarget) || audit.basisTarget.length > 240) {
      errors.push(
        `${prefix}.representationAudit.basisTarget must name the exact public total and tangible numerator to recover, such as nominal GDP and the derived sector-value range.`
      );
    }
    if (audit.selectedMode !== 'level' || !['reported', 'retrievable'].includes(audit.levelAvailability)) {
      errors.push(
        `${prefix}.representationAudit must select reported or retrievable level geometry for a share of a named public aggregate. ` +
        'A raw percentage of an economy, population, export total, production total, capacity, demand, or consumption is not a sufficient chart.'
      );
    }
    const observations = candidate?.visualEvidenceAudit?.comparableObservations;
    if (!Array.isArray(observations) || observations.length < 2) {
      errors.push(
        `${prefix}.visualEvidenceAudit must inventory both the tangible numerator or range and the named public aggregate total.`
      );
    }
  }
  if (['rate', 'share'].includes(audit.selectedMode)) {
    if (!LEVEL_AVAILABILITY.has(audit.basisAvailability)) {
      errors.push(`${prefix}.representationAudit.basisAvailability is required for ${audit.selectedMode} stories.`);
    }
    if (!isText(audit.basisRationale) || audit.basisRationale.length > 240) {
      errors.push(`${prefix}.representationAudit.basisRationale must be a non-empty string of 240 characters or fewer for ${audit.selectedMode} stories.`);
    }
    if (['reported', 'retrievable'].includes(audit.basisAvailability)) {
      errors.push(
        `${prefix}.representationAudit cannot select ${audit.selectedMode} when its tangible basis is ${audit.basisAvailability}. ` +
        'Derive and select level values for the primary geometry, then retain the rate or share as secondary context.'
      );
    }
  }
  if (audit.selectedMode === 'relative-change' &&
      ['reported', 'retrievable'].includes(audit.levelAvailability)) {
    errors.push(
      `${prefix}.representationAudit selects relative-change even though actual levels are ${audit.levelAvailability}. ` +
      'Select level values for the primary geometry and keep percentage or indexed change as secondary context.'
    );
  }
  if (audit.selectedMode === 'relative-change' &&
      ['unavailable', 'incomparable'].includes(audit.levelAvailability) &&
      hasRecoverablePriceLevelInInput(candidate)) {
    errors.push(
      `${prefix}.representationAudit cannot classify the whole price story as ${audit.levelAvailability} because the input anchor already contains a tangible currency price alongside a percentage move. ` +
      'Recover category-specific before/after price pairs, deriving the prior level from current / (1 + change rate) when valid. Different products, grades, or delivery bases do not make within-category price pairs incomparable. Use level geometry for the recoverable pairs and keep unmatched percentage observations as secondary context or research them further.'
    );
  }
  if (audit.selectedMode === 'index' &&
      ['unavailable', 'incomparable'].includes(audit.levelAvailability)) {
    errors.push(
      `${prefix}.representationAudit cannot use a synthetic index when actual levels are ${audit.levelAvailability}. ` +
      'Use the reported relative observations directly, retrieve tangible values, or omit the story.'
    );
  }
  if (audit.selectedMode === 'index' && audit.levelAvailability === 'not-applicable') {
    errors.push(`${prefix}.representationAudit cannot mark a published index level as not-applicable.`);
  }
  if (audit.selectedMode === 'level' &&
      ['unavailable', 'incomparable', 'not-applicable'].includes(audit.levelAvailability)) {
    errors.push(`${prefix}.representationAudit cannot select level when actual levels are ${audit.levelAvailability}.`);
  }

  const needsResearchProof =
    (['absolute-change', 'relative-change'].includes(audit.selectedMode) && ['unavailable', 'incomparable'].includes(audit.levelAvailability)) ||
    (['rate', 'share'].includes(audit.selectedMode) && ['unavailable', 'incomparable'].includes(audit.basisAvailability));
  if (needsResearchProof) {
    if (!isText(audit.tangibleTarget) || audit.tangibleTarget.length > 240) {
      errors.push(
        `${prefix}.representationAudit.tangibleTarget must name the exact price, count, volume, amount, numerator, or denominator sought before normalized evidence is used.`
      );
    }
    if (!Array.isArray(audit.researchAttempts) || audit.researchAttempts.length < 2) {
      errors.push(`${prefix}.representationAudit.researchAttempts must record at least two structured source checks before normalized evidence may be marked unavailable or incomparable.`);
    } else {
      const sources = new Set();
      const sourceTypes = new Set();
      audit.researchAttempts.forEach((attempt, index) => {
        const attemptPrefix = `${prefix}.representationAudit.researchAttempts[${index}]`;
        if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) {
          errors.push(`${attemptPrefix} must be an object.`);
          return;
        }
        if (!isText(attempt.source)) errors.push(`${attemptPrefix}.source is required.`);
        else sources.add(attempt.source.trim().toLowerCase());
        if (!RESEARCH_SOURCE_TYPES.has(attempt.sourceType)) {
          errors.push(
            `${attemptPrefix}.sourceType must be one of ${Array.from(RESEARCH_SOURCE_TYPES).join(', ')}.`
          );
        } else {
          sourceTypes.add(attempt.sourceType);
        }
        if (!isText(attempt.locator) || attempt.locator.length > 240) {
          errors.push(
            `${attemptPrefix}.locator must identify the URL, filing, table, ticker/date range, or dataset slice checked in 240 characters or fewer.`
          );
        } else if (PENDING_RESEARCH_TEXT.test(attempt.locator) || GENERIC_RESEARCH_LOCATOR.test(attempt.locator.trim())) {
          errors.push(`${attemptPrefix}.locator must identify a completed, source-specific check rather than a pending or generic lookup.`);
        }
        if (!isText(attempt.outcome) || attempt.outcome.length > 240) {
          errors.push(`${attemptPrefix}.outcome must explain what was found or why it was unusable in 240 characters or fewer.`);
        } else if (PENDING_RESEARCH_TEXT.test(attempt.outcome)) {
          errors.push(`${attemptPrefix}.outcome must record a completed result; pending research language is not accepted.`);
        }
      });
      if (sources.size < 2) errors.push(`${prefix}.representationAudit.researchAttempts must cover at least two distinct named sources.`);
      if (sourceTypes.size < 2) {
        errors.push(`${prefix}.representationAudit.researchAttempts must cover at least two distinct source types.`);
      }
      if (![...sourceTypes].some((sourceType) => DATA_BEARING_SOURCE_TYPES.has(sourceType))) {
        errors.push(
          `${prefix}.representationAudit.researchAttempts must include an official dataset, company filing, market-data source, or industry dataset capable of supplying tangible values.`
        );
      }
      const researchSubject = `${candidate.claim || ''} ${audit.tangibleTarget || ''} ${audit.rationale || ''}`;
      if (/\b(?:staff|workforce|employee|employees|headcount|positions?)\b/i.test(researchSubject) && !sourceTypes.has('company-filing')) {
        errors.push(
          `${prefix}.representationAudit.researchAttempts must include a company-filing check for workforce or staffing percentages before headcount is accepted as unavailable.`
        );
      }
      if (/\b(?:daily consumption|monthly consumption|fuel need|demand volume|coverage)\b/i.test(researchSubject) &&
          ![...sourceTypes].some((sourceType) => ['official-dataset', 'industry-dataset'].includes(sourceType))) {
        errors.push(
          `${prefix}.representationAudit.researchAttempts must include an official or industry dataset for consumption, demand, or coverage denominators before the basis is accepted as unavailable.`
        );
      }
    }
  }
}

function validateVisualEvidenceAudit(candidate, prefix, errors) {
  const audit = candidate.visualEvidenceAudit;
  if (!audit || typeof audit !== 'object' || Array.isArray(audit)) {
    errors.push(`${prefix}.visualEvidenceAudit is required for a selected story.`);
    return;
  }
  if (!isText(audit.rationale) || audit.rationale.length > 240) {
    errors.push(`${prefix}.visualEvidenceAudit.rationale must be a non-empty string of 240 characters or fewer.`);
  }
  if (!Array.isArray(audit.comparableObservations) || audit.comparableObservations.length === 0) {
    errors.push(`${prefix}.visualEvidenceAudit.comparableObservations must inventory at least one same-scale observation available for the central claim.`);
    return;
  }
  const regionalWorkflow = candidate?.routingAudit?.workflow === 'regional-breakdown';
  const regionalSet = regionalWorkflow
    ? TochnyiMaps.getRegionSet(candidate?.routingAudit?.regionSet)
    : null;
  const observationLimit = regionalSet ? Object.keys(regionalSet.regions).length : 12;
  if (audit.comparableObservations.length > observationLimit) {
    errors.push(
      `${prefix}.visualEvidenceAudit.comparableObservations may contain at most ${observationLimit} observations` +
      (regionalSet ? ` for region set ${regionalSet.id}.` : '.')
    );
  }
  const labels = new Set();
  audit.comparableObservations.forEach((observation, index) => {
    const observationPrefix = `${prefix}.visualEvidenceAudit.comparableObservations[${index}]`;
    if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
      errors.push(`${observationPrefix} must be an object.`);
      return;
    }
    for (const field of ['label', 'quantity', 'unit', 'period']) {
      if (!isText(observation[field])) errors.push(`${observationPrefix}.${field} is required.`);
    }
    const hasValue = typeof observation.value === 'number' && Number.isFinite(observation.value);
    const hasRange = typeof observation.low === 'number' && Number.isFinite(observation.low) &&
      typeof observation.high === 'number' && Number.isFinite(observation.high);
    if (!hasValue && !hasRange) {
      errors.push(`${observationPrefix} requires value or both low and high.`);
    }
    if (hasRange && observation.low > observation.high) {
      errors.push(`${observationPrefix}.low must not exceed high.`);
    }
    if (observation.specLabel !== undefined && !isText(observation.specLabel)) {
      errors.push(`${observationPrefix}.specLabel must be a non-empty string when provided.`);
    }
    const label = normalizedSeriesLabel(observation.specLabel || observation.label);
    if (label && labels.has(label)) errors.push(`${observationPrefix} duplicates another comparable observation label.`);
    if (label) labels.add(label);
  });

  const volumePhrases = physicalVolumePhrases(candidate);
  if (!isCoverageCandidate(candidate) || volumePhrases.length < 2) return;
  const coverageAudit = audit.coverageAudit;
  if (!coverageAudit || typeof coverageAudit !== 'object' || Array.isArray(coverageAudit)) {
    errors.push(
      `${prefix}.visualEvidenceAudit.coverageAudit is required when a coverage story contains multiple physical-volume figures. ` +
      'Inventory each supply component, the demand denominator, and every excluded volume explicitly.'
    );
    return;
  }
  if (!isText(coverageAudit.rationale) || coverageAudit.rationale.length > 240) {
    errors.push(`${prefix}.visualEvidenceAudit.coverageAudit.rationale must explain the supply-versus-demand structure in 240 characters or fewer.`);
  }
  if (!isText(coverageAudit.denominatorLabel)) {
    errors.push(`${prefix}.visualEvidenceAudit.coverageAudit.denominatorLabel is required.`);
  } else if (!labels.has(normalizedSeriesLabel(coverageAudit.denominatorLabel))) {
    errors.push(`${prefix}.visualEvidenceAudit.coverageAudit.denominatorLabel must match a comparableObservations label or specLabel.`);
  }
  if (!Array.isArray(coverageAudit.sourceEvidence) || coverageAudit.sourceEvidence.length === 0) {
    errors.push(`${prefix}.visualEvidenceAudit.coverageAudit.sourceEvidence must disposition every physical-volume phrase in the input anchor.`);
    return;
  }
  const candidateAnchors = (candidate.anchors || []).filter(isText);
  const componentLabels = new Set();
  const phraseDispositionCounts = new Map(volumePhrases.map((phrase) => [phrase, 0]));
  coverageAudit.sourceEvidence.forEach((entry, index) => {
    const entryPrefix = `${prefix}.visualEvidenceAudit.coverageAudit.sourceEvidence[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${entryPrefix} must be an object.`);
      return;
    }
    if (!isText(entry.anchor) || !candidateAnchors.some((anchor) => anchor.includes(entry.anchor.trim()))) {
      errors.push(`${entryPrefix}.anchor must be an exact excerpt from one of the candidate anchors.`);
    }
    if (!['component', 'denominator', 'excluded'].includes(entry.disposition)) {
      errors.push(`${entryPrefix}.disposition must be component, denominator, or excluded.`);
    }
    if (entry.disposition === 'component') {
      if (!isText(entry.label)) errors.push(`${entryPrefix}.label is required for a component.`);
      else {
        const label = normalizedSeriesLabel(entry.label);
        componentLabels.add(label);
        if (!labels.has(label)) errors.push(`${entryPrefix}.label must match a comparableObservations label or specLabel.`);
      }
    }
    if (entry.disposition === 'denominator' && normalizedSeriesLabel(entry.label) !== normalizedSeriesLabel(coverageAudit.denominatorLabel)) {
      errors.push(`${entryPrefix}.label must match coverageAudit.denominatorLabel for denominator evidence.`);
    }
    if (entry.disposition === 'excluded' && (!isText(entry.reason) || entry.reason.length > 240)) {
      errors.push(`${entryPrefix}.reason must specifically explain why the volume is outside the supply-versus-demand comparison.`);
    }
    if (isText(entry.anchor)) {
      const matchedPhrases = volumePhrases.filter((phrase) => entry.anchor.includes(phrase));
      if (matchedPhrases.length !== 1) {
        errors.push(
          `${entryPrefix}.anchor must identify exactly one physical-volume phrase; it currently matches ${matchedPhrases.length}. ` +
          'Use one sourceEvidence entry per reported volume.'
        );
      }
      matchedPhrases.forEach((phrase) => phraseDispositionCounts.set(phrase, (phraseDispositionCounts.get(phrase) || 0) + 1));
    }
  });
  const uncovered = volumePhrases.filter((phrase) => phraseDispositionCounts.get(phrase) === 0);
  const duplicated = volumePhrases.filter((phrase) => phraseDispositionCounts.get(phrase) > 1);
  if (uncovered.length) {
    errors.push(
      `${prefix}.visualEvidenceAudit.coverageAudit leaves physical-volume evidence undispositioned: ${uncovered.join(', ')}. ` +
      'Plot it as a component or denominator, or exclude it with a specific scope or direction reason.'
    );
  }
  if (duplicated.length) {
    errors.push(
      `${prefix}.visualEvidenceAudit.coverageAudit dispositions the same physical-volume evidence more than once: ${duplicated.join(', ')}. ` +
      'Each reported volume must have exactly one disposition.'
    );
  }
  if (componentLabels.size < 2) {
    errors.push(
      `${prefix}.visualEvidenceAudit.coverageAudit must retain at least two named supply components when multiple volume figures explain the coverage result. ` +
      'Do not replace them with one combined shipment range or a days-of-coverage headline.'
    );
  }
}

function validateVisualEvidenceCoverage(candidate, spec, errors) {
  const observations = candidate?.visualEvidenceAudit?.comparableObservations;
  const representation = candidate?.representationAudit || {};
  const normalizedNeedsAllComparators =
    ['rate', 'share'].includes(representation.selectedMode) &&
    ['unavailable', 'incomparable'].includes(representation.basisAvailability);
  const minimumObservations = normalizedNeedsAllComparators ? 2 : 3;
  if (!Array.isArray(observations) || observations.length < minimumObservations) return;
  const data = Array.isArray(spec?.data) ? spec.data : [];
  const references = Array.isArray(spec?.references) ? spec.references : [];
  const denominatorLabel = normalizedSeriesLabel(candidate?.visualEvidenceAudit?.coverageAudit?.denominatorLabel);
  const plottedLabels = new Set(data.map((item) => normalizedSeriesLabel(item?.label)).filter(Boolean));
  const referenceLabels = new Set(references.map((reference) => normalizedSeriesLabel(reference?.label)).filter(Boolean));
  const missing = observations
    .filter((observation) => {
      const label = normalizedSeriesLabel(observation?.specLabel || observation?.label);
      if (plottedLabels.has(label)) return false;
      return !(label === denominatorLabel && referenceLabels.has(label));
    })
    .map((observation) => observation?.specLabel || observation?.label)
    .filter(Boolean);
  const mismatched = observations.filter((observation) => {
    const label = normalizedSeriesLabel(observation?.specLabel || observation?.label);
    const item = data.find((candidate) => normalizedSeriesLabel(candidate?.label) === label);
    if (!item && label === denominatorLabel) {
      const reference = references.find((candidate) => normalizedSeriesLabel(candidate?.label) === label);
      if (!reference) return false;
      return typeof observation.value !== 'number' || !Number.isFinite(observation.value) ||
        typeof reference.value !== 'number' || !Number.isFinite(reference.value) ||
        Math.abs(reference.value - observation.value) > 1e-9;
    }
    if (!item) return false;
    if (typeof observation.value === 'number' && Number.isFinite(observation.value)) {
      return typeof item.value !== 'number' || !Number.isFinite(item.value) ||
        Math.abs(item.value - observation.value) > 1e-9;
    }
    return typeof item.low !== 'number' || typeof item.high !== 'number' ||
      Math.abs(item.low - observation.low) > 1e-9 || Math.abs(item.high - observation.high) > 1e-9;
  }).map((observation) => observation?.specLabel || observation?.label).filter(Boolean);
  if (missing.length || mismatched.length) {
    errors.push(
      `ChartSpec ${candidate.outputSlug} collapses a richer same-scale dataset. ` +
      `The source ledger inventories ${observations.length} comparable observations, so all must remain in primary geometry; a coverage denominator may be a visible numeric reference instead of a redundant data row. ` +
      `${missing.length ? `Missing plotted labels: ${missing.join(', ')}. ` : ''}` +
      `${mismatched.length ? `Changed plotted values or ranges: ${mismatched.join(', ')}. ` : ''}` +
      'Do not replace named components or time points with one aggregate, one range, or one headline value.'
    );
  }
}

function validateRelationshipEvidence(candidate, spec, errors) {
  if (spec?.recipe !== 'relationship.converging-signals') return;
  const mechanismEvidence = Array.isArray(candidate?.evidence)
    ? candidate.evidence.filter((item) => item?.role === 'mechanism' && isText(item?.statement))
    : [];
  if (!mechanismEvidence.length) {
    errors.push(
      `ChartSpec ${candidate.outputSlug} uses relationship.converging-signals without source-ledger mechanism evidence. ` +
      'Record an input, external, or derived evidence item with role mechanism that supports relationship.formula, or use comparison geometry instead.'
    );
    return;
  }
  if (spec?.relationship?.mode !== 'directional') return;
  const drivers = (spec.data || []).filter((item) => item?.relationshipRole === 'driver');
  const outcome = (spec.data || []).find((item) => item?.relationshipRole === 'outcome');
  if (!outcome || drivers.length !== 2) return;
  const hasExplicitLink = mechanismEvidence.some((evidence) =>
    relationshipEvidenceMentionsItem(evidence.statement, outcome, drivers) &&
    drivers.some((driver) => relationshipEvidenceMentionsItem(
      evidence.statement,
      driver,
      [outcome, ...drivers.filter((candidate) => candidate !== driver)]
    ))
  );
  if (!hasExplicitLink) {
    errors.push(
      `ChartSpec ${candidate.outputSlug} uses a directional relationship whose mechanism evidence does not explicitly link the plotted outcome to at least one plotted driver. ` +
      'A mechanism tag that only lists drivers, describes chronology, or supplies adjacent facts is not enough to justify causal connector geometry. ' +
      'Record source-supported linkage that names the outcome and a driver, or use comparison geometry instead.'
    );
  }
}

function validatePublicAggregateBasisEvidence(candidate, prefix, errors) {
  if (!isPublicAggregateShareCandidate(candidate)) return;
  const hasDenominatorEvidence = Array.isArray(candidate?.evidence) &&
    candidate.evidence.some((item) => item?.role === 'denominator' && ['external', 'derived', 'input'].includes(item?.origin));
  if (!hasDenominatorEvidence) {
    errors.push(
      `${prefix}.evidence must include a denominator item for the named public aggregate. ` +
      'Record the GDP, population, export total, production total, capacity, demand, consumption, or other public total used to derive the tangible numerator.'
    );
  }
}

function isCompleteTangibleComposition(spec) {
  if (!['composition.stacked', 'composition.donut'].includes(spec?.recipe)) return false;
  if (spec?.measure?.valueMode !== 'level') return false;
  if (/%|percent|percentage/i.test(String(spec?.measure?.unit || ''))) return false;
  const values = (spec?.data || []).map((item) => item?.value);
  return values.length >= 2 && values.every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function validatePublicAggregateSpecCoverage(candidate, spec, errors) {
  if (!isPublicAggregateShareCandidate(candidate)) return;
  if (!spec?.basis && !isCompleteTangibleComposition(spec)) {
    errors.push(
      `ChartSpec ${candidate.outputSlug} must include a tangible basis or a complete level composition for the public aggregate share. ` +
      'Plot the derived numerator and the named total; a percentage range plus a 100% reference is not an anchor.'
    );
    return;
  }
  if (spec?.basis) {
    const plottedLabels = new Set((spec?.data || []).map((item) => normalizedSeriesLabel(item?.label)).filter(Boolean));
    const basisItems = Array.isArray(spec.basis.items) ? spec.basis.items : [];
    const numerator = basisItems.find((item) => ['numerator', 'affected', 'base', 'derived'].includes(item?.role));
    const denominator = basisItems.find((item) => ['denominator', 'population'].includes(item?.role));
    const missing = [numerator, denominator]
      .filter((item) => item && !plottedLabels.has(normalizedSeriesLabel(item.label)))
      .map((item) => item.label || item.role);
    if (missing.length) {
      errors.push(
        `ChartSpec ${candidate.outputSlug} keeps public-aggregate basis values outside primary geometry. ` +
        `Missing plotted basis labels: ${missing.join(', ')}.`
      );
    }
  }
}

function validateCoverageSpecCoverage(candidate, spec, errors) {
  const coverageAudit = candidate?.visualEvidenceAudit?.coverageAudit;
  if (!coverageAudit || !Array.isArray(coverageAudit.sourceEvidence)) return;
  const componentLabels = coverageAudit.sourceEvidence
    .filter((entry) => entry?.disposition === 'component' && isText(entry.label))
    .map((entry) => entry.label);
  const plottedLabels = new Set((spec?.data || []).map((item) => normalizedSeriesLabel(item?.label)).filter(Boolean));
  const referenceLabels = new Set((spec?.references || []).map((item) => normalizedSeriesLabel(item?.label)).filter(Boolean));
  const missingComponents = componentLabels.filter((label) => !plottedLabels.has(normalizedSeriesLabel(label)));
  const normalizedDenominator = normalizedSeriesLabel(coverageAudit.denominatorLabel);
  const denominatorMissing = !plottedLabels.has(normalizedDenominator) && !referenceLabels.has(normalizedDenominator);
  if (missingComponents.length || denominatorMissing) {
    errors.push(
      `ChartSpec ${candidate.outputSlug} does not show the full supply-versus-demand decomposition. ` +
      `${missingComponents.length ? `Missing supply components: ${missingComponents.join(', ')}. ` : ''}` +
      `${denominatorMissing ? `Missing demand denominator: ${coverageAudit.denominatorLabel}. ` : ''}` +
      'Plot every retained component and show the total need as a plotted value or visible numeric reference in primary geometry.'
    );
  }
  const unit = String(spec?.measure?.unit || '').toLowerCase();
  if (componentLabels.length >= 2 && /\b(?:day|days|week|weeks|month|months)\b/.test(unit)) {
    errors.push(
      `ChartSpec ${candidate.outputSlug} converts a multi-component supply story into time-only geometry. ` +
      'Keep the shipment or reserve components and the demand denominator in the same tangible volume unit; days of coverage may remain secondary context.'
    );
  }
}

function validateForecastOrientationSpecCoverage(candidate, spec, errors) {
  const narrative = candidateNarrative(candidate);
  if (!FORECAST_STORY_TEXT.test(narrative)) return;
  const hasRealizedRateInInput = (candidate?.anchors || []).some((anchor) =>
    isText(anchor) && REALIZED_RATE_TEXT.test(anchor)
  );
  if (!hasRealizedRateInInput) return;
  const hasNumericReference = Array.isArray(spec?.references) && spec.references.some((reference) =>
    typeof reference?.value === 'number' && Number.isFinite(reference.value)
  );
  if (!hasNumericReference) {
    errors.push(
      `ChartSpec ${candidate.outputSlug} leaves an input-reported realized/current rate outside primary geometry. ` +
      'Forecast, target, and outlook stories with a same-unit actual/current observation must plot it as a numeric reference rather than leaving it in supporting context.'
    );
  }
}

function validateSourceLedger(projectRoot, runId, options = {}) {
  const normalized = normalizeRunId(runId);
  const snapshot = readInputSnapshot(projectRoot);
  const ledgerPath = sourceLedgerPath(projectRoot, normalized);
  const ledger = loadJson(ledgerPath, 'Source ledger');
  const errors = [];

  if (ledger.version !== '1.5') errors.push('Source ledger version must be 1.5.');
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
        if (evidence.conflictStatus !== undefined && !CONFLICT_STATUSES.has(evidence.conflictStatus)) {
          errors.push(`${evidencePrefix}.conflictStatus must be none or material when provided.`);
        }
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
          if (evidence.conflictStatus === 'material' && candidate.decision === 'selected') {
            errors.push(
              `${evidencePrefix} records a direct material contradiction with the input-supported story. ` +
              'A conflicted candidate cannot be selected or visualized until editorial resolution; keep the external report as working evidence and omit/hold the story instead of turning the disagreement into chart geometry.'
            );
          }
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
      validateVisualEvidenceAudit(candidate, prefix, errors);
      validateOrientationAnchorAudit(candidate, prefix, errors);
      validateRoutingAudit(candidate, prefix, errors);
      validateNormalizedCandidateReadiness(candidate, prefix, errors);
      validateExactCountCandidateReadiness(candidate, prefix, errors);
      validatePublicAggregateBasisEvidence(candidate, prefix, errors);
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
      if (['rate', 'share'].includes(audit.selectedMode)) {
        if (spec.measure?.basisAvailability !== audit.basisAvailability) {
          errors.push(
            `ChartSpec ${candidate.outputSlug} measure.basisAvailability must match representationAudit.basisAvailability (${audit.basisAvailability || 'missing'}).`
          );
        }
        if (['reported', 'retrievable'].includes(audit.basisAvailability) && !spec.basis) {
          errors.push(`ChartSpec ${candidate.outputSlug} must expose basis because the ledger records a ${audit.basisAvailability} tangible basis.`);
        }
      }
      validateVisualEvidenceCoverage(candidate, spec, errors);
      validateOrientationAnchorSpecCoverage(candidate, spec, errors);
      validateRelationshipEvidence(candidate, spec, errors);
      validatePublicAggregateSpecCoverage(candidate, spec, errors);
      validateCoverageSpecCoverage(candidate, spec, errors);
      validateForecastOrientationSpecCoverage(candidate, spec, errors);
      validateRoutingSpecCoverage(candidate, spec, errors);
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
