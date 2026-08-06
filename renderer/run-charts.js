'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateSourceLedger } = require('./source-fidelity');
const { renderStandardChart } = require('./workflow');
const { renderRegionalBreakdown } = require('./regional-workflow');
const { diagnoseHtmlResponsive, captureHtml } = require('./capture');
const {
  normalizeRunId,
  sourceLedgerPath,
  runSpecPath,
  deliveryPath
} = require('./run-workspace');

function loadJson(filePath, label) {
  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${filePath}. ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`${label} is malformed JSON: ${filePath}. ${error.message}`);
  }
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function diagnosticCounts(diagnostics) {
  const runs = Array.isArray(diagnostics?.runs) ? diagnostics.runs : [];
  return runs.reduce((totals, run) => {
    const summary = run.diagnostics?.summary || run;
    totals.errors += Number(summary.errors) || 0;
    totals.warnings += Number(summary.warnings) || 0;
    return totals;
  }, { errors: 0, warnings: 0 });
}

function selectedChartsFromLedger(ledger) {
  if (!Array.isArray(ledger?.candidates)) throw new Error('Source ledger candidates must be an array.');
  return ledger.candidates
    .filter((candidate) => candidate?.decision === 'selected')
    .map((candidate, index) => {
      if (!candidate.outputSlug || !candidate.title) {
        throw new Error(`Selected source-ledger candidate ${candidate.id || index} is missing outputSlug or title.`);
      }
      return {
        id: candidate.id,
        slug: candidate.outputSlug,
        title: candidate.title
      };
    });
}

function buildManifest(rows) {
  const header = ['chart', 'slug', 'title', 'recipe', 'png', 'html', 'spec'];
  const lines = [header.map(csvCell).join(',')];
  rows.forEach((row, index) => {
    lines.push([
      index + 1,
      row.slug,
      row.title,
      row.recipe,
      path.basename(row.pngPath),
      path.basename(row.htmlPath),
      row.specRelativePath
    ].map(csvCell).join(','));
  });
  return `${lines.join('\n')}\n`;
}

function isRebuiltArtifact(name, runId) {
  return /\.(?:html|png)$/i.test(name) ||
    ['manifest.csv', 'qa-report.json'].includes(name) ||
    name === `tochnyi-charts-${runId}.pptx` ||
    name === `tochnyi-chart-pngs-${runId}.zip`;
}

