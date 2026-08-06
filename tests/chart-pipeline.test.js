'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateSpec } = require('../renderer/validate');
const { renderHtml, renderSpecFile, assetFingerprint, defaultOutputPath } = require('../renderer/render');
const { reviewHtml, reviewFile } = require('../renderer/review');
const { recipeIds } = require('../renderer/catalog');
const { extractLayoutDiagnostics, extractDataAttributes } = require('../renderer/capture');
const {
  validateRegionalSpec,
  renderRegionalBreakdown,
  regionalAgentGuide,
  summarizeDiagnosticRun
} = require('../renderer/regional-workflow');
const { diagnoseBoxes, diagnoseMarkStyles, diagnoseBranding, diagnoseWatermark, normalizeRect } = require('../lib/tochnyi-diagnostics');
const Tochnyi = require('../lib/tochnyi-charts');
const VisualPlan = require('../lib/tochnyi-visual-plan');
const TochnyiMaps = require('../lib/tochnyi-maps');

const examplesDir = path.join(__dirname, '..', 'specs', 'examples');
const exampleFiles = fs.readdirSync(examplesDir).filter((name) => name.endsWith('.json')).sort();

function loadExample(name) {
  return JSON.parse(fs.readFileSync(path.join(examplesDir, name), 'utf8'));
}

test('every recipe has a valid example ChartSpec', () => {
  const covered = new Set();
  for (const file of exampleFiles) {
    const result = validateSpec(loadExample(file));
    assert.equal(result.valid, true, `${file}: ${result.errors.join('; ')}`);
    covered.add(result.normalized.recipe);
  }
  assert.deepEqual([...covered].sort(), [...recipeIds].sort());
});

test('numbered causal sequences are not an available chart recipe', () => {
  assert.equal(recipeIds.includes('story.sequence'), false);
  const result = validateSpec({
    version: '2.0',
    recipe: 'story.sequence',
    title: 'Unsupported sequence',
    subtitle: 'Numbered process cards are intentionally unavailable.',
    date: '2026-08-04',
    data: [
      { label: 'One', detail: 'First' },
      { label: 'Two', detail: 'Second' },
      { label: 'Three', detail: 'Third' }
    ]
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('Unknown recipe')));
});

test('shared-axis comparisons reject unlike quantities, scopes, and periods', () => {
  const valid = loadExample('profit-change-contributions.json');
  assert.equal(validateSpec(valid).valid, true);

  const unlikeQuantity = structuredClone(valid);
  unlikeQuantity.data[1].quantity = 'revenue growth';
  let result = validateSpec(unlikeQuantity);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('must match measure.quantity exactly')));

  const unlikeScope = structuredClone(valid);
  unlikeScope.data[1].scope = 'one business unit';
  result = validateSpec(unlikeScope);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('cannot place unlike scopes on one scale')));

  const unlikePeriod = structuredClone(valid);
  unlikePeriod.data[1].period = 'H2 2026';
  result = validateSpec(unlikePeriod);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('requires one shared period')));

  const genericQuantity = structuredClone(valid);
  genericQuantity.measure.quantity = 'reported change';
  genericQuantity.data.forEach((item) => { item.quantity = 'reported change'; });
  result = validateSpec(genericQuantity);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('measure.quantity is too generic')));

  const trend = loadExample('bankruptcies-trend.json');
  result = validateSpec(trend);
  assert.equal(result.valid, true, result.errors.join('; '));
  const mixedTrend = structuredClone(trend);
  mixedTrend.data[2].quantity = 'bankruptcy growth rate';
  result = validateSpec(mixedTrend);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('must match measure.quantity exactly')));

  const ranking = loadExample('regional-ranking.json');
  result = validateSpec(ranking);
  assert.equal(result.valid, true, result.errors.join('; '));
  const mixedRanking = structuredClone(ranking);
  mixedRanking.data[1].scope = 'national fuel market';
  result = validateSpec(mixedRanking);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('cannot place unlike scopes on one scale')));
});

test('numeric labels must expose their units unless the title or subtitle defines them', () => {
  const indexed = {
    version: '2.0',
    recipe: 'comparison.change',
    title: 'Consumer prices rose between two published readings',
    subtitle: 'The official series moved higher during the period.',
    date: '2026-08-05',
    data: [
      {
        label: 'Before',
        value: 105.2,
        displayValue: '105.2',
        quantity: 'consumer price index',
        scope: 'official consumer-price series',
        period: 'Previous reading'
      },
      {
        label: 'After',
        value: 108.4,
        displayValue: '108.4',
        quantity: 'consumer price index',
        scope: 'official consumer-price series',
        period: 'Latest reading'
      }
    ],
    measure: {
      quantity: 'consumer price index',
      unit: 'points',
      axisTitle: 'Consumer price index',
      valueMode: 'index',
      levelAvailability: 'reported',
      decimals: 1,
      baseline: 'auto'
    },
    emphasis: {
      direction: 'up',
      displayValue: '108.4',
      label: 'Latest reading',
      position: 'corner'
    }
  };
  let result = validateSpec(indexed);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('displayValue "108.4" is unitless')));

  const explicitLabels = structuredClone(indexed);
  explicitLabels.data[0].displayValue = '105.2 points';
  explicitLabels.data[1].displayValue = '108.4 points';
  explicitLabels.emphasis.displayValue = '108.4 points';
  result = validateSpec(explicitLabels);
  assert.equal(result.valid, true, result.errors.join('; '));

  const explicitTitle = structuredClone(indexed);
  explicitTitle.title = 'Consumer price index rose from 105.2 to 108.4 points';
  result = validateSpec(explicitTitle);
  assert.equal(result.valid, true, result.errors.join('; '));

  const genericIndexCopy = structuredClone(explicitLabels);
  genericIndexCopy.measure.unit = 'index points';
  genericIndexCopy.data[0].displayValue = '105.2 index points';
  result = validateSpec(genericIndexCopy);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /generic viewer-facing labels|must not use generic "index" wording/i.test(message)));
});

test('value representation prefers actual levels over percentages and synthetic indexes', () => {
  const relative = {
    version: '2.0',
    recipe: 'comparison.change',
    title: 'Share price changed after the event',
    subtitle: 'The source reports both share prices and the percentage movement.',
    date: '2026-08-05',
    data: [
      {
        label: 'Before', value: 0, displayValue: '0%',
        quantity: 'share-price change', scope: 'company shares', period: 'Before event'
      },
      {
        label: 'After', value: -8.5, displayValue: '−8.5%',
        quantity: 'share-price change', scope: 'company shares', period: 'After event'
      }
    ],
    measure: {
      quantity: 'share-price change', unit: '%', axisTitle: 'Share-price change',
      valueMode: 'relative-change', levelAvailability: 'retrievable', decimals: 1, baseline: 'zero'
    }
  };
  let result = validateSpec(relative);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /actual levels are retrievable/i.test(message)));

  const levels = structuredClone(relative);
  levels.title = 'Share price fell from RUB 250 to RUB 229';
  levels.subtitle = 'The percentage decline remains secondary context.';
  levels.data[0] = {
    label: 'Before', value: 250, displayValue: 'RUB 250',
    quantity: 'share price', scope: 'company shares', period: 'Before event'
  };
  levels.data[1] = {
    label: 'After', value: 229, displayValue: 'RUB 229',
    quantity: 'share price', scope: 'company shares', period: 'After event'
  };
  levels.measure = {
    quantity: 'share price', unit: 'RUB per share', axisTitle: 'Share price',
    valueMode: 'level', levelAvailability: 'reported', decimals: 0, baseline: 'auto'
  };
  result = validateSpec(levels);
  assert.equal(result.valid, true, result.errors.join('; '));

  const justifiedRelative = structuredClone(relative);
  justifiedRelative.measure.levelAvailability = 'unavailable';
  justifiedRelative.measure.normalizationNote = 'The source reports only the percentage movement and no recoverable share-price level.';
  justifiedRelative.data[0] = {
    label: 'Intraday low', value: -8.5, displayValue: '−8.5%',
    quantity: 'share-price change', scope: 'company shares', period: 'Intraday low'
  };
  justifiedRelative.data[1] = {
    label: 'Later close', value: -3.1, displayValue: '−3.1%',
    quantity: 'share-price change', scope: 'company shares', period: 'Later close'
  };
  result = validateSpec(justifiedRelative);
  assert.equal(result.valid, true, result.errors.join('; '));

  const syntheticIndex = structuredClone(levels);
  syntheticIndex.title = 'Share-price move shown as a synthetic baseline';
  syntheticIndex.data[0] = {
    label: 'Before event', value: 100, displayValue: '100 index',
    quantity: 'share-price index', scope: 'company shares', period: 'Before event'
  };
  syntheticIndex.data[1] = {
    label: 'After event', value: 91.5, displayValue: '91.5 index',
    quantity: 'share-price index', scope: 'company shares', period: 'After event'
  };
  syntheticIndex.measure = {
    quantity: 'share-price index', unit: 'index', axisTitle: 'Before event = 100',
    valueMode: 'index', levelAvailability: 'unavailable', decimals: 1, baseline: 'auto'
  };
  result = validateSpec(syntheticIndex);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /synthetic fallback|generic viewer-facing labels/i.test(message)));

  const syntheticZero = structuredClone(justifiedRelative);
  syntheticZero.data[0] = {
    label: 'Before event', value: 0, displayValue: '0%',
    quantity: 'share-price change', scope: 'company shares', period: 'Before event'
  };
  result = validateSpec(syntheticZero);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /synthetic 0% baseline/i.test(message)));
});

test('share charts expose tangible amounts when component levels are available', () => {
  const composition = loadExample('budget-composition.json');
  composition.measure.levelAvailability = 'reported';
  let result = validateSpec(composition);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /tangible absolute amount/i.test(message)));

  composition.data[0].displayValue = '35% · RUB 35,000';
  composition.data[1].displayValue = '25% · RUB 25,000';
  composition.data[2].displayValue = '20% · RUB 20,000';
  composition.data[3].displayValue = '20% · RUB 20,000';
  result = validateSpec(composition);
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('rate and share stories require an explicit tangible basis audit', () => {
  const share = {
    version: '2.0',
    recipe: 'comparison.scenarios',
    title: 'Online trade represents an estimated 8–10% of the economy',
    subtitle: 'The range must remain tied to the turnover and economy totals behind it.',
    date: '2026-08-05',
    data: [
      { label: 'Lower estimate', value: 8, displayValue: '8%', quantity: 'online-trade share of the economy', scope: 'Russian economy', period: 'H1 2026' },
      { label: 'Upper estimate', value: 10, displayValue: '10%', quantity: 'online-trade share of the economy', scope: 'Russian economy', period: 'H1 2026' }
    ],
    measure: {
      quantity: 'online-trade share of the economy', unit: '%', valueMode: 'share',
      levelAvailability: 'not-applicable', basisAvailability: 'retrievable', decimals: 0, baseline: 'zero'
    }
  };
  let result = validateSpec(share);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /basis is required/i.test(message)));

  share.basis = {
    type: 'ratio',
    label: 'Underlying amounts',
    formula: 'Online-trade turnover ÷ economy total',
    items: [
      { role: 'numerator', label: 'Online-trade turnover', value: 5.9, displayValue: 'RUB 5.9tn', unit: 'trillion RUB', valueStatus: 'reported', tone: 'primary' },
      { role: 'denominator', label: 'Implied economy total', low: 59, high: 73.75, displayValue: 'RUB 59–73.75tn', unit: 'trillion RUB', valueStatus: 'derived', tone: 'neutral' }
    ]
  };
  result = validateSpec(share);
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('risk ranges require a population anchor and explanatory context', () => {
  const risk = {
    version: '2.0',
    recipe: 'comparison.range',
    title: 'Small sellers face a 10–15% exit risk',
    subtitle: 'The estimate applies to active marketplace sellers.',
    date: '2026-08-05',
    data: [
      { label: 'Low estimate', value: 10, displayValue: '10%', quantity: 'seller exit risk', scope: 'active marketplace sellers', period: '2026 outlook' },
      { label: 'High estimate', value: 15, displayValue: '15%', quantity: 'seller exit risk', scope: 'active marketplace sellers', period: '2026 outlook' }
    ],
    measure: {
      quantity: 'seller exit risk', unit: '%', valueMode: 'rate', levelAvailability: 'not-applicable',
      basisAvailability: 'retrievable', decimals: 0, baseline: 'zero'
    },
    basis: {
      type: 'population',
      label: 'Seller population at risk',
      items: [
        { role: 'population', label: 'Active sellers', value: 456700, displayValue: '456,700 sellers', unit: 'sellers', valueStatus: 'reported' },
        { role: 'affected', label: 'Implied exits', low: 45670, high: 68505, displayValue: '45,670–68,505 sellers', unit: 'sellers', valueStatus: 'derived', tone: 'critical' }
      ]
    }
  };
  let result = validateSpec(risk);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /narrative\.emphasis risk/i.test(message)));

  risk.narrative = { frame: 'warning', density: 'editorial', emphasis: 'risk' };
  result = validateSpec(risk);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /mechanism or consequence/i.test(message)));

  risk.supportingFacts = [{ value: 'RUB 100,000/month', label: 'The exposed cohort consists of low-turnover sellers pressured by higher commissions.', role: 'mechanism', tone: 'warning' }];
  result = validateSpec(risk);
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('dated intervals, benchmark gaps, and dumbbells enforce their defining evidence', () => {
  const timeline = loadExample('fuel-ban-timeline.json');
  let result = validateSpec(timeline);
  assert.equal(result.valid, true, result.errors.join('; '));
  timeline.data[1].end = '2026-07-31';
  result = validateSpec(timeline);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /end must not precede start/i.test(message)));

  const gap = loadExample('urals-benchmark-gap.json');
  result = validateSpec(gap);
  assert.equal(result.valid, true, result.errors.join('; '));
  delete gap.data[0].benchmark;
  result = validateSpec(gap);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /benchmark is required/i.test(message)));

  const dumbbell = loadExample('marketplace-commission-dumbbell.json');
  result = validateSpec(dumbbell);
  assert.equal(result.valid, true, result.errors.join('; '));
  delete dumbbell.data[2].benchmark;
  result = validateSpec(dumbbell);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /benchmark is required for comparison\.dumbbell/i.test(message)));

  const normalizedDumbbell = loadExample('marketplace-commission-dumbbell.json');
  normalizedDumbbell.measure.valueMode = 'relative-change';
  result = validateSpec(normalizedDumbbell);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => /requires measure\.valueMode level/i.test(message)));
});

