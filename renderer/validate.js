'use strict';

const { getRecipe, recipeIds } = require('./catalog');
const TochnyiMaps = require('../lib/tochnyi-maps');
const VisualPlan = require('../lib/tochnyi-visual-plan');

const FORBIDDEN_KEYS = new Set([
  'html', 'script', 'style', 'styles', 'customCss', 'customJS', 'customJs',
  'javascript', 'innerHTML', 'template'
]);
const TONES = new Set(['primary', 'secondary', 'warning', 'critical', 'neutral', 'positive']);
const DIRECTIONS = new Set(['up', 'down', 'neutral']);
const HEIGHTS = new Set(['short', 'standard', 'tall']);
const SORTS = new Set(['none', 'ascending', 'descending']);
const STATUSES = new Set(['stable', 'improving', 'strained', 'critical', 'blocked', 'unknown']);
const ROLES = new Set(['start', 'change', 'subtotal', 'end']);
const VALUE_STATUSES = new Set(['reported', 'derived', 'bound', 'approximate']);
const SCALES = new Set(['linear', 'logarithmic']);
const VALUE_MODES = new Set(['level', 'absolute-change', 'relative-change', 'rate', 'share', 'index']);
const LEVEL_AVAILABILITY = new Set(['reported', 'retrievable', 'unavailable', 'incomparable', 'not-applicable']);
const BASIS_TYPES = new Set(['ratio', 'population']);
const BASIS_ROLES = new Set(['numerator', 'denominator', 'population', 'affected', 'base', 'derived']);
const FACT_ROLES = new Set(['comparison', 'denominator', 'mechanism', 'consequence', 'context']);
const LABEL_MODES = new Set(['auto', 'inside', 'outside']);
const FRAMES = new Set(['neutral', 'warning', 'surprise', 'collapse', 'recovery', 'divergence', 'comparison']);
const DENSITIES = new Set(['minimal', 'editorial', 'detailed']);
const NARRATIVE_EMPHASIS = new Set(['magnitude', 'direction', 'gap', 'composition', 'ranking', 'range', 'flow', 'status', 'geography', 'risk', 'duration', 'benchmark-gap']);
const CALLOUT_SIDES = new Set(['auto', 'left', 'right']);
const MAP_CALLOUTS = new Set(['auto', 'cards', 'none']);
const MAP_SUMMARY_POSITIONS = new Set(['auto', 'right', 'below', 'none']);
const MAP_SUMMARY_DISPLAYS = new Set(['auto', 'show', 'hide']);
const MAP_CALLOUT_DISTRIBUTIONS = new Set(['auto', 'geographic', 'balanced']);
const MAP_ANCHOR_STYLES = new Set(['auto', 'none', 'dot']);
const MAP_LEADER_ROUTING = new Set(['auto', 'direct', 'lanes', 'ports', 'indexed']);
const ICONS = new Set(['person', 'shield', 'warehouse', 'pause', 'exit', 'money', 'ship', 'fuel', 'factory', 'warning', 'trend', 'document']);
const VISUAL_TYPES = new Set(['auto', 'number', 'progress', 'pictogram']);
const SHARED_SCALE_RECIPES = new Set([
  'comparison.change', 'comparison.scenarios', 'comparison.diverging', 'comparison.range', 'comparison.benchmark-gap',
  'trend.line', 'ranking.horizontal'
]);
const LEGACY_RECIPES = new Set(['story.facets']);
const DISABLED_RECIPES = new Map([
  [
    'status.grid',
    'status.grid is disabled for production. A text-only status list is not a chart. Enrich the source with a common numeric measure, use map.regional when geography is explanatory, or omit the story.'
  ],
  [
    'headline.metric',
    'headline.metric is disabled for production. A single number is not enough visual evidence. Add a real comparator, denominator, benchmark, or time series and select a multi-mark recipe.'
  ]
]);

const ROOT_KEYS = new Set([
  'version', 'recipe', 'title', 'subtitle', 'date', 'source', 'data', 'references', 'measure',
  'basis', 'emphasis', 'primaryMetric', 'supportingFacts', 'visual', 'note', 'narrative', 'options', 'metadata', 'map'
]);
const SOURCE_KEYS = new Set(['name', 'period', 'url']);
const DATA_KEYS = new Set([
  'id', 'regionId', 'regionIds', 'calloutSide', 'calloutOrder', 'label', 'quantity', 'group', 'icon', 'direction', 'value', 'low', 'high',
  'benchmark', 'benchmarkDisplayValue', 'gapDisplayValue', 'start', 'end', 'displayValue', 'detail', 'annotation', 'tone', 'status', 'role', 'valueStatus',
  'period', 'scope'
]);
const REFERENCE_KEYS = new Set(['value', 'label', 'tone', 'lineStyle']);
const MEASURE_KEYS = new Set([
  'quantity', 'unit', 'axisTitle', 'valueMode', 'levelAvailability', 'basisAvailability', 'basisNote', 'normalizationNote',
  'prefix', 'suffix', 'decimals', 'minimum', 'maximum', 'baseline', 'scale'
]);
const EMPHASIS_KEYS = new Set(['direction', 'value', 'displayValue', 'label', 'position']);
const METRIC_KEYS = new Set(['value', 'label']);
const FACT_KEYS = new Set(['value', 'label', 'tone', 'role']);
const BASIS_KEYS = new Set(['type', 'label', 'formula', 'items']);
const BASIS_ITEM_KEYS = new Set(['role', 'label', 'value', 'low', 'high', 'displayValue', 'unit', 'valueStatus', 'tone']);
const VISUAL_KEYS = new Set(['type', 'icon', 'total', 'filled', 'columns']);
const NARRATIVE_KEYS = new Set(['frame', 'density', 'emphasis']);
const OPTION_KEYS = new Set(['height', 'sort', 'showLegend', 'showLabels', 'animate', 'labelMode']);
const METADATA_KEYS = new Set(['slug', 'topic', 'country', 'dataPeriod', 'keyFinding']);
const MAP_KEYS = new Set([
  'regionSet', 'callouts', 'calloutDistribution', 'summaryPosition', 'summaryDisplay',
  'viewport', 'viewportAlignment', 'contextFit', 'landmass', 'excludeRegions', 'anchorStyle', 'leaderRouting'
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rejectUnknownKeys(value, allowedKeys, path, errors) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) errors.push(`${path}.${key} is not allowed by the ChartSpec schema.`);
  }
}

