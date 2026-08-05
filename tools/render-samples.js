#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { renderSpecFile } = require('../renderer/render');
const { reviewFile } = require('../renderer/review');
const { captureHtml, diagnoseHtmlResponsive, findBrowser } = require('../renderer/capture');
const { initializeRunWorkspace, workspacePath } = require('../renderer/run-workspace');

const root = path.join(__dirname, '..');
const specsDir = path.join(root, 'specs', 'samples');
const runId = 'sample-review';
initializeRunWorkspace(root, runId, { createOutputs: false });
const renderedDir = workspacePath(root, runId, 'rendered');
const reviewDir = workspacePath(root, runId, 'review');
const browser = findBrowser();

if (!browser) {
  throw new Error('No Edge or Chrome installation was found. Set TOCHNYI_BROWSER to render samples.');
}

fs.mkdirSync(renderedDir, { recursive: true });

const captures = [];
for (const file of fs.readdirSync(specsDir).filter((name) => name.endsWith('.json')).sort()) {
  const specPath = path.join(specsDir, file);
  const slug = path.basename(file, '.json');
  const rendered = renderSpecFile(specPath, path.join(renderedDir, `${slug}.html`), { projectRoot: root });
  const review = reviewFile(rendered.htmlPath);
  if (!review.valid) throw new Error(`${file}: ${review.errors.join('; ')}`);

  const outputSlug = rendered.normalized.metadata?.slug || slug;
  const pngPath = path.join(reviewDir, `${outputSlug}.png`);
  const responsive = diagnoseHtmlResponsive(rendered.htmlPath, { browser });
  if (responsive.status === 'fail') {
    throw new Error(`${file}: responsive diagnostics failed.`);
  }

  const screenshot = captureHtml(rendered.htmlPath, pngPath, { browser });
  const hash = crypto.createHash('sha256').update(fs.readFileSync(pngPath)).digest('hex');
  captures.push({
    recipe: rendered.recipe,
    spec: path.relative(root, specPath).replace(/\\/g, '/'),
    html: path.relative(root, rendered.htmlPath).replace(/\\/g, '/'),
    preview: path.relative(root, pngPath).replace(/\\/g, '/'),
    dimensions: screenshot.dimensions,
    bytes: screenshot.bytes,
    sha256: hash,
    responsiveDiagnostics: responsive.runs,
    warnings: [...new Set([
      ...rendered.warnings,
      ...review.warnings.map((warning) => warning.replace(/^ChartSpec: /, ''))
    ])]
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  browser,
  viewport: { width: 1200, height: 900 },
  captures
};

fs.writeFileSync(
  path.join(reviewDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);
console.log(JSON.stringify(manifest, null, 2));
