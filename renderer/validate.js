'use strict';

const { getRecipe, recipeIds } = require('./catalog');
const TochnyiMaps = require('../lib/tochnyi-maps');

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
const SCALES = new Set(['linear', 'logarithmic']);
const LABEL_MODES = new Set(['auto', 'inside', 'outside']);
const FRAMES = new Set(['neutral', 'warning', 'surprise', 'collapse', 'recovery', 'divergence', 'comparison']);
const DENSITIES = new Set(['minimal', 'editorial', 'detailed']);
const NARRATIVE_EMPHASIS = new Set(['magnitude', 'direction', 'gap', 'composition', 'ranking', 'range', 'flow', 'status', 'geography']);
const CALLOUT_SIDES = new Set(['auto', 'left', 'right']);
const MAP_CALLOUTS = new Set(['auto', 'cards', 'none']);
const MAP_SUMMARY_POSITIONS = new Set(['auto', 'right', 'below', 'none']);
const MAP_SUMMARY_DISPLAYS = new Set(['auto', 'show', 'hide']);
const MAP_CALLOUT_DISTRIBUTIONS = new Set(['auto', 'geographic', 'balanced']);
const MAP_VIEWPORTS = new Set(['auto', 'all', 'data']);
const MAP_VIEWPORT_ALIGNMENTS = new Set(['auto', 'data', 'context']);
const MAP_CONTEXT_FITS = new Set(['auto', 'all', 'focus']);
const MAP_LANDMASSES = new Set(['auto', 'all', 'continental']);
const MAP_ANCHOR_STYLES = new Set(['auto', 'none', 'dot']);
const MAP_LEADER_ROUTING = new Set(['auto', 'direct', 'lanes']);

const ROOT_KEYS = new Set([
  'version', 'recipe', 'title', 'subtitle', 'date', 'source', 'data', 'references', 'measure',
  'emphasis', 'primaryMetric', 'supportingFacts', 'note', 'narrative', 'options', 'metadata', 'map'
]);
const SOURCE_KEYS = new Set(['name', 'period', 'url']);
const DATA_KEYS = new Set([
  'id', 'regionId', 'regionIds', 'calloutSide', 'calloutOrder', 'label', 'value', 'low', 'high',
  'benchmark', 'displayValue', 'detail', 'annotation', 'tone', 'status', 'role'
]);
const REFERENCE_KEYS = new Set(['value', 'label', 'tone', 'lineStyle']);
const MEASURE_KEYS = new Set(['unit', 'axisTitle', 'prefix', 'suffix', 'decimals', 'minimum', 'maximum', 'baseline', 'scale']);
const EMPHASIS_KEYS = new Set(['direction', 'value', 'displayValue', 'label', 'position']);
const METRIC_KEYS = new Set(['value', 'label']);
const FACT_KEYS = new Set(['value', 'label', 'tone']);
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
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function percentageText(value) {
  const decimals = Math.abs(value - Math.round(value)) < 0.05 ? 0 : 1;
  return `${value.toFixed(decimals)}%`;
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
    spec.map.regionSet = spec.map.regionSet || 'russia';
    spec.map.callouts = spec.map.callouts || 'auto';
    spec.map.calloutDistribution = spec.map.calloutDistribution || 'auto';
    spec.map.summaryPosition = spec.map.summaryPosition || 'auto';
    spec.map.summaryDisplay = spec.map.summaryDisplay || 'auto';
    spec.map.viewport = spec.map.viewport || 'auto';
    spec.map.viewportAlignment = spec.map.viewportAlignment || 'auto';
    spec.map.contextFit = spec.map.contextFit || 'auto';
    spec.map.landmass = spec.map.landmass || 'auto';
    spec.map.anchorStyle = spec.map.anchorStyle || 'auto';
    spec.map.leaderRouting = spec.map.leaderRouting || 'auto';
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
        ...(item.detail !== undefined ? { detail: typeof item.detail === 'string' ? item.detail.trim() : item.detail } : {}),
        ...(item.annotation !== undefined ? { annotation: typeof item.annotation === 'string' ? item.annotation.trim() : item.annotation } : {})
      }) : item)
    : spec.data;

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

  if (!isObject(input.source)) errors.push('source must be an object with a name.');
  else rejectUnknownKeys(input.source, SOURCE_KEYS, 'source', errors);

  if (Array.isArray(input.data)) {
    input.data.forEach((item, index) => rejectUnknownKeys(item, DATA_KEYS, `data[${index}]`, errors));
  }
  if (Array.isArray(input.references)) {
    input.references.forEach((reference, index) => rejectUnknownKeys(reference, REFERENCE_KEYS, `references[${index}]`, errors));
  }
  if (isObject(input.measure)) rejectUnknownKeys(input.measure, MEASURE_KEYS, 'measure', errors);
  if (isObject(input.emphasis)) rejectUnknownKeys(input.emphasis, EMPHASIS_KEYS, 'emphasis', errors);
  if (isObject(input.primaryMetric)) rejectUnknownKeys(input.primaryMetric, METRIC_KEYS, 'primaryMetric', errors);
  if (Array.isArray(input.supportingFacts)) {
    input.supportingFacts.forEach((fact, index) => rejectUnknownKeys(fact, FACT_KEYS, `supportingFacts[${index}]`, errors));
  }
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
    if (item.detail !== undefined && (typeof item.detail !== 'string' || item.detail.length > 180)) errors.push(`${path}.detail must be a string of 180 characters or fewer.`);
    if (item.annotation !== undefined && (typeof item.annotation !== 'string' || item.annotation.length > 120)) errors.push(`${path}.annotation must be a string of 120 characters or fewer.`);
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

