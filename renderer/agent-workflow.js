'use strict';

const TochnyiMaps = require('../lib/tochnyi-maps');
const { STANDARD_WORKFLOW, REGIONAL_WORKFLOW } = require('./workflow-contract');
const DEFAULT_REGION_SET_ID = 'russia';
const TOOL_API_ENTRYPOINT = 'node tool-api/chart.js';
const AUTHOR_SPEC_PATH = 'specs/runs/<run-id>/[slug].json';

const TOOL_API_RESOURCES = Object.freeze({
  schema: 'schemas/chart-spec.schema.json',
  catalog: 'recipes/catalog.json',
  examples: 'specs/examples/',
  storySelection: 'docs/story-selection.md',
  batchPolicy: 'docs/batch-workflow.md',
  sourcePolicy: 'docs/source-enrichment.md',
  sourceLedger: 'docs/source-ledger.md'
});

const BATCH_WORKFLOW = Object.freeze({
  owner: 'llm-agent',
  input: 'input.txt',
  inputAuthority: 'Expert-authored editorial evidence. Presume claims and datapoints are correct; external silence is not contradiction.',
  purpose: 'Produce a chart presentation from multiple candidate data stories.',
  steps: Object.freeze([
    'initialize .work/<run-id>/ from the exact non-empty project-root input.txt and create its hashed source ledger',
    'read the complete input.txt and inventory every distinct quantitative story with exact excerpts',
    'inventory every materially relevant same-scale observation in visualEvidenceAudit before choosing a recipe',
    'inventory orientation anchors and material formula inputs as well: actual/current values for forecasts and targets, plus mixed-unit factors that materially explain a derived outcome',
    'record selected, omitted, or merged disposition for every candidate and verify the source ledger before research',
    'preserve each inventoried expert-authored claim and enrich it from reputable sources without originating new stories',
    'merge duplicates and omit weak, irrelevant, or non-visual stories',
    'apply the visual-evidence gate and omit prose-only or one-point stories that cannot be enriched with legitimate visual structure',
    'audit actual levels and the tangible basis behind every rate or share; name the tangible target and document structured source checks before declaring either unavailable or incomparable',
    'record routingAudit for every accepted story, classifying geography as none, categorical, or explanatory and selecting standard-chart or regional-breakdown before authoring',
    'decide the appropriate production tool and chart workflow for each accepted story; explanatory geography must use regional-breakdown',
    'author one ChartSpec per accepted chart story, then use the run chart builder to validate, render, diagnose, capture, and manifest the complete selected set',
    'compare authored ChartSpecs for duplicate source, reporting context, recipe, and category or time skeleton; consolidate matches before delivery',
    'capture one final PNG image per accepted chart',
    'assemble the final PNG images into one PowerPoint presentation by following presentation-plan.json exactly, with one chart per slide and no unrequested title or divider slides',
    'verify that selected source-ledger slugs and titles exactly match the final ChartSpecs',
    'save the ChartSpecs, HTML files, final PNGs, and presentation in the retained local run folders',
    'finalize the run to remove .work/<run-id>/ and legacy previews while preserving input.txt, specs/runs/<run-id>/, and charts/<run-id>/'
  ]),
  initializeCommand: 'npm run run:init -- <run-id>',
  deliveryFolder: 'charts/<run-id>/',
  specificationFolder: 'specs/runs/<run-id>/',
  presentation: 'charts/<run-id>/tochnyi-charts-<run-id>.pptx',
  presentationPlan: 'charts/<run-id>/presentation-plan.json',
  presentationRule: 'The default deck contains exactly one slide per accepted chart in presentation-plan order. Do not add a cover, title, agenda, divider, closing, or other non-chart slide unless the user explicitly requested it.',
  finalArtifacts: Object.freeze([
    'authored ChartSpec JSON files',
    'rendered chart HTML files',
    'final chart PNG images used in the presentation',
    'presentation-plan.json with one chart entry per slide',
    'one PowerPoint presentation'
  ]),
  temporaryWorkspace: '.work/<run-id>/',
  temporaryReviewFolder: '.work/<run-id>/review/',
  sourceLedger: '.work/<run-id>/source-ledger.json',
  sourceVerificationCommand: 'npm run run:verify-source -- <run-id>',
  sourceAndSpecVerificationCommand: 'npm run run:verify-source -- <run-id> --specs',
  chartBuildCommand: 'npm run run:charts -- <run-id>',
  finalizeCommand: 'npm run run:finalize -- <run-id>',
  coldResetCommand: 'npm run run:reset',
  retentionRule: 'specs/runs/<run-id>/ and charts/<run-id>/ are retained locally. input.txt is also retained. Both production paths are ignored by Git. All research notes, downloads, helper scripts, logs, review captures, package staging, and legacy previews are transient.',
  boundary: 'The Tool API produces individual chart artifacts. The run chart builder coordinates verified ChartSpecs through HTML, responsive diagnostics, PNG capture, manifest, and QA reporting. The orchestration layer still owns input parsing, story selection, and presentation assembly.'
});