test('runtime includes basis, calendar-duration, benchmark-gap, and dumbbell renderers', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(runtime, /function renderDurationTimeline\(/);
  assert.match(runtime, /function renderBenchmarkGap\(/);
  assert.match(runtime, /function renderDumbbell\(/);
  assert.match(runtime, /tochnyi-basis-rail/);
  assert.match(css, /\.tochnyi-basis-rail\s*\{/);
  assert.match(css, /\.tochnyi-timeline-svg/);
  assert.match(css, /\.tochnyi-benchmark-gap-svg/);
  assert.match(css, /\.tochnyi-dumbbell-svg/);
});

test('legacy story facets are deprecated and render without standalone cards', () => {
  const facets = {
    version: '2.0',
    recipe: 'story.facets',
    title: 'Legacy mixed evidence',
    subtitle: 'Backward compatibility must not reintroduce a card grid.',
    date: '2026-08-04',
    data: [
      { label: 'Volume', displayValue: '2.99m', detail: 'Reported shipment volume.', tone: 'primary' },
      { label: 'Value', displayValue: '$85m', detail: 'Reported customs value.', tone: 'warning' }
    ]
  };
  const result = validateSpec(facets);
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(result.normalized.recipe, 'story.facets');
  assert.ok(result.warnings.some((message) => message.includes('deprecated')));
  const html = renderHtml(result.normalized);
  assert.equal(reviewHtml(html).valid, true);

  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(runtime, /function renderLegacyStoryEvidence\(/);
  assert.match(runtime, /case 'story\.facets'/);
  assert.match(runtime, /tochnyi-evidence-list/);
  assert.doesNotMatch(runtime, /tochnyi-facet-card/);
  assert.match(css, /\.tochnyi-evidence-list\s*\{/);
  assert.doesNotMatch(css, /\.tochnyi-facet-card\s*\{/);
  assert.doesNotMatch(css, /\.tochnyi-stat-grid\s*\{/);
});

test('composition segments retain tangible values alongside calculated shares', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  assert.match(runtime, /normalizedCopy\(item\.display\) !== normalizedCopy\(percentText\(share\)\)/);
  assert.doesNotMatch(runtime, /!compact && normalizedCopy\(item\.display\)/);
  assert.match(runtime, /tochnyi-stacked-binary-labels/);
  assert.doesNotMatch(runtime, /tochnyi-stacked-focus/);
});

test('production workflow rejects text-only status walls and single-number charts', () => {
  assert.equal(recipeIds.includes('status.grid'), false);
  assert.equal(recipeIds.includes('headline.metric'), false);

  const status = {
    version: '2.0',
    recipe: 'status.grid',
    title: 'Operations changed',
    subtitle: 'A prose grid must not be accepted as a chart.',
    date: '2026-08-04',
    data: [
      { label: 'A', status: 'blocked', detail: 'Closed.' },
      { label: 'B', status: 'strained', detail: 'Paused.' },
      { label: 'C', status: 'unknown', detail: 'Disputed.' }
    ]
  };
  let result = validateSpec(status);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('text-only status list is not a chart')));

  const headline = {
    version: '2.0',
    recipe: 'headline.metric',
    title: 'One number',
    subtitle: 'A lone value must be enriched before charting.',
    date: '2026-08-04',
    data: [{ label: 'Reported loss', value: 14.2, displayValue: '14.2bn RUB' }],
    measure: { unit: 'billion RUB', decimals: 1, baseline: 'zero' }
  };
  result = validateSpec(headline);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('single number is not enough visual evidence')));
});

test('Russian regional maps normalize to continental context and reject detached framing controls', () => {
  const base = loadExample('russia-regional-map.json');
  const valid = validateSpec(base);
  assert.equal(valid.valid, true, valid.errors.join('; '));
  assert.equal(valid.normalized.map.viewport, 'all');
  assert.equal(valid.normalized.map.contextFit, 'all');
  assert.equal(valid.normalized.map.landmass, 'continental');
  assert.equal(valid.normalized.map.summaryDisplay, 'hide');
  assert.equal(valid.normalized.map.summaryPosition, 'none');
  assert.deepEqual(valid.normalized.map.excludeRegions, []);

  for (const mapPatch of [
    { viewport: 'data' },
    { contextFit: 'focus' },
    { landmass: 'all' },
    { summaryDisplay: 'show' },
    { summaryPosition: 'right' },
    { excludeRegions: ['RU-KGD'] }
  ]) {
    const input = structuredClone(base);
    Object.assign(input.map, mapPatch);
    const result = validateSpec(input);
    assert.equal(result.valid, false, JSON.stringify(mapPatch));
    assert.ok(result.errors.some((message) =>
      message.includes('continental national context') ||
      message.includes('must be hide') ||
      message.includes('must be none') ||
      message.includes('cannot exclude administrative regions')
    ));
  }
});

test('generated shells contain no chart implementation or inline styles', () => {
  for (const file of exampleFiles) {
    const validated = validateSpec(loadExample(file));
    const html = renderHtml(validated.normalized);
    const review = reviewHtml(html);
    assert.equal(review.valid, true, `${file}: ${review.errors.join('; ')}`);
    assert.equal(/<style[\s>]/i.test(html), false);
    assert.equal(/\sstyle\s*=/.test(html), false);
    assert.equal(/am5(?:xy|percent)?\.[A-Za-z]+\.new\s*\(/.test(html), false);
    assert.equal(html.includes('tochnyi-diagnostics.js'), true);
    assert.equal(html.includes('tochnyi-visual-plan.js'), true);
    assert.ok(Buffer.byteLength(html) < 12000, `${file} shell is unexpectedly large`);
  }
});

test('source attribution is optional and omitted sources remain renderable', () => {
  const spec = loadExample('ai95-price-spike.json');
  delete spec.source;
  const result = validateSpec(spec);
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(result.normalized.source, undefined);
  const html = renderHtml(result.normalized);
  assert.equal(reviewHtml(html).valid, true);

  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  assert.match(runtime, /if \(spec\.source && spec\.source\.name\)/);
});

test('generated chart shells version local assets to invalidate browser caches', () => {
  const validated = validateSpec(loadExample('russia-regional-map.json'));
  const html = renderHtml(validated.normalized, {
    assetPrefix: '../../lib/',
    assetVersion: 'routing-fix-123'
  });
  assert.match(html, /data-assets-version="routing-fix-123"/);
  [
    'tochnyi.css',
    'tochnyi-maps.js',
    'tochnyi-map-runtime.js',
    'tochnyi-charts.js',
    'tochnyi-visual-plan.js',
    'tochnyi-runtime.js',
    'tochnyi-diagnostics.js'
  ].forEach((filename) => {
    assert.ok(
      html.includes(`../../lib/${filename}?v=routing-fix-123`),
      `${filename} must carry the shared asset version`
    );
  });
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  assert.match(runtime, /data-assets-version/);
  assert.match(runtime, /assetUrl\('tochnyi-logo\.png'\)/);
  assert.match(runtime, /assetUrl\('watermark\.svg'\)/);
});

test('visual planning adapts ranking geometry and editorial hierarchy', () => {
  const spec = validateSpec(loadExample('regional-ranking.json')).normalized;
  const data = [...spec.data].sort((a, b) => b.value - a.value);
  const plan = VisualPlan.resolveVisualPlan(spec, data, 1200);

  assert.equal(plan.titleAlign, 'left');
  assert.equal(plan.colorPolicy, 'focus');
  assert.equal(plan.accentSecond, true);
  assert.equal(plan.chartHeight, 454);
  assert.ok(plan.chartHeight < 550, 'five-row rankings should not use a fixed tall canvas');
  assert.equal(VisualPlan.rankingHeight(12, 'detailed'), 700);
  assert.equal(VisualPlan.rankingHeight(3, 'minimal'), 340);
});

test('trend labels remain candidates until measured layout and avoid line geometry', () => {
  const data = [20, 15, 25, 22, 31, 17, 17, 4].map((value, index) => ({
    label: String(index + 1),
    value
  }));
  const plan = VisualPlan.trendLabelPlan(data);
  const visible = plan.map((item, index) => item.showLabel ? index : -1).filter((index) => index >= 0);
  assert.equal(visible.length, data.length,
    'candidate planning must leave fit decisions to the measured layout');
  assert.ok(visible.includes(0));
  assert.ok(visible.includes(data.length - 1));
  assert.ok(visible.includes(4), 'global peak should retain a label');
  assert.ok(visible.includes(5));
  assert.ok(visible.includes(6), 'consecutive equal values must remain independent label candidates');
  assert.notEqual(plan[4].dy, 0);
  assert.notEqual(plan[7].dx, 0, 'edge labels should be pulled inward');

  const points = [
    { x: 80, y: 230 }, { x: 190, y: 270 }, { x: 300, y: 170 }, { x: 410, y: 200 },
    { x: 520, y: 100 }, { x: 630, y: 250 }, { x: 740, y: 250 }, { x: 850, y: 330 }
  ];
  const layout = VisualPlan.trendLabelLayout(data, {
    plans: plan,
    points,
    labelSizes: data.map(() => ({ width: 54, height: 26 })),
    boundary: { left: 20, top: 20, right: 900, bottom: 360 },
    pointRadius: 6,
    pointPadding: 5,
    labelPadding: 6,
    lineTolerance: 4,
    lineStrokeWidth: 4,
    labelBackgroundPadding: 2
  });
  const placed = layout.filter((item) => item.showLabel);
  assert.ok(placed.length >= 3, 'the layout should retain the highest-priority labels');
  assert.equal(layout[0].showLabel, true,
    'the first endpoint label must be retained when a collision-free position exists');
  assert.equal(layout[5].showLabel, true);
  assert.equal(layout[6].showLabel, true,
    'adjacent equal values should both render when their measured boxes fit');
  assert.equal(layout[7].showLabel, true,
    'a high-priority endpoint label must be moved farther from the line instead of being deleted');
  assert.ok(layout[7].searchOffset > 11,
    'the endpoint regression requires the measured layout to search beyond the first placement ring');
  assert.equal(
    VisualPlan.trendLabelLineOverlapCount(layout, points, 8),
    0,
    'placed labels must clear the stroked line and label-background safety margin'
  );
  for (const item of placed) {
    for (const point of points) {
      assert.equal(
        item.box.left < point.x + 6 && item.box.right > point.x - 6 &&
          item.box.top < point.y + 6 && item.box.bottom > point.y - 6,
        false,
        `label ${item.placement} must clear every plot point`
      );
    }
  }
  for (let first = 0; first < placed.length; first += 1) {
    for (let second = first + 1; second < placed.length; second += 1) {
      assert.equal(
        placed[first].box.left < placed[second].box.right && placed[first].box.right > placed[second].box.left &&
          placed[first].box.top < placed[second].box.bottom && placed[first].box.bottom > placed[second].box.top,
        false,
        'placed labels must not overlap one another'
      );
    }
  }
});

test('trend endpoint labels use bounded two-dimensional search when radial placements fail', () => {
  const data = [10, 20, 15].map((value, index) => ({ label: String(index + 1), value }));
  const layout = VisualPlan.trendLabelLayout(data, {
    plans: VisualPlan.trendLabelPlan(data),
    points: [
      { x: 2, y: 10 },
      { x: 105, y: 60 },
      { x: 210, y: 80 }
    ],
    labelSizes: data.map(() => ({ width: 70, height: 28 })),
    boundary: { left: 0, top: 0, right: 220, bottom: 170 },
    pointRadius: 6,
    pointPadding: 5,
    labelPadding: 6,
    lineTolerance: 4,
    lineStrokeWidth: 4,
    labelBackgroundPadding: 2
  });

  assert.equal(layout[0].showLabel, true);
  assert.equal(layout[0].placement, 'endpoint-search');
  assert.ok(layout[0].box.left >= 0 && layout[0].box.right <= 220);
  assert.ok(layout[0].box.top >= 0 && layout[0].box.bottom <= 170);
  assert.equal(
    VisualPlan.trendLabelLineOverlapCount(layout, [
      { x: 2, y: 10 },
      { x: 105, y: 60 },
      { x: 210, y: 80 }
    ], 8),
    0
  );
});

test('supporting facts render as an unboxed inline context rail', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(runtime, /tochnyi-context-rail/);
  assert.match(runtime, /tochnyi-context-item/);
  assert.match(css, /\.tochnyi-context-rail\s*\{/);
  assert.doesNotMatch(css, /\.tochnyi-context-item\s*\{[^}]*border:/s);
  assert.doesNotMatch(css, /\.tochnyi-context-item\s*\{[^}]*background:/s);
});

test('context planning compacts secondary layers when the information budget is exceeded', () => {
  const plan = VisualPlan.contextLayoutPlan({
    narrative: { density: 'editorial' },
    supportingFacts: new Array(4).fill(null).map((_, index) => ({ value: String(index), label: 'Fact' })),
    references: [{ value: 1, label: 'Reference' }],
    primaryMetric: { value: '10', label: 'Primary' },
    emphasis: { direction: 'up', label: 'Change' },
    note: 'Note'
  }, new Array(3).fill(null).map((_, index) => ({ label: String(index), annotation: 'Annotation' })));
  assert.ok(plan.contextLoad > plan.budget);
  assert.equal(plan.annotationMode, 'compact');
  assert.equal(plan.compactFacts, true);
});

test('column labels fall outside when an inside label cannot physically fit', () => {
  const plan = { chartHeight: 540, compact: false, labelMode: 'inside' };
  const bounds = { minimum: -20, maximum: 56 };
  const smallLoss = VisualPlan.columnLabelPlacement(
    { value: -10.7, display: '−10.7' },
    bounds,
    plan,
    { plotHeight: 390, barHeight: 43, labelHeight: 50.8, fontSize: 28 }
  );
  assert.equal(smallLoss.inside, false);
  assert.equal(smallLoss.fellBackOutside, true);
  assert.equal(smallLoss.placement, 'start');
  assert.equal(smallLoss.locationY, 0);
  assert.equal(smallLoss.centerYPercent, 100);
  assert.ok(smallLoss.dy < 0);

  const lossWithEndRoom = VisualPlan.columnLabelPlacement(
    { value: -5, display: '−5' },
    bounds,
    plan,
    { plotHeight: 390, barHeight: 24, labelHeight: 50.8, fontSize: 28 }
  );
  assert.equal(lossWithEndRoom.placement, 'end');
  assert.equal(lossWithEndRoom.locationY, 1);
  assert.equal(lossWithEndRoom.centerYPercent, 0);
  assert.ok(lossWithEndRoom.dy > 0);

  const tallLoss = VisualPlan.columnLabelPlacement(
    { value: -18, display: '−18' },
    bounds,
    plan,
    { plotHeight: 390, barHeight: 92, labelHeight: 50.8, fontSize: 28 }
  );
  assert.equal(tallLoss.inside, true);
  assert.equal(tallLoss.locationY, 0.5);
  assert.equal(tallLoss.centerYPercent, 50);
  assert.equal(tallLoss.dy, 0);
});

test('Russia region registry exposes stable ISO-style identifiers', () => {
  const regionSet = TochnyiMaps.getRegionSet('russia');
  assert.ok(regionSet);
  assert.equal(Object.keys(regionSet.regions).length, 83);
  assert.equal(regionSet.regions['RU-OMS'], 'Omsk');
  assert.equal(regionSet.regions['RU-ZAB'], 'Zabaykalsky');
  assert.deepEqual(regionSet.detachedRegionIds, ['RU-KGD']);
});

test('regional maps use a restrained non-flag-like status palette', () => {
  const policy = TochnyiMaps.visualPolicy;
  assert.equal(policy.statusColors.improving, '#3f727b');
  assert.equal(policy.statusColors.critical, '#a45350');
  assert.equal(policy.statusColors.blocked, '#66505e');
  assert.notEqual(policy.statusColors.improving, '#008844');
  assert.notEqual(policy.statusColors.critical, '#cc0000');
  assert.equal(policy.inactiveFill, '#c3cbd0');
  assert.ok(policy.activeFillOpacity < 0.9);
  assert.ok(policy.inactiveFillOpacity < policy.activeFillOpacity);
});

test('regional maps suppress centroid dots unless explicitly requested', () => {
  assert.equal(TochnyiMaps.resolveAnchorStyle({ anchorStyle: 'auto' }), 'none');
  assert.equal(TochnyiMaps.resolveAnchorStyle({ anchorStyle: 'none' }), 'none');
  assert.equal(TochnyiMaps.resolveAnchorStyle({ anchorStyle: 'dot' }), 'dot');
});

test('regional maps permanently suppress competing summary cards', () => {
  const data = [
    ...new Array(1).fill(null).map((_, index) => ({ label: `Improving ${index}`, status: 'improving' })),
    ...new Array(5).fill(null).map((_, index) => ({ label: `Critical ${index}`, status: 'critical' })),
    ...new Array(2).fill(null).map((_, index) => ({ label: `Blocked ${index}`, status: 'blocked' })),
    ...new Array(2).fill(null).map((_, index) => ({ label: `Strained ${index}`, status: 'strained' }))
  ];
  const redundant = TochnyiMaps.resolveSummaryPlan({
    map: { summaryDisplay: 'hide', summaryPosition: 'none' },
    data,
    primaryMetric: { value: '10 regions', label: 'regional conditions tracked' },
    supportingFacts: [
      { value: '7', label: 'critical or blocked regions', tone: 'critical' },
      { value: '1', label: 'regions where limits were lifted', tone: 'positive' }
    ]
  });
  assert.equal(redundant.show, false);
  assert.equal(redundant.reason, 'regional-summary-disabled');

  const informative = TochnyiMaps.resolveSummaryPlan({
    map: { summaryDisplay: 'hide', summaryPosition: 'none' },
    data,
    primaryMetric: { value: '₽86.5bn', label: 'total investment at risk' },
    supportingFacts: [{ value: '₽126bn', label: 'estimated rebuild cost', tone: 'critical' }]
  });
  assert.equal(informative.show, false);
  assert.equal(informative.reason, 'regional-summary-disabled');
  assert.equal(TochnyiMaps.resolveSummaryPlan({
    map: { summaryDisplay: 'show' }, data, primaryMetric: { value: '10 regions', label: 'tracked' }
  }).show, false);
});

test('regional map callouts preserve geographic order by default', () => {
  const entries = new Array(5).fill(null).map((_, index) => ({ index }));
  assert.equal(TochnyiMaps.resolveCalloutDistribution({ calloutDistribution: 'auto' }, false, entries), 'geographic');
  assert.equal(TochnyiMaps.resolveCalloutDistribution({ calloutDistribution: 'auto' }, true, entries), 'geographic');
  assert.equal(TochnyiMaps.resolveCalloutDistribution({ calloutDistribution: 'geographic' }, false, entries), 'geographic');
  assert.equal(TochnyiMaps.resolveCalloutDistribution({ calloutDistribution: 'balanced' }, false, entries), 'balanced');
});

test('regional map leader routing automatically fans out crowded anchor clusters', () => {
  const entries = [100, 104, 109, 113, 119].map((y, index) => ({
    index,
    side: 'left',
    point: { x: 500 + index * 20, y },
    endY: 95 + index * 18
  }));
  assert.equal(TochnyiMaps.resolveLeaderRouting({ leaderRouting: 'auto' }, entries, { gap: 16 }), 'lanes');
  const planned = TochnyiMaps.planLeaderRoutes(entries, {
    routing: 'auto', top: 80, bottom: 180, gap: 16
  });
  assert.equal(planned.routing, 'lanes');
  assert.ok(planned.every((entry) => entry.sideCount === entries.length));
  const destinationOrder = planned.slice().sort((first, second) => first.endY - second.endY);
  assert.deepEqual(
    destinationOrder.map((entry) => entry.approachLaneIndex),
    [4, 3, 2, 1, 0],
    'card approaches are nested from outermost at the top to innermost at the bottom'
  );

  const separated = [90, 140, 190].map((y, index) => ({
    index,
    side: 'left',
    point: { x: 500 + index * 20, y },
    endY: y
  }));
  assert.equal(TochnyiMaps.resolveLeaderRouting({ leaderRouting: 'auto' }, separated, { gap: 16 }), 'direct');

  const lanePlan = TochnyiMaps.planLeaderRoutes(entries, {
    routing: 'lanes', top: 80, bottom: 180, gap: 16
  });
  assert.equal(lanePlan.routing, 'lanes');
  assert.deepEqual(lanePlan.map((entry) => entry.laneIndex).sort((a, b) => a - b), [0, 1, 2, 3, 4]);
  assert.ok(lanePlan.every((entry) => entry.sideCount === entries.length));
  const routeYs = lanePlan.slice().sort((a, b) => a.routeY - b.routeY).map((entry) => entry.routeY);
  for (let index = 1; index < routeYs.length; index += 1) {
    assert.ok(routeYs[index] - routeYs[index - 1] >= 15.9, 'explicit lane corridors must retain visible separation');
  }
  assert.equal(TochnyiMaps.resolveLeaderRouting({ leaderRouting: 'direct' }, entries), 'direct');
  assert.equal(TochnyiMaps.resolveLeaderRouting({ leaderRouting: 'lanes' }, entries), 'lanes');
});

test('dense regional maps switch to ordered edge ports', () => {
  const entries = new Array(10).fill(null).map((_, index) => ({
    index,
    side: index < 5 ? 'left' : 'right',
    top: (index % 5) * 90,
    endY: 100 + (index % 5) * 95,
    point: { x: 430 + index * 22, y: 280 + (index % 5) * 18 }
  }));
  const planned = TochnyiMaps.planLeaderRoutes(entries, {
    routing: 'auto', top: 80, bottom: 540, gap: 22
  });
  assert.equal(planned.routing, 'ports');
  ['left', 'right'].forEach((side) => {
    const sideEntries = planned.filter((entry) => entry.side === side)
      .sort((first, second) => first.point.y - second.point.y);
    for (let index = 1; index < sideEntries.length; index += 1) {
      assert.ok(sideEntries[index].portY > sideEntries[index - 1].portY);
      assert.ok(sideEntries[index].portY - sideEntries[index - 1].portY >= 21.9);
    }
  });
  assert.equal(TochnyiMaps.resolveLeaderRouting({ leaderRouting: 'ports' }, entries), 'ports');
  assert.equal(TochnyiMaps.resolveLeaderRouting({ leaderRouting: 'indexed' }, entries), 'indexed');
});

test('dense map callout placement minimizes crossings across balanced side assignments', () => {
  const points = [
    [409, 419], [296, 461], [344, 432], [308, 476], [463, 428],
    [434, 425], [254, 441], [575, 441], [359, 430], [278, 487]
  ];
  const heights = [90, 90, 106, 90, 106, 106, 82, 82, 82, 90];
  const entries = points.map((point, index) => ({
    index,
    item: {},
    point: { x: point[0], y: point[1] },
    height: heights[index],
    side: 'left'
  }));
  const previousLeft = [5, 4, 8, 6, 9].map((index) => entries[index]);
  const previousRight = [0, 2, 7, 1, 3].map((index) => entries[index]);
  previousLeft.forEach((entry) => { entry.side = 'left'; entry.initialSide = 'left'; });
  previousRight.forEach((entry) => { entry.side = 'right'; entry.initialSide = 'right'; });
  const geometry = {
    width: 1190,
    cardWidth: 210,
    topLeft: 10,
    topRight: 10,
    bottom: 620,
    gap: 7,
    attachmentInset: 14,
    desiredLeft: 5
  };
  const baseline = TochnyiMaps.scoreCalloutPlacement(previousLeft, previousRight, geometry);
  assert.equal(baseline.crossings, 6);

  const optimizedEntries = entries.map((entry) => ({
    ...entry,
    item: {},
    side: entry.point.x < geometry.width / 2 ? 'left' : 'right'
  }));
  const optimized = TochnyiMaps.optimizeCalloutPlacement(optimizedEntries, geometry);
  assert.equal(optimized.left.length, 5);
  assert.equal(optimized.right.length, 5);
  assert.equal(optimized.predictedCrossings, 0);
  assert.equal(optimized.assignmentEvaluations, 252);
  assert.ok(Number.isFinite(optimized.maximumAttachmentSlope));
  assert.ok(optimized.maximumAttachmentSlope < 2.1);
  assert.ok(optimized.attachmentSharpness < 1.3);
  assert.ok(optimized.left.every((entry) => entry.side === 'left'));
  assert.ok(optimized.right.every((entry) => entry.side === 'right'));

  const fixed = optimizedEntries.map((entry) => ({ ...entry, item: {} }));
  fixed[2].item.calloutSide = 'left';
  fixed[8].item.calloutSide = 'right';
  const constrained = TochnyiMaps.optimizeCalloutPlacement(fixed, geometry);
  assert.ok(constrained.left.includes(fixed[2]));
  assert.ok(constrained.right.includes(fixed[8]));
});

test('regional breakdown policy centralizes layout and routing defaults', () => {
  const dense = TochnyiMaps.getRegionalBreakdownPolicy({ count: 10 });
  const standard = TochnyiMaps.getRegionalBreakdownPolicy({ count: 4 });
  assert.equal(dense.dense, true);
  assert.equal(dense.cardWidth, 190);
  assert.equal(dense.cardGap, 7);
  assert.equal(dense.attachmentInset, 14);
  assert.equal(dense.portGap, 18);
  assert.equal(dense.minimumCardStub, 36);
  assert.equal(dense.leaderClearance, 16);
  assert.equal(dense.shapeClearance, 2);
  assert.equal(standard.dense, false);
  assert.equal(standard.cardWidth, 204);
  assert.equal(standard.cardGap, 10);
  assert.equal(standard.portGap, 22);
  assert.equal(standard.leaderClearance, 14);
  assert.equal(TochnyiMaps.regionalBreakdownPolicy.portRoutingThreshold, 6);
});

test('supporting context switches prose values to a stacked text treatment', () => {
  const prose = VisualPlan.contextFactLayout({ value: 'Universal model ended' });
  const metric = VisualPlan.contextFactLayout({ value: '+15% to +25%' });
  assert.equal(prose.mode, 'stacked');
  assert.equal(prose.proseValue, true);
  assert.equal(metric.mode, 'inline');
  assert.equal(metric.proseValue, false);
});

test('relative percentage declines render as retained outcome levels', () => {
  const source = loadExample('farm-diesel-range.json');
  const spec = {
    ...source,
    title: 'Shipments are expected to fall on both comparisons',
    subtitle: 'The chart should show what remains, not encode a decline as a positive result.',
    data: [
      {
        label: 'Year-over-year decline',
        low: 25,
        high: 35,
        quantity: 'shipment decline',
        scope: 'Black Sea coal shipments',
        period: 'July 2026',
        tone: 'critical'
      },
      {
        label: 'Month-over-month decline',
        low: 15,
        high: 25,
        quantity: 'shipment decline',
        scope: 'Black Sea coal shipments',
        period: 'July 2026',
        tone: 'warning'
      }
    ],
    references: [],
    measure: {
      unit: '% change',
      axisTitle: 'Shipment change',
      valueMode: 'relative-change',
      levelAvailability: 'unavailable',
      normalizationNote: 'The fixture supplies only source-reported decline ranges, not comparable shipment levels.',
      decimals: 0,
      baseline: 'zero',
      scale: 'linear',
      quantity: 'shipment decline'
    },
    primaryMetric: undefined,
    supportingFacts: [],
    metadata: {
      slug: 'shipment-decline-outcome-test',
      topic: 'shipment decline',
      country: 'Russia',
      dataPeriod: 'July 2026',
      keyFinding: 'Shipments fell on both comparisons.'
    }
  };
  const validation = validateSpec(spec);
  assert.equal(validation.valid, true, validation.errors.join('; '));
  assert.deepEqual(validation.normalized.data.map((item) => item.direction), ['down', 'down']);

  const plan = VisualPlan.percentageChangeRangePlan(validation.normalized, validation.normalized.data);
  assert.equal(plan.mode, 'outcome-index');
  assert.equal(plan.baseline, 100);
  assert.deepEqual(
    plan.items.map((item) => [item.outcomeLow, item.outcomeHigh]),
    [[65, 75], [75, 85]]
  );
  assert.equal(plan.items[0].outcomeDisplay, '65–75% of prior level');
  assert.equal(plan.items[0].impactDisplay, '25–35% lower');
});

test('leader crowding detects long near-parallel routes without treating separated routes as crowded', () => {
  const base = [[{ x: 0, y: 0 }, { x: 120, y: 0 }]];
  const close = [[{ x: 0, y: 8 }, { x: 120, y: 8 }]];
  const separated = [[{ x: 0, y: 40 }, { x: 120, y: 40 }]];
  const closeMetrics = TochnyiMaps.sampledSegmentCrowding(base, close, 14);
  const separatedMetrics = TochnyiMaps.sampledSegmentCrowding(base, separated, 14);
  assert.equal(closeMetrics.significant, true);
  assert.ok(closeMetrics.score > 8);
  assert.equal(separatedMetrics.significant, false);
  assert.equal(separatedMetrics.score, 0);
});

test('regional breakdown planner owns routing mode, side assignment, and distribution', () => {
  const entries = new Array(8).fill(null).map((_, index) => ({
    index,
    item: {},
    point: { x: 260 + index * 65, y: 180 + index * 38 },
    height: 82,
    side: index < 4 ? 'left' : 'right'
  }));
  const plan = TochnyiMaps.planRegionalBreakdown(entries, {
    map: { leaderRouting: 'auto', calloutDistribution: 'auto' },
    dense: false,
    width: 1190,
    cardWidth: 204,
    topLeft: 10,
    topRight: 10,
    bottom: 620,
    summaryShown: false,
    summaryOnRight: false
  });
  assert.equal(plan.usePortRouting, true);
  assert.equal(plan.placementMode, 'crossing-optimized-ports');
  assert.equal(plan.sides.left.length, 4);
  assert.equal(plan.sides.right.length, 4);
  assert.equal(plan.leftDistribution, 'geographic');
  assert.equal(plan.rightDistribution, 'geographic');
  assert.ok(plan.placement.assignmentEvaluations > 0);
});

test('medium regional maps use the bounded port spline before direct lanes become visually unstable', () => {
  const entries = new Array(7).fill(null).map((_, index) => ({
    index,
    item: {},
    point: { x: 330 + index * 48, y: 180 + index * 31 },
    height: 86,
    side: index < 4 ? 'left' : 'right'
  }));
  const plan = TochnyiMaps.planRegionalBreakdown(entries, {
    map: { leaderRouting: 'auto', calloutDistribution: 'balanced' },
    dense: false,
    width: 1190,
    cardWidth: 204,
    topLeft: 10,
    topRight: 10,
    bottom: 620,
    summaryShown: false,
    summaryOnRight: false
  });
  assert.equal(plan.usePortRouting, true);
  assert.equal(plan.placementMode, 'crossing-optimized-ports');
  const routed = TochnyiMaps.planLeaderRoutes(plan.sides.left.concat(plan.sides.right), {
    routing: 'auto',
    top: 20,
    bottom: 590,
    gap: 22
  });
  assert.equal(routed.routing, 'ports',
    'placement and route construction must use the same centralized threshold');
});

test('sparse regional maps optimize callout order before drawing direct leaders', () => {
  const entries = [
    { index: 0, item: { calloutSide: 'left' }, point: { x: 430, y: 390 }, height: 92, side: 'left' },
    { index: 1, item: { calloutSide: 'left' }, point: { x: 455, y: 190 }, height: 92, side: 'left' },
    { index: 2, item: { calloutSide: 'right' }, point: { x: 735, y: 205 }, height: 92, side: 'right' },
    { index: 3, item: { calloutSide: 'right' }, point: { x: 760, y: 405 }, height: 92, side: 'right' }
  ];
  const geometry = {
    map: { leaderRouting: 'direct', calloutDistribution: 'geographic' },
    dense: false,
    width: 1190,
    cardWidth: 204,
    topLeft: 20,
    topRight: 20,
    bottom: 590,
    summaryShown: false,
    summaryOnRight: false
  };
  const baseline = TochnyiMaps.scoreCalloutPlacement(
    entries.slice(0, 2),
    entries.slice(2),
    {
      width: geometry.width,
      cardWidth: geometry.cardWidth,
      topLeft: geometry.topLeft,
      topRight: geometry.topRight,
      bottom: geometry.bottom,
      gap: 10,
      leftDistribution: 'geographic',
      rightDistribution: 'geographic',
      preserveOrder: true
    }
  );
  const plan = TochnyiMaps.planRegionalBreakdown(entries, geometry);
  assert.equal(plan.usePortRouting, false);
  assert.equal(plan.placementMode, 'crossing-optimized-direct');
  assert.deepEqual(plan.sides.left.map((entry) => entry.index), [1, 0]);
  assert.deepEqual(plan.sides.right.map((entry) => entry.index), [2, 3]);
  assert.equal(plan.placement.predictedCrossings, 0);
  assert.ok(plan.placement.predictedLength <= baseline.length);
});

test('edge-port leaders use a smooth region curve and readable horizontal card connection', () => {
  const leftPath = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 520, y: 310 },
    portY: 180
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 180,
    portOffset: 10
  });
  assert.match(leftPath.path, /^M 520 310 C /);
  assert.match(leftPath.path, / 252 180 H 220$/);
  assert.equal(leftPath.portX, 252);
  assert.equal(leftPath.portY, 180);
  assert.equal(leftPath.cardStubLength, 32);
  assert.ok(leftPath.firstControlX < 520);
  assert.ok(leftPath.secondControlX > 252);

  const rightPath = TochnyiMaps.buildPortLeaderPath({
    side: 'right',
    point: { x: 610, y: 330 },
    portY: 450
  }, {
    mapEdgeX: 960,
    cardX: 980,
    endY: 450,
    portOffset: 10
  });
  assert.match(rightPath.path, /^M 610 330 C /);
  assert.match(rightPath.path, / 948 450 H 980$/);
  assert.equal(rightPath.portX, 948);
  assert.equal(rightPath.cardStubLength, 32);
  assert.ok(rightPath.firstControlX > 610);
  assert.ok(rightPath.secondControlX < 948);
});