function findForbiddenKeys(value, path = '$', found = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenKeys(item, `${path}[${index}]`, found));
    return found;
  }
  if (!isObject(value)) return found;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) found.push(`${path}.${key}`);
    findForbiddenKeys(child, `${path}.${key}`, found);
  }
  return found;
}

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function pushLengthIssue(value, field, max, errors, warnings, warningAt = max) {
  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${field} must be a non-empty string.`);
    return;
  }
  if (value.length > max) errors.push(`${field} must be ${max} characters or fewer.`);
  else if (value.length > warningAt) warnings.push(`${field} is long and may reduce visual clarity.`);
}

function normalizeEditorialValue(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function percentageText(value) {
  const decimals = Math.abs(value - Math.round(value)) < 0.05 ? 0 : 1;
  return `${value.toFixed(decimals)}%`;
}

const UNIT_MAGNITUDE_WORDS = new Set([
  'unit', 'units', 'thousand', 'million', 'billion', 'trillion',
  'per', 'each', 'annual', 'annually', 'monthly', 'weekly', 'daily'
]);

function normalizeVisibleUnitText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/[^a-z0-9%$€£₽¥]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularUnitWord(word) {
  if (word === 'people') return 'person';
  if (word === 'men') return 'man';
  if (word === 'women') return 'woman';
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function measureUnitKeywords(unit) {
  const normalized = normalizeVisibleUnitText(unit);
  const keywords = new Set();
  if (!normalized) return keywords;
  if (normalized.includes('%')) {
    keywords.add('%');
    keywords.add('percent');
    keywords.add('percentage');
  }
  if (/\b(?:usd|dollar)\b/.test(normalized)) {
    keywords.add('$');
    keywords.add('usd');
    keywords.add('dollar');
  }
  if (/\b(?:rub|ruble|rouble)\b/.test(normalized)) {
    keywords.add('₽');
    keywords.add('rub');
    keywords.add('ruble');
    keywords.add('rouble');
  }
  if (/\b(?:eur|euro)\b/.test(normalized)) {
    keywords.add('€');
    keywords.add('eur');
    keywords.add('euro');
  }
  if (/\bindex\b/.test(normalized)) {
    keywords.add('index');
    keywords.add('point');
  }
  normalized.split(' ').forEach((word) => {
    if (!word || UNIT_MAGNITUDE_WORDS.has(word)) return;
    if (/^(?:k|m|mn|bn|tn)$/.test(word)) return;
    keywords.add(singularUnitWord(word));
  });
  return keywords;
}

function visibleTextContainsUnit(text, unit) {
  const normalized = normalizeVisibleUnitText(text);
  if (!normalized) return false;
  const words = new Set(normalized.split(' ').map(singularUnitWord));
  for (const keyword of measureUnitKeywords(unit)) {
    if (['%', '$', '€', '£', '₽', '¥'].includes(keyword)) {
      if (String(text || '').includes(keyword)) return true;
    } else if (words.has(keyword)) {
      return true;
    }
  }
  return false;
}

function isMagnitudeOnlyDisplayValue(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  return /^[≈~<>+\-−]?\s*\d[\d.,]*(?:\s*(?:k|m|mn|bn|tn))?$/i.test(normalized);
}

function validateVisibleUnits(spec, errors) {
  if (['map.regional', 'story.facets'].includes(spec.recipe)) return;
  const unit = spec.measure?.unit || spec.measure?.suffix || spec.measure?.prefix;
  if (!unit) return;
  const context = `${spec.title || ''} ${spec.subtitle || ''}`;
  const contextDefinesUnit = visibleTextContainsUnit(context, unit);
  (spec.data || []).forEach((item, index) => {
    if (!isObject(item) || !isMagnitudeOnlyDisplayValue(item.displayValue)) return;
    if (contextDefinesUnit || visibleTextContainsUnit(item.displayValue, unit)) return;
    errors.push(
      `data[${index}].displayValue "${item.displayValue}" is unitless while measure.unit is "${unit}"; ` +
      'add the unit to displayValue or state it explicitly in the title or subtitle.'
    );
  });
  if (isMagnitudeOnlyDisplayValue(spec.emphasis?.displayValue) &&
      !contextDefinesUnit && !visibleTextContainsUnit(spec.emphasis.displayValue, unit)) {
    errors.push(
      `emphasis.displayValue "${spec.emphasis.displayValue}" is unitless while measure.unit is "${unit}"; ` +
      'add the unit to the emphasis value or state it explicitly in the title or subtitle.'
    );
  }
}

function normalizeSource(source) {
  if (!isObject(source)) return source;
  return {
    name: typeof source.name === 'string' ? source.name.trim() : source.name,
    ...(source.period !== undefined ? { period: typeof source.period === 'string' ? source.period.trim() : source.period } : {}),
    ...(source.url !== undefined ? { url: typeof source.url === 'string' ? source.url.trim() : source.url } : {})
  };
}

function normalizeSpec(input) {
  const spec = clone(input);
  spec.version = spec.version || '2.0';
  spec.title = typeof spec.title === 'string' ? spec.title.trim() : spec.title;
  spec.subtitle = typeof spec.subtitle === 'string' ? spec.subtitle.trim() : spec.subtitle;
  spec.source = normalizeSource(spec.source);

  spec.measure = isObject(spec.measure) ? spec.measure : {};
  spec.measure.decimals = spec.measure.decimals === undefined ? 0 : spec.measure.decimals;
  spec.measure.baseline = spec.measure.baseline || 'zero';
  spec.measure.scale = spec.measure.scale || 'linear';

  spec.options = isObject(spec.options) ? spec.options : {};
  spec.options.height = spec.options.height || getRecipe(spec.recipe)?.defaults?.height || 'standard';
  spec.options.sort = spec.options.sort || 'none';
  spec.options.showLegend = spec.options.showLegend === undefined ? true : spec.options.showLegend;
  spec.options.showLabels = spec.options.showLabels === undefined ? true : spec.options.showLabels;
  spec.options.animate = spec.options.animate === undefined ? true : spec.options.animate;
  spec.options.labelMode = spec.options.labelMode || 'auto';

  spec.narrative = isObject(spec.narrative) ? spec.narrative : {};
  spec.narrative.frame = spec.narrative.frame || 'neutral';
  spec.narrative.density = spec.narrative.density || 'editorial';
  spec.narrative.emphasis = spec.narrative.emphasis || 'magnitude';

  if (spec.recipe === 'map.regional' || isObject(spec.map)) {
    spec.map = isObject(spec.map) ? spec.map : {};
    Object.entries(TochnyiMaps.regionalMapDefaults).forEach(([key, value]) => {
      spec.map[key] = spec.map[key] || value;
    });
    spec.map.excludeRegions = spec.map.excludeRegions === undefined
      ? []
      : Array.isArray(spec.map.excludeRegions)
        ? spec.map.excludeRegions.map((regionId) => typeof regionId === 'string' ? regionId.trim().toUpperCase() : regionId)
        : spec.map.excludeRegions;
  }

  spec.data = Array.isArray(spec.data)
    ? spec.data.map((item) => isObject(item) ? ({
        ...item,
        label: typeof item.label === 'string' ? item.label.trim() : item.label,
        ...(item.quantity !== undefined ? { quantity: typeof item.quantity === 'string' ? item.quantity.trim() : item.quantity } : {}),
        ...(item.group !== undefined ? { group: typeof item.group === 'string' ? item.group.trim() : item.group } : {}),
        ...(item.id !== undefined ? { id: typeof item.id === 'string' ? item.id.trim() : item.id } : {}),
        ...(item.regionId !== undefined ? { regionId: typeof item.regionId === 'string' ? item.regionId.trim().toUpperCase() : item.regionId } : {}),
        ...(item.regionIds !== undefined ? {
          regionIds: Array.isArray(item.regionIds)
            ? item.regionIds.map((regionId) => typeof regionId === 'string' ? regionId.trim().toUpperCase() : regionId)
            : item.regionIds
        } : {}),
        ...(item.displayValue !== undefined
          ? { displayValue: typeof item.displayValue === 'string' ? item.displayValue.trim() : item.displayValue }
          : {}),
        ...(item.benchmarkDisplayValue !== undefined
          ? { benchmarkDisplayValue: typeof item.benchmarkDisplayValue === 'string' ? item.benchmarkDisplayValue.trim() : item.benchmarkDisplayValue }
          : {}),
        ...(item.gapDisplayValue !== undefined
          ? { gapDisplayValue: typeof item.gapDisplayValue === 'string' ? item.gapDisplayValue.trim() : item.gapDisplayValue }
          : {}),
        ...(item.start !== undefined ? { start: typeof item.start === 'string' ? item.start.trim() : item.start } : {}),
        ...(item.end !== undefined ? { end: typeof item.end === 'string' ? item.end.trim() : item.end } : {}),
        ...(item.detail !== undefined ? { detail: typeof item.detail === 'string' ? item.detail.trim() : item.detail } : {}),
        ...(item.annotation !== undefined ? { annotation: typeof item.annotation === 'string' ? item.annotation.trim() : item.annotation } : {}),
        ...(item.period !== undefined ? { period: typeof item.period === 'string' ? item.period.trim() : item.period } : {}),
        ...(item.scope !== undefined ? { scope: typeof item.scope === 'string' ? item.scope.trim() : item.scope } : {})
      }) : item)
    : spec.data;

  if (Array.isArray(spec.data)) {
    spec.data = spec.data.map((item) => {
      if (!isObject(item) || item.direction !== undefined) return item;
      const inferredDirection = VisualPlan.inferChangeDirection(item, spec);
      return inferredDirection === 'up' || inferredDirection === 'down'
        ? { ...item, direction: inferredDirection }
        : item;
    });
  }

  spec.references = Array.isArray(spec.references)
    ? spec.references.map((reference) => isObject(reference) ? ({
        ...reference,
        label: typeof reference.label === 'string' ? reference.label.trim() : reference.label
      }) : reference)
    : [];

  spec.supportingFacts = Array.isArray(spec.supportingFacts)
    ? spec.supportingFacts.map((fact) => isObject(fact) ? ({
        ...fact,
        value: typeof fact.value === 'string' ? fact.value.trim() : fact.value,
        label: typeof fact.label === 'string' ? fact.label.trim() : fact.label
      }) : fact)
    : [];

  if (isObject(spec.basis)) {
    spec.basis = {
      ...spec.basis,
      ...(spec.basis.label !== undefined ? { label: typeof spec.basis.label === 'string' ? spec.basis.label.trim() : spec.basis.label } : {}),
      ...(spec.basis.formula !== undefined ? { formula: typeof spec.basis.formula === 'string' ? spec.basis.formula.trim() : spec.basis.formula } : {}),
      items: Array.isArray(spec.basis.items)
        ? spec.basis.items.map((item) => isObject(item) ? ({
            ...item,
            label: typeof item.label === 'string' ? item.label.trim() : item.label,
            displayValue: typeof item.displayValue === 'string' ? item.displayValue.trim() : item.displayValue,
            ...(item.unit !== undefined ? { unit: typeof item.unit === 'string' ? item.unit.trim() : item.unit } : {})
          }) : item)
        : spec.basis.items
    };
  }

  if (isObject(spec.primaryMetric)) {
    spec.primaryMetric = {
      ...spec.primaryMetric,
      value: typeof spec.primaryMetric.value === 'string' ? spec.primaryMetric.value.trim() : spec.primaryMetric.value,
      label: typeof spec.primaryMetric.label === 'string' ? spec.primaryMetric.label.trim() : spec.primaryMetric.label
    };
  }
  return spec;
}

function validateStructure(input, errors) {
  rejectUnknownKeys(input, ROOT_KEYS, '$', errors);
  if (input.version !== undefined && input.version !== '2.0') errors.push('version must be "2.0".');

  if (input.source !== undefined && !isObject(input.source)) errors.push('source must be an object with a name when provided.');
  else if (isObject(input.source)) rejectUnknownKeys(input.source, SOURCE_KEYS, 'source', errors);

  if (Array.isArray(input.data)) {
    input.data.forEach((item, index) => rejectUnknownKeys(item, DATA_KEYS, `data[${index}]`, errors));
  }
  if (Array.isArray(input.references)) {
    input.references.forEach((reference, index) => rejectUnknownKeys(reference, REFERENCE_KEYS, `references[${index}]`, errors));
  }
  if (isObject(input.measure)) rejectUnknownKeys(input.measure, MEASURE_KEYS, 'measure', errors);
  if (isObject(input.basis)) {
    rejectUnknownKeys(input.basis, BASIS_KEYS, 'basis', errors);
    if (Array.isArray(input.basis.items)) {
      input.basis.items.forEach((item, index) => rejectUnknownKeys(item, BASIS_ITEM_KEYS, `basis.items[${index}]`, errors));
    }
  }
  if (isObject(input.emphasis)) rejectUnknownKeys(input.emphasis, EMPHASIS_KEYS, 'emphasis', errors);
  if (isObject(input.primaryMetric)) rejectUnknownKeys(input.primaryMetric, METRIC_KEYS, 'primaryMetric', errors);
  if (Array.isArray(input.supportingFacts)) {
    input.supportingFacts.forEach((fact, index) => rejectUnknownKeys(fact, FACT_KEYS, `supportingFacts[${index}]`, errors));
  }
  if (isObject(input.visual)) rejectUnknownKeys(input.visual, VISUAL_KEYS, 'visual', errors);
  if (isObject(input.narrative)) rejectUnknownKeys(input.narrative, NARRATIVE_KEYS, 'narrative', errors);
  if (isObject(input.options)) rejectUnknownKeys(input.options, OPTION_KEYS, 'options', errors);
  if (isObject(input.metadata)) rejectUnknownKeys(input.metadata, METADATA_KEYS, 'metadata', errors);
  if (isObject(input.map)) rejectUnknownKeys(input.map, MAP_KEYS, 'map', errors);
}

function validateData(spec, errors, warnings) {
  if (!Array.isArray(spec.data)) {
    errors.push('data must be an array.');
    return;
  }
  if (spec.data.length === 0) errors.push('data must contain at least one item.');
  if (spec.data.length > 12) errors.push('data cannot contain more than 12 items.');

  spec.data.forEach((item, index) => {
    const path = `data[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    pushLengthIssue(item.label, `${path}.label`, 80, errors, warnings, 45);
    for (const key of ['value', 'low', 'high', 'benchmark']) {
      if (item[key] !== undefined && (typeof item[key] !== 'number' || !Number.isFinite(item[key]))) {
        errors.push(`${path}.${key} must be a finite number.`);
      }
    }
    if (item.displayValue !== undefined && (typeof item.displayValue !== 'string' || item.displayValue.length > 50)) {
      errors.push(`${path}.displayValue must be a string of 50 characters or fewer.`);
    }
    for (const key of ['benchmarkDisplayValue', 'gapDisplayValue']) {
      if (item[key] !== undefined && (typeof item[key] !== 'string' || item[key].length > 50)) {
        errors.push(`${path}.${key} must be a string of 50 characters or fewer.`);
      }
    }
    for (const key of ['start', 'end']) {
      if (item[key] !== undefined && !isDateString(item[key])) {
        errors.push(`${path}.${key} must be a real date in YYYY-MM-DD format.`);
      }
    }
    if (item.group !== undefined && (typeof item.group !== 'string' || item.group.trim() === '' || item.group.length > 60)) {
      errors.push(`${path}.group must be a non-empty string of 60 characters or fewer.`);
    }
    if (item.quantity !== undefined && (typeof item.quantity !== 'string' || item.quantity.trim().length < 3 || item.quantity.length > 80)) {
      errors.push(`${path}.quantity must be a specific string of 3 to 80 characters.`);
    }
    if (item.icon !== undefined && !ICONS.has(item.icon)) errors.push(`${path}.icon is not supported.`);
    if (item.direction !== undefined && !DIRECTIONS.has(item.direction)) errors.push(`${path}.direction is not supported.`);
    if (item.detail !== undefined && (typeof item.detail !== 'string' || item.detail.length > 180)) errors.push(`${path}.detail must be a string of 180 characters or fewer.`);
    if (item.annotation !== undefined && (typeof item.annotation !== 'string' || item.annotation.length > 120)) errors.push(`${path}.annotation must be a string of 120 characters or fewer.`);
    for (const key of ['period', 'scope']) {
      if (item[key] !== undefined && (typeof item[key] !== 'string' || item[key].trim() === '' || item[key].length > 80)) {
        errors.push(`${path}.${key} must be a non-empty string of 80 characters or fewer.`);
      }
    }
    if (item.valueStatus !== undefined && !VALUE_STATUSES.has(item.valueStatus)) errors.push(`${path}.valueStatus is not supported.`);
    if (item.id !== undefined && (typeof item.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id))) errors.push(`${path}.id must use lowercase letters, numbers, and single hyphens.`);
    if (item.regionId !== undefined && (typeof item.regionId !== 'string' || !/^[A-Z]{2}-[A-Z0-9]{2,3}$/.test(item.regionId))) errors.push(`${path}.regionId must be an ISO-style region identifier such as RU-OMS.`);
    if (item.regionId !== undefined && item.regionIds !== undefined) errors.push(`${path} cannot define both regionId and regionIds.`);
    if (item.regionIds !== undefined) {
      if (!Array.isArray(item.regionIds) || item.regionIds.length < 1 || item.regionIds.length > 4) {
        errors.push(`${path}.regionIds must contain 1 to 4 region identifiers.`);
      } else {
        item.regionIds.forEach((regionId, regionIndex) => {
          if (typeof regionId !== 'string' || !/^[A-Z]{2}-[A-Z0-9]{2,3}$/.test(regionId)) errors.push(`${path}.regionIds[${regionIndex}] must be an ISO-style region identifier.`);
        });
        if (new Set(item.regionIds).size !== item.regionIds.length) errors.push(`${path}.regionIds cannot contain duplicates.`);
      }
    }
    if (item.calloutSide !== undefined && !CALLOUT_SIDES.has(item.calloutSide)) errors.push(`${path}.calloutSide is not supported.`);
    if (item.calloutOrder !== undefined && (!Number.isInteger(item.calloutOrder) || item.calloutOrder < 0 || item.calloutOrder > 99)) errors.push(`${path}.calloutOrder must be an integer from 0 to 99.`);
    if (item.tone !== undefined && !TONES.has(item.tone)) errors.push(`${path}.tone is not supported.`);
    if (item.status !== undefined && !STATUSES.has(item.status)) errors.push(`${path}.status is not supported.`);
    if (item.role !== undefined && !ROLES.has(item.role)) errors.push(`${path}.role is not supported.`);
  });

  const labels = spec.data.map((item) => item?.label).filter(Boolean);
  if (new Set(labels).size !== labels.length) warnings.push('Data labels are duplicated; labels should identify distinct points.');
}

