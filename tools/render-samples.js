#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { renderSpecFile } = require('../renderer/render');
const { reviewFile } = require('../renderer/review');
const { captureHtml, diagnoseHtmlResponsive, findBrowser } = require('../renderer/capture');

const root = path.join(__dirname, '..');
const specsDir = path.join(root, 'specs', 'samples');
const previewsDir = path.join(root, 'previews', 'new-workflow');
const browser = findBrowser();

if (!browser) {
  throw new Error('No Edge or Chrome installation was found. Set TOCHNYI_BROWSER to render samples.');
}

fs.mkdirSync(previewsDir, { recursive: true });

const captures = [];
for (const file of fs.readdirSync(specsDir).filter((name) => name.endsWith('.json')).sort()) {
  const specPath = path.join(specsDir, file);
  const rendered = renderSpecFile(specPath, null, { projectRoot: root });
  const review = reviewFile(rendered.htmlPath);
  if (!review.valid) throw new Error(`${file}: ${review.errors.join('; ')}`);

  const slug = rendered.normalized.metadata?.slug || path.basename(file, '.json');
  const pngPath = path.join(previewsDir, `${slug}.png`);
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
  path.join(previewsDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
);
console.log(JSON.stringify(manifest, null, 2));