const SOURCE_ENRICHMENT_POLICY = Object.freeze({
  coreRule: 'Treat input.txt as expert-authored editorial evidence. Assume its factual claims, values, comparisons, and interpretation are correct unless a reputable source directly contradicts a material point.',
  inputRule: 'Treat each input entry as both evidence and routing information. It may be incomplete, but external silence is not a contradiction.',
  inputIdentityRule: 'Use only the exact non-empty project-root input.txt. Never substitute a sibling project file, prior batch, alternate brief, or similarly named source.',
  inventoryRule: 'Before research, inventory every distinct quantitative input story with exact excerpts and record selected, omitted, or merged disposition. Every selected story requires primary input evidence and an exact titleBasis excerpt.',
  supplementationRule: 'Use reputable external sources only after the input story is inventoried. They may add attribution, comparators, denominators, historical series, mechanisms, consequences, current status, or actual levels that directly express the same input-anchored change. They may not create the subject, central claim, or title. Changing from a percentage or index to its corresponding actual levels is a representation improvement, not a new story. Do not replace, downgrade, or relabel an input claim merely because a second source was not found.',
  titleFidelityRule: 'Every substantive title concept must be directly supported by its exact titleBasis excerpt. Analytical terms such as maximum, range, coverage, collapse, exposure, erosion, or sector-specific inflation require that structure in the input evidence.',
  contradictionRule: 'Only a direct material contradiction from a reputable source creates a source conflict. Mark the external evidence conflictStatus material, preserve both positions in working notes, and do not select or visualize the story until editorial resolution. A source conflict is never a chart comparison.',
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
  complexityRule: 'Do not add irrelevant facts or choose a complex recipe merely for decoration. A chart still needs a genuine visual comparison: enrich a one-point or text-only story with a source-supported comparator, denominator, benchmark, composition, or time series; otherwise omit it. When three or more named same-scale observations already exist, preserve all of them instead of reducing them to one aggregate or range.',
  orientationAnchorRule: 'Forecast, target, outlook, and scenario stories must search for a same-unit actual/current/latest realized observation. When one is present in the input or source, it belongs in primary geometry as a numeric reference; do not bury it in supportingFacts while plotting only forecast bands.',
  derivedOutcomeRule: 'When a headline amount or range is materially explained by two quantitative inputs in different units, such as area × price per square metre = value or capacity × utilization = output, treat those inputs as part of the visual argument. Prefer relationship.converging-signals with an explicit formula when the factors and outcome are all material. A point that merely repeats a range endpoint is not an anchor and cannot rescue a thin range chart.',
  routingRule: 'Every selected story must record routingAudit before ChartSpec authoring. Three or more named administrative regions in comparable evidence are themselves a regional distribution and must use geographyRole explanatory plus regional-breakdown, even when the prose calls the result a ranking or comparison and contains no explicit spatial cue. With two regions, spatial findings such as spread, border contrast, clustering, distribution, adjacency, or concentration also force regional-breakdown. Grouped labels count every named region. A standard ranking cannot override either decision.',
  standalonePairRule: 'Do not use comparison.scenarios for two values. Generic two-bar charts require a third independent same-scale observation. When the pair itself has a meaningful relationship, use a relationship-specific recipe such as benchmark-gap, change, or timeline; otherwise enrich with a third observation, merge, or omit.',
  representationRule: 'Before recipe selection, determine whether actual levels and any rate/share basis are reported or retrievable. Prefer tangible values for primary geometry. Percentage-only prices, workforce, exports, production, spending, and revenue must trigger a search for the underlying amounts. For multi-category price changes, comparability is evaluated within each category pair: different category price levels, grades, or delivery bases do not make a valid earlier/current pair incomparable. Workforce research must include the company filing or employee disclosure for the relevant reporting perimeter. A claim of unavailable or incomparable requires an exact tangibleTarget and at least two completed structured researchAttempts covering two source types, including a data-bearing source.',
  completedResearchRule: 'Research attempts must name the exact URL, filing, table, ticker/date range, or dataset slice actually checked and record a completed outcome. Pending language such as to be checked, will check, TBD, or generic web search is invalid evidence.',
  basisRule: 'For rates and shares, identify the numerator and denominator or the total and affected population. Shares of named public aggregates such as GDP, the economy, population, employment, exports, imports, production, or capacity must be treated as having a retrievable denominator: record basisTarget, recover the compatible public total, derive the tangible numerator, and use level geometry. A 100% reference is not an anchor. The numerator and denominator must both appear in primary geometry; a basis rail alone is not sufficient.',
  benchmarkGapRule: 'For two positive level values, first ask whether one is naturally the current/actual value and the other a prior, standard, limit, target, or other benchmark. If so, prefer one comparison.benchmark-gap row over two independent bars. value and benchmark must represent the same quantity in the same unit, and gapDisplayValue must state their arithmetic difference or percentage context. Never use a per-unit size, ratio, equivalence, or cross-unit conversion as the gap. If the relationship is multiplicative or mixed-unit, use relationship.converging-signals or supporting context instead.',
  exactCountRule: 'Do not use dot-counting or pictogram charts. A selected exact-count story with only two comparable counts must be enriched with a third comparable count, tangible denominator or population, independent benchmark, or time series. The sum of the two counts is derived from the bars and never counts as an anchor. Different-unit percentage context does not make a two-count chart analytically strong.',
  componentRule: 'When several positive reported values are additive components of one total, use composition.components: every component begins at zero and one reference reconciles the reported total. If there are only two components, that sum is redundant and the story also needs an independent same-scale benchmark/denominator; otherwise recover a third component, use a relationship-specific recipe, merge, or omit.',
  pairedChangeRule: 'Repeated category/time pairs are not scenarios. For one or two categories with earlier/current or benchmark/actual values, use comparison.benchmark-gap. For three or more categories, use comparison.dumbbell. Never flatten Category · earlier and Category · later into independent scenario bars.',
  relationshipRule: 'Use relationship.converging-signals only when two source-supported quantitative drivers or formula inputs and one different outcome measure three distinct real-world quantities. relationship.formula must state the mechanism. For directional mode, one mechanism evidence item must explicitly link the plotted outcome to at least one plotted driver; chronology or adjacent facts are not causal evidence. This includes material identities such as quantity × unit price = value as well as genuinely supported directional relationships. Repeated prices, repeated volumes, or the same measure at different dates belong in change, scenarios, dumbbell, or trend geometry. Each measure is drawn as an independent local quantitative signal; the two driver paths meet and continue with a short same-color connector toward the outcome, with no decorative hub or node. Generic Factor 1, Factor 2, and Outcome captions are not rendered. Connector width never encodes magnitude. Use identity mode only when scope and period reconcile exactly; otherwise use directional mode and disclose the mismatch in note.',
  redundancyRule: 'Every plotted mark must add information that is not already encoded by another mark. A benchmark marker already communicates the total endpoint; a segmented gap already communicates the remainder. Derived complements, zero-gap closure rows, and duplicated totals belong in direct labels or supporting context, not as additional marks.',
  durationRule: 'When duration is the comparison, use timeline.duration rather than abstract bars. Use exact start and end dates when available. When several intervals share a verified start date, use timeline.anchorDate with data[].duration and durationUnit; research the anchor date when it is material and not supplied.',
  evidenceUtilizationRule: 'Any comparable datapoint that materially defines the title must be primary geometry, not a supporting fact. Inventory all materially relevant same-scale observations in visualEvidenceAudit. When three or more exist, every one must remain a primary data item. For a rate or share whose tangible basis is unavailable or incomparable, two independent same-unit observations are already enough to trigger this preservation rule. A derived 100%-minus-share complement is not independent evidence. Do not replace named components, categories, regions, peers, or time points with one aggregate, range, total, complement, or headline. Three or more ordered observations establishing slowdown, acceleration, reversal, or persistence require a trend. Supporting facts are only for evidence that is genuinely secondary to the plotted claim.',
  normalizedOrientationRule: 'A rate or share with an unavailable or incomparable tangible basis cannot stand alone on one reported percentage plus its derived complement. Recover an independent same-unit peer, regional observation, prior/current point, benchmark, target, or other orientation from the full supplied source or underlying dataset. If a richer same-topic chart already contains that evidence, merge the thin claim into it instead of creating another slide; otherwise omit the claim.',
  coverageRule: 'When a shortage, import, reserve, or shipment story is interpreted as days of consumption, demand coverage, or share of need, place the demand denominator on the visual scale. If the input contains two or more physical-volume components, visualEvidenceAudit.coverageAudit must disposition every reported volume as a plotted component, denominator, or specifically excluded item. Keep all retained components and total need in primary geometry in one tangible unit; the denominator may be a numeric reference rather than a redundant row. Days of coverage may be secondary context, never a replacement for the decomposition.',
  baselineScaleRule: 'When the editorial point is that amounts are small relative to a baseline, preserve proportional magnitude with a linear scale. Do not use logarithmic geometry. If a monthly or annual flow denominator is at least about 8 times the largest retained component, period-normalize the same denominator to a shorter familiar interval, usually a week or day, keep every component in the original physical unit, and show the derived denominator as a visible reference. The transformation must preserve the same underlying rate and be recorded in the evidence audit or basis.',
  subtitleRule: 'Subtitle is optional. Omit it when it merely repeats the title, category labels, percentages, or displayed amounts. Use it only for a qualification, denominator, mechanism, scope distinction, or interpretation not already visible in the marks.',
  consolidationRule: 'The ledger inventories claims, not mandatory slides. After authoring, consolidate selected ChartSpecs that share the same input passage, source and reporting period, recipe, and category or time skeleton. Keep the primary measure as the chart, move a secondary measure into supportingFacts, or mark the secondary candidate merged.',
  attributionRule: 'Use source attribution when an underlying publication or dataset is available. Omit source when it is unavailable. Presentation copy must never say input.txt, input brief, the brief, source text, internal compilation, or other internal provenance/workflow language.'
});

