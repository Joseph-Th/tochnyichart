'use strict';

const TochnyiMaps = require('../lib/tochnyi-maps');
const { STANDARD_WORKFLOW, REGIONAL_WORKFLOW } = require('./workflow-contract');
const DEFAULT_REGION_SET_ID = 'russia';
const TOOL_API_ENTRYPOINT = 'node tool-api/chart.js';
const AUTHOR_SPEC_PATH = 'specs/YYYY-week-WW/[slug].json';

const TOOL_API_RESOURCES = Object.freeze({
  schema: 'schemas/chart-spec.schema.json',
  catalog: 'recipes/catalog.json',
  examples: 'specs/examples/',
  storySelection: 'docs/story-selection.md',
  batchPolicy: 'docs/batch-workflow.md',
  sourcePolicy: 'docs/source-enrichment.md'
});

const BATCH_WORKFLOW = Object.freeze({
  owner: 'llm-agent',
  input: 'input.txt',
  inputAuthority: 'Expert-authored editorial evidence. Presume claims and datapoints are correct; external silence is not contradiction.',
  purpose: 'Produce the weekly chart presentation from multiple candidate data stories.',
  steps: Object.freeze([
    'read the complete input.txt and parse distinct data stories',
    'preserve each expert-authored claim and enrich it from reputable sources',
    'merge duplicates and omit weak, irrelevant, or non-visual stories',
    'apply the visual-evidence gate and omit prose-only or one-point stories that cannot be enriched with legitimate visual structure',
    'decide the appropriate production tool and chart workflow for each accepted story',
    'author, validate, render, and diagnose one ChartSpec per accepted chart story',
    'capture one final PNG image per accepted chart',
    'assemble the final PNG images into one PowerPoint presentation',
    'save the HTML files, final PNGs, and PowerPoint deck in the weekly delivery folder'
  ]),
  deliveryFolder: 'charts/YYYY-week-WW/',
  presentation: 'charts/YYYY-week-WW/tochnyi-charts-YYYY-week-WW.pptx',
  finalArtifacts: Object.freeze([
    'rendered chart HTML files',
    'final chart PNG images used in the presentation',
    'one PowerPoint presentation'
  ]),
  temporaryReviewFolder: 'previews/',
  boundary: 'The Tool API produces individual chart artifacts. The LLM agent owns input parsing, story selection, image capture, presentation assembly, and weekly delivery.'
});

const SOURCE_ENRICHMENT_POLICY = Object.freeze({
  coreRule: 'Treat input.txt as expert-authored editorial evidence. Assume its factual claims, values, comparisons, and interpretation are correct unless a reputable source directly contradicts a material point.',
  inputRule: 'Treat each input entry as both evidence and routing information. It may be incomplete, but external silence is not a contradiction.',
  supplementationRule: 'Use reputable external sources to add attribution, comparators, denominators, historical series, mechanisms, consequences, or current status. Do not replace, downgrade, or relabel an input claim merely because a second source was not found.',
  contradictionRule: 'Only a direct material contradiction from a reputable source creates a source conflict. Preserve both positions in working notes and escalate for editorial resolution instead of silently rewriting the expert report.',
  presentationRule: 'Do not expose research-process labels such as uncorroborated, not independently confirmed, unsupported draft, or verification failed solely because external search results are silent.',
  safeDerivations: Object.freeze([
    'absolute change',
    'percentage change',
    'percentage-point change',
    'ratio',
    'share of a total',
    'coverage rate',
    'implied shortfall',
    'combined amount'
  ]),
  evidenceRoles: Object.freeze(['magnitude', 'comparison', 'mechanism', 'consequence']),
  researchOrder: Object.freeze([
    'full linked source',
    'underlying official dataset, company filing, or named report',
    'sources directly linked or cited by the article',
    'another article from the same publisher about the same event',
    'broader high-quality external research'
  ]),
  relevanceRule: 'Additional context must concern the same entity, market, or causal event; use a compatible period and scope; fill a defined evidence role; materially clarify interpretation; and have a traceable source.',
  complexityRule: 'Do not add irrelevant facts or choose a complex recipe merely for decoration. A chart still needs a genuine visual comparison: enrich a one-point or text-only story with a source-supported comparator, denominator, benchmark, composition, or time series; otherwise omit it.',
  attributionRule: 'Use source attribution when an underlying publication or dataset is available. Omit source when it is unavailable; never substitute input.txt, internal provenance, research-process labels, or workflow commentary into presentation copy.'
});

