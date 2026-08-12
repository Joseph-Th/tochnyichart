#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  initializeRunWorkspace,
  flushRunWorkspace,
  resetTransientWorkspace,
  deliveryPath
} = require('../renderer/run-workspace');
const { validateSourceLedger } = require('../renderer/source-fidelity');
const { validatePresentationFile } = require('../renderer/presentation-file');

function usage() {
  return [
    'Usage:',
    '  node tools/workspace.js init <run-id>',
    '  node tools/workspace.js verify <run-id> [--specs]',
    '  node tools/workspace.js flush <run-id> [--legacy] [--dry-run]',
    '  node tools/workspace.js finalize <run-id> [--legacy] [--dry-run]',
    '  node tools/workspace.js reset [--legacy] [--dry-run]',
    '',
    'The command never deletes specs/runs/<run-id>/ or charts/<run-id>/.',
    'Those local production paths are ignored by Git.',
    'Finalize verifies source fidelity, ChartSpec coverage, and any generated PowerPoint against presentation-plan.json before cleanup.',
    'All workspace commands preserve the project-root input/ folder.',
    'Use --legacy to remove the old previews/ tree during migration.'
  ].join('\n');
}

function parseArguments(argv) {
  const flags = new Set(argv.filter((value) => value.startsWith('--')));
  const positional = argv.filter((value) => !value.startsWith('--'));
  const command = positional[0];
  const runId = positional[1];
  const unknownFlags = [...flags].filter((flag) => !['--legacy', '--dry-run', '--specs'].includes(flag));
  if (unknownFlags.length) throw new Error(`Unknown flag: ${unknownFlags[0]}`);
  return {
    command,
    runId,
    removeLegacy: flags.has('--legacy'),
    dryRun: flags.has('--dry-run'),
    requireSpecs: flags.has('--specs')
  };
}

function main() {
  const projectRoot = path.resolve(process.env.TOCHNYI_PROJECT_ROOT || path.join(__dirname, '..'));
  const options = parseArguments(process.argv.slice(2));
  let result;

  if (options.command === 'init') {
    if (!options.runId) throw new Error('init requires a run id.');
    result = initializeRunWorkspace(projectRoot, options.runId);
  } else if (options.command === 'verify') {
    if (!options.runId) throw new Error('verify requires a run id.');
    result = validateSourceLedger(projectRoot, options.runId, {
      requireSpecs: options.requireSpecs
    });
  } else if (options.command === 'flush') {
    if (!options.runId) throw new Error('flush requires a run id.');
    result = flushRunWorkspace(projectRoot, options.runId, options);
  } else if (options.command === 'finalize') {
    if (!options.runId) throw new Error('finalize requires a run id.');
    const fidelity = validateSourceLedger(projectRoot, options.runId, { requireSpecs: true });
    const outputRoot = deliveryPath(projectRoot, options.runId);
    const planPath = path.join(outputRoot, 'presentation-plan.json');
    let presentation = null;
    if (fs.existsSync(planPath)) {
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      const pptxPath = path.join(outputRoot, `tochnyi-charts-${options.runId}.pptx`);
      if (fs.existsSync(pptxPath)) presentation = validatePresentationFile(pptxPath, plan);
    }
    const cleanup = flushRunWorkspace(projectRoot, options.runId, options);
    result = { fidelity, presentation, cleanup };
  } else if (options.command === 'reset') {
    result = resetTransientWorkspace(projectRoot, {
      removeLegacy: options.removeLegacy,
      dryRun: options.dryRun
    });
  } else {
    throw new Error(usage());
  }

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message);
  if (!String(error.message).startsWith('Usage:')) console.error(usage());
  process.exitCode = 1;
}