const VISUAL_EVIDENCE_CONTRACT = Object.freeze({
  coreRule: 'Every production chart must communicate its main claim through geometry tied to data, not through a wall of prose, status cards, or one oversized number.',
  minimumMarks: 'A generic categorical/bar chart requires at least three independent quantitative observations. Two-value charts are allowed only when a relationship-specific recipe makes the relationship itself the geometry, such as benchmark-gap, change, diverging, or timeline. A regional map may use geographic marks because location is itself an encoding.',
  onePointRule: 'A lone value is routing information, not a chart. Find a source-supported prior value, target, benchmark, denominator, peer, range, or time series. One actual-plus-benchmark relationship is sufficient for a single-row comparison.benchmark-gap because the actual segment, gap segment, and benchmark marker provide multiple marks. If no valid structure exists, omit the story.',
  richDataRule: 'When visualEvidenceAudit inventories three or more materially relevant observations of one quantity and unit, every observation must remain a primary data item. A one-row aggregate, total, range, or coverage conversion is not an acceptable substitute for the richer dataset.',
  standalonePairRule: 'comparison.scenarios requires at least three independent values. Supporting facts, annotations, or a derived total do not rescue two generic bars. Use relationship-specific geometry for a defensible two-value relationship; otherwise enrich, merge, or omit.',
  exactCountRule: 'Dot-counting is disabled. Two exact count categories are too thin unless the story also supplies a tangible denominator/population or independent benchmark. Their own sum is not an anchor. Prefer three or more same-scale counts, a denominator-anchored comparison, or a time series; otherwise merge or omit the story.',
  baselineScaleRule: 'Logarithmic scale is forbidden when a benchmark or denominator is present specifically to show that the primary amounts are a small fraction of it. Use a linear axis. When a long-period flow benchmark overwhelms the primary marks, shorten only the benchmark period with a rate-preserving conversion rather than compressing the scale.',
  categoricalRule: 'Categorical operating states cannot use a text grid. Quantify a common dimension, use map.regional when place explains the finding, or do not chart the story.',
  compositionRule: 'A composition must lead with proportional marks and one label treatment per segment. Use it when the part-versus-remainder or multi-part mix itself is the finding. Before selecting composition.stacked for a hypothetical allocation, check for a source-supported policy, target, prior, or alternative share against the same tangible total; when that comparator materially improves orientation, derive the comparable amounts and use shared-total benchmark geometry instead. Do not repeat the same percentage, amount, and category both inside the bar and immediately below it. It cannot collapse into a primaryMetric or use supporting facts to restate segment values.',
  actualValueRule: 'Actual reported or retrievable levels outrank normalized percentages for primary geometry. Percentage change should explain the level movement, not replace it.',
  orientationAnchorRule: 'Forecast, target, outlook, and scenario charts must include an available same-unit actual/current/latest observation as primary geometry or a numeric reference. A realized value in supportingFacts does not count as orientation.',
  thresholdAnchorRule: 'When the finding is defined by crossing or approaching a breakeven, profitability floor, threshold, cap, ceiling, legal limit, or other numeric cutoff, inventory that value as an orientation anchor and keep it in primary geometry. Before/after values do not replace the threshold that gives them meaning.',
  precisionInheritanceRule: 'A derived display value inherits the precision and uncertainty of its inputs. Never expose calculator digits that the source does not support. If a benchmark is approximately 133,000, a derived shortfall must be rounded at roughly the same precision and retain the approximation qualifier; do not print 33,333.33.',
  smallCountRule: 'A short series of 3–4 small exact counts is not informative merely because dates let it be drawn as a line. Require an independent same-unit denominator, reviewed universe, portfolio/network total, capacity, affected sales/volume/value, or a richer quantitative series. If chronology matters more than magnitude, use event/timeline structure instead.',
  derivedOutcomeRule: 'When a reported or derived outcome is materially explained by quantitative factors in different units, the visual must either show those factors through relationship.converging-signals or replace them with a genuinely independent benchmark. Repeating a range endpoint, floor, ceiling, or implied remainder is not enrichment.',
  basisRule: 'A rate or share must declare basisAvailability. If the tangible basis is reported or retrievable, the chart must switch to level geometry and plot the tangible numerator/denominator or affected/population amounts. The normalized rate remains secondary context.',
  normalizedOrientationRule: 'If a rate or share basis is unavailable or incomparable, one independent normalized observation is still not enough for a standalone chart. A derived complement such as 100% minus the reported share is not independent evidence. Recover a same-unit peer, regional observation, prior/current point, benchmark, or target; merge into a richer same-topic chart when available, otherwise omit.',
  regionalDensityRule: 'Three or more distinct named administrative regions in comparable evidence constitute a regional distribution and require regional-breakdown even without explicit words such as spread, border, or regional pattern. Grouped labels count every named region. A standard ranking cannot bypass this rule.',
  riskRule: 'A risk range must identify the exposed population or denominator, show that total on the primary scale, and include at least one mechanism or consequence; two percentage endpoints or a hidden basis rail are insufficient.',
  unavailableProofRule: 'Absolute-change, relative-change, rate, or share evidence cannot be marked unavailable or incomparable without an exact tangibleTarget and at least two structured source checks covering two source types, including a data-bearing source.',
  visibleUnitRule: 'A magnitude-only displayValue or emphasis value must include its unit unless the title or subtitle explicitly defines that unit. Axis titles alone do not satisfy this rule.',
  labelPlacementRule: 'For column charts, auto label placement is family-coherent: keep all value labels outside when they fit, move the full bar family inside when endpoint headroom forces it and all bars can support inside labels, and mix inside/outside only when a genuine physical-fit conflict makes one treatment impossible.',
  claimGeometryRule: 'Before accepting a chart, state the headline and then point to the exact marks that prove it. If the plotted geometry does not directly establish the claimed comparison, mechanism, threshold, or outcome, the chart fails even when every individual number is correct. Relationship connectors are evidentiary claims, not decoration.',
  referenceClarityRule: 'Every visible reference line must be necessary for orientation and carry a meaningful viewer-facing label. Never suppress a reference label with punctuation or a placeholder. If a reference is not important enough to label, remove the line and use supporting context instead.',
  notationConsistencyRule: 'Within one visual family, keep percentage notation consistent. In relationship signal cards, do not mix pp/percentage-point notation with percent-rate notation; preserve the mathematical distinction in explanatory copy or choose a different representation rather than silently converting units.',
  supportingFactsRule: 'supportingFacts may explain cause or consequence only after the primary visual already carries the argument. Comparable time points, regional or peer observations, denominators, opposing signals, and other figures required to orient or understand the title cannot be parked there. In particular, do not build a one-percentage composition while leaving same-unit comparators from the same source in supportingFacts.',
  redundancyRule: 'Reject any row whose value is only the complement, remainder, total, zero-gap endpoint, or low/high endpoint already encoded by the primary geometry.',
  rejectedRecipes: Object.freeze(['status.grid', 'headline.metric', 'comparison.pictogram'])
});