test('port detours do not reverse into their terminal card stub', () => {
  const straight = (start, end) => ({
    start,
    control1: {
      x: start.x + (end.x - start.x) / 3,
      y: start.y + (end.y - start.y) / 3
    },
    control2: {
      x: start.x + (end.x - start.x) * 2 / 3,
      y: start.y + (end.y - start.y) * 2 / 3
    },
    end
  });
  const routed = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 238, y: 336 },
    portY: 265,
    portIndex: 2,
    sideCount: 6
  }, {
    mapEdgeX: 244,
    cardX: 220,
    cardTop: 255,
    cardBottom: 336,
    portOffset: 10,
    minimumCardStub: 32,
    routeTop: 80,
    routeBottom: 520,
    routeLeft: 180,
    routeRight: 430,
    avoidRoutes: [[straight({ x: 180, y: 300 }, { x: 300, y: 300 })]],
    samplesPerSegment: 48
  });
  assert.equal(routed.fallback, false);
  assert.equal(routed.selfIntersection, false);
  const approach = routed.routeSegments[routed.routeSegments.length - 2];
  const terminal = routed.routeSegments[routed.routeSegments.length - 1];
  const tangentX = approach.end.x - approach.control2.x;
  const cardDirection = Math.sign(terminal.end.x - terminal.start.x);
  assert.ok(Math.abs(tangentX) < 0.5 || tangentX * cardDirection >= 0,
    'the final curve must arrive from the map side before entering the card');
});