const WATERFALL_UNCERTAIN_TEXT = /\b(?:about|approximately|approximate(?:ly)?|roughly|more than|less than|at least|at most|almost|nearly|derived|inferred|implied|calculated|reconstructed)\b|[<>≈~]/i;

function validateWaterfall(spec, data, errors) {
  if (data.length < 2 || data.length > 8) errors.push('flow.waterfall requires 2 to 8 data items.');
  requireNumericValues(spec, errors);

  const startIndexes = [];
  const endIndexes = [];
  data.forEach((item, index) => {
    if (!ROLES.has(item?.role)) errors.push(`data[${index}].role is required for flow.waterfall.`);
    if (item?.role === 'start') startIndexes.push(index);
    if (item?.role === 'end') endIndexes.push(index);

    if (!item?.valueStatus) {
      errors.push(`data[${index}].valueStatus is required for flow.waterfall; use reported only for exact source values.`);
    } else if (item.valueStatus !== 'reported') {
      errors.push(`data[${index}].valueStatus must be reported for flow.waterfall; derived, bounded, approximate, or inferred values cannot form an exact bridge.`);
    }
    for (const key of ['period', 'scope']) {
      if (!item?.[key]) errors.push(`data[${index}].${key} is required for flow.waterfall so every step can be checked for compatible scope.`);
    }
  });

  if (data[0]?.role !== 'start') errors.push('flow.waterfall must begin with a start item.');
  if (startIndexes.length !== 1 || startIndexes[0] !== 0) errors.push('flow.waterfall must contain exactly one start item, and it must be first.');
  if (endIndexes.some((index) => index !== data.length - 1)) errors.push('flow.waterfall end items must be last.');
  if (!['end', 'subtotal'].includes(data[data.length - 1]?.role)) errors.push('flow.waterfall must end with an end or subtotal item.');
  if (!data.some((item) => item?.role === 'change')) errors.push('flow.waterfall requires at least one change item; use a comparison for start and end values without a bridge.');

  const firstPeriod = data[0]?.period;
  const firstScope = data[0]?.scope;
  data.forEach((item, index) => {
    if (item?.period && firstPeriod && item.period !== firstPeriod) {
      errors.push(`data[${index}].period must match data[0].period for flow.waterfall; a bridge cannot mix reporting periods.`);
    }
    if (item?.scope && firstScope && item.scope !== firstScope) {
      errors.push(`data[${index}].scope must match data[0].scope for flow.waterfall; a bridge cannot mix unlike measures.`);
    }
  });

  const textFields = [
    ['title', spec.title],
    ['subtitle', spec.subtitle],
    ['note', spec.note],
    ['metadata.keyFinding', spec.metadata?.keyFinding]
  ];
  data.forEach((item, index) => {
    textFields.push(
      [`data[${index}].label`, item?.label],
      [`data[${index}].displayValue`, item?.displayValue],
      [`data[${index}].annotation`, item?.annotation]
    );
  });
  textFields.forEach(([field, value]) => {
    if (typeof value === 'string' && WATERFALL_UNCERTAIN_TEXT.test(value)) {
      errors.push(`${field} uses approximate, bounded, or derived language; flow.waterfall requires exact reported bridge values.`);
    }
  });

  const decimals = Number.isInteger(spec.measure?.decimals) ? spec.measure.decimals : 0;
  const tolerance = Math.max(1e-9, 0.5 * (10 ** -decimals));
  let current = null;
  data.forEach((item, index) => {
    if (typeof item?.value !== 'number' || !Number.isFinite(item.value)) return;
    if (item.role === 'start') {
      current = item.value;
      return;
    }
    if (current === null) return;
    if (item.role === 'change') {
      current += item.value;
      return;
    }
    if (item.role === 'subtotal' || item.role === 'end') {
      if (Math.abs(item.value - current) > tolerance) {
        const kind = item.role === 'end' ? 'ending value' : 'subtotal';
        errors.push(`data[${index}].value must reconcile with the running flow; expected ${current} for the ${kind}, received ${item.value}.`);
      }
      current = item.value;
    }
  });

}

