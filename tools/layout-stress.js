#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { renderSpecFile } = require('../renderer/render');
const { diagnoseHtmlResponsive } = require('../renderer/capture');
const { initializeRunWorkspace, workspacePath } = require('../renderer/run-workspace');

const root = path.join(__dirname, '..');
const specPath = path.join(root, 'specs', 'stress', 'range-label-collision.json');
const runId = 'layout-stress';
initializeRunWorkspace(root, runId, { createOutputs: false });
const htmlPath = workspacePath(root, runId, 'rendered', 'range-label-collision.html');

const rendered = renderSpecFile(specPath, htmlPath, { projectRoot: root });
const result = diagnoseHtmlResponsive(htmlPath, {
  viewports: [
    { width: 1200, height: 900 },
    { width: 768, height: 900 },
    { width: 480, height: 900 }
  ]
});

const nonPassing = result.runs.filter((run) => run.diagnostics?.status !== 'pass');
console.log(JSON.stringify({
  recipe: rendered.recipe,
  specPath,
  htmlPath,
  status: result.status,
  runs: result.runs
}, null, 2));

if (nonPassing.length) process.exit(1);
