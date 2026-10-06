#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { diagnoseHtml, findBrowser } = require('../renderer/capture');
const { renderSpecFile } = require('../renderer/render');

const root = path.join(__dirname, '..');
const browser = findBrowser();
if (!browser) {
  throw new Error('No Edge or Chrome installation was found. Set TOCHNYI_BROWSER to run the diagnostic self-test.');
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-diagnostics-'));
const diagnosticsUrl = pathToFileURL(path.join(root, 'lib', 'tochnyi-diagnostics.js')).href;

function writeFixture(name, body) {
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, `<!DOCTYPE html>
<html lang="en" data-rendered="true">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; }
    .tochnyi-v2 { width: 400px; }
  </style>
</head>
<body>
  ${body}
  <script src="${diagnosticsUrl}"></script>
</body>
</html>`, 'utf8');
  return filePath;
}

function hasIssue(result, code) {
  return Boolean(result.diagnostics?.issues?.some((issue) => issue.code === code));
}

try {
  const clipped = writeFixture('clipped-text.html', `
    <main class="tochnyi-v2">
      <div style="width: 130px; height: 24px; overflow: hidden; white-space: nowrap;">
        This text is intentionally too long for the visible box.
      </div>
    </main>`);
  const clippedResult = diagnoseHtml(clipped, {
    browser,
    viewport: { width: 800, height: 600 }
  });
  if (clippedResult.diagnostics?.status !== 'fail' || !hasIssue(clippedResult, 'text-truncated')) {
    throw new Error('Headless diagnostics failed to detect intentionally truncated text.');
  }

  const overflow = writeFixture('canvas-overflow.html', `
    <main class="tochnyi-v2" style="height: 760px;">
      Fixed export canvas overflow fixture.
    </main>`);
  const overflowResult = diagnoseHtml(overflow, {
    browser,
    viewport: { width: 800, height: 600 },
    requireViewportFit: true
  });
  if (overflowResult.diagnostics?.status !== 'fail' || !hasIssue(overflowResult, 'canvas-overflow')) {
    throw new Error('Headless diagnostics failed to detect fixed-canvas overflow.');
  }

  // A value label drawn past the top edge of its SVG stage must be reported as clipped.
  const clippedLabel = writeFixture('svg-label-clipping.html', `
    <main class="tochnyi-v2">
      <svg data-label-layout="complete" viewBox="0 0 400 200" width="400" height="200" style="overflow: visible; margin-top: 60px;">
        <rect data-tochnyi-mark="column" data-label-group="column-0" x="150" y="0" width="100" height="200" fill="#005bbb"></rect>
        <text data-label-role="bar-value" data-label-group="column-0" x="200" y="-12" text-anchor="middle" font-size="24" font-weight="700">100 points</text>
      </svg>
    </main>`);
  const clippedLabelResult = diagnoseHtml(clippedLabel, {
    browser,
    viewport: { width: 800, height: 600 }
  });
  if (clippedLabelResult.diagnostics?.status !== 'fail' || !hasIssue(clippedLabelResult, 'label-clipped')) {
    throw new Error('Headless diagnostics failed to detect a value label drawn outside its SVG stage.');
  }

  const chartSpecPath = path.join(tempDir, 'boundary-label.json');
  const chartHtmlPath = path.join(tempDir, 'boundary-label.html');
  const chartSpec = {
    version: '2.0',
    recipe: 'comparison.scenarios',
    title: 'Boundary label regression',
    subtitle: 'A value at the axis maximum must retain a fully visible label.',
    date: '2026-08-02',
    source: { name: 'Diagnostic fixture' },
    data: [
      {
        label: 'Lower point',
        value: 20,
        displayValue: '20 points',
        quantity: 'diagnostic boundary score',
        scope: 'boundary-label diagnostic fixture',
        period: 'single diagnostic run'
      },
      {
        label: 'Midpoint',
        value: 50,
        displayValue: '50 points',
        quantity: 'diagnostic boundary score',
        scope: 'boundary-label diagnostic fixture',
        period: 'single diagnostic run'
      },
      {
        label: 'Axis maximum',
        value: 100,
        displayValue: '100 points',
        quantity: 'diagnostic boundary score',
        scope: 'boundary-label diagnostic fixture',
        period: 'single diagnostic run'
      }
    ],
    measure: {
      quantity: 'diagnostic boundary score',
      unit: 'points',
      axisTitle: 'Boundary score',
      valueMode: 'level',
      levelAvailability: 'reported',
      decimals: 0,
      minimum: 0,
      maximum: 100,
      baseline: 'explicit'
    },
    supportingFacts: [
      { value: '100-point ceiling', label: 'Diagnostic axis bound', role: 'comparison' }
    ],
    narrative: { frame: 'neutral', density: 'editorial', emphasis: 'magnitude' },
    options: {
      height: 'standard',
      sort: 'none',
      showLegend: false,
      showLabels: true,
      animate: false,
      labelMode: 'outside'
    }
  };
  // A real column at the axis maximum keeps its outside value label fully visible.
  ['outside', 'auto'].forEach((labelMode) => {
    chartSpec.options.labelMode = labelMode;
    fs.writeFileSync(chartSpecPath, `${JSON.stringify(chartSpec, null, 2)}\n`, 'utf8');
    renderSpecFile(chartSpecPath, chartHtmlPath, { projectRoot: root });
    const boundaryResult = diagnoseHtml(chartHtmlPath, {
      browser,
      viewport: { width: 1200, height: 900 }
    });
    if (boundaryResult.diagnostics?.status === 'fail' || hasIssue(boundaryResult, 'label-clipped')) {
      throw new Error(`A column at the axis maximum lost its value label (labelMode ${labelMode}).`);
    }
  });

  console.log(JSON.stringify({
    status: 'pass',
    browser,
    checks: [
      { code: 'text-truncated', detected: true },
      { code: 'canvas-overflow', detected: true },
      { code: 'label-clipped', detected: true },
      { code: 'boundary-label-headroom', resolved: true }
    ]
  }, null, 2));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