function requireNumericValues(spec, errors) {
  const data = Array.isArray(spec.data) ? spec.data : [];
  data.forEach((item, index) => {
    if (!isObject(item)) return;
    if (typeof item?.value !== 'number' || !Number.isFinite(item.value)) {
      errors.push(`data[${index}].value is required for ${spec.recipe}.`);
    }
  });
}

const GENERIC_QUANTITY = /^(?:reported\s+)?(?:change|value|amount|metric|rate|level|index|percent(?:age)?|comparison|result|outcome)(?:\s+change)?$/i;

function validateSharedScaleSemantics(spec, errors) {
  if (!SHARED_SCALE_RECIPES.has(spec.recipe)) return;
  const quantity = typeof spec.measure?.quantity === 'string' ? spec.measure.quantity.trim() : '';
  if (!quantity) {
    errors.push(`measure.quantity is required for ${spec.recipe}; name the single real-world quantity encoded by the shared scale.`);
  } else if (GENERIC_QUANTITY.test(quantity) || /^(?:reported|h\d|q\d|annual|weekly|monthly)\s+change$/i.test(quantity)) {
    errors.push('measure.quantity is too generic. Name the measured quantity, such as "net income", "seller registrations", or "share of grain exports".');
  }

  const data = Array.isArray(spec.data) ? spec.data : [];
  const scopes = [];
  data.forEach((item, index) => {
    if (typeof item?.quantity !== 'string' || !item.quantity.trim()) {
      errors.push(`data[${index}].quantity is required for ${spec.recipe}.`);
    } else if (quantity && normalizeEditorialValue(item.quantity) !== normalizeEditorialValue(quantity)) {
      errors.push(`data[${index}].quantity must match measure.quantity exactly. Split unlike measures into separate charts or choose one primary quantity and keep the rest as inline context.`);
    }
    if (typeof item?.scope !== 'string' || !item.scope.trim()) {
      errors.push(`data[${index}].scope is required for ${spec.recipe}; use the exact population, denominator, or measured system, not the chart topic.`);
    } else {
      scopes.push(normalizeEditorialValue(item.scope));
    }
    if (typeof item?.period !== 'string' || !item.period.trim()) {
      errors.push(`data[${index}].period is required for ${spec.recipe}.`);
    }
  });
  if (new Set(scopes).size > 1) {
    errors.push(`${spec.recipe} cannot place unlike scopes on one scale. Split unlike scopes into separate charts or keep secondary evidence in the unboxed supportingFacts context rail.`);
  }

  if (!['comparison.change', 'comparison.benchmark-gap', 'trend.line'].includes(spec.recipe)) {
    const periods = data
      .map((item) => typeof item?.period === 'string' ? normalizeEditorialValue(item.period) : '')
      .filter(Boolean);
    if (new Set(periods).size > 1) {
      errors.push(`${spec.recipe} requires one shared period. Use comparison.change for before-and-after values or split mixed-period evidence into separate charts.`);
    }
  }
}