const STANDARD_SELECTION_RULES = Object.freeze([
  Object.freeze({ when: 'Two positive level values where one is naturally current/actual and the other is prior, standard, limit, target, or benchmark', use: 'comparison.benchmark-gap', example: 'specs/examples/ai95-price-spike.json' }),
  Object.freeze({ when: 'Two values showing change in the same named quantity where benchmark-gap semantics do not apply, such as sign-crossing levels, zero-to-nonzero movement, or a native rate/index', use: 'comparison.change', example: 'specs/examples/net-position-crossing-zero.json' }),
  Object.freeze({ when: 'Three to five independent same-period actual, expected, target, or alternative values for the same named quantity and scope; never repeated category/time pairs and never only two generic bars.', use: 'comparison.scenarios', example: 'specs/examples/central-bank-scenarios.json' }),
  Object.freeze({ when: 'Positive and negative values measure the same named quantity for the same scope and period', use: 'comparison.diverging', example: 'specs/examples/profit-change-contributions.json' }),
  Object.freeze({ when: 'Values include a min-max interval or threshold for the same named quantity, scope, and period. One interval is allowed only when a visible independent benchmark or total supplies the scale; a reference equal to a range endpoint is redundant. If before/current values cross a story-defining threshold, keep that threshold visibly anchored on the same scale.', use: 'comparison.range', example: 'specs/examples/farm-diesel-range.json' }),
  Object.freeze({ when: 'One or more actual values sit inside benchmark totals, including one or two category-level earlier/current price pairs or two meaningful policy/target shares against the same tangible total; one segmented row is preferred when one relationship fully carries the story', use: 'comparison.benchmark-gap', example: 'specs/examples/urals-benchmark-gap.json' }),
  Object.freeze({ when: 'Three or more categories each have an earlier or benchmark value and a later or actual value', use: 'comparison.dumbbell', example: 'specs/examples/marketplace-commission-dumbbell.json' }),
  Object.freeze({ when: 'Two source-supported quantitative drivers or formula inputs and one different outcome measure three distinct quantities, with an explicit mechanism formula. This includes material mixed-unit derivations such as quantity × unit price = value; never use it for repeated prices, repeated volumes, or one measure at different dates.', use: 'relationship.converging-signals', example: 'specs/examples/converging-signals.json' }),
  Object.freeze({ when: 'Three or more ordered time points, especially when slowdown, acceleration, reversal, or persistence is the finding. Do not use trend.line for a 3–4 point sequence of tiny exact counts unless a real denominator/portfolio benchmark or richer magnitude anchor makes the series interpretable.', use: 'trend.line', example: 'specs/examples/bankruptcies-trend.json' }),
  Object.freeze({ when: 'Two or more intervals share one calendar, using exact start/end dates or one verified common anchor plus exact durations', use: 'timeline.duration', example: 'specs/examples/fuel-ban-timeline.json' }),
  Object.freeze({ when: 'Exact parts of one total when the composition itself is the finding and no more informative same-total policy, target, prior, or alternative comparator should anchor the viewer', use: 'composition.stacked', example: 'specs/examples/moscow-warehouse-delay-2026.json' }),
  Object.freeze({ when: 'Multi-part composition where shape matters', use: 'composition.donut', example: 'specs/examples/budget-composition.json' }),
  Object.freeze({ when: 'Positive additive components reconcile to one reported total and component magnitudes should be compared from zero. With only two components, require an additional independent same-scale benchmark/denominator beyond their derived sum.', use: 'composition.components', example: 'specs/examples/additive-components.json' }),
  Object.freeze({ when: 'A source-supported existing balance moves through genuine positive and/or negative same-period changes into an ending value', use: 'flow.waterfall', example: 'specs/examples/ozon-collateral-waterfall.json' }),
  Object.freeze({ when: 'Ranked categories with long labels', use: 'ranking.horizontal', example: 'specs/examples/regional-ranking.json' })
]);

