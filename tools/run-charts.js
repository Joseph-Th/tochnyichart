#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { buildRunCharts } = require('../renderer/run-charts');

function usage() {
  return [
    'Usage:',
    '  node tools/run-charts.js <project-id> [--no-diagnose]',
    '',
    'Verifies source/spec coverage, renders every selected ChartSpec in ledger order,',
    'runs responsive diagnostics, captures final PNGs, and writes manifest.csv plus',
    'qa-report.json to projects/<project-id>/output/. Staging stays inside that project\'s',
    'work/ folder. Any prior',
    'presentation or chart-image archive is removed because presentation assembly remains',
    'a separate step and must use the newly captured PNGs.'
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const projectId = args.find((value) => !value.startsWith('--'));
  const unknown = args.filter((value) => value.startsWith('--') && value !== '--no-diagnose');
  if (unknown.length) throw new Error(`Unknown flag: ${unknown[0]}`);
  if (!projectId) throw new Error(usage());
  const projectRoot = path.resolve(process.env.TOCHNYI_PROJECT_ROOT || path.join(__dirname, '..'));
  const result = buildRunCharts(projectRoot, projectId, {
    diagnose: !args.includes('--no-diagnose')
  });
  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message || String(error));
  if (!String(error.message).startsWith('Usage:')) console.error(usage());
  process.exitCode = 1;
}