const VISUAL_EVIDENCE_CONTRACT = Object.freeze({
  coreRule: 'Every production chart must communicate its main claim through geometry tied to data, not through a wall of prose, status cards, or one oversized number.',
  minimumMarks: 'A non-map chart requires at least two quantitative marks. A regional map may use one or more geographic marks because location is itself an encoding.',
  onePointRule: 'A lone value is routing information, not a chart. Find a source-supported prior value, target, benchmark, denominator, remainder, peer, range, or time series. If none exists, omit the story.',
  categoricalRule: 'Categorical operating states cannot use a text grid. Quantify a common dimension, use map.regional when place explains the finding, or do not chart the story.',
  compositionRule: 'A composition must lead with proportional marks and direct segment labels. It cannot collapse into a primaryMetric or use supporting facts to restate segment values.',
  supportingFactsRule: 'supportingFacts may explain cause or consequence only after the primary visual already carries the argument. They cannot substitute for marks.',
  rejectedRecipes: Object.freeze(['status.grid', 'headline.metric'])
});

const STANDARD_SELECTION_RULES = Object.freeze([
  Object.freeze({ when: 'Two values showing change in the same named quantity for the same scope', use: 'comparison.change', example: 'specs/examples/ai95-price-spike.json' }),
  Object.freeze({ when: 'Actual, expected, prior, target, or alternatives for the same named quantity, scope, and period', use: 'comparison.scenarios', example: 'specs/examples/central-bank-scenarios.json' }),
  Object.freeze({ when: 'Positive and negative values measure the same named quantity for the same scope and period', use: 'comparison.diverging', example: 'specs/examples/profit-change-contributions.json' }),
  Object.freeze({ when: 'Values include a min-max interval or threshold for the same named quantity, scope, and period', use: 'comparison.range', example: 'specs/examples/farm-diesel-range.json' }),
  Object.freeze({ when: 'Ordered time points', use: 'trend.line', example: 'specs/examples/bankruptcies-trend.json' }),
  Object.freeze({ when: 'Exact parts of one total', use: 'composition.stacked', example: 'specs/examples/moscow-warehouse-delay-2026.json' }),
  Object.freeze({ when: 'Multi-part composition where shape matters', use: 'composition.donut', example: 'specs/examples/budget-composition.json' }),
  Object.freeze({ when: 'A source-supported exact start-to-end bridge with same-period, same-scope steps', use: 'flow.waterfall', example: 'specs/examples/ozon-collateral-waterfall.json' }),
  Object.freeze({ when: 'Ranked categories with long labels', use: 'ranking.horizontal', example: 'specs/examples/regional-ranking.json' })
]);

const SHARED_SCALE_CONTRACT = Object.freeze({
  sentenceTest: 'Before selecting a shared-axis comparison, complete this sentence: Every mark encodes [measure.quantity] for [data.scope] in [data.period].',
  requiredFields: Object.freeze(['measure.quantity', 'data[].quantity', 'data[].scope', 'data[].period']),
  sameQuantityRule: 'Every data[].quantity must exactly match measure.quantity.',
  sameScopeRule: 'Every item on a shared scale must use the same population, denominator, entity system, or accounting bridge.',
  periodRule: 'Scenario, diverging, and range comparisons use one period. comparison.change may use two periods because time is the intended contrast.',
  rejectionRule: 'If the sentence test cannot be completed literally, do not use a shared axis. Select one primary quantitative story and keep secondary context inline, or split the evidence into separate charts.',
  genericLabelsRejected: Object.freeze(['reported change', 'value', 'metric', 'amount', 'result'])
});