function validateRecipe(spec, errors, warnings) {
  const count = Array.isArray(spec.data) ? spec.data.length : 0;
  const data = Array.isArray(spec.data) ? spec.data : [];
  switch (spec.recipe) {
    case 'comparison.change':
      if (count !== 2) errors.push('comparison.change requires exactly 2 data items.');
      requireNumericValues(spec, errors);
      if (!spec.emphasis) warnings.push('comparison.change is clearer with an emphasis object.');
      break;
    case 'comparison.scenarios':
      if (count < 2 || count > 5) errors.push('comparison.scenarios requires 2 to 5 data items.');
      requireNumericValues(spec, errors);
      break;
    case 'comparison.diverging':
      if (count < 2 || count > 10) errors.push('comparison.diverging requires 2 to 10 data items.');
      requireNumericValues(spec, errors);
      break;
    case 'comparison.range':
      if (count < 2 || count > 8) errors.push('comparison.range requires 2 to 8 data items.');
      data.forEach((item, index) => {
        const hasValue = typeof item?.value === 'number' && Number.isFinite(item.value);
        const hasRange = typeof item?.low === 'number' && Number.isFinite(item.low) && typeof item?.high === 'number' && Number.isFinite(item.high);
        if (!hasValue && !hasRange) errors.push(`data[${index}] requires value or both low and high for comparison.range.`);
        if (hasRange && item.low > item.high) errors.push(`data[${index}].low must not exceed high.`);
      });
      break;
    case 'comparison.benchmark-gap':
      if (count < 2 || count > 6) errors.push('comparison.benchmark-gap requires 2 to 6 data items.');
      data.forEach((item, index) => {
        if (typeof item?.value !== 'number' || !Number.isFinite(item.value)) {
          errors.push(`data[${index}].value is required for comparison.benchmark-gap.`);
        }
        if (typeof item?.benchmark !== 'number' || !Number.isFinite(item.benchmark)) {
          errors.push(`data[${index}].benchmark is required for comparison.benchmark-gap.`);
        }
        if (typeof item?.value === 'number' && item.value < 0) errors.push(`data[${index}].value cannot be negative for comparison.benchmark-gap.`);
        if (typeof item?.benchmark === 'number' && item.benchmark <= 0) errors.push(`data[${index}].benchmark must be greater than zero for comparison.benchmark-gap.`);
        if (!item?.benchmarkDisplayValue) warnings.push(`data[${index}].benchmarkDisplayValue is recommended so the benchmark amount is visible.`);
        if (!item?.gapDisplayValue) warnings.push(`data[${index}].gapDisplayValue is recommended so the discount, premium, or shortfall is visible.`);
      });
      if (spec.measure?.valueMode && spec.measure.valueMode !== 'level') {
        errors.push('comparison.benchmark-gap requires measure.valueMode level because actual and benchmark are tangible amounts.');
      }
      break;
    case 'trend.line':
      if (count < 3) errors.push('trend.line requires at least 3 data items.');
      else if (count < 5) warnings.push('trend.line is usually clearer with at least 5 data points.');
      requireNumericValues(spec, errors);
      break;
    case 'timeline.duration': {
      if (count < 2 || count > 8) errors.push('timeline.duration requires 2 to 8 data items.');
      const endpoints = [];
      data.forEach((item, index) => {
        if (!isDateString(item?.start)) errors.push(`data[${index}].start is required for timeline.duration.`);
        if (!isDateString(item?.end)) errors.push(`data[${index}].end is required for timeline.duration.`);
        if (isDateString(item?.start) && isDateString(item?.end)) {
          const start = Date.parse(`${item.start}T00:00:00Z`);
          const end = Date.parse(`${item.end}T00:00:00Z`);
          if (end < start) errors.push(`data[${index}].end must not precede start for timeline.duration.`);
          endpoints.push(start, end);
        }
        if (!item?.displayValue) warnings.push(`data[${index}].displayValue is recommended so the interval duration is explicit.`);
      });
      if (new Set(endpoints).size < 2) errors.push('timeline.duration requires at least two distinct calendar endpoints.');
      break;
    }
    case 'composition.donut': {
      if (count < 2 || count > 6) errors.push('composition.donut requires 2 to 6 data items.');
      requireNumericValues(spec, errors);
      if (data.some((item) => item?.value <= 0)) {
        errors.push('composition.donut values must all be greater than zero.');
      }
      const sum = data.reduce((total, item) => total + (typeof item?.value === 'number' ? item.value : 0), 0);
      if (spec.measure?.unit === '%' && Math.abs(sum - 100) > 0.5) warnings.push(`Donut percentages total ${sum}, not 100.`);
      break;
    }
    case 'composition.stacked': {
      if (count < 2 || count > 6) errors.push('composition.stacked requires 2 to 6 data items.');
      requireNumericValues(spec, errors);
      if (data.some((item) => typeof item?.value === 'number' && item.value <= 0)) errors.push('composition.stacked values must all be greater than zero.');
      const sum = data.reduce((total, item) => total + (typeof item?.value === 'number' ? item.value : 0), 0);
      if (spec.measure?.unit === '%' && Math.abs(sum - 100) > 0.5) warnings.push(`Stacked percentages total ${sum}, not 100.`);
      if (spec.primaryMetric) {
        errors.push('composition.stacked cannot use primaryMetric. The proportional marks and direct segment labels must carry the story; do not collapse a composition into one headline number.');
      }
      break;
    }
    case 'flow.waterfall':
      validateWaterfall(spec, data, errors);
      break;
    case 'ranking.horizontal':
      if (count < 3 || count > 12) errors.push('ranking.horizontal requires 3 to 12 data items.');
      requireNumericValues(spec, errors);
      break;
    case 'status.grid':
      if (count < 3 || count > 12) errors.push('status.grid requires 3 to 12 data items.');
      data.forEach((item, index) => {
        if (!STATUSES.has(item?.status)) errors.push(`data[${index}].status is required for status.grid.`);
        if (typeof item?.detail !== 'string' || !item.detail) errors.push(`data[${index}].detail is required for status.grid.`);
      });
      break;
    case 'story.facets':
      warnings.push('story.facets is deprecated and excluded from the production selection workflow. It renders only for backward compatibility; split mixed evidence into separate ChartSpecs or select one primary quantitative recipe.');
      if (count < 2 || count > 8) errors.push('story.facets requires 2 to 8 evidence facets.');
      data.forEach((item, index) => {
        if (typeof item?.detail !== 'string' || !item.detail) errors.push(`data[${index}].detail is required for story.facets.`);
        if (item?.displayValue === undefined && (typeof item?.value !== 'number' || !Number.isFinite(item.value))) {
          errors.push(`data[${index}] requires displayValue or value for story.facets.`);
        }
      });
      break;
    case 'map.regional': {
      if (count < 1 || count > 12) errors.push('map.regional requires 1 to 12 data items.');
      const regionSet = TochnyiMaps.getRegionSet(spec.map?.regionSet);
      const usedRegions = new Set();
      data.forEach((item, index) => {
        const regionIds = Array.isArray(item?.regionIds)
          ? item.regionIds
          : (typeof item?.regionId === 'string' ? [item.regionId] : []);
        if (!regionIds.length) errors.push(`data[${index}] requires regionId or regionIds for map.regional.`);
        if (!item?.detail && !item?.displayValue && item?.value === undefined && !item?.status) {
          warnings.push(`data[${index}] has no detail, displayValue, numeric value, or status; its callout may be uninformative.`);
        }
        regionIds.forEach((regionId) => {
          if (regionSet && !regionSet.regions[regionId]) errors.push(`data[${index}] references ${regionId}, which is not in map.regionSet ${spec.map.regionSet}.`);
          if (usedRegions.has(regionId)) warnings.push(`${regionId} is referenced by more than one map item.`);
          usedRegions.add(regionId);
        });
      });
      break;
    }
    case 'headline.metric':
      if (count !== 1) errors.push('headline.metric requires exactly 1 data item.');
      requireNumericValues(spec, errors);
      break;
    default:
      errors.push(`recipe must be one of: ${[...recipeIds, ...LEGACY_RECIPES].join(', ')}.`);
  }
}

function validateMeasure(spec, errors, warnings) {
  const measure = spec.measure;
  if (!isObject(measure)) {
    errors.push('measure must be an object when provided.');
    return;
  }
  if (!Number.isInteger(measure.decimals) || measure.decimals < 0 || measure.decimals > 4) {
    errors.push('measure.decimals must be an integer from 0 to 4.');
  }
  if (!['zero', 'auto', 'explicit'].includes(measure.baseline)) errors.push('measure.baseline is not supported.');
  if (!SCALES.has(measure.scale)) errors.push('measure.scale is not supported.');
  if (measure.baseline === 'explicit' && typeof measure.minimum !== 'number') {
    errors.push('measure.minimum is required when baseline is explicit.');
  }
  if (measure.minimum !== undefined && (typeof measure.minimum !== 'number' || !Number.isFinite(measure.minimum))) {
    errors.push('measure.minimum must be a finite number.');
  }
  if (measure.maximum !== undefined && (typeof measure.maximum !== 'number' || !Number.isFinite(measure.maximum))) {
    errors.push('measure.maximum must be a finite number.');
  }
  if (typeof measure.minimum === 'number' && typeof measure.maximum === 'number' && measure.minimum >= measure.maximum) {
    errors.push('measure.minimum must be lower than measure.maximum.');
  }
  if (measure.axisTitle !== undefined && (typeof measure.axisTitle !== 'string' || measure.axisTitle.length > 80)) {
    errors.push('measure.axisTitle must be a string of 80 characters or fewer.');
  }
  if (measure.valueMode !== undefined && !VALUE_MODES.has(measure.valueMode)) {
    errors.push('measure.valueMode is not supported.');
  }
  if (measure.levelAvailability !== undefined && !LEVEL_AVAILABILITY.has(measure.levelAvailability)) {
    errors.push('measure.levelAvailability is not supported.');
  }
  if (measure.basisAvailability !== undefined && !LEVEL_AVAILABILITY.has(measure.basisAvailability)) {
    errors.push('measure.basisAvailability is not supported.');
  }
  if (measure.basisNote !== undefined && (
    typeof measure.basisNote !== 'string' ||
    measure.basisNote.trim() === '' ||
    measure.basisNote.length > 180
  )) {
    errors.push('measure.basisNote must be a non-empty string of 180 characters or fewer.');
  }
  if (measure.normalizationNote !== undefined && (
    typeof measure.normalizationNote !== 'string' ||
    measure.normalizationNote.trim() === '' ||
    measure.normalizationNote.length > 180
  )) {
    errors.push('measure.normalizationNote must be a non-empty string of 180 characters or fewer.');
  }
  if (measure.quantity !== undefined && (typeof measure.quantity !== 'string' || measure.quantity.trim().length < 3 || measure.quantity.length > 80)) {
    errors.push('measure.quantity must be a specific string of 3 to 80 characters.');
  }
  for (const [key, max] of [['unit', 40], ['prefix', 12], ['suffix', 20]]) {
    if (measure[key] !== undefined && (typeof measure[key] !== 'string' || measure[key].length > max)) {
      errors.push(`measure.${key} must be a string of ${max} characters or fewer.`);
    }
  }
  if (!measure.unit && !measure.prefix && !measure.suffix && !['status.grid', 'story.facets', 'map.regional'].includes(spec.recipe)) {
    warnings.push('No measure unit, prefix, or suffix is defined.');
  }
  if (measure.scale === 'logarithmic') {
    const data = Array.isArray(spec.data) ? spec.data : [];
    const values = data.flatMap((item) => [item?.value, item?.low, item?.high, item?.benchmark]).filter((value) => typeof value === 'number');
    if (values.some((value) => value <= 0)) errors.push('Logarithmic scale requires all plotted values to be greater than zero.');
  }
}

function isPercentUnit(measure) {
  return /%|percent|percentage/i.test(`${measure?.unit || ''} ${measure?.suffix || ''}`);
}

