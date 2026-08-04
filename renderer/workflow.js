'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateSpec } = require('./validate');
const { renderValidatedSpecFile, assetFingerprint } = require('./render');
const { reviewFile } = require('./review');
const { DEFAULT_REGION_SET_ID } = require('./agent-workflow');
const { STANDARD_WORKFLOW, REGIONAL_WORKFLOW } = require('./workflow-contract');

function readSpecFile(specPath) {
  if (typeof specPath !== 'string' || !specPath.trim()) {
    throw workflowError('A ChartSpec JSON path is required.', {
      valid: false,
      errors: ['Provide a path to a ChartSpec JSON file.'],
      warnings: []
    });
  }
  const absolutePath = path.resolve(specPath);
  let source;
  try {
    source = fs.readFileSync(absolutePath, 'utf8');
  } catch (error) {
    throw workflowError(`Unable to read ChartSpec file: ${absolutePath}.`, {
      valid: false,
      errors: [error.message],
      warnings: []
    });
  }
  let spec;
  try {
    spec = JSON.parse(source);
  } catch (error) {
    throw workflowError(`ChartSpec JSON is malformed: ${absolutePath}.`, {
      valid: false,
      errors: [error.message],
      warnings: []
    });
  }
  return {
    specPath: absolutePath,
    spec
  };
}

function workflowError(message, validation) {
  const error = new Error(message);
  if (validation) error.validation = validation;
  return error;
}

function validationForWorkflow(recipe, workflow, warnings = [], message = null) {
  return {
    valid: false,
    errors: [message || `recipe must be ${recipe} for the ${workflow} workflow.`],
    workflow,
    expectedRecipe: recipe,
    warnings
  };
}

function validateSpecFile(specPath, options = {}) {
  const loaded = readSpecFile(specPath);
  const validation = validateSpec(loaded.spec);
  if (!validation.valid) {
    throw workflowError(options.invalidMessage || 'ChartSpec validation failed.', validation);
  }

  if (options.recipe && validation.normalized.recipe !== options.recipe) {
    throw workflowError(
      options.recipeMessage || `The ${options.workflow || 'selected'} workflow does not accept recipe "${validation.normalized.recipe}".`,
      validationForWorkflow(options.recipe, options.workflow || 'selected', validation.warnings)
    );
  }

  return { ...loaded, validation };
}

function validateStandardSpec(specPath) {
  const checked = validateSpecFile(specPath, {
    workflow: STANDARD_WORKFLOW,
    invalidMessage: 'Standard chart specification is invalid.'
  });
  if (checked.validation.normalized.recipe === 'map.regional') {
    const regionSet = checked.validation.normalized.map?.regionSet || DEFAULT_REGION_SET_ID;
    throw workflowError(
      `This is a regional breakdown. Start with \`node tools/chart.js regional-guide ${regionSet}\`, then use \`node tools/chart.js regional <spec.json> [output.html]\`.`,
      validationForWorkflow(
        'a non-map recipe',
        STANDARD_WORKFLOW,
        checked.validation.warnings,
        'map.regional specifications must use the regional-breakdown workflow.'
      )
    );
  }
  return checked;
}

function reviewRenderedChart(rendered, options = {}) {
  const review = reviewFile(rendered.htmlPath);
  if (!review.valid) {
    throw workflowError(options.message || 'Generated chart failed shell review.', {
      valid: false,
      errors: review.errors,
      warnings: review.warnings
    });
  }
  return review;
}

function collectWorkflowWarnings(checked, rendered, review) {
  return [...new Set([
    ...checked.validation.warnings,
    ...(rendered.warnings || []),
    ...(review?.warnings || []).map((warning) => warning.replace(/^ChartSpec: /, ''))
  ])];
}

function renderStandardChart(specPath, outputPath, options = {}) {
  const checked = validateStandardSpec(specPath);
  const projectRoot = path.resolve(options.projectRoot || path.resolve(__dirname, '..'));
  const assetVersion = options.assetVersion || assetFingerprint(projectRoot);
  const rendered = renderValidatedSpecFile(checked.specPath, checked.validation.normalized, outputPath, {
    projectRoot,
    assetVersion,
    warnings: checked.validation.warnings
  });
  const review = reviewRenderedChart(rendered, {
    message: 'Generated standard chart failed shell review.'
  });

  return {
    workflow: STANDARD_WORKFLOW,
    specPath: checked.specPath,
    htmlPath: rendered.htmlPath,
    assetVersion,
    recipe: rendered.recipe,
    bytes: rendered.bytes,
    warnings: collectWorkflowWarnings(checked, rendered, review),
    review: { valid: review.valid, errors: review.errors }
  };
}

module.exports = {
  STANDARD_WORKFLOW,
  REGIONAL_WORKFLOW,
  readSpecFile,
  workflowError,
  validateSpecFile,
  validateStandardSpec,
  reviewRenderedChart,
  collectWorkflowWarnings,
  renderStandardChart
};
