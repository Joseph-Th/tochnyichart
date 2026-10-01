#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { listRecipes } = require('../renderer/catalog');
const { validateSpec } = require('../renderer/validate');
const { reviewFile } = require('../renderer/review');
const { captureHtml, diagnoseHtml, diagnoseHtmlResponsive } = require('../renderer/capture');
const { renderRegionalBreakdown, regionalAgentGuide } = require('../renderer/regional-workflow');
const { createStaticImage } = require('../renderer/image-workflow');
const { listImageProfiles } = require('../renderer/image-profiles');
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
  node tool-api/chart.js image <spec.json> [output.png] [--profile auto|landscape|square|portrait] [--project-id <id>]
  node tool-api/chart.js render <spec.json> [output.html] [--project-id <id>]
  node tool-api/chart.js regional <spec.json> [output.html] [--project-id <id>] [--no-diagnose]
  node tool-api/chart.js diagnose <chart.html> [--single] [--fit]
  node tool-api/chart.js review <chart.html> [--screenshot] [--output preview.png]

The model-facing artifact is a ChartSpec JSON file. The renderer owns HTML, CSS,
AMCharts configuration, branding, layout, and export behavior.

The public chart-author entrypoint is node tool-api/chart.js. The tools/chart.js
path remains available for backward compatibility and infrastructure work.

This CLI produces individual chart artifacts. When no explicit output path is
given, --project-id scopes the artifact under projects/<id>/: final PNGs go to
output/ with a self-contained, editable companion HTML of the same name, and
HTML inspection shells go to work/. --run-id remains a compatibility
alias for --project-id. See docs/batch-workflow.md.`;
  console.log(text);
  process.exit(exitCode);
}

function projectOption(args) {
  const projectId = optionValue(args, '--project-id');
  const legacyRunId = optionValue(args, '--run-id');
  if (projectId && legacyRunId && projectId !== legacyRunId) {
    throw new Error('--project-id and legacy --run-id cannot name different projects.');
  }
  return projectId || legacyRunId || undefined;
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

function commandPositionals(args, valueOptions = []) {
  const positionals = [];
  for (let index = 1; index < args.length; index += 1) {
    const value = args[index];
    if (valueOptions.includes(value)) {
      index += 1;
      continue;
    }
    if (!value.startsWith('--')) positionals.push(value);
  }
  return positionals;
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
    const guide = standardAgentGuide(args[1] || DEFAULT_REGION_SET_ID);
    printResult({
      recipes: listRecipes(),
      imageProfiles: listImageProfiles(),
      runtimeDependencies: guide.runtimeDependencies,
      decision: {
        primaryKey: 'quantitative relationship and data shape',
        defaultRule: guide.defaultRule,
        selectionRules: guide.selectionRules,
        ambiguityRules: guide.ambiguityRules,
        staticImagePriorities: {
          visibleEvidence: guide.staticImageContract.visibleEvidenceRule,
          directLabels: guide.staticImageContract.directLabelRule,
          density: guide.staticImageContract.densityRule
        }
      }
    });
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

  if (command === 'image') {
    const positionals = commandPositionals(args, ['--project-id', '--run-id', '--profile']);
    if (!positionals[0]) usage(1);
    printResult(createStaticImage(positionals[0], positionals[1], {
      projectId: projectOption(args),
      profile: optionValue(args, '--profile') || undefined
    }));
    return;
  }

  if (command === 'render') {
    const positionals = commandPositionals(args, ['--project-id', '--run-id']);
    if (!positionals[0]) usage(1);
    printResult(renderStandardChart(positionals[0], positionals[1], {
      projectId: projectOption(args)
    }));
    return;
  }

  if (command === 'regional') {
    const positionals = commandPositionals(args, ['--project-id', '--run-id']);
    if (!positionals[0]) usage(1);
    const result = renderRegionalBreakdown(positionals[0], positionals[1], {
      projectId: projectOption(args),
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
