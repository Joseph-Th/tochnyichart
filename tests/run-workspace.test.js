'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  normalizeRunId,
  initializeRunWorkspace,
  flushRunWorkspace,
  resetTransientWorkspace
} = require('../renderer/run-workspace');

const RUN_ID = 'client-alpha.issue-7';

function temporaryProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-run-workspace-'));
  fs.mkdirSync(path.join(root, 'specs', 'examples'), { recursive: true });
  fs.writeFileSync(path.join(root, 'specs', 'examples', 'fixture.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'input.txt'), 'temporary batch source\n');
  return root;
}

test('run workspace initialization centralizes transient data and creates ignored local outputs', () => {
  const root = temporaryProject();
  try {
    const result = initializeRunWorkspace(root, RUN_ID);
    assert.equal(path.basename(result.root), RUN_ID);
    for (const directory of ['research', 'downloads', 'scripts', 'logs', 'review', 'package', 'rendered']) {
      assert.equal(fs.existsSync(path.join(result.root, directory)), true);
    }
    assert.equal(result.specificationRoot, path.join(root, 'specs', 'runs', RUN_ID));
    assert.equal(result.deliveryRoot, path.join(root, 'charts', RUN_ID));
    assert.equal(fs.existsSync(result.specificationRoot), true);
    assert.equal(fs.existsSync(result.deliveryRoot), true);

    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));
    assert.deepEqual(manifest.retention.keepLocal, [
      `specs/runs/${RUN_ID}/`,
      `charts/${RUN_ID}/`
    ]);
    assert.equal(manifest.retention.repository, 'ignored');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('internal tools can request a transient-only workspace', () => {
  const root = temporaryProject();
  try {
    const result = initializeRunWorkspace(root, 'routing-stress', { createOutputs: false });
    assert.equal(result.specificationRoot, null);
    assert.equal(result.deliveryRoot, null);
    assert.equal(fs.existsSync(path.join(root, 'specs', 'runs', 'routing-stress')), false);
    assert.equal(fs.existsSync(path.join(root, 'charts', 'routing-stress')), false);
    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));
    assert.equal(manifest.outputs, null);
    assert.deepEqual(manifest.retention.keepLocal, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('finalization removes run data and input while preserving local specs and charts', () => {
  const root = temporaryProject();
  try {
    const workspace = initializeRunWorkspace(root, RUN_ID);
    fs.writeFileSync(path.join(workspace.root, 'research', 'notes.txt'), 'private notes\n');
    fs.writeFileSync(path.join(workspace.specificationRoot, 'story.json'), '{}\n');
    fs.writeFileSync(path.join(workspace.deliveryRoot, 'story.html'), '<html></html>\n');
    fs.mkdirSync(path.join(root, 'previews', 'legacy-production'), { recursive: true });
    fs.writeFileSync(path.join(root, 'previews', 'legacy-production', 'build.log'), 'old output\n');

    const result = flushRunWorkspace(root, RUN_ID, {
      clearInput: true,
      removeLegacy: true
    });

    assert.equal(fs.existsSync(workspace.root), false);
    assert.equal(fs.existsSync(path.join(root, 'previews')), false);
    assert.equal(fs.readFileSync(path.join(root, 'input.txt'), 'utf8'), '');
    assert.equal(fs.existsSync(path.join(workspace.specificationRoot, 'story.json')), true);
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, 'story.html')), true);
    assert.equal(result.preserved.length, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('cold reset removes all transient work but never curated fixtures or local outputs', () => {
  const root = temporaryProject();
  try {
    const first = initializeRunWorkspace(root, 'internal-review');
    const second = initializeRunWorkspace(root, RUN_ID);
    fs.writeFileSync(path.join(first.specificationRoot, 'story.json'), '{}\n');
    fs.writeFileSync(path.join(second.deliveryRoot, 'story.html'), '<html></html>\n');
    fs.mkdirSync(path.join(root, 'previews'), { recursive: true });
    fs.writeFileSync(path.join(root, 'previews', 'temporary.html'), 'temporary\n');

    resetTransientWorkspace(root, { clearInput: true, removeLegacy: true });

    assert.equal(fs.existsSync(path.join(root, '.work')), false);
    assert.equal(fs.existsSync(path.join(root, 'previews')), false);
    assert.equal(fs.readFileSync(path.join(root, 'input.txt'), 'utf8'), '');
    assert.equal(fs.existsSync(path.join(root, 'specs', 'examples', 'fixture.json')), true);
    assert.equal(fs.existsSync(path.join(first.specificationRoot, 'story.json')), true);
    assert.equal(fs.existsSync(path.join(second.deliveryRoot, 'story.html')), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('run ids are opaque labels and cannot escape the workspace root', () => {
  assert.throws(() => normalizeRunId('../client-alpha'), /Run id/);
  assert.throws(() => normalizeRunId('client/alpha'), /Run id/);
  assert.equal(normalizeRunId(RUN_ID), RUN_ID);
  assert.equal(normalizeRunId('2026-08-05'), '2026-08-05');
});
