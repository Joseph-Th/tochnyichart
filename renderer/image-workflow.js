'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { captureHtml } = require('./capture');
const { renderStandardChart, readSpecFile, STANDARD_WORKFLOW } = require('./workflow');
const {
  renderRegionalBreakdown,
  summarizeDiagnosticRun,
  assertNaturalRegionalRuns
} = require('./regional-workflow');
const { REGIONAL_WORKFLOW } = require('./workflow-contract');
const { slugify } = require('./render');
const { normalizeRunId, normalizeArtifactSlug, deliveryPath } = require('./run-workspace');
const { defaultImageProfileId, resolveImageProfile } = require('./image-profiles');

function defaultImageOutputPath(projectRoot, spec, options = {}) {
  const requestedProject = options.projectId || options.runId || process.env.TOCHNYI_PROJECT_ID || process.env.TOCHNYI_RUN_ID;
  if (!requestedProject) {
    throw new Error('Static image output requires either an explicit output path or --project-id <id>.');
  }
  const runId = normalizeRunId(requestedProject);
  const slug = normalizeArtifactSlug(spec.metadata?.slug || slugify(spec.title));
  return deliveryPath(projectRoot, runId, `${slug}.png`);
}

function validateImageOutputPath(outputPath) {
  const absolute = path.resolve(outputPath);
  if (path.extname(absolute).toLowerCase() !== '.png') {
    throw new Error('Static image output must use a .png filename.');
  }
  return absolute;
}

// Atomically replace target with stagedPath, keeping the previous file if the swap fails.
function publishFile(stagedPath, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const token = `${process.pid}-${Date.now()}`;
  const incoming = `${target}.building-${token}`;
  const backup = `${target}.previous-${token}`;
  const hadPrevious = fs.existsSync(target);
  fs.copyFileSync(stagedPath, incoming);

  try {
    if (hadPrevious) fs.renameSync(target, backup);
    fs.renameSync(incoming, target);
    fs.rmSync(backup, { force: true });
  } catch (error) {
    fs.rmSync(incoming, { force: true });
    if (hadPrevious && fs.existsSync(backup) && !fs.existsSync(target)) {
      fs.renameSync(backup, target);
    }
    throw error;
  } finally {
    fs.rmSync(incoming, { force: true });
    if (fs.existsSync(target)) fs.rmSync(backup, { force: true });
  }
  return target;
}

function publishImage(stagedPath, outputPath) {
  return publishFile(stagedPath, validateImageOutputPath(outputPath));
}

// The self-contained, editable HTML ships next to its PNG with the same basename.
function companionHtmlPath(pngPath) {
  return pngPath.replace(/\.png$/i, '.html');
}

function staticDiagnosticSummary(diagnostics) {
  return {
    status: diagnostics?.status || 'pass',
    errors: diagnostics?.summary?.errors || 0,
    warnings: diagnostics?.summary?.warnings || 0,
    labelsChecked: diagnostics?.summary?.labelsChecked || 0,
    marksChecked: diagnostics?.summary?.marksChecked || 0
  };
}

function captureStaticImage(dependencies, htmlPath, pngPath, profile, options = {}) {
  try {
    return dependencies.capture(htmlPath, pngPath, {
      browser: options.browser,
      viewport: profile.viewport,
      requireViewportFit: true,
      autoFit: true,
      adaptiveCanvas: profile.adaptive,
      adaptiveHeight: profile.adaptive
    });
  } catch (error) {
    if (!profile.adaptive && /content still exceeds the canvas/i.test(error.message || '')) {
      const { width, height } = profile.viewport;
      throw new Error(
        `Static image profile "${profile.id}" (${width}×${height}) cannot fit this chart without clipping. ` +
        'Reduce secondary copy or chart density so the fixed publication shape fits. Use --profile auto only when variable-height output is explicitly acceptable; do not add pixel geometry to the ChartSpec. ' +
        `Renderer detail: ${error.message}`
      );
    }
    throw error;
  }
}

function createStaticImage(specPath, outputPath, options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '..'));
  const loaded = readSpecFile(specPath);
  const recipe = loaded.spec?.recipe || '';
  const profile = resolveImageProfile(options.profile || defaultImageProfileId(recipe), recipe);
  const target = validateImageOutputPath(
    outputPath || defaultImageOutputPath(projectRoot, loaded.spec, options)
  );
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-image-'));
  const tempHtml = path.join(tempRoot, 'chart.html');
  const tempPng = path.join(tempRoot, 'chart.png');
  const dependencies = {
    renderStandard: renderStandardChart,
    renderRegional: renderRegionalBreakdown,
    capture: captureHtml,
    publish: publishImage,
    publishHtml: publishFile,
    ...(options.dependencies || {})
  };

  try {
    const isRegional = recipe === 'map.regional';
    const rendered = isRegional
      ? dependencies.renderRegional(loaded.specPath, tempHtml, {
          projectRoot,
          projectId: options.projectId || options.runId,
          browser: options.browser,
          diagnose: false
        })
      : dependencies.renderStandard(loaded.specPath, tempHtml, {
          projectRoot,
          projectId: options.projectId || options.runId
        });

    const screenshot = captureStaticImage(dependencies, tempHtml, tempPng, profile, options);

    let regionalDiagnostics = null;
    if (isRegional) {
      regionalDiagnostics = summarizeDiagnosticRun({
        viewport: screenshot.dimensions,
        diagnostics: screenshot.diagnostics,
        chartAttributes: screenshot.chartAttributes || {}
      });
      assertNaturalRegionalRuns([regionalDiagnostics]);
    }

    const finalPath = dependencies.publish(tempPng, target);
    const htmlPath = dependencies.publishHtml(tempHtml, companionHtmlPath(finalPath));
    const requestedViewport = { ...profile.viewport };
    const actualDimensions = { ...screenshot.dimensions };
    const fitMode = screenshot.canvasAttributes?.['data-canvas-fit-mode'] || 'natural';
    const stageDelta = Number(screenshot.canvasAttributes?.['data-canvas-fit-delta'] || 0);
    const scatterR = Number(screenshot.scatterAttributes?.['data-scatter-pearson-r']);
    const scatterDiagnostics = recipe === 'relationship.scatter'
      ? {
          pointCount: Number(screenshot.scatterAttributes?.['data-scatter-point-count'] || 0),
          pearsonR: Number.isFinite(scatterR) ? scatterR : null,
          xQuantity: screenshot.scatterAttributes?.['data-scatter-x-quantity'] || null,
          yQuantity: screenshot.scatterAttributes?.['data-scatter-y-quantity'] || null
        }
      : null;
    return {
      workflow: isRegional ? REGIONAL_WORKFLOW : STANDARD_WORKFLOW,
      recipe: rendered.recipe,
      specPath: loaded.specPath,
      outputPath: finalPath,
      htmlPath,
      bytes: screenshot.bytes,
      profile: {
        id: profile.id,
        requestedViewport,
        actualDimensions,
        adaptive: profile.adaptive,
        fitMode,
        stageDelta,
        expanded: requestedViewport.width !== actualDimensions.width ||
          requestedViewport.height !== actualDimensions.height
      },
      diagnostics: staticDiagnosticSummary(screenshot.diagnostics),
      regionalDiagnostics,
      scatterDiagnostics,
      warnings: rendered.warnings || [],
      htmlRetained: true
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

module.exports = {
  createStaticImage,
  defaultImageOutputPath,
  validateImageOutputPath,
  publishImage,
  publishFile,
  companionHtmlPath,
  staticDiagnosticSummary,
  captureStaticImage
};