function isIndexUnit(measure) {
  return /\bindex(?:ed)?\b/i.test(`${measure?.unit || ''} ${measure?.axisTitle || ''}`);
}

function isGenericIndexUnit(value) {
  return /^\s*index(?:\s+points?)?\s*$/i.test(String(value || ''));
}

function isSyntheticRelativeBaseline(item) {
  if (!item || item.value !== 0) return false;
  return /\b(?:before|baseline|pre[- ]?event|pre[- ]?attack|starting?|start)\b/i.test(
    `${item.label || ''} ${item.period || ''}`
  );
}

function containsTangibleMagnitude(value) {
  const text = String(value || '');
  const withoutPercentages = text.replace(/[≈~<>+\-−]?\s*\d[\d.,]*(?:\s*(?:k|m|mn|bn|tn))?\s*%/gi, ' ');
  return /(?:[$€£₽¥]\s*\d|\b(?:USD|RUB|EUR|GBP|JPY|CNY)\s*\d|\d[\d.,]*\s*(?:[a-zA-Z]{1,12}|m²|km²|tons?|tonnes?|barrels?|shares?|units?|people|persons?))/i.test(withoutPercentages);
}

function validateValueRepresentation(spec, errors, warnings) {
  if (['map.regional', 'story.facets'].includes(spec.recipe)) return;
  const measure = spec.measure || {};
  const percentOrIndex = isPercentUnit(measure) || isIndexUnit(measure);

  if (percentOrIndex && !measure.valueMode) {
    errors.push(
      'measure.valueMode is required for percentage or index charts. Declare whether the marks are a native rate, share, relative change, or index.'
    );
    return;
  }
  if (!measure.valueMode) return;

  if (!measure.levelAvailability) {
    errors.push(
      'measure.levelAvailability is required when measure.valueMode is declared. Record whether actual levels are reported, retrievable, unavailable, incomparable, or not applicable.'
    );
    return;
  }

  if (measure.valueMode === 'relative-change') {
    if (['reported', 'retrievable'].includes(measure.levelAvailability)) {
      errors.push(
        `measure.valueMode relative-change cannot be primary when actual levels are ${measure.levelAvailability}. ` +
        'Plot the actual values and move the relative or indexed change into emphasis, annotation, or supporting context.'
      );
    }
    if (['unavailable', 'incomparable'].includes(measure.levelAvailability) && !measure.normalizationNote) {
      errors.push(
        `measure.normalizationNote is required when relative-change is used because actual levels are ${measure.levelAvailability}.`
      );
    }
    if (measure.levelAvailability === 'not-applicable') {
      errors.push('measure.levelAvailability cannot be not-applicable for relative-change; an underlying level exists conceptually.');
    }
    const syntheticBaselineIndex = (spec.data || []).findIndex(isSyntheticRelativeBaseline);
    if (syntheticBaselineIndex !== -1) {
      errors.push(
        `data[${syntheticBaselineIndex}] is a synthetic 0% baseline. Plot only reported relative observations, retrieve the tangible levels, or omit the story.`
      );
    }
  }

  if (measure.valueMode === 'index') {
    if (['unavailable', 'incomparable'].includes(measure.levelAvailability)) {
      errors.push(
        'measure.valueMode index cannot be used as a synthetic fallback when tangible levels are unavailable or incomparable. ' +
        'Use reported relative observations directly, retrieve tangible values, or omit the story.'
      );
    }
    if (measure.levelAvailability === 'not-applicable') {
      errors.push('measure.levelAvailability cannot be not-applicable for a published index level.');
    }
    if (isGenericIndexUnit(measure.unit) || isGenericIndexUnit(measure.axisTitle)) {
      errors.push(
        'Generic viewer-facing labels such as "index" or "index points" are not allowed. Name the published measure and use a reader-facing unit such as points.'
      );
    }
    (spec.data || []).forEach((item, index) => {
      if (/\bindex(?:\s+points?)?\b/i.test(String(item?.displayValue || ''))) {
        errors.push(
          `data[${index}].displayValue must not use generic "index" wording. Show the value in points and name the specific measure in the title, subtitle, or axis.`
        );
      }
    });
    if (/\bindex(?:\s+points?)?\b/i.test(String(spec.emphasis?.displayValue || ''))) {
      errors.push('emphasis.displayValue must not use generic "index" wording.');
    }
  }

  if (measure.valueMode === 'level' && ['unavailable', 'incomparable', 'not-applicable'].includes(measure.levelAvailability)) {
    errors.push('measure.valueMode level requires actual levels to be reported or retrievable.');
  }

  if (['rate', 'share'].includes(measure.valueMode) && !['composition.donut', 'composition.stacked'].includes(spec.recipe)) {
    if (!measure.basisAvailability) {
      errors.push(
        `measure.basisAvailability is required for ${measure.valueMode} charts. Record whether the tangible basis is reported, retrievable, unavailable, incomparable, or not applicable.`
      );
    } else if (['reported', 'retrievable'].includes(measure.basisAvailability) && !spec.basis) {
      errors.push(
        `basis is required because the ${measure.valueMode} numerator, denominator, or population is ${measure.basisAvailability}. ` +
        'Expose the tangible amounts rather than leaving the percentage unanchored.'
      );
    } else if (['unavailable', 'incomparable', 'not-applicable'].includes(measure.basisAvailability) && !measure.basisNote) {
      errors.push(`measure.basisNote is required when the ${measure.valueMode} basis is ${measure.basisAvailability}.`);
    }
  }

  if (measure.valueMode === 'share' && ['reported', 'retrievable'].includes(measure.levelAvailability) && !spec.basis) {
    (spec.data || []).forEach((item, index) => {
      if (!containsTangibleMagnitude(item?.displayValue)) {
        errors.push(
          `data[${index}].displayValue must include the tangible absolute amount as well as the share because actual component levels are ${measure.levelAvailability}.`
        );
      }
    });
  }

  if (measure.valueMode !== 'relative-change' && measure.normalizationNote) {
    warnings.push('measure.normalizationNote is only needed for relative-change representations.');
  }
  if (!['rate', 'share'].includes(measure.valueMode) && (measure.basisAvailability || measure.basisNote || spec.basis)) {
    warnings.push('basis fields are intended for rate or share anchoring; use supporting facts for unrelated context.');
  }
}

