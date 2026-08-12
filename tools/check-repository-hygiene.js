#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const CURATED_SPEC_PREFIXES = Object.freeze([
  'specs/examples/',
  'specs/samples/',
  'specs/stress/'
]);

const ALLOWED_GENERATED_EXTENSIONS = new Set([
  'lib/tochnyi-logo.png'
]);

function normalizeRepositoryPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function transientReason(filePath) {
  const normalized = normalizeRepositoryPath(filePath);
  const lower = normalized.toLowerCase();

  if (lower === 'input.txt' || lower.startsWith('input/')) return 'user input must remain local';
  if (lower === 'nul') return 'reserved-name scratch file must not be tracked';
  if (lower.startsWith('.work/')) return 'run workspace is transient';
  if (lower.startsWith('charts/')) return 'rendered chart delivery is generated';
  if (lower.startsWith('previews/')) return 'preview output is transient';
  if (lower.startsWith('specs/runs/')) return 'production ChartSpecs are local run data';
  if (lower.startsWith('specs/') && !CURATED_SPEC_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return 'only curated spec fixtures may be tracked';
  }
  if (/\.(?:pptx|zip|log|tmp|cache)$/i.test(normalized)) return 'generated package or log file';
  if (/\.(?:png|jpe?g|gif|webp|pdf|html)$/i.test(normalized) && !ALLOWED_GENERATED_EXTENSIONS.has(lower)) {
    return 'generated or binary artifact is not allowlisted';
  }
  return null;
}

function runGit(projectRoot, args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: projectRoot,
    encoding: options.encoding || 'utf8',
    windowsHide: true
  });
  if (result.error) throw result.error;
  return result;
}

function trackedFiles(projectRoot) {
  const result = runGit(projectRoot, ['ls-files', '-z'], { encoding: 'buffer' });
  if (result.status !== 0) {
    throw new Error(result.stderr?.toString('utf8') || 'git ls-files failed.');
  }
  return result.stdout.toString('utf8').split('\0').filter(Boolean).map(normalizeRepositoryPath);
}

function isIgnored(projectRoot, relativePath) {
  const result = runGit(projectRoot, ['check-ignore', '--no-index', '-q', relativePath]);
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error(result.stderr || `git check-ignore failed for ${relativePath}.`);
}

function checkIgnoreContract(projectRoot) {
  const mustIgnore = [
    'input/source.csv',
    'input.txt',
    'nul',
    '.work/arbitrary-run/logs/render.log',
    'charts/arbitrary-run/chart.html',
    'previews/chart.png',
    'specs/runs/arbitrary-run/chart.json',
    'specs/arbitrary-run/chart.json'
  ];
  const mustTrack = [
    'specs/examples/fixture.json',
    'specs/samples/fixture.json',
    'specs/stress/fixture.json',
    'lib/tochnyi-logo.png'
  ];

  const errors = [];
  for (const filePath of mustIgnore) {
    if (!isIgnored(projectRoot, filePath)) errors.push(`${filePath} is not ignored.`);
  }
  for (const filePath of mustTrack) {
    if (isIgnored(projectRoot, filePath)) errors.push(`${filePath} is unexpectedly ignored.`);
  }
  return errors;
}

function checkRepositoryHygiene(projectRoot = path.resolve(__dirname, '..')) {
  const tracked = trackedFiles(projectRoot);
  const forbidden = tracked
    .map((filePath) => ({ filePath, reason: transientReason(filePath) }))
    .filter((entry) => entry.reason);
  const ignoreErrors = checkIgnoreContract(projectRoot);
  return {
    valid: forbidden.length === 0 && ignoreErrors.length === 0,
    trackedCount: tracked.length,
    forbidden,
    ignoreErrors
  };
}

function main() {
  const result = checkRepositoryHygiene();
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  CURATED_SPEC_PREFIXES,
  normalizeRepositoryPath,
  transientReason,
  trackedFiles,
  isIgnored,
  checkIgnoreContract,
  checkRepositoryHygiene
};