function requireNumericValues(spec, errors) {
  spec.data.forEach((item, index) => {
    if (typeof item?.value !== 'number' || !Number.isFinite(item.value)) {
      errors.push(`data[${index}].value is required for ${spec.recipe}.`);
    }
  });
}

function validateRecipe(spec, errors, warnings) {
  const count = Array.isArray(spec.data) ? spec.data.length : 0;
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
      spec.data.forEach((item, index) => {
        const hasValue = typeof item.value === 'number' && Number.isFinite(item.value);
        const hasRange = typeof item.low === 'number' && Number.isFinite(item.low) && typeof item.high === 'number' && Number.isFinite(item.high);
        if (!hasValue && !hasRange) errors.push(`data[${index}] requires value or both low and high for comparison.range.`);
        if (hasRange && item.low > item.high) errors.push(`data[${index}].low must not exceed high.`);
      });
      break;
    case 'trend.line':
      if (count < 3) errors.push('trend.line requires at least 3 data items.');
      else if (count < 5) warnings.push('trend.line is usually clearer with at least 5 data points.');
      requireNumericValues(spec, errors);
      break;
    case 'composition.donut': {
      if (count < 2 || count > 6) errors.push('composition.donut requires 2 to 6 data items.');
      requireNumericValues(spec, errors);
      if (Array.isArray(spec.data) && spec.data.some((item) => item?.value <= 0)) {
        errors.push('composition.donut values must all be greater than zero.');
      }
      const sum = Array.isArray(spec.data)
        ? spec.data.reduce((total, item) => total + (typeof item?.value === 'number' ? item.value : 0), 0)
        : 0;
      if (spec.measure?.unit === '%' && Math.abs(sum - 100) > 0.5) warnings.push(`Donut percentages total ${sum}, not 100.`);
      break;
    }
    case 'composition.stacked': {
      if (count < 2 || count > 6) errors.push('composition.stacked requires 2 to 6 data items.');
      requireNumericValues(spec, errors);
      if (spec.data.some((item) => typeof item.value === 'number' && item.value <= 0)) errors.push('composition.stacked values must all be greater than zero.');
      const sum = spec.data.reduce((total, item) => total + (typeof item.value === 'number' ? item.value : 0), 0);
      if (spec.measure?.unit === '%' && Math.abs(sum - 100) > 0.5) warnings.push(`Stacked percentages total ${sum}, not 100.`);
      break;
    }
    case 'flow.waterfall':
      if (count < 2 || count > 8) errors.push('flow.waterfall requires 2 to 8 data items.');
      requireNumericValues(spec, errors);
      spec.data.forEach((item, index) => {
        if (!ROLES.has(item.role)) errors.push(`data[${index}].role is required for flow.waterfall.`);
      });
      if (spec.data[0]?.role !== 'start') errors.push('flow.waterfall must begin with a start item.');
      if (!['end', 'subtotal'].includes(spec.data[count - 1]?.role)) errors.push('flow.waterfall must end with an end or subtotal item.');
      if (!spec.data.some((item) => item.role === 'change')) warnings.push('flow.waterfall should contain at least one change item.');
      break;
    case 'ranking.horizontal':
      if (count < 3 || count > 12) errors.push('ranking.horizontal requires 3 to 12 data items.');
      requireNumericValues(spec, errors);
      break;
    case 'status.grid':
      if (count < 3 || count > 12) errors.push('status.grid requires 3 to 12 data items.');
      spec.data.forEach((item, index) => {
        if (!STATUSES.has(item.status)) errors.push(`data[${index}].status is required for status.grid.`);
        if (typeof item.detail !== 'string' || !item.detail) errors.push(`data[${index}].detail is required for status.grid.`);
      });
      break;
    case 'map.regional': {
      if (count < 1 || count > 12) errors.push('map.regional requires 1 to 12 data items.');
      const regionSet = TochnyiMaps.getRegionSet(spec.map?.regionSet);
      const usedRegions = new Set();
      spec.data.forEach((item, index) => {
        const regionIds = item.regionIds || (item.regionId ? [item.regionId] : []);
        if (!regionIds.length) errors.push(`data[${index}] requires regionId or regionIds for map.regional.`);
        if (!item.detail && !item.displayValue && item.value === undefined && !item.status) {
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
    case 'story.sequence':
      if (count < 3 || count > 6) errors.push('story.sequence requires 3 to 6 data items.');
      spec.data.forEach((item, index) => {
        if (typeof item.detail !== 'string' || !item.detail) errors.push(`data[${index}].detail is required for story.sequence.`);
      });
      break;
    case 'headline.metric':
      if (count !== 1) errors.push('headline.metric requires exactly 1 data item.');
      requireNumericValues(spec, errors);
      break;
    default:
      errors.push(`recipe must be one of: ${recipeIds.join(', ')}.`);
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
  for (const [key, max] of [['unit', 40], ['prefix', 12], ['suffix', 20]]) {
    if (measure[key] !== undefined && (typeof measure[key] !== 'string' || measure[key].length > max)) {
      errors.push(`measure.${key} must be a string of ${max} characters or fewer.`);
    }
  }
  if (!measure.unit && !measure.prefix && !measure.suffix && !['status.grid', 'story.sequence', 'map.regional'].includes(spec.recipe)) {
    warnings.push('No measure unit, prefix, or suffix is defined.');
  }
  if (measure.scale === 'logarithmic') {
    const values = spec.data.flatMap((item) => [item.value, item.low, item.high, item.benchmark]).filter((value) => typeof value === 'number');
    if (values.some((value) => value <= 0)) errors.push('Logarithmic scale requires all plotted values to be greater than zero.');
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
  });
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
  if (!MAP_SUMMARY_POSITIONS.has(spec.map.summaryPosition)) errors.push('map.summaryPosition is not supported.');
  if (!MAP_SUMMARY_DISPLAYS.has(spec.map.summaryDisplay)) errors.push('map.summaryDisplay is not supported.');
  if (!MAP_VIEWPORTS.has(spec.map.viewport)) errors.push('map.viewport is not supported.');
  if (!MAP_VIEWPORT_ALIGNMENTS.has(spec.map.viewportAlignment)) errors.push('map.viewportAlignment is not supported.');
  if (!MAP_CONTEXT_FITS.has(spec.map.contextFit)) errors.push('map.contextFit is not supported.');
  if (!MAP_LANDMASSES.has(spec.map.landmass)) errors.push('map.landmass is not supported.');
  if (!MAP_ANCHOR_STYLES.has(spec.map.anchorStyle)) errors.push('map.anchorStyle is not supported.');
  if (!MAP_LEADER_ROUTING.has(spec.map.leaderRouting)) errors.push('map.leaderRouting is not supported.');
  if (!Array.isArray(spec.map.excludeRegions) || spec.map.excludeRegions.length > 12) {
    errors.push('map.excludeRegions must be an array of no more than 12 region identifiers.');
    return;
  }
  const regionSet = TochnyiMaps.getRegionSet(spec.map.regionSet);
  const activeRegions = new Set((Array.isArray(spec.data) ? spec.data : []).flatMap((item) => item?.regionIds || (item?.regionId ? [item.regionId] : [])));
  const excludedRegions = new Set();
  spec.map.excludeRegions.forEach((regionId, index) => {
    if (typeof regionId !== 'string' || !/^[A-Z]{2}-[A-Z0-9]{2,3}$/.test(regionId)) {
      errors.push(`map.excludeRegions[${index}] must be an ISO-style region identifier.`);
      return;
    }
    if (regionSet && !regionSet.regions[regionId]) errors.push(`map.excludeRegions[${index}] references ${regionId}, which is not in map.regionSet ${spec.map.regionSet}.`);
    if (excludedRegions.has(regionId)) errors.push(`map.excludeRegions cannot contain duplicate region ${regionId}.`);
    if (activeRegions.has(regionId)) errors.push(`map.excludeRegions cannot hide active data region ${regionId}.`);
    excludedRegions.add(regionId);
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

function validateEditorialEconomy(spec, warnings) {
  if (/(input[.]txt|weekly source text|source text)/i.test(spec.source?.name || '')) {
    warnings.push('source.name looks like an internal working reference; use the underlying publication or dataset when available.');
  }

  spec.data.forEach((item, index) => {
    if (/[0-9]+(?:[.][0-9]+)?m[ 	]+m(?:2|²)/i.test(item.displayValue || '')) {
      warnings.push(`data[${index}].displayValue uses an ambiguous repeated unit abbreviation; prefer a fully written unit.`);
    }
  });

  if (spec.recipe !== 'composition.stacked' || spec.data.length < 2) return;
  const total = spec.data.reduce((sum, item) => sum + (typeof item.value === 'number' ? item.value : 0), 0);
  if (!(total > 0)) return;

  const repeated = new Set();
  spec.data.forEach((item) => {
    repeated.add(normalizeEditorialValue(item.displayValue));
    repeated.add(normalizeEditorialValue(percentageText(item.value / total * 100)));
  });
  const duplicateFacts = spec.supportingFacts.filter((fact) => repeated.has(normalizeEditorialValue(fact.value)));
  if (duplicateFacts.length) {
    warnings.push('Supporting facts repeat values already encoded in the stacked composition; keep only facts that add a different unit, cause, or consequence.');
  }

  const allAnnotated = spec.data.every((item) => typeof item.annotation === 'string' && item.annotation.trim());
  if (spec.data.length === 2 && spec.options.showLabels && spec.options.showLegend && allAnnotated && spec.supportingFacts.length >= 2) {
    warnings.push('This two-part composition repeats the same categories across segment labels, legend, annotations, and supporting facts. The renderer will collapse redundant layers.');
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
  if (!getRecipe(spec.recipe)) errors.push(`Unknown recipe: ${String(spec.recipe)}.`);
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
  validateMeasure(spec, errors, warnings);
  validateReferences(spec, errors, warnings);
  validateEmphasis(spec, errors);
  validateSupportingFacts(spec, errors, warnings);
  validatePrimaryMetric(spec, errors, warnings);
  validateNarrative(spec, errors);
  validateOptions(spec, errors);
  validateMap(spec, errors);
  validateMetadata(spec, errors, warnings);
  validateEditorialEconomy(spec, warnings);

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