const WATERFALL_CONTRACT = Object.freeze({
  useWhen: 'Only for one exact quantity changing through mutually exclusive, same-period, same-scope steps into a reported ending value.',
  requiredItemFields: Object.freeze(['role', 'value', 'valueStatus', 'period', 'scope']),
  valueStatus: 'Every waterfall item must be valueStatus "reported". Derived, bounded, approximate, or inferred values belong in a simpler recipe with supporting facts.',
  reconciliation: 'The renderer checks and reconciles start + every change = each subtotal and the final end, within the declared display precision.',
  rejectWhen: Object.freeze([
    'the source says more than, about, roughly, almost, or otherwise gives a bound or approximation',
    'a step belongs to a prior or different reporting period',
    'the opening value is reconstructed from incomplete charges',
    'the steps are unlike facts rather than additive components of one measure'
  ]),
  fallback: 'Use comparison.change, comparison.scenarios, comparison.range, or a separate chart when the bridge cannot be proven. Omit the story if only one unsupported value remains.'
});

const COMPOSABLE_FEATURES = Object.freeze([
  Object.freeze({ need: 'Target, average, legal limit, or benchmark', add: 'references' }),
  Object.freeze({ need: 'Explain a specific point', add: 'data[].annotation' }),
  Object.freeze({ need: 'Values span orders of magnitude', add: 'measure.scale = logarithmic' }),
  Object.freeze({ need: 'Important context uses different units but remains secondary', add: 'supportingFacts after a primary visual with at least two marks' }),
  Object.freeze({ need: 'Several mixed-unit facts jointly carry the main story', add: 'split them into separate ChartSpecs; do not use a card or facet grid' }),
  Object.freeze({ need: 'A lone percentage has a meaningful denominator', add: 'encode numerator and remainder with composition.stacked rather than a headline number' }),
  Object.freeze({ need: 'A composition is expressed as percentages', add: 'data[].displayValue with the tangible absolute amount as well' })
]);

const SHARED_AUTHORING_RULES = Object.freeze([
  'Author a ChartSpec JSON file; never author generated HTML, CSS, JavaScript, or chart geometry.',
  'Use the underlying publication or dataset as the source when available; otherwise omit source attribution.',
  'Treat input.txt as expert-authored editorial evidence and preserve its claims by default. Entries are also routing information and may be incomplete.',
  'Use external research to supplement or attribute the input, not to vote on whether it is true. External silence is not contradiction.',
  'Never label an input claim uncorroborated, unsupported, or not independently confirmed solely because a second source was not found.',
  'Escalate only direct material contradictions from reputable sources and preserve both positions instead of silently rewriting the report.',
  'Read supplied sources before selecting a recipe. Never mention the input filename or internal workflow status in presentation copy.',
  'Search beyond the primary source to fill a named material evidence gap or add useful attribution and context, and reject adjacent context that does not strengthen the central claim.',
  'Do not add irrelevant data or decorative complexity. Do require a real visual comparison: a one-point or prose-only story must be enriched with source-supported structure or omitted.',
  'Never place unlike quantities, scopes, denominators, or accounting bases on one numeric axis. Apply the shared-scale sentence test before choosing any comparison recipe.',
  'Never use status, card, bullet, or facet grids as a substitute for a chart. Quantify a common dimension, use a regional map when geography matters, split the evidence, or omit the story.',
  'Never create a chart from one numeric item. Find a comparator, denominator, benchmark, remainder, peer, range, or time series in the source; otherwise omit it.',
  'For composition charts, preserve both the share and tangible absolute amount, lead with proportional marks, and do not use primaryMetric or repeated supporting facts.',
  'Use flow.waterfall only when the strict waterfall contract is satisfied: every step is exact and reported, period and scope match, and the bridge reconciles.',
  'Keep the title, subtitle, labels, and details concise enough to survive responsive layouts.',
  'Revise the ChartSpec for data, copy, recipe, or semantic errors.',
  'If a valid ChartSpec still fails rendering or diagnostics, report an infrastructure issue. Do not inspect or modify renderer internals unless the task explicitly assigns the maintainer role.'
]);

