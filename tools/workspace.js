#!/usr/bin/env node
'use strict';

const path = require('node:path');
const {
  initializeRunWorkspace,
  flushRunWorkspace,
  resetTransientWorkspace
} = require('../renderer/run-workspace');
const { validateSourceLedger } = require('../renderer/source-fidelity');

function usage() {
  return [
    'Usage:',
    '  node tools/workspace.js init <run-id>',
    '  node tools/workspace.js verify <run-id> [--specs]',
    '  node tools/workspace.js flush <run-id> [--legacy] [--dry-run]',
    '  node tools/workspace.js finalize <run-id> [--legacy] [--dry-run]',
    '  node tools/workspace.js reset [--input] [--legacy] [--dry-run]',
    '',
    'The command never deletes specs/runs/<run-id>/ or charts/<run-id>/.',
    'Those local production paths are ignored by Git.',
    'Finalize verifies source fidelity and ChartSpec coverage before cleanup.',
    'Flush and finalize always preserve input.txt.',
    'Use --input only with reset to truncate input.txt.',
    'Use --legacy to remove the old previews/ tree during migration.'
  ].join('\n');
}

function parseArguments(argv) {
  const flags = new Set(argv.filter((value) => value.startsWith('--')));
  const positional = argv.filter((value) => !value.startsWith('--'));
  const command = positional[0];
  const runId = positional[1];
  const unknownFlags = [...flags].filter((flag) => !['--input', '--legacy', '--dry-run', '--specs'].includes(flag));
  if (unknownFlags.length) throw new Error(`Unknown flag: ${unknownFlags[0]}`);
  if (command === 'flush' && flags.has('--input')) {
    throw new Error('flush always preserves input.txt; --input is only valid with reset.');
  }
  return {
    command,
    runId,
    clearInput: command === 'reset' && flags.has('--input'),
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
    const cleanup = flushRunWorkspace(projectRoot, options.runId, options);
    result = { fidelity, cleanup };
  } else if (options.command === 'reset') {
    result = resetTransientWorkspace(projectRoot, {
      clearInput: options.clearInput,
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