test('leader detours fan out before turning around a nearby route', () => {
  const cubic = (start, control1, control2, end) => ({ start, control1, control2, end });
  const straight = (start, end) => cubic(
    start,
    {
      x: start.x + (end.x - start.x) / 3,
      y: start.y + (end.y - start.y) / 3
    },
    {
      x: start.x + (end.x - start.x) * 2 / 3,
      y: start.y + (end.y - start.y) * 2 / 3
    },
    end
  );
  const priorRoute = [
    cubic(
      { x: 322.4893323171313, y: 367.3365011510068 },
      { x: 437.99146585370505, y: 367.3365011510068 },
      { x: 703.6463729878246, y: 237.8 },
      { x: 900, y: 237.8 }
    ),
    straight({ x: 900, y: 237.8 }, { x: 932, y: 237.8 })
  ];
  const routed = TochnyiMaps.buildPortLeaderPath({
    side: 'right',
    point: { x: 297.4499915498942, y: 368.0431577728622 },
    portY: 353.2,
    portIndex: 2,
    sideCount: 4
  }, {
    mapEdgeX: 910,
    cardX: 932,
    cardTop: 335,
    cardBottom: 420,
    endY: 353.2,
    portOffset: 10,
    minimumCardStub: 32,
    leaderClearance: 14,
    obstacles: [],
    sourceObstacles: [],
    routeTop: 80,
    routeBottom: 520,
    routeLeft: 246,
    routeRight: 900,
    samplesPerSegment: 48,
    preferSmooth: true,
    avoidRoutes: [priorRoute]
  });
  const chordLengths = routed.routeSegments.map((segment) => Math.hypot(
    segment.end.x - segment.start.x,
    segment.end.y - segment.start.y
  ));
  assert.equal(routed.fallback, false);
  assert.equal(routed.routeCrossings, 0);
  assert.equal(routed.selfIntersection, false);
  assert.equal(routed.smooth, true);
  assert.equal(routed.candidateSource, 'route-fan-single',
    'leader-only interference should use one continuous fan spline before multi-turn detours');
  assert.equal((routed.path.match(/\bC\b/g) || []).length, 1,
    'the route to the callout must contain one cubic spline, not a chain of corrective bends');
  assert.equal(routed.routeSegments.length, 2,
    'one spline plus the horizontal card stub is the complete route');
  assert.ok(routed.minimumRouteGap >= 13.9,
    'the detour must preserve the configured leader clearance');
  assert.ok(Math.min(...chordLengths) >= 28,
    'the route must fan out before turning instead of using tiny local S-curves');
});

test('obstacle detours reject false-smooth terminal box turns', () => {
  const cubic = (start, control1, control2, end) => ({ start, control1, control2, end });
  const straight = (start, end) => cubic(
    start,
    {
      x: start.x + (end.x - start.x) / 3,
      y: start.y + (end.y - start.y) / 3
    },
    {
      x: start.x + (end.x - start.x) * 2 / 3,
      y: start.y + (end.y - start.y) * 2 / 3
    },
    end
  );
  const priorRoute = [
    cubic(
      { x: 358, y: 386 },
      { x: 516, y: 386 },
      { x: 881, y: 354 },
      { x: 1150, y: 354 }
    ),
    straight({ x: 1150, y: 354 }, { x: 1182, y: 354 })
  ];
  const routed = TochnyiMaps.buildPortLeaderPath({
    side: 'right',
    point: { x: 324, y: 387 },
    portY: 396,
    portIndex: 3,
    sideCount: 4
  }, {
    mapEdgeX: 1160,
    cardX: 1182,
    cardTop: 378,
    cardBottom: 462,
    endY: 396,
    portOffset: 10,
    minimumCardStub: 32,
    leaderClearance: 14,
    obstacles: [{ left: 340, right: 385, top: 370, bottom: 405 }],
    sourceObstacles: [],
    routeTop: 80,
    routeBottom: 520,
    routeLeft: 250,
    routeRight: 1150,
    samplesPerSegment: 48,
    preferSmooth: true,
    avoidRoutes: [priorRoute]
  });
  assert.equal(routed.fallback, false);
  assert.equal(routed.collisionCount, 0);
  assert.equal(routed.routeCrossings, 0);
  assert.equal(routed.directionReversalCount, 0);
  assert.equal(routed.controlReverseDistance, 0);
  assert.equal(routed.terminalBoxTurn, false);
  assert.ok(routed.terminalApproachRun >= 28);
  assert.equal((routed.path.match(/\bC\b/g) || []).length, 1,
    'a simple obstruction should produce one continuous fan spline, not corrective S-turns');
});

test('successive crowded leaders remain single logical splines', () => {
  const cubic = (start, control1, control2, end) => ({ start, control1, control2, end });
  const straight = (start, end) => cubic(
    start,
    {
      x: start.x + (end.x - start.x) / 3,
      y: start.y + (end.y - start.y) / 3
    },
    {
      x: start.x + (end.x - start.x) * 2 / 3,
      y: start.y + (end.y - start.y) * 2 / 3
    },
    end
  );
  const firstRoute = [
    cubic(
      { x: 322.4893323171313, y: 367.3365011510068 },
      { x: 437.99146585370505, y: 367.3365011510068 },
      { x: 703.6463729878246, y: 237.8 },
      { x: 900, y: 237.8 }
    ),
    straight({ x: 900, y: 237.8 }, { x: 932, y: 237.8 })
  ];
  const common = {
    mapEdgeX: 910,
    cardX: 932,
    portOffset: 10,
    minimumCardStub: 32,
    leaderClearance: 14,
    obstacles: [],
    sourceObstacles: [],
    routeTop: 80,
    routeBottom: 520,
    routeLeft: 246,
    routeRight: 900,
    samplesPerSegment: 48,
    preferSmooth: true
  };
  const secondRoute = TochnyiMaps.buildPortLeaderPath({
    side: 'right',
    point: { x: 297.4499915498942, y: 368.0431577728622 },
    portY: 353.2,
    portIndex: 2,
    sideCount: 4
  }, {
    ...common,
    cardTop: 335,
    cardBottom: 420,
    endY: 353.2,
    avoidRoutes: [firstRoute]
  });
  const thirdRoute = TochnyiMaps.buildPortLeaderPath({
    side: 'right',
    point: { x: 295.3870335632557, y: 392.83108079225303 },
    portY: 407.6,
    portIndex: 3,
    sideCount: 4
  }, {
    ...common,
    cardTop: 390,
    cardBottom: 475,
    endY: 407.6,
    avoidRoutes: [firstRoute, secondRoute.routeSegments]
  });

  [secondRoute, thirdRoute].forEach((route) => {
    assert.equal(route.candidateSource, 'route-fan-single');
    assert.equal((route.path.match(/\bC\b/g) || []).length, 1);
    assert.equal(route.routeSegments.length, 2);
    assert.equal(route.routeCrossings, 0);
    assert.equal(route.selfIntersection, false);
    assert.ok(route.minimumRouteGap >= 13.9);
  });
});