const SHARED_STAGES = Object.freeze([
  Object.freeze({ id: 'preserve-input', action: 'Treat input.txt as expert-authored evidence and preserve its factual claims unless a reputable source directly contradicts a material point.' }),
  Object.freeze({ id: 'confirm-source', action: 'Confirm that supplied sources used for supplementation match the entity, event, period, and finding.' }),
  Object.freeze({ id: 'enrich-source', action: 'Read the full primary source and extract relevant supplemental evidence and safe derivations.' }),
  Object.freeze({ id: 'fill-evidence-gap', action: 'Research beyond supplied sources to fill a named material evidence gap or add useful attribution and context.' }),
  Object.freeze({ id: 'analyze', action: 'Choose one central finding, its evidence spine, the workflow, and the recipe.' }),
  Object.freeze({ id: 'author', action: 'Write the smallest semantic ChartSpec that expresses that story.' }),
  Object.freeze({ id: 'validate', command: `${TOOL_API_ENTRYPOINT} validate <spec.json>` }),
  Object.freeze({ id: 'render', action: 'Run the Tool API render command for the selected workflow.' }),
  Object.freeze({ id: 'review', action: 'Resolve errors before delivery. For a weekly batch, capture the final PNG into charts/YYYY-week-WW/ after diagnostics pass; previews remain optional for ad hoc review.' })
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
      'Preserve the expert input claim, then read supplied sources and fill useful evidence gaps.',
      'Apply the visual-evidence contract. Reject prose walls and one-point stories before selecting a recipe.',
      'Classify the enriched evidence with the selection rules below.',
      'Write a semantic ChartSpec using the selected recipe.',
      'Validate, render, and diagnose the chart; for a weekly batch, capture the final PNG into the weekly delivery folder.'
    ],
    authoringSurface: {
      role: 'chart-author',
      entrypoint: TOOL_API_ENTRYPOINT,
      specPath: AUTHOR_SPEC_PATH,
      resources: clone(TOOL_API_RESOURCES)
    },
    commands: {
      validate: `${TOOL_API_ENTRYPOINT} validate <spec.json>`,
      render: `${TOOL_API_ENTRYPOINT} render <spec.json> [output.html]`,
      diagnose: `${TOOL_API_ENTRYPOINT} diagnose <output.html>`,
      review: `${TOOL_API_ENTRYPOINT} review <output.html> --screenshot --output <preview.png>`
    },
    selectionRules: clone(STANDARD_SELECTION_RULES),
    authoringRules: [...SHARED_AUTHORING_RULES],
    visualEvidenceContract: clone(VISUAL_EVIDENCE_CONTRACT),
    sharedScaleContract: clone(SHARED_SCALE_CONTRACT),
    sourceEnrichment: clone(SOURCE_ENRICHMENT_POLICY),
    composableFeatures: clone(COMPOSABLE_FEATURES),
    waterfallContract: clone(WATERFALL_CONTRACT),
    regionalHandoff: {
      when: 'Administrative regions need a geographic breakdown with map callouts.',
      use: 'map.regional',
      nextCommand: `${TOOL_API_ENTRYPOINT} regional-guide ${regionSet.id}`
    },
    defaultRule: 'Choose the story structure before the chart geometry. Do not default to bars merely because values are numeric.',
    failureBoundary: 'Correct the ChartSpec when the problem is semantic. Report a renderer or diagnostic defect as an infrastructure issue; do not enter renderer/, lib/, tests/, or generated HTML during normal chart authoring.'
  };
}