const SHARED_SCALE_CONTRACT = Object.freeze({
  sentenceTest: 'Before selecting any shared-axis comparison, trend, or ranking, complete this sentence: Every mark encodes [measure.quantity] for [data.scope] in [data.period].',
  requiredFields: Object.freeze(['measure.quantity', 'data[].quantity', 'data[].scope', 'data[].period']),
  sameQuantityRule: 'Every data[].quantity must exactly match measure.quantity.',
  sameScopeRule: 'Every item on a shared scale must use the same population, denominator, entity system, or accounting bridge.',
  periodRule: 'Scenario, diverging, range, dumbbell, and ranking charts use one shared period; a dumbbell period may name the comparison interval. comparison.change and comparison.benchmark-gap may use before-and-after periods, and trend.line may advance through ordered periods, while quantity and scope stay fixed.',
  rejectionRule: 'If the sentence test cannot be completed literally, do not use a shared axis. Use relationship.converging-signals when exactly two drivers and one outcome form one coherent claim; otherwise select one primary story with secondary context or split the evidence into separate charts.',
  genericLabelsRejected: Object.freeze(['reported change', 'value', 'metric', 'amount', 'result'])
});

const VALUE_REPRESENTATION_CONTRACT = Object.freeze({
  auditRule: 'Every selected source-ledger candidate must declare representationAudit.selectedMode, levelAvailability, and rationale. Rate/share stories also require basisAvailability and basisRationale. When a tangible basis is reported or retrievable, selectedMode must be level. Unavailable or incomparable normalized evidence requires tangibleTarget plus completed structured researchAttempts.',
  hierarchy: 'Prefer reported or retrievable actual levels for the primary geometry. Use absolute change next. Use native rates and shares when they are the real measured quantity. Use relative change only when actual levels are unavailable or incomparable. Use index only for a named, source-reported index with point levels.',
  actualLevelRule: 'When actual levels are reported or retrievable, plot those levels and move percentage or indexed change into emphasis, annotation, subtitle, or supporting context. For multi-category prices, compare each category with its own prior level; different category magnitudes do not make the within-category pairs incomparable.',
  partialLevelRule: 'If only some category pairs have recoverable actual levels, use those tangible pairs when they still support the input-anchored finding and keep unmatched normalized observations secondary. If an unmatched category is necessary to the headline, continue targeted research rather than downgrading the entire story to percentage-only geometry.',
  syntheticBaselineRule: 'Never invent a 0% before-event point or an index-100 starting point merely to create a trend. Research the actual level or chart only the reported relative observations. Do not publish generic labels such as 100 index or index points.',
  tangibleValueRule: 'For prices, volumes, revenues, output, counts, and other tangible quantities, use the tangible values when available. For rates and shares with a reported or retrievable basis, derive and plot the numerator/denominator or population/affected amounts as level geometry rather than leaving the percentage as the chart.',
  researchProof: Object.freeze({
    requiredWhen: 'Actual levels or a rate/share basis are classified as unavailable or incomparable.',
    tangibleTarget: 'Name the exact price, count, volume, amount, numerator, or denominator sought.',
    attemptFields: Object.freeze(['source', 'sourceType', 'locator', 'outcome']),
    sourceTypes: Object.freeze(['supplied-source', 'official-dataset', 'company-filing', 'market-data', 'industry-dataset', 'authoritative-report']),
    diversityRule: 'Use at least two source types and include an official dataset, company filing, market-data source, or industry dataset. Every locator and outcome must describe a completed source-specific check; placeholders are rejected.'
  }),
  viewerCopyRule: 'Do not show synthetic index wording such as 100 index, 91.5 index, or index points. A named published index should use reader-facing point values and identify the measure by name.',
  exceptionRule: 'A relative-change ChartSpec is valid only when levelAvailability is unavailable or incomparable and measure.normalizationNote explains the limitation. An index ChartSpec requires reported or retrievable point levels for a named published index.'
});


const WATERFALL_CONTRACT = Object.freeze({
  useWhen: 'Only for one existing balance or level changing through mutually exclusive, same-period, same-scope steps into a reported ending value.',
  requiredItemFields: Object.freeze(['role', 'value', 'valueStatus', 'period', 'scope']),
  valueStatus: 'Every waterfall item must be valueStatus "reported". Derived, bounded, approximate, or inferred values belong in a simpler recipe with supporting facts.',
  reconciliation: 'The renderer checks and reconciles start + every change = each subtotal and the final end, within the declared display precision.',
  rejectWhen: Object.freeze([
    'the source says more than, about, roughly, almost, or otherwise gives a bound or approximation',
    'a step belongs to a prior or different reporting period',
    'the opening value is reconstructed from incomplete charges',
    'the steps are unlike facts rather than additive components of one measure',
    'all intermediate steps are simply positive components of one total; use composition.components so each component is seated at zero'
  ]),
  fallback: 'Use composition.components for positive additive components, or comparison.change, comparison.scenarios, comparison.range, or a separate chart when a true balance bridge cannot be proven. Omit the story if only one unsupported value remains.'
});

const COMPOSABLE_FEATURES = Object.freeze([
  Object.freeze({ need: 'Target, average, legal limit, or benchmark', add: 'references' }),
  Object.freeze({ need: 'Explain a specific point', add: 'data[].annotation' }),
  Object.freeze({ need: 'Values span orders of magnitude and the story is multiplicative rather than amount-as-a-fraction-of-baseline', add: 'measure.scale = logarithmic; never use it to make a denominator comparison fit' }),
  Object.freeze({ need: 'Important context uses different units but remains secondary', add: 'supportingFacts only after the primary visual already satisfies its recipe-specific evidence gate' }),
  Object.freeze({ need: 'Mixed-unit facts jointly carry the main story', add: 'use relationship.converging-signals for exactly two drivers and one outcome; otherwise split them into separate ChartSpecs' }),
  Object.freeze({ need: 'A story has only two exact count categories, or only 3–4 tiny/low-variation exact-count observations', add: 'research a tangible denominator/population, reviewed universe, portfolio/network total, capacity, affected volume/value, independent benchmark, or richer series. The sum of the counts is not an anchor, and a line through a few tiny integers is not automatically informative.' }),
  Object.freeze({ need: 'A lone rate or share remains after tangible-basis research', add: 'recover an independent same-unit peer, regional observation, prior/current point, benchmark, or target. The derived 100%-minus-share complement is not an independent anchor; merge into a richer same-topic visual or omit when no comparator exists.' }),
  Object.freeze({ need: 'A composition is expressed as percentages', add: 'data[].displayValue with the tangible absolute amount as well' }),
  Object.freeze({ need: 'A rate or share has a tangible numerator and denominator', add: 'switch to level geometry and plot the tangible amounts; keep the rate or share as secondary copy' }),
  Object.freeze({ need: 'Duration or reserve runway defines the comparison', add: 'timeline.duration with exact start/end dates, or timeline.anchorDate plus data[].duration and durationUnit for a common verified start' }),
  Object.freeze({ need: 'An amount is meaningful only relative to daily consumption, monthly demand, or total need', add: 'keep the physical amount and add a visible linear reference in the same unit; if a monthly or annual reference is too large, period-normalize only the denominator to a week or day' }),
  Object.freeze({ need: 'A discount, premium, shortfall, overage, standard, limit, prior level, or target supplies a meaningful reference for one positive actual/current level', add: 'comparison.benchmark-gap' }),
  Object.freeze({ need: 'Positive additive components reconcile to one total', add: 'composition.components with zero-seated bars and the total as one reference' })
]);

