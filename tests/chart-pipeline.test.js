'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateSpec } = require('../renderer/validate');
const { renderHtml, renderSpecFile, isoWeek } = require('../renderer/render');
const { reviewHtml, reviewFile } = require('../renderer/review');
const { recipeIds } = require('../renderer/catalog');
const { extractLayoutDiagnostics } = require('../renderer/capture');
const { diagnoseBoxes, diagnoseMarkStyles, normalizeRect } = require('../lib/tochnyi-diagnostics');
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
  assert.ok(policy.activeFillOpacity < 0.9);
  assert.ok(policy.inactiveFillOpacity < policy.activeFillOpacity);
});

test('regional maps suppress centroid dots unless explicitly requested', () => {
  assert.equal(TochnyiMaps.resolveAnchorStyle({ anchorStyle: 'auto' }), 'none');
  assert.equal(TochnyiMaps.resolveAnchorStyle({ anchorStyle: 'none' }), 'none');
  assert.equal(TochnyiMaps.resolveAnchorStyle({ anchorStyle: 'dot' }), 'dot');
});

test('regional map leader routing separates clustered callouts into traceable lanes', () => {
  const entries = [100, 104, 109, 113, 119].map((y, index) => ({
    index,
    side: 'left',
    point: { x: 500 + index * 20, y }
  }));
  assert.equal(TochnyiMaps.resolveLeaderRouting({ leaderRouting: 'auto' }, entries), 'lanes');
  const planned = TochnyiMaps.planLeaderRoutes(entries, {
    routing: 'auto', top: 80, bottom: 180, gap: 16
  });
  assert.equal(planned.routing, 'lanes');
  const routeYs = planned.slice().sort((a, b) => a.routeY - b.routeY).map((entry) => entry.routeY);
  for (let index = 1; index < routeYs.length; index += 1) {
    assert.ok(routeYs[index] - routeYs[index - 1] >= 15.9);
  }
  assert.ok(planned.every((entry) => entry.sideCount === entries.length));
  assert.equal(TochnyiMaps.resolveLeaderRouting({ leaderRouting: 'auto' }, entries.slice(0, 2)), 'direct');
  assert.equal(TochnyiMaps.resolveLeaderRouting({ leaderRouting: 'direct' }, entries), 'direct');
});

test('regional map leaders use orthogonal geometry without arbitrary diagonals', () => {
  const leftPath = TochnyiMaps.buildOrthogonalLeaderPath({
    side: 'left',
    point: { x: 520, y: 310 },
    routeY: 340,
    laneIndex: 2,
    sideCount: 5
  }, {
    mapEdgeX: 240,
    cardX: 220,
    endY: 120
  });
  assert.match(leftPath.path, /^M 520 310 H /);
  assert.match(leftPath.path, / V 340 H .* V 120 H 220$/);
  assert.doesNotMatch(leftPath.path, /\sL\s/);
  assert.ok(leftPath.approachX > 240 && leftPath.approachX < 520);

  const rightPath = TochnyiMaps.buildOrthogonalLeaderPath({
    side: 'right',
    point: { x: 610, y: 330 },
    routeY: 360,
    laneIndex: 3,
    sideCount: 5
  }, {
    mapEdgeX: 960,
    cardX: 980,
    endY: 450
  });
  assert.doesNotMatch(rightPath.path, /\sL\s/);
  assert.ok(rightPath.approachX > 610 && rightPath.approachX < 960);
});

test('regional map planning focuses on active data and omits inactive detached regions', () => {
  const regionSet = TochnyiMaps.getRegionSet('russia');
  const rectangle = (left, bottom, right, top) => ({
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [left, bottom], [right, bottom], [right, top], [left, top], [left, bottom]
      ]]
    }
  });
  const featureById = {
    'RU-BRY': rectangle(31, 51, 35, 54),
    'RU-ZAB': rectangle(107, 49, 122, 58),
    'RU-KGD': rectangle(19, 54, 23, 55)
  };
  const plan = TochnyiMaps.resolveMapPlan(
    { viewport: 'auto', excludeRegions: [] },
    regionSet,
    [{ regionId: 'RU-BRY' }, { regionId: 'RU-ZAB' }],
    featureById
  );
  assert.equal(plan.viewportMode, 'data');
  assert.ok(plan.excludedRegionIds.includes('RU-KGD'));
  assert.ok(plan.geoBounds.left < 31);
  assert.ok(plan.geoBounds.right > 122);

  const kaliningradPlan = TochnyiMaps.resolveMapPlan(
    { viewport: 'auto', excludeRegions: [] },
    regionSet,
    [{ regionId: 'RU-KGD' }],
    featureById
  );
  assert.equal(kaliningradPlan.excludedRegionIds.includes('RU-KGD'), false);
});

test('regional map specs validate known regions and load map tooling', () => {
  const spec = loadExample('russia-regional-map.json');
  let result = validateSpec(spec);
  assert.equal(result.valid, true, result.errors.join('; '));
  const html = renderHtml(result.normalized);
  assert.match(html, /lib\/5\/map[.]js/);
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
  assert.ok(result.errors.some((error) => error.includes('cannot hide active data region')));

  const invalidExclusions = loadExample('russia-regional-map.json');
  invalidExclusions.map.excludeRegions = 'RU-KGD';
  result = validateSpec(invalidExclusions);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('map.excludeRegions must be an array')));

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
  assert.match(css, /--tochnyi-watermark-opacity:\s*0\.14/);
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

test('semantic cards do not use thick colored border highlights', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'lib', 'tochnyi.css'), 'utf8');
  assert.doesNotMatch(css, /\.tochnyi-(?:status-card|stat|sequence-node|headline-metric)[^{]*\{[^}]*border-top:\s*(?:[2-9]|\d{2,})px/gs);
  assert.doesNotMatch(css, /\.tochnyi-(?:status-card|stat|sequence-node|headline-metric)[^{]*\[[^\]]+\][^{]*\{[^}]*border-top-color/gs);
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

test('renderer writes a reviewable chart file', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-chart-'));
  const output = path.join(tempDir, 'example.html');
  const result = renderSpecFile(path.join(examplesDir, 'ai95-price-spike.json'), output);
  assert.equal(fs.existsSync(output), true);
  assert.equal(result.recipe, 'comparison.change');
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

test('range, status, and waterfall semantics are enforced', () => {
  const range = loadExample('farm-diesel-range.json');
  let result = validateSpec(range);
  assert.equal(result.valid, true, result.errors.join('; '));
  range.data[1].low = 10000;
  range.data[1].high = 3000;
  result = validateSpec(range);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('data[1].low must not exceed high.'));

  const status = loadExample('fuel-shortage-status.json');
  delete status.data[0].status;
  result = validateSpec(status);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('data[0].status is required for status.grid.'));

  const waterfall = loadExample('ozon-collateral-waterfall.json');
  waterfall.data[0].role = 'change';
  result = validateSpec(waterfall);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('flow.waterfall must begin with a start item.'));
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
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.ok(result.warnings.some((warning) => warning.includes('internal working reference')));
  assert.ok(result.warnings.some((warning) => warning.includes('ambiguous repeated unit abbreviation')));
  assert.ok(result.warnings.some((warning) => warning.includes('Supporting facts repeat values')));
});

test('ISO week paths are zero padded', () => {
  assert.equal(isoWeek('2026-01-01'), '2026-week-01');
  assert.equal(isoWeek('2026-07-26'), '2026-week-30');
});