function validateBasis(spec, errors, warnings) {
  if (spec.basis === undefined) return;
  if (!isObject(spec.basis)) {
    errors.push('basis must be an object.');
    return;
  }
  if (!BASIS_TYPES.has(spec.basis.type)) errors.push('basis.type is not supported.');
  if (spec.basis.label !== undefined) pushLengthIssue(spec.basis.label, 'basis.label', 80, errors, warnings, 55);
  if (spec.basis.formula !== undefined) pushLengthIssue(spec.basis.formula, 'basis.formula', 140, errors, warnings, 100);
  if (!Array.isArray(spec.basis.items) || spec.basis.items.length < 2 || spec.basis.items.length > 4) {
    errors.push('basis.items must contain 2 to 4 tangible anchor items.');
    return;
  }
  const roles = new Set();
  spec.basis.items.forEach((item, index) => {
    const path = `basis.items[${index}]`;
    if (!isObject(item)) {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (!BASIS_ROLES.has(item.role)) errors.push(`${path}.role is not supported.`);
    else roles.add(item.role);
    pushLengthIssue(item.label, `${path}.label`, 80, errors, warnings, 55);
    pushLengthIssue(item.displayValue, `${path}.displayValue`, 60, errors, warnings, 42);
    for (const key of ['value', 'low', 'high']) {
      if (item[key] !== undefined && (typeof item[key] !== 'number' || !Number.isFinite(item[key]))) {
        errors.push(`${path}.${key} must be a finite number.`);
      }
    }
    const hasValue = typeof item.value === 'number' && Number.isFinite(item.value);
    const hasRange = typeof item.low === 'number' && Number.isFinite(item.low) && typeof item.high === 'number' && Number.isFinite(item.high);
    if (!hasValue && !hasRange) errors.push(`${path} requires value or both low and high.`);
    if (hasRange && item.low > item.high) errors.push(`${path}.low must not exceed high.`);
    if (item.unit !== undefined && (typeof item.unit !== 'string' || item.unit.length > 40)) errors.push(`${path}.unit must be a string of 40 characters or fewer.`);
    if (item.valueStatus !== undefined && !VALUE_STATUSES.has(item.valueStatus)) errors.push(`${path}.valueStatus is not supported.`);
    if (item.tone !== undefined && !TONES.has(item.tone)) errors.push(`${path}.tone is not supported.`);
  });
  if (spec.basis.type === 'ratio' && !(roles.has('numerator') && roles.has('denominator'))) {
    errors.push('basis.type ratio requires numerator and denominator items.');
  }
  if (spec.basis.type === 'population' && !(roles.has('population') && roles.has('affected'))) {
    errors.push('basis.type population requires population and affected items.');
  }
}

function validateVisual(spec, errors) {
  if (spec.visual === undefined) return;
  if (!isObject(spec.visual)) {
    errors.push('visual must be an object.');
    return;
  }
  if (!VISUAL_TYPES.has(spec.visual.type)) errors.push('visual.type is not supported.');
  if (spec.visual.icon !== undefined && !ICONS.has(spec.visual.icon)) errors.push('visual.icon is not supported.');
  for (const key of ['total', 'filled', 'columns']) {
    if (spec.visual[key] !== undefined && !Number.isInteger(spec.visual[key])) errors.push(`visual.${key} must be an integer.`);
  }
  if (spec.visual.total !== undefined && (spec.visual.total < 2 || spec.visual.total > 100)) errors.push('visual.total must be from 2 to 100.');
  if (spec.visual.filled !== undefined && (spec.visual.filled < 0 || spec.visual.filled > 100)) errors.push('visual.filled must be from 0 to 100.');
  if (spec.visual.columns !== undefined && (spec.visual.columns < 2 || spec.visual.columns > 20)) errors.push('visual.columns must be from 2 to 20.');
  if (spec.visual.type === 'pictogram') {
    if (spec.recipe !== 'headline.metric') errors.push('visual.type pictogram is only supported by headline.metric.');
    if (!spec.visual.icon) errors.push('visual.icon is required for a pictogram.');
    if (!spec.visual.total) errors.push('visual.total is required for a pictogram.');
    if (spec.visual.filled !== undefined && spec.visual.total !== undefined && spec.visual.filled > spec.visual.total) {
      errors.push('visual.filled cannot exceed visual.total.');
    }
  }
}

function validateReferences(spec, errors, warnings) {
  if (!Array.isArray(spec.references)) {
    errors.push('references must be an array when provided.');
    return;
  }
  if (spec.references.length > 4) errors.push('references cannot contain more than 4 items.');
  spec.references.forEach((reference, index) => {
    if (!isObject(reference)) {
      errors.push(`references[${index}] must be an object.`);
      return;
    }
    if (typeof reference.value !== 'number' || !Number.isFinite(reference.value)) errors.push(`references[${index}].value must be a finite number.`);
    pushLengthIssue(reference.label, `references[${index}].label`, 80, errors, warnings, 55);
    if (reference.tone !== undefined && !TONES.has(reference.tone)) errors.push(`references[${index}].tone is not supported.`);
    if (reference.lineStyle !== undefined && !['line', 'dashed'].includes(reference.lineStyle)) errors.push(`references[${index}].lineStyle is not supported.`);
  });
}

function validateEmphasis(spec, errors) {
  if (spec.emphasis === undefined) return;
  if (!isObject(spec.emphasis)) {
    errors.push('emphasis must be an object.');
    return;
  }
  if (!DIRECTIONS.has(spec.emphasis.direction)) errors.push('emphasis.direction must be up, down, or neutral.');
  pushLengthIssue(spec.emphasis.label, 'emphasis.label', 80, errors, [], 80);
  if (spec.emphasis.value !== undefined && (typeof spec.emphasis.value !== 'number' || !Number.isFinite(spec.emphasis.value))) {
    errors.push('emphasis.value must be a finite number.');
  }
  if (spec.emphasis.displayValue !== undefined && (typeof spec.emphasis.displayValue !== 'string' || spec.emphasis.displayValue.length > 40)) {
    errors.push('emphasis.displayValue must be a string of 40 characters or fewer.');
  }
  if (spec.emphasis.position && !['between', 'corner', 'left'].includes(spec.emphasis.position)) {
    errors.push('emphasis.position is not supported.');
  }
}

function validateSupportingFacts(spec, errors, warnings) {
  if (!Array.isArray(spec.supportingFacts)) {
    errors.push('supportingFacts must be an array when provided.');
    return;
  }
  if (spec.supportingFacts.length > 4) errors.push('supportingFacts cannot contain more than 4 items.');
  spec.supportingFacts.forEach((fact, index) => {
    if (!isObject(fact)) {
      errors.push(`supportingFacts[${index}] must be an object.`);
      return;
    }
    pushLengthIssue(fact.value, `supportingFacts[${index}].value`, 60, errors, warnings, 35);
    pushLengthIssue(fact.label, `supportingFacts[${index}].label`, 180, errors, warnings, 115);
    if (fact.tone && !TONES.has(fact.tone)) errors.push(`supportingFacts[${index}].tone is not supported.`);
    if (fact.role && !FACT_ROLES.has(fact.role)) errors.push(`supportingFacts[${index}].role is not supported.`);
  });
}

const RISK_TEXT = /\b(?:risk|at risk|likely|likelihood|probability|expected\s+(?:exit|loss|failure|closure|default)|forecast\s+(?:exit|loss|failure|closure|default))\b/i;

function validateRiskContext(spec, errors) {
  const text = `${spec.title || ''} ${spec.subtitle || ''} ${spec.measure?.quantity || ''}`;
  const isRisk = spec.narrative?.emphasis === 'risk' || RISK_TEXT.test(text);
  if (!isRisk) return;
  if (spec.narrative?.emphasis !== 'risk') {
    errors.push('Risk and exit-outlook stories must use narrative.emphasis risk so the evidence requirements are explicit.');
  }
  const facts = Array.isArray(spec.supportingFacts) ? spec.supportingFacts : [];
  const hasPopulationBasis = spec.basis?.type === 'population';
  const hasDenominatorFact = facts.some((fact) => fact?.role === 'denominator');
  const hasMechanismOrConsequence = facts.some((fact) => ['mechanism', 'consequence'].includes(fact?.role)) ||
    (spec.data || []).some((item) => typeof item?.annotation === 'string' && item.annotation.trim());
  if (!hasPopulationBasis && !hasDenominatorFact) {
    errors.push('Risk stories require a population basis or a supporting fact with role denominator so the exposed share is anchored to a tangible cohort.');
  }
  if (!hasMechanismOrConsequence) {
    errors.push('Risk stories require at least one mechanism or consequence in supportingFacts.role or a point annotation; a bare probability range is too thin.');
  }
}

function validatePrimaryMetric(spec, errors, warnings) {
  if (spec.primaryMetric === undefined) return;
  if (!isObject(spec.primaryMetric)) {
    errors.push('primaryMetric must be an object.');
    return;
  }
  pushLengthIssue(spec.primaryMetric.value, 'primaryMetric.value', 40, errors, warnings, 28);
  pushLengthIssue(spec.primaryMetric.label, 'primaryMetric.label', 80, errors, warnings, 55);
}

function validateNarrative(spec, errors) {
  if (!FRAMES.has(spec.narrative.frame)) errors.push('narrative.frame is not supported.');
  if (!DENSITIES.has(spec.narrative.density)) errors.push('narrative.density is not supported.');
  if (!NARRATIVE_EMPHASIS.has(spec.narrative.emphasis)) errors.push('narrative.emphasis is not supported.');
}

function validateOptions(spec, errors) {
  if (!HEIGHTS.has(spec.options.height)) errors.push('options.height is not supported.');
  if (!SORTS.has(spec.options.sort)) errors.push('options.sort is not supported.');
  if (!LABEL_MODES.has(spec.options.labelMode)) errors.push('options.labelMode is not supported.');
  for (const key of ['showLegend', 'showLabels', 'animate']) {
    if (typeof spec.options[key] !== 'boolean') errors.push(`options.${key} must be a boolean.`);
  }
}

function validateMap(spec, errors) {
  if (spec.recipe !== 'map.regional' && spec.map === undefined) return;
  if (spec.recipe !== 'map.regional') {
    errors.push('map is only supported by map.regional.');
    return;
  }
  if (!isObject(spec.map)) {
    errors.push('map must be an object for map.regional.');
    return;
  }
  if (!TochnyiMaps.getRegionSet(spec.map.regionSet)) errors.push(`map.regionSet must be one of: ${TochnyiMaps.regionSetIds.join(', ')}.`);
  if (!MAP_CALLOUTS.has(spec.map.callouts)) errors.push('map.callouts is not supported.');
  if (!MAP_CALLOUT_DISTRIBUTIONS.has(spec.map.calloutDistribution)) errors.push('map.calloutDistribution is not supported.');
  if (spec.map.summaryPosition !== 'none') errors.push('map.summaryPosition is renderer-owned and must be none; regional callout cards carry the evidence without a competing summary card.');
  if (spec.map.summaryDisplay !== 'hide') errors.push('map.summaryDisplay is renderer-owned and must be hide.');
  if (!MAP_ANCHOR_STYLES.has(spec.map.anchorStyle)) errors.push('map.anchorStyle is not supported.');
  if (!MAP_LEADER_ROUTING.has(spec.map.leaderRouting)) errors.push('map.leaderRouting is not supported.');
  if (
    spec.map.viewport !== 'all' ||
    spec.map.viewportAlignment !== 'context' ||
    spec.map.contextFit !== 'all' ||
    spec.map.landmass !== 'continental'
  ) {
    errors.push('map.regional uses the renderer-owned continental national context; detached regions and island fragments are excluded by policy.');
  }
  if (!Array.isArray(spec.map.excludeRegions) || spec.map.excludeRegions.length !== 0) {
    errors.push('map.regional cannot exclude administrative regions from the national outline.');
  }
  const regionSet = TochnyiMaps.getRegionSet(spec.map.regionSet);
  const nonContinental = new Set(regionSet?.nonContinentalRegionIds || []);
  (spec.data || []).forEach((item, index) => {
    const regionIds = Array.isArray(item?.regionIds) ? item.regionIds : item?.regionId ? [item.regionId] : [];
    regionIds.forEach((regionId) => {
      if (nonContinental.has(regionId)) {
        errors.push(`data[${index}] references ${regionId}, which is outside the supported continental regional map. Use a non-map story format for detached-region evidence.`);
      }
    });
  });
}

function validateMetadata(spec, errors, warnings) {
  if (spec.metadata === undefined) return;
  if (!isObject(spec.metadata)) {
    errors.push('metadata must be an object.');
    return;
  }
  if (spec.metadata.slug !== undefined) {
    if (typeof spec.metadata.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spec.metadata.slug)) {
      errors.push('metadata.slug must contain lowercase letters, numbers, and single hyphens only.');
    }
  }
  for (const [key, max] of [['topic', 100], ['country', 80], ['dataPeriod', 80], ['keyFinding', 240]]) {
    if (spec.metadata[key] !== undefined) pushLengthIssue(spec.metadata[key], `metadata.${key}`, max, errors, warnings, max);
  }
}

