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
const { normalizeRunId, normalizeArtifactSlug, workspacePath } = require('./run-workspace');
const { resolveImageProfile } = require('./image-profiles');

function defaultImageOutputPath(projectRoot, spec, options = {}) {
  const runId = normalizeRunId(options.runId || process.env.TOCHNYI_RUN_ID || 'default');
  const slug = normalizeArtifactSlug(spec.metadata?.slug || slugify(spec.title));
  return workspacePath(projectRoot, runId, 'rendered', `${slug}.png`);
}

function validateImageOutputPath(outputPath) {
  const absolute = path.resolve(outputPath);
  if (path.extname(absolute).toLowerCase() !== '.png') {
    throw new Error('Static image output must use a .png filename.');
  }
  return absolute;
}

function publishImage(stagedPath, outputPath) {
  const target = validateImageOutputPath(outputPath);
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
      fillViewport: !profile.adaptive,
      adaptiveCanvas: profile.adaptive,
      adaptiveHeight: profile.adaptive
    });
  } catch (error) {
    if (!profile.adaptive && /content still exceeds the canvas/i.test(error.message || '')) {
      const { width, height } = profile.viewport;
      throw new Error(
        `Static image profile "${profile.id}" (${width}×${height}) cannot fit this chart without clipping. ` +
        'Use the auto profile or another destination-compatible fixed profile; do not add pixel geometry to the ChartSpec. ' +
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
  const profile = resolveImageProfile(options.profile || 'auto', recipe);
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
    ...(options.dependencies || {})
  };

  try {
    const isRegional = recipe === 'map.regional';
    const rendered = isRegional
      ? dependencies.renderRegional(loaded.specPath, tempHtml, {
          projectRoot,
          runId: options.runId,
          browser: options.browser,
          diagnose: false
        })
      : dependencies.renderStandard(loaded.specPath, tempHtml, {
          projectRoot,
          runId: options.runId
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
    const requestedViewport = { ...profile.viewport };
    const actualDimensions = { ...screenshot.dimensions };
    const fitMode = screenshot.canvasAttributes?.['data-canvas-fit-mode'] || 'natural';
    const stageDelta = Number(screenshot.canvasAttributes?.['data-canvas-fit-delta'] || 0);
    return {
      workflow: isRegional ? REGIONAL_WORKFLOW : STANDARD_WORKFLOW,
      recipe: rendered.recipe,
      specPath: loaded.specPath,
      outputPath: finalPath,
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
      warnings: rendered.warnings || [],
      htmlRetained: false
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
  staticDiagnosticSummary,
  captureStaticImage
};
