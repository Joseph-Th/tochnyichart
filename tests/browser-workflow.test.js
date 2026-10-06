'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { validateSpec } = require('../renderer/validate');
const { renderSpecFile } = require('../renderer/render');
const {
  diagnoseHtmlResponsive,
  findBrowser,
  trendLabelConsistencyFailure
} = require('../renderer/capture');
const {
  REGIONAL_WORKFLOW_VIEWPORTS,
  renderRegionalBreakdown
} = require('../renderer/regional-workflow');
const TochnyiMaps = require('../lib/tochnyi-maps');
const { createStaticImage } = require('../renderer/image-workflow');
const { pngDimensions } = require('../renderer/capture');

const root = path.join(__dirname, '..');
const examplesDir = path.join(root, 'specs', 'examples');
const browser = findBrowser();

function nonNullNumbers(runs, field) {
  return runs
    .map((run) => run[field])
    .filter((value) => value !== null && value !== undefined);
}

test('PNG capture rejects inconsistent trend value-label centering', () => {
  assert.equal(trendLabelConsistencyFailure({}), null);
  assert.equal(trendLabelConsistencyFailure({
    'data-trend-label-layout': 'measured',
    'data-trend-label-center-error': '0.75'
  }), null);
  assert.match(trendLabelConsistencyFailure({
    'data-trend-label-layout': 'measured',
    'data-trend-label-center-error': '6.25'
  }), /not horizontally centered/i);
  assert.match(trendLabelConsistencyFailure({
    'data-trend-label-layout': 'waiting',
    'data-trend-label-center-error': 'pending'
  }), /did not settle/i);
});

