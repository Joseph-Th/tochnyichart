'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const WORKSPACE_DIRECTORY = '.work';
const LEGACY_PREVIEW_DIRECTORY = 'previews';
const INPUT_DIRECTORY = 'input';
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

function normalizeArtifactSlug(value) {
  const slug = String(value || '').trim();
  if (slug.length > 128 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Artifact slug must be 1-128 characters using lowercase letters, numbers, and single hyphens.');
  }
  return slug;
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
  const runRoot = projectPath(projectRoot, ...RUN_SPEC_DIRECTORY, normalized);
  const target = path.resolve(runRoot, ...segments);
  if (target !== runRoot && !target.startsWith(`${runRoot}${path.sep}`)) {
    throw new Error(`Refusing path outside run specification root: ${target}`);
  }
  return target;
}

function deliveryPath(projectRoot, runId, ...segments) {
  const normalized = normalizeRunId(runId);
  const runRoot = projectPath(projectRoot, DELIVERY_DIRECTORY, normalized);
  const target = path.resolve(runRoot, ...segments);
  if (target !== runRoot && !target.startsWith(`${runRoot}${path.sep}`)) {
    throw new Error(`Refusing path outside run delivery root: ${target}`);
  }
  return target;
}

function sourceText(filePath, data) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.ipynb') {
    try {
      const notebook = JSON.parse(data.toString('utf8'));
      return (notebook.cells || [])
        .map((cell) => Array.isArray(cell.source) ? cell.source.join('') : '')
        .filter(Boolean)
        .join('\n\n');
    } catch {
      return '';
    }
  }
  if (new Set(['.txt', '.md', '.csv', '.tsv', '.json', '.jsonl', '.yaml', '.yml', '.xml', '.html', '.htm']).has(extension)) {
    return data.toString('utf8');
  }
  return '';
}

function inputFiles(inputRoot) {
  const files = [];
  function walk(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  walk(inputRoot);
  return files;
}

function directoryInputSnapshot(projectRoot) {
  const root = path.resolve(projectRoot);
  const inputRoot = projectPath(projectRoot, INPUT_DIRECTORY);
  if (!fs.existsSync(inputRoot) || !fs.statSync(inputRoot).isDirectory()) return null;
  const paths = inputFiles(inputRoot);
  if (!paths.length) {
    throw new Error('input/ is empty. Add the source materials for the run before initialization.');
  }

  const files = paths.map((filePath) => {
    const data = fs.readFileSync(filePath);
    const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
    return {
      path: relativePath,
      bytes: data.length,
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      content: sourceText(filePath, data)
    };
  });
  if (!files.some((file) => file.bytes > 0)) {
    throw new Error('input/ contains no non-empty source files.');
  }
  const digest = crypto.createHash('sha256');
  files.forEach((file) => digest.update(`${file.path}\0${file.bytes}\0${file.sha256}\n`, 'utf8'));
  return {
    kind: 'directory',
    path: inputRoot,
    relativePath: 'input/',
    files,
    documents: files.filter((file) => file.content).map((file) => ({ path: file.path, content: file.content })),
    content: files.filter((file) => file.content).map((file) => file.content).join('\n\n'),
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    sha256: digest.digest('hex')
  };
}

function legacyInputSnapshot(projectRoot) {
  const inputPath = projectPath(projectRoot, 'input.txt');
  if (!fs.existsSync(inputPath)) return null;
  const content = fs.readFileSync(inputPath, 'utf8');
  if (!content.trim()) {
    throw new Error('input.txt is empty. Add source material to input/ for production runs.');
  }
  const bytes = Buffer.byteLength(content, 'utf8');
  return {
    kind: 'legacy-file',
    path: inputPath,
    relativePath: 'input.txt',
    files: [{
      path: 'input.txt',
      bytes,
      sha256: crypto.createHash('sha256').update(content, 'utf8').digest('hex'),
      content
    }],
    documents: [{ path: 'input.txt', content }],
    content,
    bytes,
    sha256: crypto.createHash('sha256').update(content, 'utf8').digest('hex')
  };
}

function readInputSnapshot(projectRoot) {
  const directorySnapshot = directoryInputSnapshot(projectRoot);
  if (directorySnapshot) return directorySnapshot;
  const legacySnapshot = legacyInputSnapshot(projectRoot);
  if (legacySnapshot) return legacySnapshot;
  throw new Error('input/ is missing. Production runs require a non-empty project-root input/ folder.');
}

function existingInputTarget(projectRoot) {
  const directory = projectPath(projectRoot, INPUT_DIRECTORY);
  if (fs.existsSync(directory) && fs.statSync(directory).isDirectory()) return directory;
  return projectPath(projectRoot, 'input.txt');
}

function sourceLedgerPath(projectRoot, runId) {
  return workspacePath(projectRoot, runId, 'source-ledger.json');
}

function initializeSourceLedger(projectRoot, runId, snapshot) {
  const target = sourceLedgerPath(projectRoot, runId);
  if (!fs.existsSync(target)) {
    const input = snapshot.kind === 'directory'
      ? {
          path: snapshot.relativePath,
          kind: 'directory',
          bytes: snapshot.bytes,
          sha256: snapshot.sha256,
          files: snapshot.files.map((file) => ({ path: file.path, bytes: file.bytes, sha256: file.sha256 }))
        }
      : {
          path: 'input.txt',
          bytes: snapshot.bytes,
          sha256: snapshot.sha256
        };
    fs.writeFileSync(target, `${JSON.stringify({
      version: snapshot.kind === 'directory' ? '2.0' : '1.5',
      runId: normalizeRunId(runId),
      input,
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
  const inputTarget = existingInputTarget(projectRoot);
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
      target: inputTarget,
      preserved: true
    },
    preserved: [
      runSpecPath(projectRoot, normalized),
      deliveryPath(projectRoot, normalized),
      inputTarget
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
  INPUT_DIRECTORY,
  RUN_SPEC_DIRECTORY,
  DELIVERY_DIRECTORY,
  DEFAULT_SUBDIRECTORIES,
  normalizeRunId,
  normalizeArtifactSlug,
  projectPath,
  workspaceRoot,
  workspacePath,
  runSpecPath,
  deliveryPath,
  readInputSnapshot,
  existingInputTarget,
  sourceLedgerPath,
  initializeSourceLedger,
  initializeRunWorkspace,
  flushRunWorkspace,
  resetTransientWorkspace
};