function regionalWorkflowGuide(regionSetId = DEFAULT_REGION_SET_ID) {
  const regionSet = getRegionSet(regionSetId);
  return {
    workflow: REGIONAL_WORKFLOW,
    recipe: 'map.regional',
    command: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html]`,
    startHere: 'Use this path only when geography is part of the finding and each highlighted region needs a map callout.',
    steps: [
      'Preserve the expert input claim, then read supplied sources and fill useful evidence gaps.',
      `Use stable IDs from \`${TOOL_API_ENTRYPOINT} regions ${regionSet.id}\`.`,
      'Author editorial content and region IDs; leave layout and routing to the renderer.',
      'Validate the spec, then run the regional command for shell review and responsive diagnostics.',
      'For a weekly batch, use the generic review command with --screenshot to capture the final PNG into the weekly delivery folder.'
    ],
    authoringSurface: {
      role: 'chart-author',
      entrypoint: TOOL_API_ENTRYPOINT,
      specPath: AUTHOR_SPEC_PATH,
      example: 'specs/examples/russia-regional-map.json',
      resources: clone(TOOL_API_RESOURCES)
    },
    commands: {
      regions: `${TOOL_API_ENTRYPOINT} regions ${regionSet.id}`,
      validate: `${TOOL_API_ENTRYPOINT} validate <spec.json>`,
      render: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html]`,
      renderWithoutBrowser: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html] --no-diagnose`,
      screenshot: `${TOOL_API_ENTRYPOINT} review <output.html> --screenshot --output <preview.png>`
    },
    authoringRule: 'Specify editorial content and stable continental region IDs. Russian regional maps permanently omit Kaliningrad and island fragments, suppress summary cards, and reserve the wide canvas for the mainland map. Detached-region evidence must use a non-map story format.',
    requiredTopLevel: ['title', 'date', 'data', 'metadata.slug'],
    requiredDataItem: ['label', 'regionId or regionIds'],
    recommendedDataItem: ['status', 'displayValue', 'detail'],
    evidenceRule: 'Each callout should include at least one of status, displayValue, detail, or value. Status maps are clearest when they include status, displayValue, and detail.',
    sourceEnrichment: clone(SOURCE_ENRICHMENT_POLICY),
    minimalMap: { regionSet: regionSet.id },
    overrideOnlyWhenNeeded: [...REGIONAL_OVERRIDES],
    automaticByDefault: [...REGIONAL_AUTOMATIC],
    neverAuthor: [
      'coordinates or pixel positions',
      'manual card geometry or route points',
      'HTML, CSS, JavaScript, or AMCharts configuration'
    ],
    failureBoundary: 'Correct source data, copy, statuses, region IDs, or semantic fields in the ChartSpec. Report persistent planner, rendering, or diagnostic failures as infrastructure issues without inspecting implementation directories.',
    statuses: [...REGIONAL_STATUSES],
    regionSet: {
      id: regionSet.id,
      label: regionSet.label,
      detachedRegionIds: regionSet.detachedRegionIds,
      nonContinentalRegionIds: regionSet.nonContinentalRegionIds,
      regionCount: Object.keys(regionSet.regions).length
    }
  };
}

function agentWorkflowOrientation(regionSetId = DEFAULT_REGION_SET_ID) {
  const regionSet = getRegionSet(regionSetId);
  return {
    version: '1.6',
    interface: {
      type: 'tool-api',
      role: 'chart-author',
      entrypoint: TOOL_API_ENTRYPOINT,
      manifestCommand: `${TOOL_API_ENTRYPOINT} api`
    },
    startHere: 'For a weekly job, treat input.txt as expert-authored editorial evidence, preserve its claims by default, and follow the batch workflow. For each accepted chart story, choose exactly one chart workflow before writing a spec.',
    batchWorkflow: clone(BATCH_WORKFLOW),
    decision: [
      {
        if: 'The story needs a map of administrative regions with callout cards.',
        workflow: REGIONAL_WORKFLOW,
        firstCommand: `${TOOL_API_ENTRYPOINT} regional-guide ${regionSet.id}`,
        renderCommand: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html]`
      },
      {
        if: 'The story has at least two quantitative marks and is a comparison, ranking, composition, trend, or flow without a map.',
        workflow: STANDARD_WORKFLOW,
        firstCommand: `${TOOL_API_ENTRYPOINT} guide`,
        renderCommand: `${TOOL_API_ENTRYPOINT} render <spec.json> [output.html]`
      }
    ],
    sharedContract: {
      artifact: 'ChartSpec JSON',
      specPath: AUTHOR_SPEC_PATH,
      resources: clone(TOOL_API_RESOURCES),
      sourceEnrichment: clone(SOURCE_ENRICHMENT_POLICY),
      visualEvidenceContract: clone(VISUAL_EVIDENCE_CONTRACT),
      sharedScaleContract: clone(SHARED_SCALE_CONTRACT),
      waterfallContract: clone(WATERFALL_CONTRACT),
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
      guideCommand: `${TOOL_API_ENTRYPOINT} regional-guide ${regionSet.id}`,
      renderCommand: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html]`
    },
    standard: {
      workflow: STANDARD_WORKFLOW,
      guideCommand: `${TOOL_API_ENTRYPOINT} guide`,
      renderCommand: `${TOOL_API_ENTRYPOINT} render <spec.json> [output.html]`,
      diagnoseCommand: `${TOOL_API_ENTRYPOINT} diagnose <output.html>`
    },
    authoringRules: [...SHARED_AUTHORING_RULES],
    boundary: {
      publicSurface: ['input.txt', 'tool-api/', 'docs/batch-workflow.md', 'docs/agent-workflows.md', 'docs/story-selection.md', 'docs/source-enrichment.md', 'schemas/chart-spec.schema.json', 'recipes/catalog.json', 'specs/examples/', 'specs/YYYY-week-WW/', 'charts/', 'previews/'],
      implementation: ['renderer/', 'lib/', 'tests/', 'tools/'],
      rule: 'Chart authors stay on the public surface. Implementation directories are maintainer-only unless the user explicitly requests infrastructure work.'
    }
  };
}