test('steep box connectors reserve a long horizontal terminal tangent', () => {
  const steep = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 359, y: 430 },
    portY: 110
  }, {
    mapEdgeX: 246,
    cardX: 220,
    endY: 110,
    minimumCardStub: 36,
    obstacles: []
  });
  const values = steep.path.split(/\s+/);
  const control2X = Number(values[6]);
  const control2Y = Number(values[7]);
  const endX = Number(values[8]);
  const endY = Number(values[9]);
  assert.ok(Math.abs(control2X - endX) >= 70,
    'large vertical displacement must receive enough horizontal runway to avoid a sharp box turn');
  assert.equal(control2Y, endY, 'the curve must remain tangent to the horizontal box connector');
  assert.equal(steep.fallback, false);
});

test('near-card regional anchors use a direct horizontal connection without a spline kink', () => {
  const nearCard = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 255, y: 445 },
    portY: 454
  }, {
    mapEdgeX: 246,
    cardX: 220,
    cardTop: 410,
    cardBottom: 492,
    endY: 454,
    minimumCardStub: 36,
    obstacles: [],
    samplesPerSegment: 36
  });
  assert.equal(nearCard.avoidance, 'near-card');
  assert.equal(nearCard.path, 'M 255 445 H 220');
  assert.equal(nearCard.portX, 255);
  assert.equal(nearCard.portY, 445);
  assert.equal(nearCard.cardStubLength, 35);
  assert.equal(nearCard.collisionCount, 0);
  assert.doesNotMatch(nearCard.path, /\sC\s/);
});

test('close card routes spend the available gutter on a monotonic smooth curve', () => {
  const closeRoute = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 279, y: 489 },
    portY: 546
  }, {
    mapEdgeX: 246,
    cardX: 220,
    cardTop: 530,
    cardBottom: 620,
    endY: 546,
    minimumCardStub: 36,
    obstacles: [],
    samplesPerSegment: 36
  });
  assert.equal(closeRoute.avoidance, 'direct');
  assert.equal(closeRoute.adaptiveCardStub, true);
  assert.ok(closeRoute.cardStubLength >= 14 && closeRoute.cardStubLength < 24);
  const values = closeRoute.path.split(/\s+/);
  const startX = Number(values[1]);
  const control1X = Number(values[4]);
  const control2X = Number(values[6]);
  const endX = Number(values[8]);
  const control2Y = Number(values[7]);
  const endY = Number(values[9]);
  assert.ok(startX > control1X && control1X > control2X && control2X > endX,
    'close left-side curves must progress monotonically toward the card');
  assert.equal(control2Y, endY, 'the curve must arrive tangent to the horizontal card attachment');
  assert.match(closeRoute.path, / H 220$/);
});

test('edge-port leaders curve around highlighted-region obstacles when a corridor exists', () => {
  const routed = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 520, y: 310 },
    portY: 180
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 180,
    portOffset: 10,
    obstacles: [{ left: 330, right: 430, top: 220, bottom: 300 }],
    obstacleClearance: 8,
    routeTop: 80,
    routeBottom: 500,
    samplesPerSegment: 48
  });
  assert.equal(routed.directCollisionCount, 1);
  assert.equal(routed.collisionCount, 0);
  assert.equal(routed.fallback, false);
  assert.equal(routed.avoidance, 'above');
  assert.equal(routed.routingEnvelope, 'strict');
  assert.ok(routed.verticalExcursion <= 0.01,
    'when the destination is above and an upper corridor is clear, the route must not form a lower U-shaped detour');
  const routedCurveCount = (routed.path.match(/\sC\s/g) || []).length;
  assert.ok(routedCurveCount >= 2 && routedCurveCount <= 3,
    'obstacle detours should use no more than three smooth cubic sections');
  assert.equal((routed.path.match(/\sH\s/g) || []).length, 1);
  assert.doesNotMatch(routed.path, /\s[LVQ]\s/);
  assert.ok(routed.cardStubLength >= 32);
  const cubicSegments = routed.path.split(' C ').slice(1).map((segment) => {
    const values = segment.split(/\s+/).slice(0, 6).map(Number);
    return {
      control1: { x: values[0], y: values[1] },
      control2: { x: values[2], y: values[3] },
      end: { x: values[4], y: values[5] }
    };
  });
  assert.ok(cubicSegments.every((segment) => !(
    Math.abs(segment.control1.y - segment.control2.y) < 0.01 &&
    Math.abs(segment.control2.y - segment.end.y) < 0.01
  )), 'detour cubics must not collapse into a flat shared trunk');
  for (let index = 0; index < cubicSegments.length - 1; index += 1) {
    const current = cubicSegments[index];
    const next = cubicSegments[index + 1];
    const incoming = {
      x: current.end.x - current.control2.x,
      y: current.end.y - current.control2.y
    };
    const outgoing = {
      x: next.control1.x - current.end.x,
      y: next.control1.y - current.end.y
    };
    const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
    const dot = incoming.x * outgoing.x + incoming.y * outgoing.y;
    assert.ok(Math.abs(cross) < 0.001, 'adjacent detour cubics must share one tangent');
    assert.ok(dot > 0, 'adjacent detour cubics must continue in the same direction');
  }
  const finalSegment = cubicSegments[cubicSegments.length - 1];
  assert.ok(Math.abs(finalSegment.control2.y - finalSegment.end.y) < 0.001,
    'the final curve must arrive horizontally before the card stub');

  const optionalSourceExit = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 520, y: 310 },
    portY: 180
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 180,
    portOffset: 10,
    obstacles: [{ left: 330, right: 430, top: 220, bottom: 300 }],
    sourceObstacles: [{ left: 500, right: 540, top: 290, bottom: 330 }],
    obstacleClearance: 8,
    routeTop: 80,
    routeBottom: 500,
    samplesPerSegment: 48
  });
  assert.equal(optionalSourceExit.directCollisionCount, 1);
  assert.equal(optionalSourceExit.collisionCount, 0);
  assert.equal(optionalSourceExit.sourceExitUsed, false,
    'the router must discard a source-exit waypoint when a simpler clear detour exists');
  assert.doesNotMatch(optionalSourceExit.path, /\s[LVQ]\s/,
    'obstacle fallback leaders must keep every visible turn cubic');
  assert.ok((optionalSourceExit.path.match(/\sC\s/g) || []).length <= 3,
    'optional source geometry must not add an extra curve section');

  const envelopeBlocked = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 520, y: 310 },
    portY: 180
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 180,
    portOffset: 10,
    obstacles: [{ left: 330, right: 430, top: 170, bottom: 320 }],
    obstacleClearance: 8,
    routeTop: 80,
    routeBottom: 500,
    samplesPerSegment: 48
  });
  assert.equal(envelopeBlocked.routingEnvelope, 'expanded');
  assert.ok(envelopeBlocked.verticalExcursion > 0,
    'the router may leave the endpoint envelope only when the envelope itself is blocked');
  assert.equal(envelopeBlocked.collisionCount, 0);
  assert.equal(envelopeBlocked.fallback, false);

  const blocked = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 520, y: 310 },
    portY: 180
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 180,
    portOffset: 10,
    obstacles: [{ left: 250, right: 510, top: 150, bottom: 350 }],
    obstacleClearance: 8,
    routeTop: 150,
    routeBottom: 350,
    samplesPerSegment: 48
  });
  assert.equal(blocked.avoidance, 'fallback');
  assert.equal(blocked.fallback, true);
  assert.ok(blocked.collisionCount > 0);

  const nestedSource = TochnyiMaps.buildPortLeaderPath({
    side: 'left',
    point: { x: 520, y: 310 },
    portY: 180
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 180,
    portOffset: 10,
    obstacles: [{
      left: 450,
      right: 560,
      top: 240,
      bottom: 380,
      contains: () => true,
      exactContains: () => true
    }],
    sourceObstacles: [{ left: 500, right: 540, top: 290, bottom: 330 }],
    obstacleClearance: 8,
    routeTop: 80,
    routeBottom: 500,
    samplesPerSegment: 48
  });
  assert.equal(nestedSource.fallback, false,
    'a containing active region must not make a nested source route impossible');
  assert.equal(nestedSource.collisionCount, 0);
});

test('indexed regional markers deconflict nearby anchors with short local links', () => {
  const entries = new Array(8).fill(null).map((_, index) => ({
    index,
    markerIndex: index + 1,
    point: { x: 500 + (index % 2) * 4, y: 320 + Math.floor(index / 2) * 3 }
  }));
  const markers = TochnyiMaps.planIndexedMarkers(entries, {
    left: 350,
    right: 650,
    top: 190,
    bottom: 450,
    markerRadius: 12,
    minimumDistance: 30,
    candidateStep: 26,
    candidateRings: 4
  });
  assert.equal(markers.length, entries.length);
  markers.forEach((marker) => {
    assert.ok(marker.markerX >= 362 && marker.markerX <= 638);
    assert.ok(marker.markerY >= 202 && marker.markerY <= 438);
    assert.ok(marker.markerDisplacement <= 105);
  });
  for (let first = 0; first < markers.length; first += 1) {
    for (let second = first + 1; second < markers.length; second += 1) {
      const distance = Math.hypot(
        markers[first].markerX - markers[second].markerX,
        markers[first].markerY - markers[second].markerY
      );
      assert.ok(distance >= 27.9, 'indexed markers must not overlap');
    }
  }
  assert.ok(markers.some((marker) => marker.markerMoved));
});

test('regional map leaders use smooth cubic geometry without square elbows', () => {
  const microLane = TochnyiMaps.buildOrthogonalLeaderPath({
    side: 'left',
    point: { x: 320, y: 200 },
    routeY: 205,
    routeGap: 18,
    laneIndex: 1,
    sideCount: 4
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 210
  });
  assert.equal((microLane.path.match(/\sC\s/g) || []).length, 1,
    'negligible lane offsets should collapse into one smooth card approach');
  assert.match(microLane.path, / 220$/);

  const leftPath = TochnyiMaps.buildOrthogonalLeaderPath({
    side: 'left',
    point: { x: 520, y: 310 },
    routeY: 338,
    laneIndex: 2,
    sideCount: 5
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 120
  });
  assert.match(leftPath.path, /^M 520 310 C /);
  assert.ok(leftPath.path.endsWith(' ' + leftPath.approachX + ' 120 H 220'));
  assert.doesNotMatch(leftPath.path, /\s[LVQ]\s/);
  assert.equal((leftPath.path.match(/\sC\s/g) || []).length, 3,
    'lane routes separate source fan-out, lane travel, and card approach');
  assert.ok(leftPath.approachX > 240 && leftPath.approachX < 520);
  assert.ok(leftPath.fanX > leftPath.approachX && leftPath.fanX < 520);
  assert.equal(leftPath.routeY, 338);
  for (let index = 0; index < leftPath.routeSegments.length - 1; index += 1) {
    const first = leftPath.routeSegments[index];
    const second = leftPath.routeSegments[index + 1];
    const incoming = {
      x: first.end.x - first.control2.x,
      y: first.end.y - first.control2.y
    };
    const outgoing = {
      x: second.control1.x - second.start.x,
      y: second.control1.y - second.start.y
    };
    const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
    const dot = incoming.x * outgoing.x + incoming.y * outgoing.y;
    assert.ok(Math.abs(cross) < 0.001, 'adjacent cubic sections must share one tangent');
    assert.ok(dot > 0, 'adjacent cubic tangents must point in the same direction');
  }

  const rightPath = TochnyiMaps.buildOrthogonalLeaderPath({
    side: 'right',
    point: { x: 610, y: 330 },
    routeY: 366,
    laneIndex: 3,
    sideCount: 5
  }, {
    mapEdgeX: 960,
    cardX: 980,
    endY: 450
  });
  assert.match(rightPath.path, /^M 610 330 C /);
  assert.ok(rightPath.path.endsWith(' ' + rightPath.approachX + ' 450 H 980'));
  assert.doesNotMatch(rightPath.path, /\s[LVQ]\s/);
  assert.equal((rightPath.path.match(/\sC\s/g) || []).length, 3,
    'lane routes separate source fan-out, lane travel, and card approach');
  assert.ok(rightPath.approachX > 610 && rightPath.approachX < 960);
  assert.ok(rightPath.fanX > 610 && rightPath.fanX < rightPath.approachX);
  assert.equal(rightPath.routeY, 366);

  const directPath = TochnyiMaps.buildOrthogonalLeaderPath({
    side: 'left',
    point: { x: 520, y: 310 },
    laneIndex: 0,
    sideCount: 1
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 120
  });
  assert.match(directPath.path, /^M 520 310 C /);
  assert.doesNotMatch(directPath.path, /\s[LVQ]\s/);
  assert.equal((directPath.path.match(/\sC\s/g) || []).length, 1);
});

