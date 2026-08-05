'use strict';

const path = require('node:path');
const { renderValidatedSpecFile, assetFingerprint } = require('./render');
const { diagnoseHtmlResponsive } = require('./capture');
const { regionalWorkflowGuide } = require('./agent-workflow');
const {
  REGIONAL_WORKFLOW,
  validateSpecFile,
  reviewRenderedChart,
  collectWorkflowWarnings,
  workflowError
} = require('./workflow');

const REGIONAL_WORKFLOW_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 1450, height: 679 }),
  Object.freeze({ width: 768, height: 900 }),
  Object.freeze({ width: 480, height: 900 })
]);

function validateRegionalSpec(specPath) {
  return validateSpecFile(specPath, {
    workflow: REGIONAL_WORKFLOW,
    recipe: 'map.regional',
    invalidMessage: 'Regional breakdown specification is invalid.',
    recipeMessage: 'The regional workflow only accepts recipe "map.regional".'
  });
}

function numberAttribute(attributes, name) {
  const value = Number(attributes?.[name]);
  return Number.isFinite(value) ? value : null;
}

function firstNumberAttribute(attributes, names) {
  for (const name of names) {
    const value = numberAttribute(attributes, name);
    if (value !== null) return value;
  }
  return null;
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
    predictedCrowding: numberAttribute(attributes, 'data-map-callout-predicted-crowding'),
    renderedCrossings: numberAttribute(attributes, 'data-map-port-rendered-crossings'),
    routeCrowding: firstNumberAttribute(attributes, [
      'data-map-leader-crowding-score',
      'data-map-port-crowding-score'
    ]),
    crowdedRoutes: firstNumberAttribute(attributes, [
      'data-map-leader-crowded-pairs',
      'data-map-port-crowded-routes'
    ]),
    minimumRouteGap: firstNumberAttribute(attributes, [
      'data-map-leader-min-gap',
      'data-map-port-min-route-gap'
    ]),
    finalCollisions: numberAttribute(attributes, 'data-map-port-final-collisions'),
    fallbackRoutes: numberAttribute(attributes, 'data-map-port-fallback-routes'),
    sourceExitRoutes: numberAttribute(attributes, 'data-map-port-source-exit-routes'),
    strictEnvelopeRoutes: numberAttribute(attributes, 'data-map-port-strict-envelope-routes'),
    expandedEnvelopeRoutes: numberAttribute(attributes, 'data-map-port-expanded-envelope-routes')
  };
}

function renderRegionalBreakdown(specPath, outputPath, options = {}) {
  const checked = validateRegionalSpec(specPath);
  const projectRoot = path.resolve(options.projectRoot || path.resolve(__dirname, '..'));
  const assetVersion = options.assetVersion || assetFingerprint(projectRoot);
  const rendered = renderValidatedSpecFile(checked.specPath, checked.validation.normalized, outputPath, {
    projectRoot,
    assetVersion,
    runId: options.runId,
    warnings: checked.validation.warnings
  });
  const review = reviewRenderedChart(rendered, {
    message: 'Generated regional chart failed shell review.'
  });

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
    throw workflowError('Generated regional chart failed browser diagnostics.', {
      valid: false,
      errors: runs.filter((run) => run.status === 'fail'),
      warnings: []
    });
  }

  return {
    workflow: REGIONAL_WORKFLOW,
    specPath: checked.specPath,
    htmlPath: rendered.htmlPath,
    assetVersion,
    recipe: checked.validation.normalized.recipe,
    bytes: rendered.bytes,
    regionSet: checked.validation.normalized.map.regionSet,
    regionCount: checked.validation.normalized.data.length,
    normalizedMap: checked.validation.normalized.map,
    warnings: collectWorkflowWarnings(checked, rendered, review),
    review: { valid: review.valid, errors: review.errors },
    diagnostics: { status, runs }
  };
}

module.exports = {
  REGIONAL_WORKFLOW_VIEWPORTS,
  validateRegionalSpec,
  renderRegionalBreakdown,
  regionalAgentGuide: regionalWorkflowGuide,
  summarizeDiagnosticRun
};
