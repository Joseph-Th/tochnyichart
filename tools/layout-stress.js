#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { renderSpecFile } = require('../renderer/render');
const { diagnoseHtmlResponsive } = require('../renderer/capture');
const { STANDARD_DIAGNOSTIC_VIEWPORTS } = require('../renderer/workflow-contract');
const { freshToolWorkspace } = require('./tool-workspace');

const root = path.join(__dirname, '..');
const specPath = path.join(root, 'specs', 'stress', 'range-label-collision.json');
const htmlPath = path.join(freshToolWorkspace(root, 'layout-stress'), 'range-label-collision.html');

const rendered = renderSpecFile(specPath, htmlPath, { projectRoot: root });
const result = diagnoseHtmlResponsive(htmlPath, {
  viewports: STANDARD_DIAGNOSTIC_VIEWPORTS
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