test('regional map leader rendering preserves separation after routing', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-map-runtime.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(runtime, /gap:\s*regionalPolicy\.portGap/);
  assert.match(runtime, /data-map-leader-route-gap/);
  assert.match(runtime, /data-map-leader-fanout/);
  assert.match(runtime, /leaderRenderPlan\.forEach\(function\(plan\)\s*\{[\s\S]*?tochnyi-map-leader-halo[\s\S]*?\}\);[\s\S]*?leaderRenderPlan\.forEach\(function\(plan\)\s*\{[\s\S]*?tochnyi-map-leader'/);
  assert.match(css, /\.tochnyi-map-leader\s*\{[^}]*stroke-width:\s*1\.65[^}]*opacity:\s*0\.9/gs);
  assert.match(css, /\.tochnyi-map-leader-halo\s*\{[^}]*stroke-width:\s*5\.25/gs);
});

test('dense map runtime renders curved edge-port leaders instead of stacked corridors', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-map-runtime.js'), 'utf8');
  const maps = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-maps.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(runtime, /planRegionalBreakdown\(entries/);
  assert.match(runtime, /data-map-workflow', 'regional-breakdown'/);
  assert.match(maps, /portRoutingThreshold:\s*6/);
  assert.match(maps, /function planRegionalBreakdown\(/);
  assert.match(maps, /optimizeCalloutPlacement\(all, placementOptions\)/);
  assert.match(runtime, /pack\(sides\.left[^\n]+usePortRouting \? 'optimized' : 'geographic'/);
  assert.match(runtime, /data-map-callout-placement',/);
  assert.match(runtime, /data-map-callout-predicted-crossings/);
  assert.match(runtime, /data-map-callout-assignment-evaluations/);
  assert.match(runtime, /data-map-callout-max-attachment-slope/);
  assert.match(runtime, /data-map-callout-attachment-sharpness/);
  assert.match(runtime, /routedEntries\.routing === 'ports'/);
  assert.match(runtime, /buildPortLeaderPath\(entry/);
  assert.match(runtime, /data-map-port-order', 'crossing-optimized'/);
  assert.match(runtime, /minimumCardStub:\s*regionalPolicy\.minimumCardStub/);
  assert.match(runtime, /cardTop:\s*entry\.top/);
  assert.match(runtime, /cardBottom:\s*entry\.top \+ entry\.height/);
  assert.match(runtime, /data-map-port-curve-model', 'bounded-tangent-spline'/);
  assert.match(runtime, /data-map-port-min-card-stub/);
  assert.match(runtime, /data-map-port-near-card-routes/);
  assert.match(runtime, /data-map-port-adaptive-stub-routes/);
  assert.match(runtime, /data-adaptive-card-stub/);
  assert.match(runtime, /data-map-port-directionality', 'strict-envelope-first'/);
  assert.match(runtime, /data-map-port-strict-envelope-routes/);
  assert.match(runtime, /data-map-port-expanded-envelope-routes/);
  assert.match(runtime, /data-route-envelope/);
  assert.match(runtime, /data-map-port-max-vertical-excursion/);
  assert.match(runtime, /data-route-vertical-excursion/);
  assert.match(runtime, /attachmentTop <= attachmentBottom/);
  assert.match(runtime, /Math\.max\(attachmentTop, Math\.min\(attachmentBottom, entry\.point\.y\)\)/);
  assert.match(runtime, /data-card-stub-length/);
  assert.match(runtime, /projectedFeatureBounds\(/);
  assert.match(runtime, /data-map-port-obstacle-avoidance/);
  assert.match(runtime, /obstacles:\s*routeObstacles/);
  assert.match(runtime, /sourceObstacles:\s*sourceRouteObstacles/);
  assert.match(runtime, /highlighted-regions-and-leader-lines/);
  assert.match(runtime, /data-map-port-avoided-obstacles/);
  assert.match(runtime, /data-map-port-avoided-routes/);
  assert.match(runtime, /data-map-port-grid-routes/);
  assert.match(runtime, /data-map-port-fallback-routes/);
  assert.match(runtime, /data-map-port-final-collisions/);
  assert.match(runtime, /data-map-port-source-exit-routes/);
  assert.match(runtime, /data-map-port-self-intersections/);
  assert.match(runtime, /data-map-port-rendered-crossings/);
  assert.match(runtime, /data-route-direct-collisions/);
  assert.match(runtime, /data-route-final-collisions/);
  assert.match(runtime, /data-route-self-intersection/);
  assert.match(runtime, /exactContains:/);
  assert.match(runtime, /shapeClearance = regionalPolicy\.shapeClearance/);
  assert.match(runtime, /routeLeft:/);
  assert.match(runtime, /routeRight:/);
  assert.doesNotMatch(runtime, /tochnyi-map-edge-port/);
  assert.doesNotMatch(runtime, /tochnyi-map-port-anchor/);
  assert.doesNotMatch(runtime, /data-tochnyi-mark': 'edge-port'/);
  assert.match(css, /\.tochnyi-map-port-leader\s*\{/);
  assert.match(css, /\.tochnyi-map-port-leader-halo\s*\{/);
  assert.doesNotMatch(css, /\.tochnyi-map-edge-port/);
  assert.doesNotMatch(css, /\.tochnyi-map-port-anchor/);
});

test('regional map planning enforces continental Russian context', () => {
  const regionSet = TochnyiMaps.getRegionSet('russia');
  assert.equal(regionSet.defaultLandmass, 'continental');
  assert.deepEqual(regionSet.nonContinentalRegionIds, ['RU-KGD', 'RU-SAK']);
  assert.equal(regionSet.requireFullContext, false);
  assert.equal(TochnyiMaps.regionalMapDefaults.landmass, 'continental');
  assert.equal(TochnyiMaps.regionalMapDefaults.summaryDisplay, 'hide');
  assert.equal(TochnyiMaps.regionalMapDefaults.summaryPosition, 'none');
});

test('regional map viewport centering balances data and surrounding geography', () => {
  const viewport = {
    left: 20, right: 120, bottom: 40, top: 70,
    longitudeSpan: 100, latitudeSpan: 30
  };
  const data = { left: 30, right: 110, longitudeSpan: 80 };
  const context = { left: 20, right: 180, longitudeSpan: 160 };
  const balanced = TochnyiMaps.balanceViewportCenter(viewport, data, context, 'auto');
  assert.ok(balanced.centerShiftLongitude > 0);
  assert.equal(balanced.right - balanced.left, viewport.right - viewport.left);

  const exact = TochnyiMaps.balanceViewportCenter(viewport, data, context, 'data');
  assert.deepEqual(exact, viewport);

  const contextCentered = TochnyiMaps.balanceViewportCenter(viewport, data, context, 'context');
  assert.equal((contextCentered.left + contextCentered.right) / 2, 100);
});

test('regional map visual centering offsets the rendered footprint on both axes', () => {
  const feature = {
    geometry: {
      type: 'Polygon',
      coordinates: [[[10, 10], [30, 10], [30, 20], [10, 20], [10, 10]]]
    }
  };
  const projected = TochnyiMaps.projectedFeatureBounds(
    [feature],
    ({ longitude, latitude }) => ({ x: longitude * 4 + 120, y: latitude * 3 }),
    { width: 400, height: 200 }
  );
  assert.equal(projected.left, 160);
  assert.equal(projected.right, 240);
  assert.equal(projected.centerX, 200);

  const offCenter = {
    ...projected,
    left: 210,
    right: 290,
    top: 40,
    bottom: 100,
    centerX: 250,
    centerY: 70
  };
  const offset = TochnyiMaps.resolveVisualOffset(
    offCenter,
    { width: 400, height: 200 },
    { tolerance: 1 }
  );
  assert.equal(offset.rawX, -50);
  assert.equal(offset.rawY, 30);
  assert.equal(offset.x, -50);
  assert.equal(offset.y, 30);
  assert.equal(offset.centered, false);
});

test('regional map centering never shifts a complete silhouette outside the viewport', () => {
  const offset = TochnyiMaps.resolveVisualOffset(
    { left: 40, right: 340, top: 30, bottom: 170, centerX: 190, centerY: 100 },
    { width: 400, height: 200 },
    {
      tolerance: 1,
      hardBounds: { left: 8, right: 396, top: 10, bottom: 190 },
      padding: 4
    }
  );
  assert.equal(offset.rawX, 10);
  assert.equal(offset.x, 0);
  assert.equal(offset.constrainedX, true);
  assert.equal(offset.hardOverflowX, false);
  assert.equal(offset.y, 0);
});

test('regional map containment expands the geographic viewport before allowing clipping', () => {
  const adjustment = TochnyiMaps.expandGeoBoundsForProjectedOverflow(
    { left: 20, right: 120, bottom: 40, top: 70, longitudeSpan: 100, latitudeSpan: 30 },
    { left: -20, right: 440, top: 10, bottom: 190 },
    { width: 400, height: 200 },
    { padding: 8, safetyRatio: 1.02 }
  );
  assert.equal(adjustment.requiresRefit, true);
  assert.ok(adjustment.scale > 1.18);
  assert.ok(adjustment.geoBounds.longitudeSpan > 118);
});

test('regional map context fitting chooses complete national context for broad breakdowns', () => {
  const regionSet = TochnyiMaps.getRegionSet('russia');
  const dataBounds = { longitudeSpan: 95, latitudeSpan: 20 };
  const contextBounds = { longitudeSpan: 160, latitudeSpan: 42 };
  assert.equal(TochnyiMaps.resolveContextFit({}, dataBounds, contextBounds, 10, regionSet), 'all');
  assert.equal(TochnyiMaps.resolveContextFit({}, { longitudeSpan: 20, latitudeSpan: 12 }, contextBounds, 10, regionSet), 'focus');
  assert.equal(TochnyiMaps.resolveContextFit({}, { longitudeSpan: 20, latitudeSpan: 8 }, contextBounds, 2, regionSet), 'focus');
  assert.equal(TochnyiMaps.resolveContextFit({ contextFit: 'all' }, dataBounds, contextBounds, 2, regionSet), 'all');
});

test('regional map static projection keeps antimeridian regions complete and in frame', () => {
  const rectangle = (left, bottom, right, top) => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[left, bottom], [right, bottom], [right, top], [left, top], [left, bottom]]]
    }
  });
  const west = rectangle(20, 45, 40, 60);
  const east = rectangle(-175, 55, -165, 68);
  const projection = TochnyiMaps.buildStaticProjection([west, east], { width: 500, height: 300 }, { padding: 10 });
  assert.ok(projection);
  const westPoint = projection.project({ longitude: 30, latitude: 52 });
  const eastPoint = projection.project({ longitude: -170, latitude: 61 });
  assert.ok(westPoint.x >= 10 && westPoint.x <= 490);
  assert.ok(eastPoint.x >= 10 && eastPoint.x <= 490);
  assert.ok(projection.renderedBounds.left >= 9.9);
  assert.ok(projection.renderedBounds.right <= 490.1);
  assert.match(projection.path(east), /^M /);
});

test('regional maps are permanently north-up even when legacy orientation options are supplied', () => {
  const rectangle = (left, bottom, right, top) => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[left, bottom], [right, bottom], [right, top], [left, top], [left, bottom]]]
    }
  });
  const features = [rectangle(30, 45, 40, 60)];
  const baseline = TochnyiMaps.buildStaticProjection(features, { width: 500, height: 300 }, { padding: 10 });
  const attemptedRotation = TochnyiMaps.buildStaticProjection(features, { width: 500, height: 300 }, {
    padding: 10,
    rotation: 90,
    bearing: 90,
    pitch: 35,
    tilt: 35
  });
  assert.deepEqual(attemptedRotation.project({ longitude: 35, latitude: 52 }), baseline.project({ longitude: 35, latitude: 52 }));
  assert.equal(attemptedRotation.rotation, 0);
  assert.deepEqual(attemptedRotation.orientation, { rotation: 0, bearing: 0, pitch: 0, tilt: 0 });

  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-map-runtime.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(runtime, /data-map-orientation', 'north-up'/);
  assert.match(runtime, /data-map-projection-rotation', '0'/);
  assert.match(runtime, /setProperty\('transform', 'none', 'important'\)/);
  assert.match(css, /\.tochnyi-map-stage,[\s\S]*?transform:\s*none\s*!important[\s\S]*?rotate:\s*none\s*!important/);
});

test('regional map continental mode keeps the largest connected landmass and removes islands', () => {
  const ring = (left, bottom, right, top) => [
    [left, bottom], [right, bottom], [right, top], [left, top], [left, bottom]
  ];
  const rectangle = (left, bottom, right, top) => [ring(left, bottom, right, top)];
  const mainWithEnclave = [ring(0, 0, 10, 10), ring(4, 4, 6, 6)];
  const features = [
    {
      type: 'Feature', id: 'MAIN-A', properties: { name: 'Main A' },
      geometry: { type: 'MultiPolygon', coordinates: [mainWithEnclave, rectangle(0, 20, 2, 22)] }
    },
    {
      type: 'Feature', id: 'MAIN-B', properties: { name: 'Main B' },
      geometry: { type: 'Polygon', coordinates: rectangle(10, 0, 20, 10) }
    },
    {
      type: 'Feature', id: 'ENCLAVE', properties: { name: 'Enclave' },
      geometry: { type: 'Polygon', coordinates: [ring(4, 4, 6, 6)] }
    },
    {
      type: 'Feature', id: 'ISLAND', properties: { name: 'Island' },
      geometry: { type: 'Polygon', coordinates: rectangle(30, 30, 38, 38) }
    }
  ];
  const result = TochnyiMaps.selectLargestConnectedLandmass(features);
  assert.deepEqual(result.features.map((feature) => feature.id), ['MAIN-A', 'MAIN-B', 'ENCLAVE']);
  assert.deepEqual(result.removedRegionIds, ['ISLAND']);
  assert.equal(result.keptComponentCount, 3);
  assert.equal(result.removedComponentCount, 2);
  assert.equal(result.features[0].geometry.type, 'Polygon');
  assert.deepEqual(result.features[0].geometry.coordinates, mainWithEnclave);
});

test('regional map automatic landmass mode removes islands even when referenced', () => {
  const rectangle = (left, bottom, right, top) => [[
    [left, bottom], [right, bottom], [right, top], [left, top], [left, bottom]
  ]];
  const features = [
    { type: 'Feature', id: 'MAIN-A', geometry: { type: 'Polygon', coordinates: rectangle(0, 0, 10, 10) } },
    { type: 'Feature', id: 'MAIN-B', geometry: { type: 'Polygon', coordinates: rectangle(10, 0, 20, 10) } },
    { type: 'Feature', id: 'ISLAND', geometry: { type: 'Polygon', coordinates: rectangle(30, 30, 38, 38) } }
  ];
  const regionSet = { defaultLandmass: 'continental', landmass: { coordinatePrecision: 1000 } };
  const mainland = TochnyiMaps.resolveLandmassPlan(
    { landmass: 'auto' }, regionSet, [{ regionId: 'MAIN-A' }], features
  );
  assert.equal(mainland.mode, 'continental');
  assert.equal(mainland.reason, 'region-set-default');
  assert.deepEqual(mainland.removedRegionIds, ['ISLAND']);

  const island = TochnyiMaps.resolveLandmassPlan(
    { landmass: 'auto' }, regionSet, [{ regionId: 'ISLAND' }], features
  );
  assert.equal(island.mode, 'continental');
  assert.equal(island.reason, 'region-set-default');
  assert.deepEqual(island.removedRegionIds, ['ISLAND']);
  assert.equal(island.features.length, 2);
});

test('regional map visual centering ignores negligible edge fragments', () => {
  const weights = new Array(100).fill(0);
  weights[0] = 1;
  weights[99] = 1;
  for (let index = 20; index <= 79; index += 1) weights[index] = 20;
  const bounds = TochnyiMaps.visualBoundsFromColumnWeights(weights, 500, 0.005);
  assert.ok(bounds.left >= 95 && bounds.left <= 105);
  assert.ok(bounds.right >= 395 && bounds.right <= 405);
  assert.equal(bounds.centerX, 250);
});

test('regional map raster bounds measure vertical as well as horizontal whitespace', () => {
  const columns = new Array(100).fill(0);
  const rows = new Array(80).fill(0);
  for (let index = 20; index <= 79; index += 1) columns[index] = 20;
  for (let index = 10; index <= 49; index += 1) rows[index] = 30;
  const bounds = TochnyiMaps.visualBoundsFromRasterWeights(columns, rows, 500, 400, 0.005);
  assert.equal(bounds.left, 100);
  assert.equal(bounds.right, 400);
  assert.equal(bounds.centerX, 250);
  assert.equal(bounds.top, 50);
  assert.equal(bounds.bottom, 250);
  assert.equal(bounds.centerY, 150);
});

test('regional map specs validate known regions and load map tooling', () => {
  const spec = loadExample('russia-regional-map.json');
  let result = validateSpec(spec);
  assert.equal(result.valid, true, result.errors.join('; '));
  const html = renderHtml(result.normalized);
  assert.doesNotMatch(html, /lib\/5\/map[.]js/);
  assert.match(html, /geodata\/russiaLow[.]js/);
  assert.match(html, /tochnyi-maps[.]js/);
  assert.match(html, /tochnyi-map-runtime[.]js/);

  spec.data[0].regionId = 'RU-XXX';
  result = validateSpec(spec);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('RU-XXX') && error.includes('not in map.regionSet')));

  const hiddenActive = loadExample('russia-regional-map.json');
  hiddenActive.map.excludeRegions = [hiddenActive.data[0].regionId];
  result = validateSpec(hiddenActive);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('cannot exclude administrative regions')));

  const invalidExclusions = loadExample('russia-regional-map.json');
  invalidExclusions.map.excludeRegions = 'RU-KGD';
  result = validateSpec(invalidExclusions);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('cannot exclude administrative regions')));

  const invalidAnchorStyle = loadExample('russia-regional-map.json');
  invalidAnchorStyle.map.anchorStyle = 'capital';
  result = validateSpec(invalidAnchorStyle);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('map.anchorStyle is not supported')));

  const invalidLeaderRouting = loadExample('russia-regional-map.json');
  invalidLeaderRouting.map.leaderRouting = 'spaghetti';
  result = validateSpec(invalidLeaderRouting);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('map.leaderRouting is not supported')));

  const invalidMapOrientation = loadExample('russia-regional-map.json');
  invalidMapOrientation.map.rotation = 90;
  result = validateSpec(invalidMapOrientation);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('map.rotation is not allowed')));

  const indexedLeaderRouting = loadExample('russia-regional-map.json');
  indexedLeaderRouting.map.leaderRouting = 'indexed';
  result = validateSpec(indexedLeaderRouting);
  assert.equal(result.valid, true);

  const portLeaderRouting = loadExample('russia-regional-map.json');
  portLeaderRouting.map.leaderRouting = 'ports';
  result = validateSpec(portLeaderRouting);
  assert.equal(result.valid, true);

  const manualLeaderDetour = loadExample('russia-regional-map.json');
  manualLeaderDetour.data[0].leaderDetour = 'above';
  result = validateSpec(manualLeaderDetour);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('leaderDetour is not allowed')));

  const invalidViewportAlignment = loadExample('russia-regional-map.json');
  invalidViewportAlignment.map.viewportAlignment = 'left';
  result = validateSpec(invalidViewportAlignment);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('continental national context')));

  const invalidContextFit = loadExample('russia-regional-map.json');
  invalidContextFit.map.contextFit = 'crop-randomly';
  result = validateSpec(invalidContextFit);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('continental national context')));

  const invalidLandmass = loadExample('russia-regional-map.json');
  invalidLandmass.map.landmass = 'northern-islands-only';
  result = validateSpec(invalidLandmass);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('continental national context')));

  const invalidSummaryDisplay = loadExample('russia-regional-map.json');
  invalidSummaryDisplay.map.summaryDisplay = 'sometimes';
  result = validateSpec(invalidSummaryDisplay);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('must be hide')));

  for (const regionId of ['RU-KGD', 'RU-SAK']) {
    const detachedRegion = loadExample('russia-regional-map.json');
    detachedRegion.data[0].regionId = regionId;
    result = validateSpec(detachedRegion);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((error) =>
      error.includes(regionId) && error.includes('outside the supported continental regional map')
    ));
  }

  const invalidCalloutDistribution = loadExample('russia-regional-map.json');
  invalidCalloutDistribution.map.calloutDistribution = 'bottom-heavy';
  result = validateSpec(invalidCalloutDistribution);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('map.calloutDistribution is not supported')));
});

