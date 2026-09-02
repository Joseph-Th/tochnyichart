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
    '  node tools/workspace.js init <project-id>',
    '  node tools/workspace.js verify <project-id> [--specs]',
    '  node tools/workspace.js flush <project-id> [--legacy] [--dry-run]',
    '  node tools/workspace.js finalize <project-id> [--legacy] [--dry-run]',
    '  node tools/workspace.js reset [--legacy] [--dry-run]',
    '',
    'Each production project lives entirely under projects/<project-id>/.',
    'Finalize deletes only that project\'s work/ subtree after verification.',
    'input/, source-ledger.json, specs/, and output/ remain together and are ignored by Git.',
    'Finalize verifies source fidelity, ChartSpec coverage, and any generated PowerPoint against presentation-plan.json before cleanup.',
    'Use --legacy to remove old .work/ and previews/ scratch trees during migration; legacy charts/ and specs/runs/ are never deleted implicitly.'
  ].join('\n');
}

function parseArguments(argv) {
  const flags = new Set(argv.filter((value) => value.startsWith('--')));
  const positional = argv.filter((value) => !value.startsWith('--'));
  const command = positional[0];
  const projectId = positional[1];
  const unknownFlags = [...flags].filter((flag) => !['--legacy', '--dry-run', '--specs'].includes(flag));
  if (unknownFlags.length) throw new Error(`Unknown flag: ${unknownFlags[0]}`);
  return {
    command,
    projectId,
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
    if (!options.projectId) throw new Error('init requires a project id.');
    result = initializeRunWorkspace(projectRoot, options.projectId);
  } else if (options.command === 'verify') {
    if (!options.projectId) throw new Error('verify requires a project id.');
    result = validateSourceLedger(projectRoot, options.projectId, {
      requireSpecs: options.requireSpecs
    });
  } else if (options.command === 'flush') {
    if (!options.projectId) throw new Error('flush requires a project id.');
    result = flushRunWorkspace(projectRoot, options.projectId, options);
  } else if (options.command === 'finalize') {
    if (!options.projectId) throw new Error('finalize requires a project id.');
    const fidelity = validateSourceLedger(projectRoot, options.projectId, { requireSpecs: true });
    const outputRoot = deliveryPath(projectRoot, options.projectId);
    const planPath = path.join(outputRoot, 'presentation-plan.json');
    let presentation = null;
    if (fs.existsSync(planPath)) {
      const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      const pptxPath = path.join(outputRoot, `tochnyi-charts-${options.projectId}.pptx`);
      if (fs.existsSync(pptxPath)) presentation = validatePresentationFile(pptxPath, plan);
    }
    const cleanup = flushRunWorkspace(projectRoot, options.projectId, options);
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
