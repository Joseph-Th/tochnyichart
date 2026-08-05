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

  const chartSpecPath = path.join(tempDir, 'amcharts-label-clipping.json');
  const chartHtmlPath = path.join(tempDir, 'amcharts-label-clipping.html');
  const chartSpec = {
    version: '2.0',
    recipe: 'comparison.scenarios',
    title: 'Boundary label regression',
    subtitle: 'A value at the axis maximum must retain a fully visible label.',
    date: '2026-08-02',
    source: { name: 'Diagnostic fixture' },
    data: [
      {
        label: 'Midpoint',
        value: 50,
        displayValue: '50',
        quantity: 'diagnostic index value',
        scope: 'boundary-label diagnostic fixture',
        period: 'single diagnostic run'
      },
      {
        label: 'Axis maximum',
        value: 100,
        displayValue: '100',
        quantity: 'diagnostic index value',
        scope: 'boundary-label diagnostic fixture',
        period: 'single diagnostic run'
      }
    ],
    measure: {
      quantity: 'diagnostic index value',
      unit: 'index',
      decimals: 0,
      minimum: 0,
      maximum: 100,
      baseline: 'explicit'
    },
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
  fs.writeFileSync(chartSpecPath, `${JSON.stringify(chartSpec, null, 2)}\n`, 'utf8');
  renderSpecFile(chartSpecPath, chartHtmlPath, { projectRoot: root });
  const chartClipResult = diagnoseHtml(chartHtmlPath, {
    browser,
    viewport: { width: 1200, height: 900 }
  });
  if (chartClipResult.diagnostics?.status !== 'fail' || !hasIssue(chartClipResult, 'label-clipped')) {
    throw new Error('Headless diagnostics failed to detect a clipped AMCharts value label.');
  }

  chartSpec.options.labelMode = 'auto';
  fs.writeFileSync(chartSpecPath, `${JSON.stringify(chartSpec, null, 2)}\n`, 'utf8');
  renderSpecFile(chartSpecPath, chartHtmlPath, { projectRoot: root });
  const chartAutoResult = diagnoseHtml(chartHtmlPath, {
    browser,
    viewport: { width: 1200, height: 900 }
  });
  if (hasIssue(chartAutoResult, 'label-clipped')) {
    throw new Error('Automatic column-label placement did not resolve the boundary collision.');
  }

  console.log(JSON.stringify({
    status: 'pass',
    browser,
    checks: [
      { code: 'text-truncated', detected: true },
      { code: 'canvas-overflow', detected: true },
      { code: 'label-clipped', detected: true },
      { code: 'adaptive-label-placement', resolved: true }
    ]
  }, null, 2));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