test('ranking renderer keeps requested order at the top and supports adaptive labels', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  assert.match(runtime, /function renderRanking\(spec\)[\s\S]*?inversed:\s*true/);
  assert.doesNotMatch(runtime, /spec\.options\.sort === 'none'\) data\.sort/);
  assert.match(runtime, /plan\.labelMode === 'inside'/);
  assert.match(runtime, /labelFitsInside\(item, bounds\)/);
});

test('shared quantitative marks use restrained translucent styling', () => {
  const style = Tochnyi.marks.column;
  assert.ok(style.fillOpacity >= 0.5 && style.fillOpacity <= 0.72);
  assert.ok(style.hoverFillOpacity > style.fillOpacity && style.hoverFillOpacity < 0.9);
  assert.ok(style.strokeOpacity >= 0.8 && style.strokeOpacity <= 1);
  assert.ok(style.strokeWidth >= 1 && style.strokeWidth <= 2);
  assert.ok(Tochnyi.marks.watermarkOpacity <= 0.18);

  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  const uses = runtime.match(/applySemanticColumnAppearance\(series\);/g) || [];
  assert.equal(uses.length, 4, 'all four AMCharts column recipes should use the shared appearance policy');

  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(css, /--tochnyi-watermark-opacity:\s*0\.085/);
  assert.match(css, /rgba\(204, 0, 0, 0\.58\)/);

  const rect = normalizeRect({ left: 0, top: 0, right: 40, bottom: 100 });
  assert.equal(diagnoseMarkStyles([{
    id: 'shared', role: 'column', rect,
    fillOpacity: style.fillOpacity,
    strokeOpacity: style.strokeOpacity,
    strokeWidth: style.strokeWidth
  }]).length, 0);
  const opaqueIssues = diagnoseMarkStyles([{
    id: 'opaque', role: 'column', rect,
    fillOpacity: 1,
    strokeOpacity: 1,
    strokeWidth: 1.5
  }]);
  assert.ok(opaqueIssues.some((issue) => issue.code === 'column-fill-too-opaque' && issue.severity === 'error'));
});

test('non-map semantic layouts do not fall back to standalone card grids', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  assert.doesNotMatch(runtime, /tochnyi-(?:status-card|facet-card|stat-grid)/);
  assert.doesNotMatch(css, /\.tochnyi-(?:status-card|facet-card|stat-grid)\s*\{/);
  assert.match(runtime, /tochnyi-status-list/);
  assert.match(css, /\.tochnyi-status-row\s*\{[^}]*border-bottom:/s);
  assert.doesNotMatch(css, /\.tochnyi-status-row\s*\{[^}]*background:/s);
});

test('emphasis labels occupy a dedicated layout rail instead of overlaying graph geometry', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(runtime, /tochnyi-emphasis-rail/);
  assert.match(css, /\.tochnyi-chart-container\.has-emphasis\s*\{[^}]*display:\s*grid[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\)/s);
  assert.match(css, /\.tochnyi-change-badge\s*\{[^}]*position:\s*relative/s);
  assert.doesNotMatch(css, /\.tochnyi-change-badge\s*\{[^}]*position:\s*absolute/s);
});

test('PNG capture expands the canvas and refuses any remaining clipped output', () => {
  const capture = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'capture.js'), 'utf8');
  const diagnostics = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-diagnostics.js'), 'utf8');
  assert.match(capture, /adaptiveAttempts < 6/);
  assert.match(capture, /horizontalOverflow > 0 \|\| verticalOverflow > 0/);
  assert.match(capture, /requiredWidth \+ 24/);
  assert.match(capture, /requiredHeight \+ 24/);
  assert.match(capture, /PNG capture refused because content still exceeds the canvas/);
  assert.match(capture, /dimensions\.width !== inspection\.viewport\.width/);
  assert.match(diagnostics, /requiredWidth/);
  assert.match(diagnostics, /requiredHeight/);
  assert.match(diagnostics, /viewportFit:\s*viewportFit/);
});

test('shared branding keeps the logo legible after export scaling', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(css, /--tochnyi-logo-height:\s*56px/);
  assert.match(css, /--tochnyi-logo-height-compact:\s*48px/);
  assert.match(css, /\.tochnyi-logo\s*\{[^}]*opacity:\s*1/gs);
  assert.match(css, /\.tochnyi-logo\s*\{[^}]*mix-blend-mode:\s*normal/gs);
});

test('branding diagnostics reject missing, faint, unloaded, and undersized logos', () => {
  assert.ok(diagnoseBranding([]).some((issue) => issue.code === 'logo-missing'));

  const base = {
    id: 'logo', role: 'logo', loaded: true, opacity: 1,
    rect: normalizeRect({ left: 0, top: 0, right: 193, bottom: 56 })
  };
  assert.equal(diagnoseBranding([base]).length, 0);
  assert.ok(diagnoseBranding([{ ...base, loaded: false }]).some((issue) => issue.code === 'logo-not-loaded'));
  assert.ok(diagnoseBranding([{ ...base, opacity: 0.2 }]).some((issue) => issue.code === 'logo-too-faint'));
  assert.ok(diagnoseBranding([{
    ...base,
    rect: normalizeRect({ left: 0, top: 0, right: 138, bottom: 40 })
  }]).some((issue) => issue.code === 'logo-too-small'));
});

test('watermark opacity is controlled once by CSS rather than compounded inside the SVG', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  const svg = fs.readFileSync(path.join(__dirname, '..', 'lib', 'watermark.svg'), 'utf8');
  assert.match(css, /--tochnyi-watermark-opacity:\s*0\.085/);
  assert.match(css, /--tochnyi-watermark-opacity-quiet:\s*0\.065/);
  assert.match(css, /--tochnyi-watermark-opacity-corner:\s*0\.10/);
  assert.doesNotMatch(svg, /opacity\s*:\s*\.(?:0[0-9]|1[0-9])/);
});

test('standard charts keep the watermark large and centered across recipes', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-runtime.js'), 'utf8');
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recipes', 'catalog.json'), 'utf8'));
  const standardRecipes = catalog.recipes.filter((recipe) => recipe.id !== 'map.regional');

  assert.match(css, /\.tochnyi-watermark\s*\{[^}]*top:\s*50%[^}]*left:\s*50%[^}]*height:\s*100%[^}]*max-width:\s*100%/s);
  assert.match(runtime, /watermark\.classList\.add\('watermark-' \+ plan\.watermark\)/);
  assert.doesNotMatch(runtime, /watermark\.classList\.add\('(?:corner|small)'\)/);
  assert.ok(standardRecipes.every((recipe) => recipe.defaults.watermark === 'full'));
  assert.equal(catalog.recipes.find((recipe) => recipe.id === 'map.regional').defaults.watermark, 'corner');
});

test('watermark diagnostics reject missing, faint, unloaded, and undersized marks', () => {
  assert.ok(diagnoseWatermark([]).some((issue) => issue.code === 'watermark-missing'));

  const base = {
    id: 'watermark', role: 'watermark', loaded: true, opacity: 0.085,
    rect: normalizeRect({ left: 0, top: 0, right: 550, bottom: 550 })
  };
  assert.equal(diagnoseWatermark([base]).length, 0);
  assert.ok(diagnoseWatermark([{ ...base, loaded: false }]).some((issue) => issue.code === 'watermark-not-loaded'));
  assert.ok(diagnoseWatermark([{ ...base, occluded: true }]).some((issue) => issue.code === 'watermark-occluded'));
  assert.ok(diagnoseWatermark([{ ...base, opacity: 0.01 }]).some((issue) => issue.code === 'watermark-too-faint'));
  assert.ok(diagnoseWatermark([{
    ...base,
    rect: normalizeRect({ left: 0, top: 0, right: 40, bottom: 40 })
  }]).some((issue) => issue.code === 'watermark-too-small'));
});

