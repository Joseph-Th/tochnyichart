'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const WORKSPACE_DIRECTORY = '.work';
const LEGACY_PREVIEW_DIRECTORY = 'previews';
const RUN_SPEC_DIRECTORY = Object.freeze(['specs', 'runs']);
const DELIVERY_DIRECTORY = 'charts';
const DEFAULT_SUBDIRECTORIES = Object.freeze([
  'research',
  'downloads',
  'scripts',
  'logs',
  'review',
  'package',
  'rendered'
]);

function normalizeRunId(value) {
  const runId = String(value || '').trim();
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,127})$/.test(runId) || runId === '.' || runId === '..') {
    throw new Error('Run id must be 1-128 characters using letters, numbers, dots, underscores, or hyphens.');
  }
  return runId;
}

function projectPath(projectRoot, ...segments) {
  const root = path.resolve(projectRoot || path.join(__dirname, '..'));
  const target = path.resolve(root, ...segments);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing path outside project root: ${target}`);
  }
  return target;
}

function workspaceRoot(projectRoot) {
  return projectPath(projectRoot, WORKSPACE_DIRECTORY);
}

function workspacePath(projectRoot, runId, ...segments) {
  const normalized = normalizeRunId(runId);
  const runRoot = projectPath(projectRoot, WORKSPACE_DIRECTORY, normalized);
  const target = path.resolve(runRoot, ...segments);
  if (target !== runRoot && !target.startsWith(`${runRoot}${path.sep}`)) {
    throw new Error(`Refusing path outside run workspace: ${target}`);
  }
  return target;
}

function runSpecPath(projectRoot, runId, ...segments) {
  const normalized = normalizeRunId(runId);
  return projectPath(projectRoot, ...RUN_SPEC_DIRECTORY, normalized, ...segments);
}

function deliveryPath(projectRoot, runId, ...segments) {
  const normalized = normalizeRunId(runId);
  return projectPath(projectRoot, DELIVERY_DIRECTORY, normalized, ...segments);
}

function readInputSnapshot(projectRoot) {
  const inputPath = projectPath(projectRoot, 'input.txt');
  if (!fs.existsSync(inputPath)) {
    throw new Error('input.txt is missing. Production runs must use the exact project-root input.txt; do not substitute a sibling or alternate file.');
  }
  const content = fs.readFileSync(inputPath, 'utf8');
  if (!content.trim()) {
    throw new Error('input.txt is empty. Stop the run and obtain the intended source document; do not substitute a sibling or alternate file.');
  }
  return {
    path: inputPath,
    content,
    bytes: Buffer.byteLength(content, 'utf8'),
    sha256: crypto.createHash('sha256').update(content, 'utf8').digest('hex')
  };
}

function sourceLedgerPath(projectRoot, runId) {
  return workspacePath(projectRoot, runId, 'source-ledger.json');
}

function initializeSourceLedger(projectRoot, runId, snapshot) {
  const target = sourceLedgerPath(projectRoot, runId);
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, `${JSON.stringify({
      version: '1.0',
      runId: normalizeRunId(runId),
      input: {
        path: 'input.txt',
        bytes: snapshot.bytes,
        sha256: snapshot.sha256
      },
      inventoryComplete: false,
      ignoredEvidence: [],
      candidates: []
    }, null, 2)}\n`, 'utf8');
  }
  return target;
}

function initializeRunWorkspace(projectRoot, runId, options = {}) {
  const normalized = normalizeRunId(runId);
  const createOutputs = options.createOutputs !== false;
  const inputSnapshot = createOutputs && options.requireInput !== false
    ? readInputSnapshot(projectRoot)
    : null;
  const root = workspacePath(projectRoot, normalized);
  const subdirectories = Array.isArray(options.subdirectories)
    ? options.subdirectories
    : DEFAULT_SUBDIRECTORIES;

  fs.mkdirSync(root, { recursive: true });
  const created = [];
  for (const directory of subdirectories) {
    const target = workspacePath(projectRoot, normalized, directory);
    fs.mkdirSync(target, { recursive: true });
    created.push(target);
  }

  const specificationRoot = createOutputs ? runSpecPath(projectRoot, normalized) : null;
  const deliveryRoot = createOutputs ? deliveryPath(projectRoot, normalized) : null;
  if (specificationRoot) fs.mkdirSync(specificationRoot, { recursive: true });
  if (deliveryRoot) fs.mkdirSync(deliveryRoot, { recursive: true });
  const ledgerPath = inputSnapshot
    ? initializeSourceLedger(projectRoot, normalized, inputSnapshot)
    : null;

  const manifestPath = workspacePath(projectRoot, normalized, 'run.json');
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, `${JSON.stringify({
      runId: normalized,
      workspace: path.relative(path.resolve(projectRoot), root).replace(/\\/g, '/'),
      outputs: createOutputs ? {
        specifications: path.relative(path.resolve(projectRoot), specificationRoot).replace(/\\/g, '/'),
        delivery: path.relative(path.resolve(projectRoot), deliveryRoot).replace(/\\/g, '/')
      } : null,
      retention: {
        keepLocal: createOutputs ? [`specs/runs/${normalized}/`, `charts/${normalized}/`] : [],
        repository: 'ignored',
        purge: [`${WORKSPACE_DIRECTORY}/${normalized}/`, LEGACY_PREVIEW_DIRECTORY]
      }
    }, null, 2)}\n`, 'utf8');
  }

  return {
    runId: normalized,
    root,
    manifestPath,
    ledgerPath,
    directories: created,
    specificationRoot,
    deliveryRoot
  };
}

function removeTarget(target, dryRun) {
  const exists = fs.existsSync(target);
  if (exists && !dryRun) fs.rmSync(target, { recursive: true, force: true });
  return { target, existed: exists, removed: exists && !dryRun };
}

function clearInput(projectRoot, dryRun) {
  const inputPath = projectPath(projectRoot, 'input.txt');
  const exists = fs.existsSync(inputPath);
  const hadContent = exists && fs.statSync(inputPath).size > 0;
  if (!dryRun) fs.writeFileSync(inputPath, '', 'utf8');
  return {
    target: inputPath,
    existed: exists,
    hadContent,
    cleared: !dryRun
  };
}

function flushRunWorkspace(projectRoot, runId, options = {}) {
  const normalized = normalizeRunId(runId);
  const dryRun = Boolean(options.dryRun);
  const removed = [removeTarget(workspacePath(projectRoot, normalized), dryRun)];
  if (options.removeLegacy) {
    removed.push(removeTarget(projectPath(projectRoot, LEGACY_PREVIEW_DIRECTORY), dryRun));
  }
  return {
    mode: 'run',
    runId: normalized,
    dryRun,
    removed,
    input: {
      target: projectPath(projectRoot, 'input.txt'),
      preserved: true
    },
    preserved: [
      runSpecPath(projectRoot, normalized),
      deliveryPath(projectRoot, normalized),
      projectPath(projectRoot, 'input.txt')
    ]
  };
}

function resetTransientWorkspace(projectRoot, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const removed = [removeTarget(workspaceRoot(projectRoot), dryRun)];
  if (options.removeLegacy !== false) {
    removed.push(removeTarget(projectPath(projectRoot, LEGACY_PREVIEW_DIRECTORY), dryRun));
  }
  const input = options.clearInput ? clearInput(projectRoot, dryRun) : null;
  return {
    mode: 'reset',
    dryRun,
    removed,
    input,
    preserved: [
      projectPath(projectRoot, 'specs'),
      projectPath(projectRoot, DELIVERY_DIRECTORY)
    ]
  };
}

module.exports = {
  WORKSPACE_DIRECTORY,
  LEGACY_PREVIEW_DIRECTORY,
  RUN_SPEC_DIRECTORY,
  DELIVERY_DIRECTORY,
  DEFAULT_SUBDIRECTORIES,
  normalizeRunId,
  projectPath,
  workspaceRoot,
  workspacePath,
  runSpecPath,
  deliveryPath,
  readInputSnapshot,
  sourceLedgerPath,
  initializeSourceLedger,
  initializeRunWorkspace,
  flushRunWorkspace,
  resetTransientWorkspace
};