function toolApiManifest(regionSetId = DEFAULT_REGION_SET_ID) {
  const regionSet = getRegionSet(regionSetId);
  return {
    name: 'Tochnyi Charts Tool API',
    version: '1.6',
    role: 'chart-author',
    entrypoint: TOOL_API_ENTRYPOINT,
    firstCommand: `${TOOL_API_ENTRYPOINT} orient`,
    artifact: 'ChartSpec JSON',
    specPath: AUTHOR_SPEC_PATH,
    commands: {
      orient: `${TOOL_API_ENTRYPOINT} orient [region-set]`,
      guide: `${TOOL_API_ENTRYPOINT} guide [region-set]`,
      regionalGuide: `${TOOL_API_ENTRYPOINT} regional-guide [region-set]`,
      catalog: `${TOOL_API_ENTRYPOINT} catalog`,
      regions: `${TOOL_API_ENTRYPOINT} regions [region-set]`,
      validate: `${TOOL_API_ENTRYPOINT} validate <spec.json>`,
      render: `${TOOL_API_ENTRYPOINT} render <spec.json> [output.html]`,
      regional: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html]`,
      diagnose: `${TOOL_API_ENTRYPOINT} diagnose <chart.html>`,
      review: `${TOOL_API_ENTRYPOINT} review <chart.html> [--screenshot] [--output preview.png]`
    },
    resources: clone(TOOL_API_RESOURCES),
    batchWorkflow: clone(BATCH_WORKFLOW),
    sourceEnrichment: clone(SOURCE_ENRICHMENT_POLICY),
    visualEvidenceContract: clone(VISUAL_EVIDENCE_CONTRACT),
    sharedScaleContract: clone(SHARED_SCALE_CONTRACT),
    waterfallContract: clone(WATERFALL_CONTRACT),
    regionSet: { id: regionSet.id, label: regionSet.label },
    allowedWork: [
      'parse input.txt into distinct data stories',
      'preserve expert input evidence and analyze supplemental sources',
      'select, merge, or omit stories for the weekly presentation',
      'choose a workflow and recipe',
      'author and revise ChartSpec JSON',
      'run validation, rendering, diagnostics, and review',
      'capture final PNG images and assemble the weekly PowerPoint presentation',
      'report output paths, warnings, and infrastructure defects'
    ],
    excludedWork: [
      'inspect or modify renderer/, lib/, tests/, or internal tools during normal chart production',
      'edit generated HTML or PNG artifacts',
      'author layout geometry, styling, JavaScript, or chart-library configuration'
    ],
    escalation: 'When a valid semantic ChartSpec still produces a rendering, layout, or diagnostic failure, report an infrastructure issue. Switch to maintainer work only when the user explicitly requests infrastructure changes.'
  };
}

module.exports = {
  DEFAULT_REGION_SET_ID,
  STANDARD_SELECTION_RULES,
  COMPOSABLE_FEATURES,
  SHARED_AUTHORING_RULES,
  SHARED_STAGES,
  TOOL_API_ENTRYPOINT,
  TOOL_API_RESOURCES,
  BATCH_WORKFLOW,
  SOURCE_ENRICHMENT_POLICY,
  VISUAL_EVIDENCE_CONTRACT,
  SHARED_SCALE_CONTRACT,
  WATERFALL_CONTRACT,
  toolApiManifest,
  agentWorkflowOrientation,
  standardAgentGuide,
  regionalWorkflowGuide
};