function publishStagedDelivery(stagingRoot, outputRoot, runId) {
  const backupRoot = `${outputRoot}.previous-${process.pid}-${Date.now()}`;
  fs.rmSync(backupRoot, { recursive: true, force: true });

  if (fs.existsSync(outputRoot)) {
    for (const name of fs.readdirSync(outputRoot)) {
      if (isRebuiltArtifact(name, runId)) continue;
      fs.cpSync(path.join(outputRoot, name), path.join(stagingRoot, name), {
        recursive: true,
        force: true
      });
    }
    fs.renameSync(outputRoot, backupRoot);
  }

  try {
    fs.renameSync(stagingRoot, outputRoot);
    fs.rmSync(backupRoot, { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(outputRoot, { recursive: true, force: true });
    if (fs.existsSync(backupRoot)) fs.renameSync(backupRoot, outputRoot);
    throw error;
  }
}

function buildRunCharts(projectRoot, runId, options = {}) {
  const root = path.resolve(projectRoot || path.join(__dirname, '..'));
  const normalized = normalizeRunId(runId);
  const dependencies = {
    verify: validateSourceLedger,
    renderStandard: renderStandardChart,
    renderRegional: renderRegionalBreakdown,
    diagnose: diagnoseHtmlResponsive,
    capture: captureHtml,
    ...(options.dependencies || {})
  };

  const fidelity = dependencies.verify(root, normalized, { requireSpecs: true });
  const ledgerPath = sourceLedgerPath(root, normalized);
  const ledger = loadJson(ledgerPath, 'Source ledger');
  const selected = selectedChartsFromLedger(ledger);
  const outputRoot = deliveryPath(root, normalized);
  const stagingRunId = `${normalized}.building-${process.pid}-${Date.now()}`;
  const stagingRoot = deliveryPath(root, stagingRunId);
  fs.rmSync(stagingRoot, { recursive: true, force: true });
  fs.mkdirSync(stagingRoot, { recursive: true });

  const rows = [];
  let diagnosticErrors = 0;
  let diagnosticWarnings = 0;
  let renderWarnings = 0;

  try {
    selected.forEach((entry) => {
      const specPath = runSpecPath(root, normalized, `${entry.slug}.json`);
      const spec = loadJson(specPath, `ChartSpec ${entry.slug}`);
      const htmlPath = path.join(stagingRoot, `${entry.slug}.html`);
      const pngPath = path.join(stagingRoot, `${entry.slug}.png`);
      let rendered;
      let diagnostics;

      if (spec.recipe === 'map.regional') {
        rendered = dependencies.renderRegional(specPath, htmlPath, {
          projectRoot: root,
          runId: normalized,
          browser: options.browser,
          diagnose: options.diagnose !== false
        });
        diagnostics = rendered.diagnostics || { status: 'not-run', runs: [] };
      } else {
        rendered = dependencies.renderStandard(specPath, htmlPath, {
          projectRoot: root,
          runId: normalized
        });
        diagnostics = options.diagnose === false
          ? { status: 'not-run', runs: [] }
          : dependencies.diagnose(htmlPath, { browser: options.browser });
        if (diagnostics.status === 'fail') {
          throw new Error(`Chart ${entry.slug} failed responsive browser diagnostics.`);
        }
      }

      const counts = diagnosticCounts(diagnostics);
      diagnosticErrors += counts.errors;
      diagnosticWarnings += counts.warnings;
      renderWarnings += Array.isArray(rendered.warnings) ? rendered.warnings.length : 0;

      const screenshot = dependencies.capture(htmlPath, pngPath, {
        browser: options.browser,
        requireViewportFit: true,
        adaptiveCanvas: true
      });

      rows.push({
        slug: entry.slug,
        title: entry.title,
        recipe: spec.recipe,
        workflow: rendered.workflow,
        specPath,
        specRelativePath: path.relative(outputRoot, specPath).replace(/\\/g, '/'),
        htmlPath,
        pngPath,
        warnings: rendered.warnings || [],
        diagnostics,
        screenshot: {
          bytes: screenshot.bytes,
          dimensions: screenshot.dimensions
        }
      });
    });

    const stagedManifestPath = path.join(stagingRoot, 'manifest.csv');
    fs.writeFileSync(stagedManifestPath, buildManifest(rows), 'utf8');

    const stagedQaPath = path.join(stagingRoot, 'qa-report.json');
    const qa = {
      version: '1.0',
      runId: normalized,
      passed: diagnosticErrors === 0,
      sourceCoverage: fidelity,
      artifacts: {
        specifications: rows.length,
        htmlCharts: rows.length,
        pngCharts: rows.length
      },
      visualQa: {
        diagnosticErrors,
        diagnosticWarnings,
        renderWarnings
      },
      files: {
        manifest: 'manifest.csv',
        qaReport: 'qa-report.json'
      },
      presentation: {
        status: 'not-built',
        requiredNext: true,
        note: 'Assemble a new presentation from these PNGs. Any prior presentation was removed because its chart images were stale.'
      },
      charts: rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        recipe: row.recipe,
        workflow: row.workflow,
        html: path.basename(row.htmlPath),
        png: path.basename(row.pngPath),
        image: row.screenshot,
        warnings: row.warnings
      }))
    };
    fs.writeFileSync(stagedQaPath, `${JSON.stringify(qa, null, 2)}\n`, 'utf8');

    publishStagedDelivery(stagingRoot, outputRoot, normalized);

    return {
      runId: normalized,
      outputRoot,
      chartCount: rows.length,
      manifestPath: path.join(outputRoot, 'manifest.csv'),
      qaPath: path.join(outputRoot, 'qa-report.json'),
      diagnosticErrors,
      diagnosticWarnings,
      renderWarnings,
      passed: qa.passed
    };
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

module.exports = {
  buildRunCharts,
  buildManifest,
  isRebuiltArtifact,
  publishStagedDelivery,
  csvCell,
  diagnosticCounts,
  selectedChartsFromLedger
};
