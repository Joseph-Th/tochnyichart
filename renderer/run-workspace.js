'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECTS_DIRECTORY = 'projects';
const LEGACY_PREVIEW_DIRECTORY = 'previews';
const PROJECT_INPUT_DIRECTORY = 'input';
const PROJECT_SPEC_DIRECTORY = 'specs';
const PROJECT_OUTPUT_DIRECTORY = 'output';
const PROJECT_WORK_DIRECTORY = 'work';

function normalizeRunId(value) {
  const runId = String(value || '').trim();
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,127})$/.test(runId) || runId === '.' || runId === '..') {
    throw new Error('Project id must be 1-128 characters using letters, numbers, dots, underscores, or hyphens.');
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

function projectsRoot(projectRoot) {
  return projectPath(projectRoot, PROJECTS_DIRECTORY);
}

function runProjectPath(projectRoot, runId, ...segments) {
  const normalized = normalizeRunId(runId);
  const runRoot = projectPath(projectRoot, PROJECTS_DIRECTORY, normalized);
  const target = path.resolve(runRoot, ...segments);
  if (target !== runRoot && !target.startsWith(`${runRoot}${path.sep}`)) {
    throw new Error(`Refusing path outside project ${normalized}: ${target}`);
  }
  return target;
}

function workspaceRoot(projectRoot, runId) {
  return runProjectPath(projectRoot, runId, PROJECT_WORK_DIRECTORY);
}

function workspacePath(projectRoot, runId, ...segments) {
  const runRoot = workspaceRoot(projectRoot, runId);
  const target = path.resolve(runRoot, ...segments);
  if (target !== runRoot && !target.startsWith(`${runRoot}${path.sep}`)) {
    throw new Error(`Refusing path outside project work folder: ${target}`);
  }
  return target;
}

function runSpecPath(projectRoot, runId, ...segments) {
  const runRoot = runProjectPath(projectRoot, runId, PROJECT_SPEC_DIRECTORY);
  const target = path.resolve(runRoot, ...segments);
  if (target !== runRoot && !target.startsWith(`${runRoot}${path.sep}`)) {
    throw new Error(`Refusing path outside project specification root: ${target}`);
  }
  return target;
}

function deliveryPath(projectRoot, runId, ...segments) {
  const runRoot = runProjectPath(projectRoot, runId, PROJECT_OUTPUT_DIRECTORY);
  const target = path.resolve(runRoot, ...segments);
  if (target !== runRoot && !target.startsWith(`${runRoot}${path.sep}`)) {
    throw new Error(`Refusing path outside project output root: ${target}`);
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

function directoryInputSnapshot(projectRoot, runId) {
  const root = runProjectPath(projectRoot, runId);
  const inputRoot = runProjectPath(projectRoot, runId, PROJECT_INPUT_DIRECTORY);
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
  if (!files.some((file) => file.content && file.content.trim().length > 0)) {
    throw new Error('input/ contains no non-empty source files.');
  }
  const digest = crypto.createHash('sha256');
  files.forEach((file) => digest.update(`${file.path}\0${file.bytes}\0${file.sha256}\n`, 'utf8'));
  return {
    kind: 'directory',
    path: inputRoot,
    relativePath: `${PROJECT_INPUT_DIRECTORY}/`,
    files,
    documents: files.filter((file) => file.content).map((file) => ({ path: file.path, content: file.content })),
    content: files.filter((file) => file.content).map((file) => file.content).join('\n\n'),
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    sha256: digest.digest('hex')
  };
}

function readInputSnapshot(projectRoot, runId) {
  const normalized = normalizeRunId(runId);
  const snapshot = directoryInputSnapshot(projectRoot, normalized);
  if (!snapshot) {
    throw new Error(`projects/${normalized}/input/ is missing. Put this project's source materials there before initialization.`);
  }
  return snapshot;
}

function existingInputTarget(projectRoot, runId) {
  return runProjectPath(projectRoot, runId, PROJECT_INPUT_DIRECTORY);
}

function sourceLedgerPath(projectRoot, runId) {
  return runProjectPath(projectRoot, runId, 'source-ledger.json');
}

function initializeSourceLedger(projectRoot, runId, snapshot) {
  const target = sourceLedgerPath(projectRoot, runId);
  if (!fs.existsSync(target)) {
    const input = {
      path: snapshot.relativePath,
      kind: 'directory',
      bytes: snapshot.bytes,
      sha256: snapshot.sha256,
      files: snapshot.files.map((file) => ({ path: file.path, bytes: file.bytes, sha256: file.sha256 }))
    };
    fs.writeFileSync(target, `${JSON.stringify({
      version: '2.0',
      projectId: normalizeRunId(runId),
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
    ? readInputSnapshot(projectRoot, normalized)
    : null;
  const root = runProjectPath(projectRoot, normalized);
  const workRoot = workspaceRoot(projectRoot, normalized);
  fs.mkdirSync(workRoot, { recursive: true });

  const specificationRoot = createOutputs ? runSpecPath(projectRoot, normalized) : null;
  const deliveryRoot = createOutputs ? deliveryPath(projectRoot, normalized) : null;
  if (specificationRoot) fs.mkdirSync(specificationRoot, { recursive: true });
  if (deliveryRoot) fs.mkdirSync(deliveryRoot, { recursive: true });
  const ledgerPath = inputSnapshot
    ? initializeSourceLedger(projectRoot, normalized, inputSnapshot)
    : null;

  const manifestPath = runProjectPath(projectRoot, normalized, 'project.json');
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, `${JSON.stringify({
      version: '1.0',
      projectId: normalized,
      paths: createOutputs ? {
        input: `${PROJECT_INPUT_DIRECTORY}/`,
        sourceLedger: 'source-ledger.json',
        specifications: `${PROJECT_SPEC_DIRECTORY}/`,
        output: `${PROJECT_OUTPUT_DIRECTORY}/`,
        work: `${PROJECT_WORK_DIRECTORY}/`
      } : null,
      retention: {
        keepLocal: createOutputs ? [
          `${PROJECT_INPUT_DIRECTORY}/`,
          'source-ledger.json',
          `${PROJECT_SPEC_DIRECTORY}/`,
          `${PROJECT_OUTPUT_DIRECTORY}/`
        ] : [],
        repository: 'ignored',
        purge: [`${PROJECT_WORK_DIRECTORY}/`]
      }
    }, null, 2)}\n`, 'utf8');
  }

  return {
    projectId: normalized,
    root,
    workRoot,
    manifestPath,
    ledgerPath,
    directories: [workRoot],
    specificationRoot,
    deliveryRoot
  };
}

function removeTarget(target, dryRun) {
  const exists = fs.existsSync(target);
  if (exists && !dryRun) fs.rmSync(target, { recursive: true, force: true });
  return { target, existed: exists, removed: exists && !dryRun };
}

function flushRunWorkspace(projectRoot, runId, options = {}) {
  const normalized = normalizeRunId(runId);
  const dryRun = Boolean(options.dryRun);
  const inputTarget = existingInputTarget(projectRoot, normalized);
  const removed = [removeTarget(workspaceRoot(projectRoot, normalized), dryRun)];
  if (options.removeLegacy) {
    removed.push(
      removeTarget(projectPath(projectRoot, '.work'), dryRun),
      removeTarget(projectPath(projectRoot, LEGACY_PREVIEW_DIRECTORY), dryRun)
    );
  }
  return {
    mode: 'project',
    projectId: normalized,
    dryRun,
    removed,
    input: {
      target: inputTarget,
      preserved: true
    },
    preserved: [
      runProjectPath(projectRoot, normalized),
      runSpecPath(projectRoot, normalized),
      deliveryPath(projectRoot, normalized),
      inputTarget
    ]
  };
}

function resetTransientWorkspace(projectRoot, options = {}) {
  const dryRun = Boolean(options.dryRun);
  const removed = [];
  const root = projectsRoot(projectRoot);
  if (fs.existsSync(root)) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const projectDirectory = runProjectPath(projectRoot, entry.name);
      removed.push(removeTarget(workspaceRoot(projectRoot, entry.name), dryRun));
      if (!dryRun && fs.existsSync(projectDirectory) && fs.readdirSync(projectDirectory).length === 0) {
        fs.rmSync(projectDirectory, { recursive: true, force: true });
      }
    }
  }
  if (options.removeLegacy !== false) {
    removed.push(
      removeTarget(projectPath(projectRoot, '.work'), dryRun),
      removeTarget(projectPath(projectRoot, LEGACY_PREVIEW_DIRECTORY), dryRun)
    );
  }
  return {
    mode: 'reset',
    dryRun,
    removed,
    preserved: [root]
  };
}

module.exports = {
  PROJECTS_DIRECTORY,
  LEGACY_PREVIEW_DIRECTORY,
  PROJECT_INPUT_DIRECTORY,
  PROJECT_SPEC_DIRECTORY,
  PROJECT_OUTPUT_DIRECTORY,
  PROJECT_WORK_DIRECTORY,
  normalizeRunId,
  normalizeArtifactSlug,
  projectPath,
  projectsRoot,
  runProjectPath,
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