const SHARED_AUTHORING_RULES = Object.freeze([
  'Author a ChartSpec JSON file; never author generated HTML, CSS, JavaScript, or chart geometry.',
  'Use the underlying publication or dataset as the source when available; otherwise omit source attribution.',
  'Treat input.txt as expert-authored editorial evidence and preserve its claims by default. Entries are also routing information and may be incomplete.',
  'Use external research to supplement or attribute the input, not to vote on whether it is true. External silence is not contradiction.',
  'Never label an input claim uncorroborated, unsupported, or not independently confirmed solely because a second source was not found.',
  'Escalate only direct material contradictions from reputable sources. Mark the external evidence conflictStatus material, preserve both positions, and do not select or visualize the story until editorial resolution.',
  'Read supplied sources before selecting a recipe. Never mention the input filename or internal workflow status in presentation copy.',
  'Search beyond the primary source to fill a named material evidence gap or add useful attribution and context, and reject adjacent context that does not strengthen the central claim.',
  'Record routingAudit for every selected story before ChartSpec authoring. Classify geography as none, categorical, or explanatory. Three or more named administrative regions in comparable evidence automatically constitute a regional distribution and require regional-breakdown, even without words such as spread or regional pattern; grouped labels count every named region. Two regions plus a spatial finding such as border contrast, clustering, distribution, adjacency, or concentration also require regional-breakdown.',
  'Do not add irrelevant data or decorative complexity. Do require a real visual comparison: a one-point or prose-only story must be enriched with source-supported structure or omitted.',
  'Never place unlike quantities, scopes, denominators, or accounting bases on one numeric axis. Apply the shared-scale sentence test before choosing any comparison, trend, or ranking recipe.',
  'Audit value representation before recipe selection. Declare measure.valueMode and measure.levelAvailability, matching the selected story representationAudit.',
  'For rate and share stories, also declare basisAvailability. Expose reported or retrievable numerator/denominator or population/affected amounts through basis. If the basis remains unavailable or incomparable, one percentage plus its derived complement is still too thin for a standalone chart: recover an independent same-unit comparator or merge/omit the claim.',
  'Do not declare levels or a rate/share basis unavailable or incomparable until representationAudit names the tangibleTarget and records at least two structured source checks with sourceType, locator, and outcome. The checks must span two source types and include a data-bearing source.',
  'When actual levels are reported or retrievable, plot the actual values and move percentage change into emphasis, annotation, subtitle, or supportingFacts.',
  'For forecast, target, outlook, and scenario stories, search specifically for the same-unit actual/current/latest realized value. If one exists, put it on the visual scale as a numeric reference; supportingFacts is not sufficient.',
  'When a breakeven, profitability floor, threshold, cap, ceiling, limit, or cutoff defines why the observed values matter, record it as an orientation anchor before recipe selection and preserve it in primary geometry. A before/after comparison that omits the threshold fails the claim-to-geometry check.',
  'Derived arithmetic must inherit source precision and uncertainty. Round derived gaps, averages, implied values, and shortfalls to the coarsest materially constraining input precision and preserve qualifiers such as about, approximately, up to, or at least. Never surface raw calculator decimals from rounded source values.',
  'Do not select a line, ranking, or generic comparison merely because 3–4 exact count observations exist. If the counts are tiny or barely vary, first recover an independent same-unit denominator, portfolio/universe, reviewed set, capacity, affected sales/volume/value, or a richer series. If no such orientation exists, use chronology/event structure when appropriate or omit/merge the story.',
  'A value that exactly repeats a low/high range endpoint, benchmark endpoint, total, remainder, or zero gap is redundant geometry. It does not count as an anchor and must not be added merely to make a thin chart pass.',
  'When a headline outcome or range is materially explained by two quantitative factors in different units, keep those factors in the main visual argument. Use relationship.converging-signals with an explicit formula when the two inputs and outcome are all material, rather than parking the inputs in supportingFacts.',
  'For price-like category changes, evaluate comparability within each category pair. A current price plus a compatible percentage move makes the prior price derivable. Different category levels, grades, or delivery bases do not make valid within-category pairs incomparable.',
  'Do not flatten repeated category/time pairs into comparison.scenarios. Use comparison.benchmark-gap for one or two category pairs and comparison.dumbbell for three or more.',
  'Prefer comparison.benchmark-gap over comparison.change when two positive level values can be read naturally as current/actual versus prior, standard, limit, target, or benchmark. Do not default to two independent bars.',
  'Do not use dot-counting or comparison.pictogram. Two exact count categories require a third comparable count, a tangible denominator/population, an independent benchmark, or a time series before they deserve a standalone chart. Their own sum is not an anchor.',
  'For percentage-only prices, workforce, exports, production, spending, and revenue, search for the underlying amounts for the same scope and periods before selecting geometry.',
  'For workforce percentages, check the company filing, employee note, or official workforce disclosure before accepting headcount as unavailable.',
  'Never invent a 0% before-event point or index-100 starting point merely to create a trend. Use actual levels or only the reported relative observations.',
  'Use relative-change geometry only when actual levels are unavailable or incomparable, and explain the limitation in measure.normalizationNote. Use index only for a named published index with reported or retrievable point levels; never show generic index wording in visible values.',
  'Never use status, card, bullet, or facet grids as a substitute for a chart. Quantify a common dimension, use a regional map when geography matters, split the evidence, or omit the story.',
  'Never create a chart from one independent numeric item. Find a comparator, denominator, benchmark, peer, range, or time series in the source; otherwise omit it. A derived complement or remainder does not convert one reported observation into two independent observations.',
  'Before splitting one supplied article, dataset, or paragraph into several selected charts, perform a source-family sweep: collect all related quantitative observations first. If one proposed chart is only a summary, complement, subset, or single-point restatement of a richer same-topic comparison or regional distribution, merge it into the richer chart instead of creating a separate thin slide.',
  'Never publish a bare numeric label whose unit is only available on an axis. Put the unit in displayValue or state it explicitly in the title or subtitle.',
  'Do not create parallel charts from the same source passage, reporting period, recipe, and category or time skeleton merely because the measures use different units. Consolidate the secondary measure or mark it merged.',
  'Subtitle is optional. Omit it when it repeats values, labels, or the title; retain it only when it adds interpretation, scope, mechanism, denominator, or qualification.',
  'For composition charts, preserve both the share and tangible absolute amount, lead with proportional marks, and render each segment label once rather than repeating the same category, share, and amount in two locations.',
  'For risk or exit-outlook charts, anchor the percentage to a population or denominator, show that total on the plotted scale, and include at least one mechanism or consequence.',
  'Use every comparable datapoint that materially defines the headline as primary geometry. Three or more time observations establishing slowdown or acceleration require trend.line rather than two bars plus supporting facts.',
  'When an amount is interpreted through daily consumption, monthly demand, coverage, or total need, keep the physical components and visualize the denominator as a linear reference in the same unit. If a monthly or annual denominator is at least about 8 times the largest retained component, period-normalize only the denominator to a week or day and record the rate-preserving derivation.',
  'Use timeline.duration whenever duration is the primary comparison. Use exact intervals or a verified common timeline.anchorDate plus duration fields; do not reduce policy windows or reserve runway to abstract bars.',
  'When a headline depends on opposing quantities, such as falling volume and rising price producing higher spending, use relationship.converging-signals or split the evidence. Do not plot only one side and leave the rest in supportingFacts.',
  'Use comparison.benchmark-gap when a discount, premium, shortfall, or overage is the finding so both the benchmark total and actual amount remain visible.',
  'Use comparison.benchmark-gap for one or two category-level earlier/current price pairs; use comparison.dumbbell for three or more paired categories.',
  'Use composition.components for positive additive components of one reported total so every component is seated at zero; show the total as one numeric reference.',
  'Use flow.waterfall only for a genuine existing balance moving through exact reported changes. Do not use it for a simple positive component decomposition.',
  'Keep the title, subtitle, labels, and details concise enough to survive responsive layouts.',
  'Revise the ChartSpec for data, copy, recipe, or semantic errors.',
  'If a valid ChartSpec still fails rendering or diagnostics, report an infrastructure issue. Do not inspect or modify renderer internals unless the task explicitly assigns the maintainer role.'
]);

