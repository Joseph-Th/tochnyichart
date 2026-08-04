'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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
