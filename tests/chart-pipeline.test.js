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
