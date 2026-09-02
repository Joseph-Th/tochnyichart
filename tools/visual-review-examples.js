#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { renderSpecFile } = require('../renderer/render');
const { reviewFile } = require('../renderer/review');
const { captureHtml, findBrowser } = require('../renderer/capture');
const { initializeRunWorkspace, workspacePath } = require('../renderer/run-workspace');
const { resolveImageProfile } = require('../renderer/image-profiles');
const { summarizeDiagnosticRun, assertNaturalRegionalRuns } = require('../renderer/regional-workflow');

const root = path.join(__dirname, '..');
const specsDir = path.join(root, 'specs', 'examples');
const runId = 'example-visual-review';
initializeRunWorkspace(root, runId, { createOutputs: false });
const chartsDir = workspacePath(root, runId, 'rendered');
const reviewDir = workspacePath(root, runId, 'review');
const browser = findBrowser();

if (!browser) {
  throw new Error('No Edge or Chrome installation was found. Set TOCHNYI_BROWSER to run visual review.');
}

fs.mkdirSync(chartsDir, { recursive: true });

const captures = [];
for (const file of fs.readdirSync(specsDir).filter((name) => name.endsWith('.json')).sort()) {
  const base = file.replace(/\.json$/i, '');
  const specPath = path.join(specsDir, file);
  const htmlPath = path.join(chartsDir, `${base}.html`);
  const pngPath = path.join(reviewDir, `${base}.png`);
  const rendered = renderSpecFile(specPath, htmlPath, { projectRoot: root });
  const review = reviewFile(htmlPath);
  if (!review.valid) throw new Error(`${file}: ${review.errors.join('; ')}`);
  const profile = resolveImageProfile('auto', rendered.recipe);
  const screenshot = captureHtml(htmlPath, pngPath, {
    browser,
    viewport: profile.viewport,
    autoFit: true,
    adaptiveCanvas: profile.adaptive,
    adaptiveHeight: profile.adaptive
  });
  if (screenshot.diagnostics?.status === 'fail') {
    const details = (screenshot.diagnostics.issues || [])
      .filter((issue) => issue.severity === 'error')
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join(' | ');
    throw new Error(
      `${file}: layout diagnostics found ${screenshot.diagnostics.summary.errors} error(s)` +
      (details ? `: ${details}` : '.')
    );
  }
  let regionalDiagnostics = null;
  if (rendered.recipe === 'map.regional') {
    regionalDiagnostics = summarizeDiagnosticRun({
      viewport: screenshot.dimensions,
      diagnostics: screenshot.diagnostics,
      chartAttributes: screenshot.chartAttributes || {}
    });
    assertNaturalRegionalRuns([regionalDiagnostics]);
  }
  const hash = crypto.createHash('sha256').update(fs.readFileSync(pngPath)).digest('hex');
  captures.push({
    recipe: rendered.recipe,
    spec: path.relative(root, specPath).replace(/\\/g, '/'),
    html: path.relative(root, htmlPath).replace(/\\/g, '/'),
    preview: path.relative(root, pngPath).replace(/\\/g, '/'),
    imageProfile: profile.id,
    requestedViewport: profile.viewport,
    dimensions: screenshot.dimensions,
    bytes: screenshot.bytes,
    sha256: hash,
    diagnostics: screenshot.diagnostics,
    regionalDiagnostics,
    warnings: [...new Set([...rendered.warnings, ...review.warnings.map((warning) => warning.replace(/^ChartSpec: /, ''))])]
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  browser,
  imageProfile: 'auto',
  captures
};
fs.writeFileSync(path.join(reviewDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(manifest, null, 2));
