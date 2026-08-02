#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { listRecipes } = require('../renderer/catalog');
const { validateSpec } = require('../renderer/validate');
const { renderSpecFile } = require('../renderer/render');
const { reviewFile } = require('../renderer/review');
const { captureHtml, diagnoseHtml, diagnoseHtmlResponsive } = require('../renderer/capture');
const TochnyiMaps = require('../lib/tochnyi-maps');

function usage(exitCode = 0) {
  const text = `Tochnyi Charts v2

Usage:
  node tools/chart.js catalog
  node tools/chart.js regions [region-set]
  node tools/chart.js guide
  node tools/chart.js validate <spec.json>
  node tools/chart.js render <spec.json> [output.html]
  node tools/chart.js diagnose <chart.html> [--single] [--fit]
  node tools/chart.js review <chart.html> [--screenshot] [--output preview.png]

The model-facing artifact is a ChartSpec JSON file. The renderer owns HTML, CSS,
AMCharts configuration, branding, layout, and export behavior.`;
  console.log(text);
  process.exit(exitCode);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
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

  if (command === 'guide') {
    printResult({
      selectionRules: [
        { when: 'One decisive number', use: 'headline.metric' },
        { when: 'Two values showing change', use: 'comparison.change' },
        { when: 'Actual, expected, prior, target, or alternatives', use: 'comparison.scenarios' },
        { when: 'Changes need a visible zero line', use: 'comparison.diverging' },
        { when: 'Values include a min-max interval or threshold', use: 'comparison.range' },
        { when: 'Ordered time points', use: 'trend.line' },
        { when: 'Exact parts of one total', use: 'composition.stacked' },
        { when: 'Multi-part composition where shape matters', use: 'composition.donut' },
        { when: 'Start, additions or losses, and an ending value', use: 'flow.waterfall' },
        { when: 'Ranked categories with long labels', use: 'ranking.horizontal' },
        { when: 'Places or operations have categorical conditions', use: 'status.grid' },
        { when: 'Administrative regions need a geographic breakdown with callouts', use: 'map.regional' },
        { when: 'Trigger, transmission, and consequence form a chain', use: 'story.sequence' }
      ],
      composableFeatures: [
        { need: 'Target, average, legal limit, or benchmark', add: 'references' },
        { need: 'Explain a specific point', add: 'data[].annotation' },
        { need: 'Values span orders of magnitude', add: 'measure.scale = logarithmic' },
        { need: 'Important context uses different units', add: 'supportingFacts instead of another axis' }
      ],
      defaultRule: 'Choose the story structure before the chart geometry. Do not default to bars merely because values are numeric.'
    });
    return;
  }

  if (command === 'validate') {
    if (!args[1]) usage(1);
    const result = validateSpec(readJson(args[1]));
    printResult(result);
    if (!result.valid) process.exit(1);
    return;
  }

  if (command === 'render') {
    if (!args[1]) usage(1);
    const result = renderSpecFile(args[1], args[2]);
    const review = reviewFile(result.htmlPath);
    printResult({
      htmlPath: result.htmlPath,
      recipe: result.recipe,
      bytes: result.bytes,
      warnings: [...new Set([...result.warnings, ...review.warnings.map((warning) => warning.replace(/^ChartSpec: /, ''))])],
      review: { valid: review.valid, errors: review.errors }
    });
    if (!review.valid) process.exit(1);
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