test('standard and regional workflows pass browser comparison checks', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-browser-workflow-'));
  try {
    const standardPath = path.join(tempDir, 'standard.html');
    renderSpecFile(path.join(examplesDir, 'ai95-price-spike.json'), standardPath, { projectRoot: root });
    const standardDiagnostics = diagnoseHtmlResponsive(standardPath, {
      browser,
      viewports: REGIONAL_WORKFLOW_VIEWPORTS
    });
    assert.equal(standardDiagnostics.status, 'pass');
    assert.ok(standardDiagnostics.runs.every((run) => run.diagnostics?.summary?.errors === 0));

    const regional = renderRegionalBreakdown(
      path.join(examplesDir, 'russia-regional-map.json'),
      path.join(tempDir, 'regional.html'),
      { projectRoot: root, browser }
    );
    assert.equal(regional.workflow, 'regional-breakdown');
    assert.equal(regional.diagnostics.status, 'pass');
    assert.equal(regional.diagnostics.runs.length, REGIONAL_WORKFLOW_VIEWPORTS.length);
    assert.ok(regional.diagnostics.runs.every((run) => run.errors === 0));
    const collisions = nonNullNumbers(regional.diagnostics.runs, 'finalCollisions');
    const fallbacks = nonNullNumbers(regional.diagnostics.runs, 'fallbackRoutes');
    assert.ok(collisions.length > 0 && collisions.every((value) => value === 0));
    assert.ok(fallbacks.length > 0 && fallbacks.every((value) => value === 0));
    assert.ok(regional.diagnostics.runs.every((run) => run.workflow === 'regional-breakdown'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('existing scenario columns remain responsive after objective infrastructure changes', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-scenario-columns-'));
  try {
    const outputPath = path.join(tempDir, 'scenario-columns.html');
    renderSpecFile(path.join(examplesDir, 'central-bank-scenarios.json'), outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, { browser, viewports: REGIONAL_WORKFLOW_VIEWPORTS });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => {
      assert.equal(run.diagnostics?.summary?.errors, 0);
      assert.equal(run.diagnostics?.summary?.marksChecked, 3);
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('scatter relationship renders both numeric dimensions with machine-readable diagnostics', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-scatter-'));
  try {
    const htmlPath = path.join(tempDir, 'scatter.html');
    renderSpecFile(path.join(examplesDir, 'store-traffic-sales-scatter.json'), htmlPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(htmlPath, { browser, viewports: REGIONAL_WORKFLOW_VIEWPORTS });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => {
      assert.equal(run.diagnostics?.summary?.errors, 0);
      assert.equal(run.diagnostics?.summary?.marksChecked, 8);
      assert.equal(run.scatterAttributes?.['data-scatter-point-count'], '8');
      assert.equal(run.scatterAttributes?.['data-scatter-x-quantity'], 'weekly store foot traffic');
      assert.equal(run.scatterAttributes?.['data-scatter-y-quantity'], 'weekly store sales');
      const r = Number(run.scatterAttributes?.['data-scatter-pearson-r']);
      assert.ok(Number.isFinite(r) && r > 0.99 && r <= 1);
    });

    const pngPath = path.join(tempDir, 'scatter.png');
    const image = createStaticImage(path.join(examplesDir, 'store-traffic-sales-scatter.json'), pngPath, {
      projectRoot: root,
      browser,
      profile: 'landscape'
    });
    assert.deepEqual(pngDimensions(pngPath), { width: 1600, height: 900 });
    assert.equal(image.scatterDiagnostics.pointCount, 8);
    assert.ok(image.scatterDiagnostics.pearsonR > 0.99 && image.scatterDiagnostics.pearsonR <= 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('public image CLI defaults standard output to fixed landscape', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-static-cli-'));
  try {
    const outputPath = path.join(tempDir, 'cli-landscape.png');
    const cliPath = path.join(root, 'tool-api', 'chart.js');
    const result = spawnSync(process.execPath, [
      cliPath,
      'image',
      path.join(examplesDir, 'ai95-price-spike.json'),
      outputPath
    ], {
      cwd: root,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, TOCHNYI_BROWSER: browser }
    });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.workflow, 'standard-chart');
    assert.equal(payload.profile.id, 'landscape');
    assert.deepEqual(payload.profile.actualDimensions, { width: 1600, height: 900 });
    // A standard chart fills the fixed canvas: the stage grows into spare room or shrinks to fit.
    assert.ok(['natural', 'fill', 'shrink'].includes(payload.profile.fitMode));
    if (payload.profile.fitMode === 'shrink') assert.ok(payload.profile.stageDelta < 0);
    if (payload.profile.fitMode === 'fill') assert.ok(payload.profile.stageDelta > 0);
    assert.equal(payload.htmlRetained, true);
    assert.equal(path.resolve(payload.htmlPath), path.resolve(outputPath.replace(/\.png$/, '.html')));
    assert.equal(payload.diagnostics.errors, 0);
    assert.equal(path.resolve(payload.outputPath), path.resolve(outputPath));
    assert.deepEqual(pngDimensions(outputPath), { width: 1600, height: 900 });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('static image workflow produces an exact square PNG with its self-contained HTML', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-static-square-'));
  try {
    const outputPath = path.join(tempDir, 'square.png');
    const result = createStaticImage(path.join(examplesDir, 'ai95-price-spike.json'), outputPath, {
      projectRoot: root,
      browser,
      profile: 'square'
    });
    assert.equal(result.workflow, 'standard-chart');
    assert.equal(result.profile.id, 'square');
    assert.deepEqual(result.profile.actualDimensions, { width: 1080, height: 1080 });
    assert.ok(['natural', 'fill', 'shrink'].includes(result.profile.fitMode));
    assert.equal(result.profile.stageDelta > 0, result.profile.fitMode === 'fill');
    assert.deepEqual(pngDimensions(outputPath), { width: 1080, height: 1080 });
    assert.equal(result.profile.expanded, false);
    assert.equal(result.htmlRetained, true);
    assert.equal(result.diagnostics.errors, 0);
    assert.deepEqual(fs.readdirSync(tempDir).filter((name) => name.endsWith('.html')), ['square.html']);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('static image workflow uses the wide maintained canvas for regional maps', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-static-regional-'));
  try {
    const outputPath = path.join(tempDir, 'regional.png');
    const result = createStaticImage(path.join(examplesDir, 'russia-regional-map.json'), outputPath, {
      projectRoot: root,
      browser,
      profile: 'auto'
    });
    assert.equal(result.workflow, 'regional-breakdown');
    assert.deepEqual(result.profile.requestedViewport, { width: 1450, height: 679 });
    assert.ok(result.profile.actualDimensions.height >= result.profile.requestedViewport.height);
    assert.equal(result.profile.fitMode, 'natural');
    assert.equal(result.profile.stageDelta, 0);
    assert.equal(result.diagnostics.errors, 0);
    assert.equal(result.regionalDiagnostics.renderedCrossings || 0, 0);
    assert.equal(result.regionalDiagnostics.directionReversalRoutes || 0, 0);
    assert.deepEqual(pngDimensions(outputPath), result.profile.actualDimensions);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('regional browser workflow separates highlighted regions from callout cards', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-regional-highlight-only-'));
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(examplesDir, 'russia-regional-map.json'), 'utf8'));
    const regionSet = TochnyiMaps.getRegionSet('russia');
    const regionIds = Object.keys(regionSet.regions)
      .filter((regionId) => !(regionSet.nonContinentalRegionIds || []).includes(regionId))
      .slice(0, 16);
    spec.data = regionIds.map((regionId, index) => ({
      label: regionSet.regions[regionId],
      regionId,
      status: index % 2 ? 'strained' : 'critical',
      displayValue: index < 4 ? `Callout ${index + 1}` : undefined,
      detail: index < 4 ? 'Representative regional evidence.' : undefined,
      callout: index < 4 ? 'auto' : 'none'
    }));
    const specPath = path.join(tempDir, 'regional-highlight-only.json');
    fs.writeFileSync(specPath, JSON.stringify(spec));
    const result = renderRegionalBreakdown(
      specPath,
      path.join(tempDir, 'regional-highlight-only.html'),
      { projectRoot: root, browser }
    );
    assert.equal(result.diagnostics.status, 'pass');
    result.diagnostics.runs.forEach((run) => {
      assert.equal(run.activeItems, 16);
      assert.equal(run.calloutCount, 4);
      assert.equal(run.errors, 0);
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('trend value labels clear measured plot points at every responsive viewport', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-trend-labels-'));
  try {
    const outputPath = path.join(tempDir, 'trend-labels.html');
    renderSpecFile(path.join(examplesDir, 'trend-point-label-collision.json'), outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, {
      browser,
      viewports: REGIONAL_WORKFLOW_VIEWPORTS
    });
    assert.equal(diagnostics.status, 'pass');
    assert.equal(diagnostics.runs.length, REGIONAL_WORKFLOW_VIEWPORTS.length);
    diagnostics.runs.forEach((run) => {
      assert.equal(run.diagnostics?.summary?.errors, 0);
      assert.equal(run.diagnostics?.summary?.warnings, 0);
      assert.equal(run.diagnostics?.summary?.marksChecked, 8);
      assert.equal(run.trendAttributes?.['data-trend-label-layout'], 'measured');
      assert.equal(Number(run.trendAttributes?.['data-trend-label-line-overlaps']), 0);
      assert.ok(Number(run.trendAttributes?.['data-trend-label-center-error']) <= 1,
        'centered trend value labels must stay within 1px of their point centers');
      assert.ok(Number(run.trendAttributes?.['data-trend-label-visible-count']) >= 3);
      const visibleIndices = String(
        run.trendAttributes?.['data-trend-label-visible-indices'] || ''
      ).split(',').filter(Boolean).map(Number);
      assert.ok(visibleIndices.includes(0),
        'the first endpoint label must be repositioned rather than suppressed');
      assert.ok(visibleIndices.includes(7),
        'the final endpoint label must be repositioned rather than suppressed');
      assert.equal(
        run.diagnostics?.issues?.some((issue) =>
          issue.code === 'text-object-overlap' &&
          issue.elements?.some((element) => element.role === 'point')
        ),
        false
      );
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('near-equal column bars resolve to one family label placement', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-column-label-family-'));
  try {
    const specPath = path.join(tempDir, 'column-label-family.json');
    const outputPath = path.join(tempDir, 'column-label-family.html');
    fs.writeFileSync(specPath, JSON.stringify({
      version: '2.0',
      recipe: 'comparison.scenarios',
      title: 'Near-equal values use one label treatment',
      subtitle: 'Three independent scenario values test one coherent label-placement family.',
      date: '2026-08-06',
      data: [
        {
          label: 'Option A', value: 78, displayValue: '78 units',
          quantity: 'capacity', scope: 'same system', period: '2026'
        },
        {
          label: 'Option B', value: 80, displayValue: '80 units',
          quantity: 'capacity', scope: 'same system', period: '2026'
        },
        {
          label: 'Option C', value: 79, displayValue: '79 units',
          quantity: 'capacity', scope: 'same system', period: '2026'
        }
      ],
      supportingFacts: [{ value: '100 units', label: 'Capacity ceiling', role: 'comparison' }],
      measure: {
        quantity: 'capacity', unit: 'units', valueMode: 'level',
        levelAvailability: 'reported', minimum: 0, maximum: 100, baseline: 'zero'
      },
      options: { animate: false, labelMode: 'auto' }
    }));
    const validated = validateSpec(JSON.parse(fs.readFileSync(specPath, 'utf8')));
    assert.equal(validated.valid, true, validated.errors.join('; '));
    renderSpecFile(specPath, outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, {
      browser,
      viewports: REGIONAL_WORKFLOW_VIEWPORTS
    });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => {
      assert.equal(run.diagnostics?.summary?.errors, 0);
      assert.ok(['inside', 'outside'].includes(run.columnAttributes?.['data-column-label-mode']));
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('axes that cross zero render a prominent interior zero reference', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-zero-reference-'));
  try {
    const specPath = path.join(tempDir, 'zero-reference.json');
    const outputPath = path.join(tempDir, 'zero-reference.html');
    fs.writeFileSync(specPath, JSON.stringify({
      version: '2.0',
      recipe: 'comparison.diverging',
      title: 'Operating contributions crossed zero',
      subtitle: 'Positive and negative contributions use one company-wide bridge.',
      date: '2026-08-05',
      data: [
        {
          label: 'Price effect', value: 12, displayValue: 'RUB 12m',
          quantity: 'contribution to operating profit change',
          scope: 'company-wide operating profit bridge', period: 'H1 2026'
        },
        {
          label: 'Cost effect', value: -7, displayValue: '−RUB 7m',
          quantity: 'contribution to operating profit change',
          scope: 'company-wide operating profit bridge', period: 'H1 2026'
        }
      ],
      measure: {
        quantity: 'contribution to operating profit change',
        unit: 'million RUB', axisTitle: 'Operating profit contribution',
        valueMode: 'absolute-change', levelAvailability: 'reported',
        decimals: 0, baseline: 'auto'
      }
    }), 'utf8');
    renderSpecFile(specPath, outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, {
      browser,
      viewports: REGIONAL_WORKFLOW_VIEWPORTS
    });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => {
      assert.equal(run.scaleAttributes?.['data-zero-reference'], 'interior-prominent');
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('components, duration timelines, benchmark gaps, dumbbells, heat matrices, waterfalls, and converging-signal relationships pass responsive diagnostics with quantitative marks', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-new-recipes-'));
  try {
    const cases = [
      { file: 'additive-components.json', minimumMarks: 2 },
      { file: 'fuel-ban-timeline.json', marks: 2 },
      { file: 'anchored-duration-timeline.json', marks: 2 },
      { file: 'population-risk-range.json', minimumMarks: 4 },
      { file: 'single-benchmark-gap.json', marks: 3 },
      { file: 'urals-benchmark-gap.json', marks: 3 },
      { file: 'marketplace-commission-dumbbell.json', marks: 12 },
      { file: 'support-channel-heatmap.json', marks: 9 },
      { file: 'ozon-collateral-waterfall.json', minimumMarks: 3 },
      { file: 'converging-signals.json', minimumMarks: 8 }
    ];
    cases.forEach(({ file, marks, minimumMarks }) => {
      const outputPath = path.join(tempDir, `${path.basename(file, '.json')}.html`);
      renderSpecFile(path.join(examplesDir, file), outputPath, { projectRoot: root });
      const diagnostics = diagnoseHtmlResponsive(outputPath, {
        browser,
        viewports: REGIONAL_WORKFLOW_VIEWPORTS
      });
      assert.equal(diagnostics.status, 'pass', file);
      diagnostics.runs.forEach((run) => {
        assert.equal(run.diagnostics?.summary?.errors, 0, file);
        assert.equal(run.diagnostics?.summary?.warnings, 0, file);
        if (minimumMarks !== undefined) {
          assert.ok(run.diagnostics?.summary?.marksChecked >= minimumMarks, file);
        } else {
          assert.equal(run.diagnostics?.summary?.marksChecked, marks, file);
        }
        if (file === 'converging-signals.json') {
          assert.equal(run.relationshipAttributes?.['data-relationship-continuation'], 'true');
        }
        if (file === 'support-channel-heatmap.json') {
          assert.equal(run.heatAttributes?.['data-heat-rows'], '3');
          assert.equal(run.heatAttributes?.['data-heat-columns'], '3');
          assert.equal(run.heatAttributes?.['data-heat-cells'], '9');
          assert.equal(run.heatAttributes?.['data-heat-direct-labels'], 'true');
          assert.equal(run.heatAttributes?.['data-heat-scale'], 'sequential');
        }
      });
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('ranking outside value labels reserve enough gutter for complete trailing units', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-ranking-value-gutter-'));
  try {
    const specPath = path.join(tempDir, 'ranking-value-gutter.json');
    const outputPath = path.join(tempDir, 'ranking-value-gutter.html');
    fs.writeFileSync(specPath, JSON.stringify({
      version: '2.0', recipe: 'ranking.horizontal',
      title: 'Station closures by operator type', date: '2026-08-10',
      data: [
        { label: 'Large independent chains', value: 105, displayValue: '105 stations', quantity: 'closed gas stations', scope: 'same station network', period: '2026 year to date' },
        { label: 'Small independent chains', value: 82, displayValue: '82 stations', quantity: 'closed gas stations', scope: 'same station network', period: '2026 year to date' },
        { label: 'Medium independent chains', value: 69, displayValue: '69 stations', quantity: 'closed gas stations', scope: 'same station network', period: '2026 year to date' }
      ],
      measure: {
        quantity: 'closed gas stations', unit: 'stations', axisTitle: 'Stations closed',
        valueMode: 'level', levelAvailability: 'reported', decimals: 0, baseline: 'zero', scale: 'linear'
      },
      narrative: { frame: 'comparison', density: 'editorial', emphasis: 'ranking' },
      options: { height: 'standard', sort: 'descending', showLabels: true, animate: false, labelMode: 'outside' }
    }));
    renderSpecFile(specPath, outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, { browser, viewports: REGIONAL_WORKFLOW_VIEWPORTS });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => {
      assert.equal(run.diagnostics?.summary?.errors, 0);
      assert.equal(run.diagnostics?.summary?.warnings, 0);
      const gutter = Number(run.rankingAttributes?.['data-ranking-value-label-gutter']);
      const measured = Number(run.rankingAttributes?.['data-ranking-value-label-width']);
      assert.ok(Number.isFinite(gutter) && Number.isFinite(measured) && measured > 0);
      assert.ok(gutter > measured, `expected ranking gutter ${gutter} to clear measured label width ${measured}`);
      assert.equal(run.diagnostics?.issues?.some((issue) =>
        ['label-clipped', 'text-truncated'].includes(issue.code) &&
        issue.elements?.some((element) => /105 stati/i.test(element.text || ''))
      ), false);
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('benchmark gaps reserve enough left gutter for long category labels', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-benchmark-label-gutter-'));
  try {
    const outputPath = path.join(tempDir, 'diesel-import-subsidy-gap.html');
    renderSpecFile(path.join(root, 'specs', 'samples', 'diesel-import-subsidy-gap.json'), outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, {
      browser,
      viewports: REGIONAL_WORKFLOW_VIEWPORTS
    });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => {
      assert.equal(run.diagnostics?.summary?.errors, 0);
      assert.equal(run.diagnostics?.summary?.warnings, 0);
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('reference labels clear nearby axis ticks and their own reference lines', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-reference-label-clearance-'));
  try {
    const specPath = path.join(tempDir, 'reference-label-clearance.json');
    const outputPath = path.join(tempDir, 'reference-label-clearance.html');
    fs.writeFileSync(specPath, JSON.stringify({
      version: '2.0',
      recipe: 'composition.components',
      title: 'Two components reconcile to a reported total',
      date: '2026-08-09',
      data: [
        {
          label: 'Recurring component', value: 539, displayValue: '539 units',
          quantity: 'reported component', scope: 'same total', period: '2026'
        },
        {
          label: 'Special component', value: 396, displayValue: '396 units',
          quantity: 'reported component', scope: 'same total', period: '2026'
        }
      ],
      references: [
        { value: 935, label: 'Reported total · 935 units', lineStyle: 'dashed', tone: 'neutral' },
        // 800 is intentionally an ordinary y-axis tick for this 0–1150 scale.
        // The reference label must still clear both that tick and the rotated
        // axis title when rendered in the middle of the plot.
        { value: 800, label: 'Prior total · 800 units', lineStyle: 'dashed', tone: 'neutral' }
      ],
      measure: {
        quantity: 'reported component', unit: 'units', axisTitle: 'Component value',
        valueMode: 'level', levelAvailability: 'reported', minimum: 0, maximum: 1150,
        decimals: 0, baseline: 'zero', scale: 'linear'
      },
      narrative: { frame: 'comparison', density: 'minimal', emphasis: 'composition' },
      options: { height: 'standard', showLabels: true, animate: false }
    }));
    const validated = validateSpec(JSON.parse(fs.readFileSync(specPath, 'utf8')));
    assert.equal(validated.valid, true, validated.errors.join('; '));
    renderSpecFile(specPath, outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, {
      browser,
      viewports: REGIONAL_WORKFLOW_VIEWPORTS
    });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => {
      assert.equal(run.diagnostics?.summary?.errors, 0);
      assert.equal(run.diagnostics?.summary?.warnings, 0);
      assert.equal(run.diagnostics?.issues?.some((issue) =>
        ['text-line-collision', 'text-text-overlap'].includes(issue.code) &&
        issue.elements?.some((element) => element.text === 'Reported total · 935 units')
      ), false);
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('direct-label donuts reserve leader-label gutters at every responsive width', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-direct-donut-labels-'));
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(examplesDir, 'budget-composition.json'), 'utf8'));
    spec.data[0].label = 'Online channel — led by marketplaces';
    spec.data[1].label = 'Physical bookstores';
    spec.data[2].label = 'Other retail channels';
    spec.data = spec.data.slice(0, 3);
    spec.data[2].value = 40;
    spec.data[2].displayValue = '40%';
    spec.options.showLegend = false;
    spec.options.showLabels = true;
    const specPath = path.join(tempDir, 'direct-donut.json');
    const outputPath = path.join(tempDir, 'direct-donut.html');
    fs.writeFileSync(specPath, JSON.stringify(spec));
    const validation = validateSpec(spec);
    assert.equal(validation.valid, true, validation.errors.join('; '));
    renderSpecFile(specPath, outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, { browser, viewports: REGIONAL_WORKFLOW_VIEWPORTS });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => assert.equal(run.diagnostics?.summary?.errors, 0));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('zero-bound trend points reserve a plot gutter above x-axis labels', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-zero-bound-trend-'));
  try {
    const spec = {
      version: '2.0', recipe: 'trend.line',
      title: 'Event-driven outage rose from zero to 444 thousand square metres',
      date: '2026-08-18', source: { name: 'Illustrative event chronology', period: 'June–July 2026' },
      data: [
        { label: '30 Jun', value: 0, displayValue: '0 m²', quantity: 'offline area', scope: 'same network', period: '30 Jun 2026' },
        { label: '18 Jul', value: 392, displayValue: '392k m²', quantity: 'offline area', scope: 'same network', period: '18 Jul 2026' },
        { label: '22 Jul', value: 444, displayValue: '444k m²', quantity: 'offline area', scope: 'same network', period: '22 Jul 2026' }
      ],
      measure: { quantity: 'offline area', unit: 'thousand m²', axisTitle: 'Offline area', valueMode: 'level', levelAvailability: 'reported', decimals: 0, baseline: 'zero', scale: 'linear' },
      narrative: { frame: 'warning', density: 'editorial', emphasis: 'direction' },
      options: { height: 'standard', showLegend: false, showLabels: true, animate: false, labelMode: 'outside' }
    };
    const specPath = path.join(tempDir, 'zero-bound-trend.json');
    const outputPath = path.join(tempDir, 'zero-bound-trend.html');
    fs.writeFileSync(specPath, JSON.stringify(spec));
    const validation = validateSpec(spec);
    assert.equal(validation.valid, true, validation.errors.join('; '));
    renderSpecFile(specPath, outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, { browser, viewports: REGIONAL_WORKFLOW_VIEWPORTS });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => assert.equal(run.diagnostics?.summary?.errors, 0));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('near-zero negative diverging labels clear long category names', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-diverging-near-zero-label-'));
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(examplesDir, 'profit-change-contributions.json'), 'utf8'));
    spec.data = [
      { ...spec.data[0], label: 'Independent online shops', value: 18, displayValue: '+18%' },
      { ...spec.data[1], label: 'Wildberries + Ozon sellers', value: -2, displayValue: '−2%' }
    ];
    spec.data.forEach((item) => { item.quantity = 'change in seller count'; item.scope = 'same online-selling business comparison'; });
    spec.measure = {
      quantity: 'change in seller count', unit: '%', axisTitle: 'Change in business count',
      valueMode: 'relative-change', levelAvailability: 'unavailable',
      normalizationNote: 'The fixture exercises a source-reported percent change rather than absolute seller counts.',
      decimals: 0, baseline: 'zero', scale: 'linear'
    };
    const specPath = path.join(tempDir, 'near-zero-diverging.json');
    const outputPath = path.join(tempDir, 'near-zero-diverging.html');
    fs.writeFileSync(specPath, JSON.stringify(spec));
    const validation = validateSpec(spec);
    assert.equal(validation.valid, true, validation.errors.join('; '));
    renderSpecFile(specPath, outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, { browser, viewports: REGIONAL_WORKFLOW_VIEWPORTS });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => assert.equal(run.diagnostics?.summary?.errors, 0));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('compared compositions remain collision-free across responsive widths', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-compared-composition-'));
  try {
    const outputPath = path.join(tempDir, 'compared-composition.html');
    renderSpecFile(path.join(examplesDir, 'compared-composition.json'), outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, { browser, viewports: REGIONAL_WORKFLOW_VIEWPORTS });
    assert.equal(diagnostics.status, 'pass');
    diagnostics.runs.forEach((run) => {
      assert.equal(run.diagnostics?.summary?.errors, 0);
      assert.equal(run.diagnostics?.summary?.warnings, 0);
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('regional overlay callouts keep a bottom gutter above notes', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-regional-note-gutter-'));
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(examplesDir, 'russia-regional-map.json'), 'utf8'));
    spec.note = 'Detached-region context belongs below the map and must never cover a callout.';
    const specPath = path.join(tempDir, 'regional-note-gutter.json');
    fs.writeFileSync(specPath, JSON.stringify(spec));
    const result = renderRegionalBreakdown(
      specPath,
      path.join(tempDir, 'regional-note-gutter.html'),
      { projectRoot: root, browser }
    );
    assert.equal(result.diagnostics.status, 'pass');
    result.diagnostics.runs.forEach((run) => {
      assert.equal(run.errors, 0);
      assert.equal(run.warnings, 0);
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('categorical status evidence is rejected before browser rendering', () => {
  const spec = {
    version: '2.0',
    recipe: 'status.grid',
    title: 'Categorical status wall',
    subtitle: 'Text-only status rows are not an accepted chart form.',
    date: '2026-08-04',
    data: [
      { label: 'A', status: 'blocked', detail: 'Closed.' },
      { label: 'B', status: 'strained', detail: 'Paused.' },
      { label: 'C', status: 'unknown', detail: 'Disputed.' }
    ]
  };
  const result = validateSpec(spec);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes('text-only status list is not a chart')));
});
