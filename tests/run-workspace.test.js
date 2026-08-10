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
const { buildRunCharts } = require('../renderer/run-charts');
const {
  zipEntryNamesFromBuffer,
  validatePresentationFile
} = require('../renderer/presentation-file');

const RUN_ID = 'client-alpha.issue-7';

function temporaryProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-run-workspace-'));
  fs.mkdirSync(path.join(root, 'specs', 'examples'), { recursive: true });
  fs.writeFileSync(path.join(root, 'specs', 'examples', 'fixture.json'), '{}\n');
  fs.writeFileSync(path.join(root, 'input.txt'), 'temporary batch source\n');
  return root;
}

function fakePowerPointArchive(entryNames) {
  const centralDirectory = Buffer.concat(entryNames.map((entryName) => {
    const name = Buffer.from(entryName, 'utf8');
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(name.length, 28);
    return Buffer.concat([header, name]);
  }));
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entryNames.length, 8);
  end.writeUInt16LE(entryNames.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(0, 16);
  return Buffer.concat([centralDirectory, end]);
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
    assert.equal(result.ledgerPath, path.join(root, '.work', RUN_ID, 'source-ledger.json'));
    assert.equal(fs.existsSync(result.specificationRoot), true);
    assert.equal(fs.existsSync(result.deliveryRoot), true);
    const ledger = JSON.parse(fs.readFileSync(result.ledgerPath, 'utf8'));
    assert.equal(ledger.input.path, 'input.txt');
    assert.equal(ledger.input.bytes, Buffer.byteLength('temporary batch source\n'));
    assert.match(ledger.input.sha256, /^[a-f0-9]{64}$/);
    assert.equal(ledger.inventoryComplete, false);

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

test('production initialization rejects missing or empty input without searching elsewhere', () => {
  const root = temporaryProject();
  try {
    fs.rmSync(path.join(root, 'input.txt'));
    assert.throws(() => initializeRunWorkspace(root, 'missing-input'), /exact project-root input\.txt/i);

    fs.writeFileSync(path.join(root, 'input.txt'), '   \n');
    assert.throws(() => initializeRunWorkspace(root, 'empty-input'), /input\.txt is empty/i);
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

test('finalization removes run data while preserving input, local specs, and charts', () => {
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
    assert.equal(fs.readFileSync(path.join(root, 'input.txt'), 'utf8'), 'temporary batch source\n');
    assert.equal(fs.existsSync(path.join(workspace.specificationRoot, 'story.json')), true);
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, 'story.html')), true);
    assert.equal(result.input.preserved, true);
    assert.equal(result.preserved.length, 3);
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

test('run chart builder renders selected stories in ledger order and writes QA artifacts', () => {
  const root = temporaryProject();
  const runId = 'batch-render';
  try {
    const workspace = initializeRunWorkspace(root, runId);
    const ledger = {
      version: '1.5',
      runId,
      input: { path: 'input.txt', bytes: 0, sha256: 'stub' },
      inventoryComplete: true,
      ignoredEvidence: [],
      candidates: [
        { id: 'first-story', decision: 'selected', outputSlug: 'first-story', title: 'First story' },
        { id: 'merged-story', decision: 'merged', mergedInto: 'first-story' },
        { id: 'regional-story', decision: 'selected', outputSlug: 'regional-story', title: 'Regional story' }
      ]
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    fs.writeFileSync(path.join(workspace.specificationRoot, 'first-story.json'), JSON.stringify({
      recipe: 'comparison.change', title: 'First story'
    }));
    fs.writeFileSync(path.join(workspace.specificationRoot, 'regional-story.json'), JSON.stringify({
      recipe: 'map.regional', title: 'Regional story'
    }));
    fs.writeFileSync(path.join(workspace.deliveryRoot, `tochnyi-charts-${runId}.pptx`), 'stale deck');
    fs.writeFileSync(path.join(workspace.deliveryRoot, 'editorial-notes.txt'), 'preserve me');

    const calls = [];
    function render(kind, specPath, htmlPath) {
      calls.push(`${kind}:${path.basename(specPath, '.json')}`);
      fs.writeFileSync(htmlPath, '<html data-rendered="true"></html>\n');
      return {
        workflow: kind === 'regional' ? 'regional-breakdown' : 'standard-chart',
        htmlPath,
        warnings: [],
        diagnostics: kind === 'regional'
          ? { status: 'pass', runs: [{ errors: 0, warnings: 0 }] }
          : undefined
      };
    }

    const result = buildRunCharts(root, runId, {
      dependencies: {
        verify: () => ({ valid: true, selected: 2, merged: 1, omitted: 0, specificationsChecked: 2 }),
        renderStandard: (specPath, htmlPath) => render('standard', specPath, htmlPath),
        renderRegional: (specPath, htmlPath) => render('regional', specPath, htmlPath),
        diagnose: () => ({ status: 'pass', runs: [{ diagnostics: { summary: { errors: 0, warnings: 0 } } }] }),
        capture: (htmlPath, pngPath) => {
          fs.writeFileSync(pngPath, 'png');
          return { bytes: 3, dimensions: { width: 1200, height: 900 } };
        }
      }
    });

    assert.deepEqual(calls, ['standard:first-story', 'regional:regional-story']);
    assert.equal(result.chartCount, 2);
    assert.equal(result.passed, true);
    const manifest = fs.readFileSync(result.manifestPath, 'utf8');
    assert.ok(manifest.indexOf('first-story') < manifest.indexOf('regional-story'));
    assert.match(manifest, /comparison\.change/);
    assert.match(manifest, /map\.regional/);
    const qa = JSON.parse(fs.readFileSync(result.qaPath, 'utf8'));
    assert.equal(qa.artifacts.htmlCharts, 2);
    assert.equal(qa.artifacts.pngCharts, 2);
    assert.equal(qa.visualQa.diagnosticErrors, 0);
    assert.equal(qa.presentation.requiredNext, true);
    assert.equal(qa.presentation.titleSlidesAllowed, false);
    assert.equal(qa.presentation.expectedSlideCount, 2);
    const presentationPlan = JSON.parse(fs.readFileSync(result.presentationPlanPath, 'utf8'));
    assert.equal(presentationPlan.titleSlidesAllowed, false);
    assert.equal(presentationPlan.expectedSlideCount, 2);
    assert.deepEqual(presentationPlan.slides.map((slide) => slide.kind), ['chart', 'chart']);
    assert.deepEqual(presentationPlan.slides.map((slide) => slide.slug), ['first-story', 'regional-story']);
    assert.deepEqual(qa.charts.map((chart) => chart.slug), ['first-story', 'regional-story']);
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, 'first-story.png')), true);
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, 'regional-story.png')), true);
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, `tochnyi-charts-${runId}.pptx`)), false);
    assert.equal(fs.readFileSync(path.join(workspace.deliveryRoot, 'editorial-notes.txt'), 'utf8'), 'preserve me');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('run chart builder preserves the previous delivery when staged capture fails', () => {
  const root = temporaryProject();
  const runId = 'atomic-render';
  try {
    const workspace = initializeRunWorkspace(root, runId);
    fs.writeFileSync(workspace.ledgerPath, JSON.stringify({
      candidates: [{ id: 'story', decision: 'selected', outputSlug: 'story', title: 'Story' }]
    }));
    fs.writeFileSync(path.join(workspace.specificationRoot, 'story.json'), JSON.stringify({
      recipe: 'comparison.change', title: 'Story'
    }));
    fs.writeFileSync(path.join(workspace.deliveryRoot, 'story.html'), 'previous delivery\n');

    assert.throws(() => buildRunCharts(root, runId, {
      dependencies: {
        verify: () => ({ valid: true, selected: 1, specificationsChecked: 1 }),
        renderStandard: (specPath, htmlPath) => {
          fs.writeFileSync(htmlPath, '<html data-rendered="true"></html>\n');
          return { workflow: 'standard-chart', htmlPath, warnings: [] };
        },
        diagnose: () => ({ status: 'pass', runs: [] }),
        capture: () => { throw new Error('capture failed'); }
      }
    }), /capture failed/);

    assert.equal(fs.readFileSync(path.join(workspace.deliveryRoot, 'story.html'), 'utf8'), 'previous delivery\n');
    assert.equal(
      fs.readdirSync(path.join(root, 'charts')).some((name) => name.startsWith(`${runId}.building-`)),
      false
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('presentation validation rejects unrequested extra slides', () => {
  const root = temporaryProject();
  try {
    const pptxPath = path.join(root, 'deck.pptx');
    const archive = fakePowerPointArchive([
      '[Content_Types].xml',
      'ppt/presentation.xml',
      'ppt/slides/slide1.xml',
      'ppt/slides/slide2.xml'
    ]);
    fs.writeFileSync(pptxPath, archive);
    assert.deepEqual(zipEntryNamesFromBuffer(archive), [
      '[Content_Types].xml',
      'ppt/presentation.xml',
      'ppt/slides/slide1.xml',
      'ppt/slides/slide2.xml'
    ]);

    const valid = validatePresentationFile(pptxPath, {
      titleSlidesAllowed: false,
      expectedSlideCount: 2
    });
    assert.equal(valid.actualSlideCount, 2);

    assert.throws(
      () => validatePresentationFile(pptxPath, {
        titleSlidesAllowed: false,
        expectedSlideCount: 1
      }),
      /slide count is 2|remove unrequested cover/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