const SHARED_STAGES = Object.freeze([
  Object.freeze({ id: 'preserve-input', action: 'Treat input.txt as expert-authored evidence and preserve its factual claims unless a reputable source directly contradicts a material point.' }),
  Object.freeze({ id: 'confirm-source', action: 'Confirm that supplied sources used for supplementation match the entity, event, period, and finding.' }),
  Object.freeze({ id: 'enrich-source', action: 'Read the full primary source and extract relevant supplemental evidence and safe derivations.' }),
  Object.freeze({ id: 'fill-evidence-gap', action: 'Research beyond supplied sources to fill a named material evidence gap or add useful attribution and context.' }),
  Object.freeze({ id: 'audit-representation', action: 'Determine whether actual levels are reported or retrievable, record the representation audit, and prefer tangible values over normalized changes.' }),
  Object.freeze({ id: 'audit-routing', action: 'Record routingAudit, including geographyRole and workflow; explanatory geography must route to regional-breakdown before a recipe is selected.' }),
  Object.freeze({ id: 'analyze', action: 'Choose one central finding, its evidence spine, the workflow, and the recipe.' }),
  Object.freeze({ id: 'author', action: 'Write the smallest semantic ChartSpec that expresses that story.' }),
  Object.freeze({ id: 'validate', command: `${TOOL_API_ENTRYPOINT} validate <spec.json>` }),
  Object.freeze({ id: 'render', action: 'Run the Tool API render command for the selected workflow.' }),
  Object.freeze({ id: 'review', action: 'Resolve errors before delivery. Capture the final PNG into charts/<run-id>/ after diagnostics pass; temporary review belongs in .work/<run-id>/review/.' })
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
  'data[].callout',
  'data[].calloutSide'
]);

