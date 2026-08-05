#!/usr/bin/env node
'use strict';

const path = require('node:path');
const {
  initializeRunWorkspace,
  flushRunWorkspace,
  resetTransientWorkspace
} = require('../renderer/run-workspace');

function usage() {
  return [
    'Usage:',
    '  node tools/workspace.js init <run-id>',
    '  node tools/workspace.js flush <run-id> [--input] [--legacy] [--dry-run]',
    '  node tools/workspace.js reset [--input] [--legacy] [--dry-run]',
    '',
    'The command never deletes specs/runs/<run-id>/ or charts/<run-id>/.',
    'Those local production paths are ignored by Git.',
    'Use --input to truncate input.txt after delivery.',
    'Use --legacy to remove the old previews/ tree during migration.'
  ].join('\n');
}

function parseArguments(argv) {
  const flags = new Set(argv.filter((value) => value.startsWith('--')));
  const positional = argv.filter((value) => !value.startsWith('--'));
  const command = positional[0];
  const runId = positional[1];
  const unknownFlags = [...flags].filter((flag) => !['--input', '--legacy', '--dry-run'].includes(flag));
  if (unknownFlags.length) throw new Error(`Unknown flag: ${unknownFlags[0]}`);
  return {
    command,
    runId,
    clearInput: flags.has('--input'),
    removeLegacy: flags.has('--legacy'),
    dryRun: flags.has('--dry-run')
  };
}

function main() {
  const projectRoot = path.resolve(process.env.TOCHNYI_PROJECT_ROOT || path.join(__dirname, '..'));
  const options = parseArguments(process.argv.slice(2));
  let result;

  if (options.command === 'init') {
    if (!options.runId) throw new Error('init requires a run id.');
    result = initializeRunWorkspace(projectRoot, options.runId);
  } else if (options.command === 'flush') {
    if (!options.runId) throw new Error('flush requires a run id.');
    result = flushRunWorkspace(projectRoot, options.runId, options);
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