test('regional map watermark stays behind geography and within restrained size and opacity limits', () => {
  const runtime = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi-map-runtime.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.match(runtime, /chartNode\.appendChild\(watermark\);[\s\S]*?chartNode\.appendChild\(mapCanvas\);[\s\S]*?chartNode\.appendChild\(lineLayer\);/);
  assert.match(runtime, /watermark\.classList\.add\('watermark-map', 'watermark-map-behind'\)/);
  assert.match(runtime, /data-watermark-layer', 'behind-map'/);
  assert.match(css, /--tochnyi-map-watermark-opacity:\s*0\.075/);
  assert.match(css, /--tochnyi-map-watermark-height:\s*min\(46%, 280px\)/);
  assert.match(css, /--tochnyi-map-watermark-height-compact:\s*220px/);
  assert.match(css, /\.tochnyi-chart\.recipe-map-regional\s*\{[^}]*max-width:\s*1480px/gs);
  assert.match(css, /\.tochnyi-v2\.recipe-map-regional \.tochnyi-logo\s*\{[^}]*height:\s*48px/gs);
  assert.match(css, /\.tochnyi-v2\.recipe-map-regional \.tochnyi-title\s*\{[^}]*font-size:\s*34px/gs);
  assert.match(css, /\.tochnyi-map-stage\.has-callouts \.tochnyi-map-canvas\s*\{[^}]*right:\s*214px[^}]*left:\s*214px/gs);
  assert.match(css, /\.tochnyi-map-stage > \.tochnyi-watermark\.watermark-map\s*\{[^}]*z-index:\s*0/gs);
  assert.match(css, /\.tochnyi-map-stage > \.tochnyi-watermark\.watermark-map\s*\{[^}]*filter:\s*none/gs);
  assert.match(css, /\.tochnyi-map-canvas\s*\{[^}]*z-index:\s*1/gs);
  assert.match(css, /\.tochnyi-map-lines\s*\{\s*z-index:\s*2/);
  assert.match(css, /\.tochnyi-map-callouts[^{]*\{[^}]*z-index:\s*3/gs);

  const mapWatermark = {
    id: 'map-watermark', role: 'watermark', loaded: true, occluded: true,
    opacity: 0.075, watermarkLayer: 'behind-map',
    rect: normalizeRect({ left: 0, top: 0, right: 280, bottom: 280 })
  };
  assert.equal(diagnoseWatermark([mapWatermark]).length, 0);
  assert.ok(diagnoseWatermark([{ ...mapWatermark, opacity: 0.11 }])
    .some((issue) => issue.code === 'watermark-too-prominent'));
  assert.ok(diagnoseWatermark([{
    ...mapWatermark,
    rect: normalizeRect({ left: 0, top: 0, right: 420, bottom: 420 })
  }]).some((issue) => issue.code === 'watermark-too-large'));
});

test('layout diagnostics detect text overlap and clipping', () => {
  const labels = [
    { id: 'a', source: 'amcharts', role: 'data-label', text: 'First', rect: normalizeRect({ left: 10, top: 10, right: 90, bottom: 40 }) },
    { id: 'b', source: 'amcharts', role: 'axis-label', text: 'Second', rect: normalizeRect({ left: 60, top: 15, right: 130, bottom: 45 }) },
    { id: 'c', source: 'amcharts', role: 'data-label', text: 'Clipped', rect: normalizeRect({ left: 180, top: 80, right: 230, bottom: 110 }) }
  ];
  const issues = diagnoseBoxes({
    labels,
    objects: [],
    boundaries: [{ source: 'amcharts', rect: normalizeRect({ left: 0, top: 0, right: 200, bottom: 100 }) }]
  });
  assert.ok(issues.some((issue) => issue.code === 'text-text-overlap'));
  assert.ok(issues.some((issue) => issue.code === 'label-clipped'));
});

test('layout diagnostics fail text that overflows its visible box', () => {
  const label = {
    id: 'truncated',
    source: 'dom',
    role: 'page-label',
    text: 'A visibly truncated label',
    intrinsicOverflow: true,
    rect: normalizeRect({ left: 10, top: 10, right: 120, bottom: 30 })
  };
  const issues = diagnoseBoxes({
    labels: [label],
    objects: [],
    boundaries: [{ source: 'dom', rect: normalizeRect({ left: 0, top: 0, right: 200, bottom: 100 }) }]
  });
  assert.ok(issues.some((issue) => issue.code === 'text-truncated' && issue.severity === 'error'));
});

test('layout diagnostics ignore a label inside its own column', () => {
  const label = {
    id: 'label', source: 'amcharts', role: 'data-label', text: '42', dataUid: 7,
    rect: normalizeRect({ left: 20, top: 20, right: 50, bottom: 40 })
  };
  const column = {
    id: 'column', source: 'amcharts', role: 'column', dataUid: 7, line: false,
    rect: normalizeRect({ left: 10, top: 10, right: 70, bottom: 90 })
  };
  const issues = diagnoseBoxes({
    labels: [label],
    objects: [column],
    boundaries: [{ source: 'amcharts', rect: normalizeRect({ left: 0, top: 0, right: 100, bottom: 100 }) }]
  });
  assert.equal(issues.length, 0);
});

test('layout diagnostics reject a data label covering its own line point', () => {
  const label = {
    id: 'point-label', source: 'amcharts', role: 'data-label', text: '0.31%', dataUid: 11,
    rect: normalizeRect({ left: 32, top: 28, right: 82, bottom: 52 })
  };
  const point = {
    id: 'point', source: 'amcharts', role: 'point', dataUid: 11, line: false,
    rect: normalizeRect({ left: 50, top: 38, right: 62, bottom: 50 })
  };
  const issues = diagnoseBoxes({
    labels: [label],
    objects: [point],
    boundaries: [{ source: 'amcharts', rect: normalizeRect({ left: 0, top: 0, right: 120, bottom: 100 }) }]
  });
  assert.ok(issues.some((issue) => issue.code === 'text-object-overlap'));
  assert.ok(issues.some((issue) => issue.elements.some((element) => element.role === 'point')));
});

test('layout diagnostics fail unresolved labels and ignore their own SVG marks', () => {
  const label = {
    id: 'range-label', source: 'svg-0', role: 'range-value', text: '49%–51%', group: 'range-1',
    layoutUnresolved: true,
    rect: normalizeRect({ left: 40, top: 20, right: 100, bottom: 40 })
  };
  const ownRange = {
    id: 'range-mark', source: 'svg-0', role: 'range', group: 'range-1', line: true,
    rect: normalizeRect({ left: 50, top: 30, right: 90, bottom: 30 })
  };
  const issues = diagnoseBoxes({
    labels: [label],
    objects: [ownRange],
    boundaries: [{ source: 'svg-0', rect: normalizeRect({ left: 0, top: 0, right: 200, bottom: 100 }) }]
  });
  assert.ok(issues.some((issue) => issue.code === 'label-layout-unresolved'));
  assert.equal(issues.some((issue) => issue.code === 'text-line-collision'), false);
});

test('layout diagnostics detect overlap between SVG labels', () => {
  const labels = [
    { id: 'low', source: 'svg-0', role: 'range-value', text: '21.0%', rect: normalizeRect({ left: 50, top: 20, right: 105, bottom: 40 }) },
    { id: 'high', source: 'svg-0', role: 'range-value', text: '31.0%', rect: normalizeRect({ left: 85, top: 20, right: 140, bottom: 40 }) }
  ];
  const issues = diagnoseBoxes({
    labels,
    objects: [],
    boundaries: [{ source: 'svg-0', rect: normalizeRect({ left: 0, top: 0, right: 200, bottom: 100 }) }]
  });
  assert.ok(issues.some((issue) => issue.code === 'text-text-overlap'));
});

test('browser diagnostic JSON can be extracted from dumped DOM', () => {
  const report = { version: '1.0', status: 'pass', summary: { errors: 0, warnings: 0 }, issues: [] };
  const dom = `<html data-layout-diagnostics="pass"><body><script id="tochnyi-layout-diagnostics" type="application/json">${JSON.stringify(report)}</script></body></html>`;
  assert.deepEqual(extractLayoutDiagnostics(dom), report);
});

test('regional workflow extracts routing diagnostics from the chart element', () => {
  const dom = '<div id="chart" data-map-workflow="regional-breakdown" data-map-leader-routing="ports" ' +
    'data-map-callout-predicted-crossings="0" data-map-port-final-collisions="0" ' +
    'data-map-port-rendered-crossings="0" data-map-port-fallback-routes="0" ' +
    'data-map-port-direction-reversal-routes="0" data-map-port-control-reversal-routes="0" ' +
    'data-map-port-terminal-box-turn-routes="0"></div>';
  const attributes = extractDataAttributes(dom);
  assert.equal(attributes['data-map-workflow'], 'regional-breakdown');
  const summary = summarizeDiagnosticRun({
    viewport: { width: 1190, height: 679 },
    diagnostics: { status: 'pass', summary: { errors: 0, warnings: 0 } },
    chartAttributes: attributes
  });
  assert.equal(summary.routing, 'ports');
  assert.equal(summary.predictedCrossings, 0);
  assert.equal(summary.renderedCrossings, 0);
  assert.equal(summary.finalCollisions, 0);
  assert.equal(summary.fallbackRoutes, 0);
  assert.equal(summary.directionReversalRoutes, 0);
  assert.equal(summary.controlReversalRoutes, 0);
  assert.equal(summary.terminalBoxTurnRoutes, 0);
});

test('regional agent workflow validates, renders, and reports normalized automatic defaults', () => {
  const specPath = path.join(examplesDir, 'russia-regional-map.json');
  const checked = validateRegionalSpec(specPath);
  assert.equal(checked.validation.normalized.recipe, 'map.regional');
  assert.equal(checked.validation.normalized.map.leaderRouting, 'auto');
  assert.equal(checked.validation.normalized.map.calloutDistribution, 'auto');

  const guide = regionalAgentGuide('russia');
  assert.equal(guide.recipe, 'map.regional');
  assert.deepEqual(guide.minimalMap, { regionSet: 'russia' });
  assert.ok(guide.automaticByDefault.includes('leader routing'));

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-regional-'));
  const output = path.join(tempDir, 'regional.html');
  const result = renderRegionalBreakdown(specPath, output, { diagnose: false });
  assert.equal(result.workflow, 'regional-breakdown');
  assert.equal(result.review.valid, true);
  assert.equal(result.diagnostics.status, 'not-run');
  assert.equal(fs.existsSync(output), true);
  assert.equal(fs.existsSync(path.join(tempDir, 'regional.png')), false);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('regional workflow rejects non-map recipes', () => {
  assert.throws(
    () => validateRegionalSpec(path.join(examplesDir, 'ai95-price-spike.json')),
    /only accepts recipe "map\.regional"/
  );
});

test('renderer writes a reviewable chart file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-chart-'));
  const output = path.join(tempDir, 'example.html');
  const result = renderSpecFile(path.join(examplesDir, 'ai95-price-spike.json'), output);
  assert.equal(fs.existsSync(output), true);
  assert.equal(result.recipe, 'comparison.change');
  const html = fs.readFileSync(output, 'utf8');
  const fingerprint = assetFingerprint(path.join(__dirname, '..'));
  assert.match(html, new RegExp(`data-assets-version="${fingerprint}"`));
  assert.ok(html.includes(`tochnyi-runtime.js?v=${fingerprint}`));
  const review = reviewFile(output);
  assert.equal(review.valid, true, review.errors.join('; '));
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('implementation fields are rejected', () => {
  const spec = loadExample('ai95-price-spike.json');
  spec.customCss = '.anything { display: none; }';
  const result = validateSpec(spec);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('forbidden')));
});

test('unknown schema fields and numeric strings are rejected', () => {
  const unknown = loadExample('ai95-price-spike.json');
  unknown.layoutHint = 'make it dramatic';
  let result = validateSpec(unknown);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('not allowed by the ChartSpec schema')));

  const stringValue = loadExample('ai95-price-spike.json');
  stringValue.data[0].value = '70000';
  result = validateSpec(stringValue);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('data[0].value must be a finite number.'));
});

test('recipe constraints are enforced', () => {
  const spec = loadExample('ai95-price-spike.json');
  spec.data.push({ label: 'Third point', value: 90000 });
  const result = validateSpec(spec);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('comparison.change requires exactly 2 data items.'));
});

test('range and waterfall semantics are enforced', () => {
  const range = loadExample('farm-diesel-range.json');
  let result = validateSpec(range);
  assert.equal(result.valid, true, result.errors.join('; '));
  range.data[1].low = 10000;
  range.data[1].high = 3000;
  result = validateSpec(range);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('data[1].low must not exceed high.'));

  const waterfall = loadExample('ozon-collateral-waterfall.json');
  waterfall.data[0].role = 'change';
  result = validateSpec(waterfall);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('flow.waterfall must begin with a start item.'));
});

test('waterfall contract rejects inferred, uncertain, mixed-period, and non-reconciling bridges', () => {
  const base = loadExample('ozon-collateral-waterfall.json');

  const missingProvenance = JSON.parse(JSON.stringify(base));
  delete missingProvenance.data[0].valueStatus;
  let result = validateSpec(missingProvenance);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('data[0].valueStatus is required for flow.waterfall; use reported only for exact source values.'));

  const inferredStart = JSON.parse(JSON.stringify(base));
  inferredStart.data[0].valueStatus = 'derived';
  inferredStart.data[0].annotation = 'Derived from the ending value and the disclosed loss.';
  result = validateSpec(inferredStart);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('derived, bounded, approximate, or inferred values cannot form an exact bridge')));
  assert.ok(result.errors.some((error) => error.includes('uses approximate, bounded, or derived language')));

  const mixedPeriod = JSON.parse(JSON.stringify(base));
  mixedPeriod.data[1].period = 'H1 2025';
  result = validateSpec(mixedPeriod);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('cannot mix reporting periods')));

  const unreconciled = JSON.parse(JSON.stringify(base));
  unreconciled.data[2].value = 271;
  result = validateSpec(unreconciled);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('must reconcile with the running flow')));
});

test('a reported loss must gain a real comparator instead of becoming a single-number chart', () => {
  const spec = {
    version: '2.0',
    recipe: 'headline.metric',
    title: 'The State Leasing Company Exceeded 14.2 Billion Rubles in Losses',
    subtitle: 'A single reported result is not enough to justify a chart.',
    date: '2026-08-02',
    source: {
      name: 'State Transport Leasing Company first-half 2026 results',
      period: 'H1 2026'
    },
    data: [{
      label: 'Reported H1 loss',
      value: 14.2,
      displayValue: 'more than 14.2 billion rubles',
      tone: 'critical'
    }],
    measure: { unit: 'billion rubles', decimals: 1, baseline: 'zero' }
  };
  const result = validateSpec(spec);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('Add a real comparator')));
});

test('semantic reference lineStyle is allowed while implementation style remains forbidden', () => {
  const spec = loadExample('farm-diesel-range.json');
  let result = validateSpec(spec);
  assert.equal(result.valid, true, result.errors.join('; '));

  spec.references[0].style = 'position: fixed';
  result = validateSpec(spec);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('forbidden')));
});

test('editorial validation flags redundant composition copy and internal sources', () => {
  const spec = loadExample('spimex-demand-stacked.json');
  spec.source.name = 'Weekly source text (input.txt)';
  spec.data[0].displayValue = '18.1m m²';
  spec.supportingFacts.push({
    value: '18.1%',
    label: 'This repeats the share already encoded in the composition.',
    tone: 'primary'
  });
  const result = validateSpec(spec);
  assert.equal(result.valid, false);
  assert.ok(result.warnings.some((warning) => warning.includes('internal working reference')));
  assert.ok(result.warnings.some((warning) => warning.includes('ambiguous repeated unit abbreviation')));
  assert.ok(result.errors.some((error) => error.includes('Supporting facts repeat values')));
});

test('default output paths use an arbitrary transient run id', () => {
  const root = path.join(os.tmpdir(), 'tochnyi-default-output');
  const output = defaultOutputPath(root, {
    metadata: { slug: 'example-chart' }
  }, {
    runId: 'client-alpha.issue-7'
  });
  assert.equal(
    output,
    path.join(root, '.work', 'client-alpha.issue-7', 'rendered', 'example-chart.html')
  );
  assert.throws(
    () => defaultOutputPath(root, { metadata: { slug: 'example-chart' } }, { runId: '../escape' }),
    /Run id/
  );
});
