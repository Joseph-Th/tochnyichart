'use strict';

const TochnyiMaps = require('../lib/tochnyi-maps');
const { STANDARD_WORKFLOW, REGIONAL_WORKFLOW } = require('./workflow-contract');
const DEFAULT_REGION_SET_ID = 'russia';

const STANDARD_SELECTION_RULES = Object.freeze([
  Object.freeze({ when: 'One decisive number', use: 'headline.metric' }),
  Object.freeze({ when: 'Two values showing change', use: 'comparison.change' }),
  Object.freeze({ when: 'Actual, expected, prior, target, or alternatives', use: 'comparison.scenarios' }),
  Object.freeze({ when: 'Changes need a visible zero line', use: 'comparison.diverging' }),
  Object.freeze({ when: 'Values include a min-max interval or threshold', use: 'comparison.range' }),
  Object.freeze({ when: 'Ordered time points', use: 'trend.line' }),
  Object.freeze({ when: 'Exact parts of one total', use: 'composition.stacked' }),
  Object.freeze({ when: 'Multi-part composition where shape matters', use: 'composition.donut' }),
  Object.freeze({ when: 'Start, additions or losses, and an ending value', use: 'flow.waterfall' }),
  Object.freeze({ when: 'Ranked categories with long labels', use: 'ranking.horizontal' }),
  Object.freeze({ when: 'Places or operations have categorical conditions', use: 'status.grid' }),
  Object.freeze({ when: 'Trigger, transmission, and consequence form a chain', use: 'story.sequence' })
]);

const COMPOSABLE_FEATURES = Object.freeze([
  Object.freeze({ need: 'Target, average, legal limit, or benchmark', add: 'references' }),
  Object.freeze({ need: 'Explain a specific point', add: 'data[].annotation' }),
  Object.freeze({ need: 'Values span orders of magnitude', add: 'measure.scale = logarithmic' }),
  Object.freeze({ need: 'Important context uses different units', add: 'supportingFacts instead of another axis' })
]);

const SHARED_AUTHORING_RULES = Object.freeze([
  'Author a ChartSpec JSON file; never author generated HTML, CSS, JavaScript, or chart geometry.',
  'Use the underlying publication or dataset as the source.',
  'Keep the title, subtitle, labels, and details concise enough to survive responsive layouts.',
  'After a failed check, revise the ChartSpec or shared renderer—not the generated HTML.'
]);

const SHARED_STAGES = Object.freeze([
  Object.freeze({ id: 'analyze', action: 'Identify the finding, source, date, and story structure.' }),
  Object.freeze({ id: 'author', action: 'Write the smallest semantic ChartSpec that expresses that story.' }),
  Object.freeze({ id: 'validate', command: 'node tools/chart.js validate <spec.json>' }),
  Object.freeze({ id: 'render', action: 'Use the renderer for the selected workflow.' }),
  Object.freeze({ id: 'review', action: 'Resolve errors before delivery; use a screenshot only for editorial visual review.' })
]);

const REGIONAL_STATUSES = Object.freeze([
  'stable',
  'improving',
  'strained',
  'critical',
  'blocked',
  'unknown'
]);

const REGIONAL_OVERRIDES = Object.freeze([
  'map.viewport',
  'map.contextFit',
  'map.landmass',
  'map.excludeRegions',
  'data[].calloutSide'
]);