function validateEditorialEconomy(spec, errors, warnings) {
  if (/(input[.]txt|weekly source text|source text)/i.test(spec.source?.name || '')) {
    warnings.push('source.name looks like an internal working reference; use the underlying publication or dataset when available.');
  }

  const data = Array.isArray(spec.data) ? spec.data : [];
  const hasIntervalFields = data.some((item) => item?.start !== undefined || item?.end !== undefined);
  if (hasIntervalFields && spec.recipe !== 'timeline.duration') {
    errors.push('Dated start/end intervals require timeline.duration so calendar position, overlap, and elapsed time remain visible.');
  }
  const hasBenchmarkGapFields = data.some((item) =>
    item?.benchmark !== undefined || item?.benchmarkDisplayValue !== undefined || item?.gapDisplayValue !== undefined
  );
  if (hasBenchmarkGapFields && !['comparison.benchmark-gap', 'comparison.range'].includes(spec.recipe)) {
    errors.push('Benchmark-relative data require comparison.benchmark-gap, or comparison.range when the benchmark is only a threshold.');
  }
  const benchmarkStoryText = `${spec.title || ''} ${spec.subtitle || ''} ${spec.measure?.quantity || ''}`;
  if (/\b(?:discount|premium|shortfall|overage|gap to benchmark|below benchmark|above benchmark)\b/i.test(benchmarkStoryText) &&
      !['comparison.benchmark-gap', 'comparison.range'].includes(spec.recipe)) {
    warnings.push('This appears to be a benchmark-gap story. Research the benchmark total and actual amount, then prefer comparison.benchmark-gap when both are available.');
  }
  data.forEach((item, index) => {
    if (!isObject(item)) return;
    if (/[0-9]+(?:[.][0-9]+)?m[ 	]+m(?:2|²)/i.test(item.displayValue || '')) {
      warnings.push(`data[${index}].displayValue uses an ambiguous repeated unit abbreviation; prefer a fully written unit.`);
    }
  });

  if (spec.recipe !== 'composition.stacked' || data.length < 2) return;
  const total = data.reduce((sum, item) => sum + (typeof item?.value === 'number' ? item.value : 0), 0);
  if (!(total > 0)) return;

  const repeated = new Set();
  data.forEach((item) => {
    repeated.add(normalizeEditorialValue(item?.displayValue));
    repeated.add(normalizeEditorialValue(percentageText(item?.value / total * 100)));
  });
  const duplicateFacts = spec.supportingFacts.filter((fact) => repeated.has(normalizeEditorialValue(fact.value)));
  if (duplicateFacts.length) {
    errors.push('Supporting facts repeat values already encoded in the stacked composition. Segment values and shares must be labeled on the visual itself; supporting facts may only add a different cause, consequence, or unit.');
  }

  const allAnnotated = data.every((item) => typeof item?.annotation === 'string' && item.annotation.trim());
  if (data.length === 2 && spec.options.showLabels && spec.options.showLegend && allAnnotated && spec.supportingFacts.length >= 2) {
    warnings.push('This two-part composition repeats the same categories across segment labels, legend, annotations, and supporting facts. The renderer will collapse redundant layers.');
  }
}

function validateInformationDensity(spec, warnings) {
  const data = Array.isArray(spec.data) ? spec.data : [];
  const annotations = data.filter((item) => typeof item?.annotation === 'string' && item.annotation.trim()).length;
  const facts = Array.isArray(spec.supportingFacts) ? spec.supportingFacts.length : 0;
  const references = Array.isArray(spec.references) ? spec.references.length : 0;
  const basisItems = Array.isArray(spec.basis?.items) ? spec.basis.items.length : 0;
  const density = spec.narrative?.density || 'editorial';
  const budget = density === 'minimal' ? 5 : density === 'detailed' ? 10 : 8;
  const contextLoad = annotations + facts + references + Math.min(2, basisItems) +
    (spec.primaryMetric ? 1 : 0) +
    (spec.note ? 1 : 0) +
    (spec.emphasis ? 1 : 0);

  if (contextLoad > budget) {
    warnings.push(
      `Persistent context load is ${contextLoad} against a ${budget}-item ${density} budget; ` +
      'the renderer will compact secondary annotations and supporting facts.'
    );
  }
  if (annotations > 2 && facts > 2) {
    warnings.push(
      'Point annotations and supporting facts are both dense; keep one layer primary and use the other only for non-redundant context.'
    );
  }
}

function validateSpec(input) {
  const errors = [];
  const warnings = [];
  if (!isObject(input)) return { valid: false, errors: ['ChartSpec must be an object.'], warnings, normalized: null };

  validateStructure(input, errors);
  const forbidden = findForbiddenKeys(input);
  forbidden.forEach((path) => errors.push(`${path} is forbidden; ChartSpec cannot contain implementation code or styles.`));

  const spec = normalizeSpec(input);
  if (DISABLED_RECIPES.has(spec.recipe)) {
    errors.push(DISABLED_RECIPES.get(spec.recipe));
  } else if (!getRecipe(spec.recipe) && !LEGACY_RECIPES.has(spec.recipe)) {
    errors.push(`Unknown recipe: ${String(spec.recipe)}.`);
  }
  pushLengthIssue(spec.title, 'title', 100, errors, warnings, 68);
  pushLengthIssue(spec.subtitle, 'subtitle', 240, errors, warnings, 170);
  if (!isDateString(spec.date)) errors.push('date must be a real date in YYYY-MM-DD format.');

  if (isObject(spec.source)) {
    pushLengthIssue(spec.source.name, 'source.name', 180, errors, warnings, 120);
    if (spec.source.period !== undefined && (typeof spec.source.period !== 'string' || spec.source.period.length > 80)) {
      errors.push('source.period must be a string of 80 characters or fewer.');
    }
    if (spec.source.url && !isHttpUrl(spec.source.url)) errors.push('source.url must be an HTTP or HTTPS URL.');
  }

  validateData(spec, errors, warnings);
  validateRecipe(spec, errors, warnings);
  validateSharedScaleSemantics(spec, errors);
  validateMeasure(spec, errors, warnings);
  validateBasis(spec, errors, warnings);
  validateValueRepresentation(spec, errors, warnings);
  validateVisual(spec, errors);
  validateReferences(spec, errors, warnings);
  validateEmphasis(spec, errors);
  validateSupportingFacts(spec, errors, warnings);
  validateRiskContext(spec, errors);
  validatePrimaryMetric(spec, errors, warnings);
  validateNarrative(spec, errors);
  validateOptions(spec, errors);
  validateMap(spec, errors);
  validateMetadata(spec, errors, warnings);
  validateVisibleUnits(spec, errors);
  validateEditorialEconomy(spec, errors, warnings);
  validateInformationDensity(spec, warnings);

  if (spec.note !== undefined && (typeof spec.note !== 'string' || spec.note.length > 240)) {
    errors.push('note must be a string of 240 characters or fewer.');
  }

  return { valid: errors.length === 0, errors, warnings, normalized: spec };
}

module.exports = {
  validateSpec,
  normalizeSpec,
  findForbiddenKeys
};