const REGIONAL_AUTOMATIC = Object.freeze([
  'callout placement',
  'column order optimized from anchor geometry',
  'straight region-to-card leader routing',
  'zero-crossing validation',
  'shortest practical leader placement',
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
      'Audit actual-level availability and select the least normalized representation that preserves the story.',
      'Classify the enriched evidence with the selection rules below.',
      'Write a semantic ChartSpec using the selected recipe.',
      'Validate, render, and diagnose the chart; capture the final PNG into charts/<run-id>/.'
    ],
    authoringSurface: {
      role: 'chart-author',
      entrypoint: TOOL_API_ENTRYPOINT,
      specPath: AUTHOR_SPEC_PATH,
      resources: clone(TOOL_API_RESOURCES)
    },
    commands: {
      validate: `${TOOL_API_ENTRYPOINT} validate <spec.json>`,
      render: `${TOOL_API_ENTRYPOINT} render <spec.json> [output.html] [--run-id <id>]`,
      diagnose: `${TOOL_API_ENTRYPOINT} diagnose <output.html>`,
      review: `${TOOL_API_ENTRYPOINT} review <output.html> --screenshot --output .work/<run-id>/review/<chart>.png`
    },
    selectionRules: clone(STANDARD_SELECTION_RULES),
    authoringRules: [...SHARED_AUTHORING_RULES],
    visualEvidenceContract: clone(VISUAL_EVIDENCE_CONTRACT),
    sharedScaleContract: clone(SHARED_SCALE_CONTRACT),
    valueRepresentationContract: clone(VALUE_REPRESENTATION_CONTRACT),
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
    command: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html] [--run-id <id>]`,
    startHere: 'Use this path when geography is part of the finding. Keep all materially reported regions highlighted; reserve callout cards for the locations that need explicit evidence labels.',
    steps: [
      'Preserve the expert input claim, then read supplied sources and fill useful evidence gaps.',
      `Use stable IDs from \`${TOOL_API_ENTRYPOINT} regions ${regionSet.id}\`.`,
      'Author every materially reported region. Use data[].callout = "none" for fill-only highlights. Do not author visual card order; the renderer orders cards from anchor geometry to minimize straight-line crossings and travel.',
      'Validate the spec, then run the regional command for shell review and responsive diagnostics.',
      'Use the generic review command with --screenshot to capture the final PNG into charts/<run-id>/.'
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
      render: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html] [--run-id <id>]`,
      renderWithoutBrowser: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html] [--run-id <id>] --no-diagnose`,
      screenshot: `${TOOL_API_ENTRYPOINT} review <output.html> --screenshot --output .work/<run-id>/review/<chart>.png`
    },
    authoringRule: 'Specify editorial content and stable continental region IDs. The data array is the geographic evidence inventory, not a list of boxes: keep reported regions in data[] even when they do not need callouts. Automatic layout ignores source order and calloutOrder for geometry, places cards near their anchors, and optimizes vertical order for straight non-crossing leaders with minimum travel. Any rendered leader crossing is a delivery failure. Regional maps never render origin dots on leaders. Russian regional maps permanently omit Kaliningrad and island fragments, suppress summary cards, and reserve the wide canvas for the mainland map. Detached-region evidence must use a non-map story format.',
    requiredTopLevel: ['title', 'date', 'data', 'metadata.slug'],
    requiredDataItem: ['label', 'regionId or regionIds'],
    recommendedDataItem: ['status', 'displayValue', 'detail', 'callout'],
    evidenceRule: 'Every materially reported region should remain represented in data[]. At most 12 items may have callout cards; use callout: "none" on lower-priority regions so their fill remains visible without a box. Visible callouts should include at least one of status, displayValue, detail, or value.',
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
    version: '1.16',
    interface: {
      type: 'tool-api',
      role: 'chart-author',
      entrypoint: TOOL_API_ENTRYPOINT,
      manifestCommand: `${TOOL_API_ENTRYPOINT} api`
    },
    startHere: 'For a batch run, treat input.txt as expert-authored editorial evidence, preserve its claims by default, and follow the batch workflow. For each accepted chart story, choose exactly one chart workflow before writing a spec.',
    batchWorkflow: clone(BATCH_WORKFLOW),
    decision: [
      {
        if: 'Administrative regions are part of the finding and spatial location changes the interpretation; some highlighted regions may be fill-only without callout cards.',
        workflow: REGIONAL_WORKFLOW,
        firstCommand: `${TOOL_API_ENTRYPOINT} regional-guide ${regionSet.id}`,
        renderCommand: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html] [--run-id <id>]`
      },
      {
        if: 'The story has enough independent quantitative structure for the selected recipe and is a comparison, ranking, composition, trend, or flow without a map. Generic categorical bars require at least three observations; relationship-specific two-value recipes may use two.',
        workflow: STANDARD_WORKFLOW,
        firstCommand: `${TOOL_API_ENTRYPOINT} guide`,
        renderCommand: `${TOOL_API_ENTRYPOINT} render <spec.json> [output.html] [--run-id <id>]`
      }
    ],
    sharedContract: {
      artifact: 'ChartSpec JSON',
      specPath: AUTHOR_SPEC_PATH,
      resources: clone(TOOL_API_RESOURCES),
      sourceEnrichment: clone(SOURCE_ENRICHMENT_POLICY),
      visualEvidenceContract: clone(VISUAL_EVIDENCE_CONTRACT),
      sharedScaleContract: clone(SHARED_SCALE_CONTRACT),
      valueRepresentationContract: clone(VALUE_REPRESENTATION_CONTRACT),
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
      renderCommand: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html] [--run-id <id>]`
    },
    standard: {
      workflow: STANDARD_WORKFLOW,
      guideCommand: `${TOOL_API_ENTRYPOINT} guide`,
      renderCommand: `${TOOL_API_ENTRYPOINT} render <spec.json> [output.html] [--run-id <id>]`,
      diagnoseCommand: `${TOOL_API_ENTRYPOINT} diagnose <output.html>`
    },
    authoringRules: [...SHARED_AUTHORING_RULES],
    boundary: {
      publicSurface: ['input.txt', 'tool-api/', 'docs/batch-workflow.md', 'docs/agent-workflows.md', 'docs/story-selection.md', 'docs/source-enrichment.md', 'schemas/chart-spec.schema.json', 'recipes/catalog.json', 'specs/examples/', 'specs/runs/<run-id>/', 'charts/<run-id>/', '.work/<run-id>/'],
      implementation: ['renderer/', 'lib/', 'tests/', 'tools/'],
      rule: 'Chart authors stay on the public surface. Implementation directories are maintainer-only unless the user explicitly requests infrastructure work.'
    }
  };
}

function toolApiManifest(regionSetId = DEFAULT_REGION_SET_ID) {
  const regionSet = getRegionSet(regionSetId);
  return {
    name: 'Tochnyi Charts Tool API',
    version: '1.16',
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
      render: `${TOOL_API_ENTRYPOINT} render <spec.json> [output.html] [--run-id <id>]`,
      regional: `${TOOL_API_ENTRYPOINT} regional <spec.json> [output.html] [--run-id <id>]`,
      diagnose: `${TOOL_API_ENTRYPOINT} diagnose <chart.html>`,
      review: `${TOOL_API_ENTRYPOINT} review <chart.html> [--screenshot] [--output .work/<run-id>/review/<chart>.png]`
    },
    resources: clone(TOOL_API_RESOURCES),
    batchWorkflow: clone(BATCH_WORKFLOW),
    sourceEnrichment: clone(SOURCE_ENRICHMENT_POLICY),
    visualEvidenceContract: clone(VISUAL_EVIDENCE_CONTRACT),
    sharedScaleContract: clone(SHARED_SCALE_CONTRACT),
    valueRepresentationContract: clone(VALUE_REPRESENTATION_CONTRACT),
    waterfallContract: clone(WATERFALL_CONTRACT),
    regionSet: { id: regionSet.id, label: regionSet.label },
    allowedWork: [
      'initialize and finalize the isolated run workspace',
      'parse input.txt into distinct data stories',
      'preserve expert input evidence and analyze supplemental sources',
      'select, merge, or omit stories for the presentation',
      'choose a workflow and recipe',
      'author and revise ChartSpec JSON',
      'run validation, rendering, diagnostics, and review',
      'capture final PNG images and assemble the PowerPoint presentation',
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
  VALUE_REPRESENTATION_CONTRACT,
  WATERFALL_CONTRACT,
  toolApiManifest,
  agentWorkflowOrientation,
  standardAgentGuide,
  regionalWorkflowGuide
};
