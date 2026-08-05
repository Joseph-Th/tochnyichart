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

test('categorical status evidence renders as an unboxed list without responsive collisions', { skip: browser ? false : 'Edge or Chrome is unavailable.' }, () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-status-list-'));
  try {
    const outputPath = path.join(tempDir, 'status-list.html');
    renderSpecFile(path.join(examplesDir, 'fuel-shortage-status.json'), outputPath, { projectRoot: root });
    const diagnostics = diagnoseHtmlResponsive(outputPath, {
      browser,
      viewports: REGIONAL_WORKFLOW_VIEWPORTS
    });
    assert.equal(diagnostics.status, 'pass');
    assert.ok(diagnostics.runs.every((run) => run.diagnostics?.summary?.errors === 0));
    assert.ok(diagnostics.runs.every((run) => run.diagnostics?.summary?.warnings === 0));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
