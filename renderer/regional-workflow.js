'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateSpec } = require('./validate');
const { renderSpecFile, assetFingerprint } = require('./render');
const { reviewFile } = require('./review');
const { diagnoseHtmlResponsive } = require('./capture');
const TochnyiMaps = require('../lib/tochnyi-maps');

const REGIONAL_WORKFLOW_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 1450, height: 679 }),
  Object.freeze({ width: 768, height: 900 }),
  Object.freeze({ width: 480, height: 900 })
]);

function readSpec(specPath) {
  return JSON.parse(fs.readFileSync(path.resolve(specPath), 'utf8'));
}

function validationError(message, validation) {
  const error = new Error(message);
  error.validation = validation;
  return error;
}

function validateRegionalSpec(specPath) {
  const absolutePath = path.resolve(specPath);
  const validation = validateSpec(readSpec(absolutePath));
  if (!validation.valid) {
    throw validationError('Regional breakdown specification is invalid.', validation);
  }
  if (validation.normalized.recipe !== 'map.regional') {
    throw validationError('The regional workflow only accepts recipe "map.regional".', {
      valid: false,
      errors: ['recipe must be map.regional for the regional workflow.'],
      warnings: validation.warnings
    });
  }
  return { specPath: absolutePath, validation };
}

function numberAttribute(attributes, name) {
  const value = Number(attributes?.[name]);
  return Number.isFinite(value) ? value : null;
}

function summarizeDiagnosticRun(run) {
  const attributes = run.chartAttributes || {};
  return {
    viewport: run.viewport,
    status: run.diagnostics?.status || 'pass',
    errors: run.diagnostics?.summary?.errors || 0,
    warnings: run.diagnostics?.summary?.warnings || 0,
    workflow: attributes['data-map-workflow'] || null,
    routing: attributes['data-map-leader-routing'] || null,
    placement: attributes['data-map-callout-placement'] || null,
    predictedCrossings: numberAttribute(attributes, 'data-map-callout-predicted-crossings'),
    renderedCrossings: numberAttribute(attributes, 'data-map-port-rendered-crossings'),
    finalCollisions: numberAttribute(attributes, 'data-map-port-final-collisions'),
    fallbackRoutes: numberAttribute(attributes, 'data-map-port-fallback-routes'),
    sourceExitRoutes: numberAttribute(attributes, 'data-map-port-source-exit-routes'),
    strictEnvelopeRoutes: numberAttribute(attributes, 'data-map-port-strict-envelope-routes'),
    expandedEnvelopeRoutes: numberAttribute(attributes, 'data-map-port-expanded-envelope-routes')
  };
}

function renderRegionalBreakdown(specPath, outputPath, options = {}) {
  const checked = validateRegionalSpec(specPath);
  const projectRoot = options.projectRoot || path.resolve(__dirname, '..');
  const rendered = renderSpecFile(checked.specPath, outputPath, { projectRoot });
  const review = reviewFile(rendered.htmlPath);
  if (!review.valid) {
    throw validationError('Generated regional chart failed shell review.', {
      valid: false,
      errors: review.errors,
      warnings: review.warnings
    });
  }

  const diagnostics = options.diagnose === false
    ? null
    : diagnoseHtmlResponsive(rendered.htmlPath, {
        browser: options.browser,
        viewports: options.viewports || REGIONAL_WORKFLOW_VIEWPORTS,
        requireViewportFit: Boolean(options.requireViewportFit)
      });
  const runs = diagnostics ? diagnostics.runs.map(summarizeDiagnosticRun) : [];
  const status = diagnostics?.status || 'not-run';
  if (status === 'fail') {
    throw validationError('Generated regional chart failed browser diagnostics.', {
      valid: false,
      errors: runs.filter((run) => run.status === 'fail'),
      warnings: []
    });
  }

  return {
    workflow: 'regional-breakdown',
    specPath: checked.specPath,
    htmlPath: rendered.htmlPath,
    assetVersion: assetFingerprint(projectRoot),
    recipe: checked.validation.normalized.recipe,
    regionSet: checked.validation.normalized.map.regionSet,
    regionCount: checked.validation.normalized.data.length,
    normalizedMap: checked.validation.normalized.map,
    warnings: [...new Set([
      ...checked.validation.warnings,
      ...rendered.warnings,
      ...review.warnings.map((warning) => warning.replace(/^ChartSpec: /, ''))
    ])],
    review: { valid: review.valid, errors: review.errors },
    diagnostics: { status, runs }
  };
}

function regionalAgentGuide(regionSetId = 'russia') {
  const regionSet = TochnyiMaps.listRegionSets().find((entry) => entry.id === regionSetId);
  if (!regionSet) {
    throw new Error(`Unknown region set: ${regionSetId}. Available: ${TochnyiMaps.regionSetIds.join(', ')}.`);
  }
  return {
    recipe: 'map.regional',
    command: 'node tools/chart.js regional <spec.json> [output.html]',
    authoringRule: 'Specify editorial content and stable region IDs. Omit automatic layout and routing fields unless the story requires an explicit override.',
    requiredTopLevel: ['title', 'date', 'source', 'data', 'metadata.slug'],
    requiredDataItem: ['label', 'regionId or regionIds', 'status', 'displayValue', 'detail'],
    minimalMap: { regionSet: regionSet.id },
    overrideOnlyWhenNeeded: [
      'map.viewport',
      'map.contextFit',
      'map.landmass',
      'map.excludeRegions',
      'data[].calloutSide'
    ],
    automaticByDefault: [
      'callout placement',
      'column ordering',
      'leader routing',
      'obstacle avoidance',
      'curve simplification',
      'card attachment smoothing',
      'summary visibility',
      'responsive diagnostics'
    ],
    statuses: ['stable', 'improving', 'strained', 'critical', 'blocked', 'unknown'],
    regionSet: {
      id: regionSet.id,
      label: regionSet.label,
      detachedRegionIds: regionSet.detachedRegionIds,
      regionCount: regionSet.regions.length
    }
  };
}

module.exports = {
  REGIONAL_WORKFLOW_VIEWPORTS,
  validateRegionalSpec,
  renderRegionalBreakdown,
  regionalAgentGuide,
  summarizeDiagnosticRun
};
