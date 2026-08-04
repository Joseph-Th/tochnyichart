#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { listRecipes } = require('../renderer/catalog');
const { validateSpec } = require('../renderer/validate');
const { reviewFile } = require('../renderer/review');
const { captureHtml, diagnoseHtml, diagnoseHtmlResponsive } = require('../renderer/capture');
const { renderRegionalBreakdown, regionalAgentGuide } = require('../renderer/regional-workflow');
const {
  DEFAULT_REGION_SET_ID,
  agentWorkflowOrientation,
  standardAgentGuide,
  toolApiManifest
} = require('../renderer/agent-workflow');
const { readSpecFile, renderStandardChart } = require('../renderer/workflow');
const TochnyiMaps = require('../lib/tochnyi-maps');

function usage(exitCode = 0) {
  const text = `Tochnyi Charts v2

Usage:
  node tool-api/chart.js api [region-set]
  node tool-api/chart.js catalog
  node tool-api/chart.js regions [region-set]
  node tool-api/chart.js orient [region-set]
  node tool-api/chart.js guide [region-set]
  node tool-api/chart.js regional-guide [region-set]
  node tool-api/chart.js validate <spec.json>
  node tool-api/chart.js render <spec.json> [output.html]
  node tool-api/chart.js regional <spec.json> [output.html] [--no-diagnose]
  node tool-api/chart.js diagnose <chart.html> [--single] [--fit]
  node tool-api/chart.js review <chart.html> [--screenshot] [--output preview.png]

The model-facing artifact is a ChartSpec JSON file. The renderer owns HTML, CSS,
AMCharts configuration, branding, layout, and export behavior.

The public chart-author entrypoint is node tool-api/chart.js. The tools/chart.js
path remains available for backward compatibility and infrastructure work.

This CLI produces individual chart artifacts. The LLM agent owns the weekly
input.txt batch, story selection, final PNG capture, PowerPoint assembly, and
delivery to charts/YYYY-week-WW/. See docs/batch-workflow.md.`;
  console.log(text);
  process.exit(exitCode);
}

function printResult(result) {
  console.log(JSON.stringify(result, null, 2));
}

function fail(error) {
  console.error(error.message || String(error));
  if (error.validation) printResult(error.validation);
  process.exit(1);
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  if (!command || command === 'help' || command === '--help' || command === '-h') usage(0);

  if (command === 'api') {
    printResult(toolApiManifest(args[1] || DEFAULT_REGION_SET_ID));
    return;
  }

  if (command === 'catalog') {
    printResult({ recipes: listRecipes() });
    return;
  }

  if (command === 'regions') {
    const requested = args[1];
    const regionSets = TochnyiMaps.listRegionSets();
    if (!requested) {
      printResult({ regionSets });
      return;
    }
    const regionSet = regionSets.find((entry) => entry.id === requested);
    if (!regionSet) throw new Error(`Unknown region set: ${requested}. Available: ${TochnyiMaps.regionSetIds.join(', ')}.`);
    printResult(regionSet);
    return;
  }

  if (command === 'orient') {
    printResult(agentWorkflowOrientation(args[1] || DEFAULT_REGION_SET_ID));
    return;
  }

  if (command === 'guide') {
    printResult(standardAgentGuide(args[1] || DEFAULT_REGION_SET_ID));
    return;
  }

  if (command === 'regional-guide') {
    printResult(regionalAgentGuide(args[1] || DEFAULT_REGION_SET_ID));
    return;
  }

  if (command === 'validate') {
    if (!args[1]) usage(1);
    const result = validateSpec(readSpecFile(args[1]).spec);
    printResult(result);
    if (!result.valid) process.exit(1);
    return;
  }

  if (command === 'render') {
    if (!args[1]) usage(1);
    printResult(renderStandardChart(args[1], args[2]));
    return;
  }

  if (command === 'regional') {
    if (!args[1]) usage(1);
    const outputPath = args[2] && !args[2].startsWith('--') ? args[2] : undefined;
    const result = renderRegionalBreakdown(args[1], outputPath, {
      diagnose: !args.includes('--no-diagnose')
    });
    printResult(result);
    return;
  }

  if (command === 'diagnose') {
    if (!args[1]) usage(1);
    const htmlPath = path.resolve(args[1]);
    const requireViewportFit = args.includes('--fit');
    if (args.includes('--single')) {
      const result = diagnoseHtml(htmlPath, { requireViewportFit });
      printResult({ htmlPath: result.htmlPath, viewport: result.viewport, diagnostics: result.diagnostics });
      if (result.diagnostics?.status === 'fail') process.exit(1);
    } else {
      const result = diagnoseHtmlResponsive(htmlPath, { requireViewportFit });
      printResult(result);
      if (result.status === 'fail') process.exit(1);
    }
    return;
  }

  if (command === 'review') {
    if (!args[1]) usage(1);
    const htmlPath = path.resolve(args[1]);
    const review = reviewFile(htmlPath);
    let screenshot = null;
    if (args.includes('--screenshot')) {
      screenshot = captureHtml(htmlPath, optionValue(args, '--output') || undefined);
    }
    const diagnostics = screenshot?.diagnostics || null;
    printResult({ ...review, spec: undefined, diagnostics, screenshot: screenshot ? { ...screenshot, diagnostics: undefined } : null });
    if (!review.valid || diagnostics?.status === 'fail') process.exit(1);
    return;
  }

  usage(1);
}

try {
  main();
} catch (error) {
  fail(error);
}
