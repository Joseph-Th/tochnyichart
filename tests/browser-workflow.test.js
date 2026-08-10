'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { validateSpec } = require('../renderer/validate');
const { renderSpecFile } = require('../renderer/render');
const {
  diagnoseHtmlResponsive,
  findBrowser
} = require('../renderer/capture');
const {
  REGIONAL_WORKFLOW_VIEWPORTS,
  renderRegionalBreakdown
} = require('../renderer/regional-workflow');

const root = path.join(__dirname, '..');
const examplesDir = path.join(root, 'specs', 'examples');
const browser = findBrowser();

function nonNullNumbers(runs, field) {
  return runs
    .map((run) => run[field])
    .filter((value) => value !== null && value !== undefined);
}

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
      title: 'Two near-equal values use one label treatment',
      subtitle: 'A numeric comparison fact makes this two-item scenario comparison independently useful.',
      date: '2026-08-06',
      data: [
        {
          label: 'Option A', value: 78, displayValue: '78 units',
          quantity: 'capacity', scope: 'same system', period: '2026'
        },
        {
          label: 'Option B', value: 80, displayValue: '80 units',
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

test('components, duration timelines, benchmark gaps, dumbbells, and converging-signal relationships pass responsive diagnostics with quantitative marks', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
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
      });
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
      references: [{ value: 935, label: 'Reported total · 935 units', lineStyle: 'dashed', tone: 'neutral' }],
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