const REGIONAL_AUTOMATIC = Object.freeze([
  'callout placement',
  'column ordering',
  'leader routing',
  'obstacle avoidance',
  'curve simplification',
  'card attachment smoothing',
  'summary visibility',
  'responsive diagnostics'
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getRegionSet(regionSetId = DEFAULT_REGION_SET_ID) {
  const regionSet = TochnyiMaps.getRegionSet(regionSetId);
  if (!regionSet) {
    throw new Error(`Unknown region set: ${regionSetId}. Available: ${TochnyiMaps.regionSetIds.join(', ')}.`);
  }
  return regionSet;
}

function standardAgentGuide(regionSetId = DEFAULT_REGION_SET_ID) {
  const regionSet = getRegionSet(regionSetId);
  return {
    workflow: STANDARD_WORKFLOW,
    startHere: 'Use this path when geography is not the primary visual structure. If the story needs a map with regional callouts, stop and use regional-guide plus regional instead.',
    steps: [
      'Classify the story with the selection rules below.',
      'Write a semantic ChartSpec using the selected recipe.',
      'Validate, render, diagnose, and optionally capture a screenshot.'
    ],
    commands: {
      validate: 'node tools/chart.js validate <spec.json>',
      render: 'node tools/chart.js render <spec.json> [output.html]',
      diagnose: 'node tools/chart.js diagnose <output.html>',
      review: 'node tools/chart.js review <output.html> --screenshot --output <preview.png>'
    },
    selectionRules: clone(STANDARD_SELECTION_RULES),
    composableFeatures: clone(COMPOSABLE_FEATURES),
    regionalHandoff: {
      when: 'Administrative regions need a geographic breakdown with map callouts.',
      use: 'map.regional',
      nextCommand: `node tools/chart.js regional-guide ${regionSet.id}`
    },
    defaultRule: 'Choose the story structure before the chart geometry. Do not default to bars merely because values are numeric.'
  };
}

function regionalWorkflowGuide(regionSetId = DEFAULT_REGION_SET_ID) {
  const regionSet = getRegionSet(regionSetId);
  return {
    workflow: REGIONAL_WORKFLOW,
    recipe: 'map.regional',
    command: 'node tools/chart.js regional <spec.json> [output.html]',
    startHere: 'Use this path only when geography is part of the finding and each highlighted region needs a map callout.',
    steps: [
      `Use stable IDs from \`node tools/chart.js regions ${regionSet.id}\`.`,
      'Author editorial content and region IDs; leave layout and routing to the renderer.',
      'Validate the spec, then run the regional command for shell review and responsive diagnostics.',
      'Use the generic review command with --screenshot only when a human needs to inspect the composition.'
    ],
    commands: {
      regions: `node tools/chart.js regions ${regionSet.id}`,
      validate: 'node tools/chart.js validate <spec.json>',
      render: 'node tools/chart.js regional <spec.json> [output.html]',
      renderWithoutBrowser: 'node tools/chart.js regional <spec.json> [output.html] --no-diagnose',
      screenshot: 'node tools/chart.js review <output.html> --screenshot --output <preview.png>'
    },
    authoringRule: 'Specify editorial content and stable region IDs. The map object normally needs only regionSet; omit automatic layout and routing fields.',
    requiredTopLevel: ['title', 'date', 'source', 'data', 'metadata.slug'],
    requiredDataItem: ['label', 'regionId or regionIds'],
    recommendedDataItem: ['status', 'displayValue', 'detail'],
    evidenceRule: 'Each callout should include at least one of status, displayValue, detail, or value. Status maps are clearest when they include status, displayValue, and detail.',
    minimalMap: { regionSet: regionSet.id },
    overrideOnlyWhenNeeded: [...REGIONAL_OVERRIDES],
    automaticByDefault: [...REGIONAL_AUTOMATIC],
    neverAuthor: [
      'coordinates or pixel positions',
      'manual card geometry or route points',
      'HTML, CSS, JavaScript, or AMCharts configuration'
    ],
    statuses: [...REGIONAL_STATUSES],
    regionSet: {
      id: regionSet.id,
      label: regionSet.label,
      detachedRegionIds: regionSet.detachedRegionIds,
      regionCount: Object.keys(regionSet.regions).length
    }
  };
}

function agentWorkflowOrientation(regionSetId = DEFAULT_REGION_SET_ID) {
  const regionSet = getRegionSet(regionSetId);
  return {
    version: '1.0',
    startHere: 'Choose exactly one workflow before writing a spec.',
    decision: [
      {
        if: 'The story needs a map of administrative regions with callout cards.',
        workflow: REGIONAL_WORKFLOW,
        firstCommand: `node tools/chart.js regional-guide ${regionSet.id}`,
        renderCommand: 'node tools/chart.js regional <spec.json> [output.html]'
      },
      {
        if: 'The story is a number, comparison, ranking, status list, composition, trend, flow, or sequence without a map.',
        workflow: STANDARD_WORKFLOW,
        firstCommand: 'node tools/chart.js guide',
        renderCommand: 'node tools/chart.js render <spec.json> [output.html]'
      }
    ],
    sharedContract: {
      artifact: 'ChartSpec JSON',
      stages: clone(SHARED_STAGES),
      authorOwns: [
        'source, date, data, calculations, story structure, copy, and recipe choice'
      ],
      rendererOwns: [
        'HTML, CSS, typography, color policy, layout, responsiveness, map projection, callout placement, and leader routing'
      ],
      finishWhen: 'Validation passes, the selected render workflow passes its shell review, and diagnostics show no error-level issues.'
    },
    regional: {
      workflow: REGIONAL_WORKFLOW,
      regionSet: {
        id: regionSet.id,
        label: regionSet.label,
        regionCount: Object.keys(regionSet.regions).length
      },
      guideCommand: `node tools/chart.js regional-guide ${regionSet.id}`,
      renderCommand: 'node tools/chart.js regional <spec.json> [output.html]'
    },
    standard: {
      workflow: STANDARD_WORKFLOW,
      guideCommand: 'node tools/chart.js guide',
      renderCommand: 'node tools/chart.js render <spec.json> [output.html]',
      diagnoseCommand: 'node tools/chart.js diagnose <output.html>'
    },
    authoringRules: [...SHARED_AUTHORING_RULES]
  };
}

module.exports = {
  DEFAULT_REGION_SET_ID,
  STANDARD_SELECTION_RULES,
  COMPOSABLE_FEATURES,
  SHARED_AUTHORING_RULES,
  SHARED_STAGES,
  agentWorkflowOrientation,
  standardAgentGuide,
  regionalWorkflowGuide
};
