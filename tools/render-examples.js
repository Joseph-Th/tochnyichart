#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { renderSpecFile } = require('../renderer/render');
const { reviewFile } = require('../renderer/review');
const { initializeRunWorkspace, workspacePath } = require('../renderer/run-workspace');

const root = path.join(__dirname, '..');
const specsDir = path.join(root, 'specs', 'examples');
const runId = 'example-render';
initializeRunWorkspace(root, runId, { createOutputs: false });
const outputDir = workspacePath(root, runId, 'rendered');

const results = [];
for (const file of fs.readdirSync(specsDir).filter((name) => name.endsWith('.json')).sort()) {
  const specPath = path.join(specsDir, file);
  const outputPath = path.join(outputDir, file.replace(/\.json$/i, '.html'));
  const rendered = renderSpecFile(specPath, outputPath, { projectRoot: root });
  const review = reviewFile(outputPath);
  if (!review.valid) throw new Error(`${file}: ${review.errors.join('; ')}`);
  results.push({
    spec: path.relative(root, specPath),
    html: path.relative(root, outputPath),
    recipe: rendered.recipe,
    bytes: rendered.bytes,
    warnings: [...new Set([...rendered.warnings, ...review.warnings.map((warning) => warning.replace(/^ChartSpec: /, ''))])]
  });
}

console.log(JSON.stringify({ rendered: results }, null, 2));
