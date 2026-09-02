'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  normalizeRunId,
  normalizeArtifactSlug,
  readInputSnapshot,
  initializeRunWorkspace,
  flushRunWorkspace,
  resetTransientWorkspace,
  runProjectPath,
  workspaceRoot,
  runSpecPath,
  deliveryPath
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
  return root;
}

function writeProjectInput(root, projectId, content = 'temporary batch source\n') {
  const inputRoot = runProjectPath(root, projectId, 'input');
  fs.mkdirSync(inputRoot, { recursive: true });
  fs.writeFileSync(path.join(inputRoot, 'brief.txt'), content);
  return inputRoot;
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

test('project initialization keeps durable and transient artifacts under one project folder', () => {
  const root = temporaryProject();
  try {
    writeProjectInput(root, RUN_ID);
    const result = initializeRunWorkspace(root, RUN_ID);
    assert.equal(result.root, path.join(root, 'projects', RUN_ID));
    assert.equal(result.workRoot, path.join(result.root, 'work'));
    assert.equal(fs.existsSync(result.workRoot), true);
    for (const directory of ['research', 'downloads', 'scripts', 'logs', 'review', 'package', 'rendered']) {
      assert.equal(fs.existsSync(path.join(result.workRoot, directory)), false, `${directory} should be created only on demand`);
    }
    assert.equal(result.specificationRoot, path.join(result.root, 'specs'));
    assert.equal(result.deliveryRoot, path.join(result.root, 'output'));
    assert.equal(result.ledgerPath, path.join(result.root, 'source-ledger.json'));
    assert.equal(result.manifestPath, path.join(result.root, 'project.json'));
    assert.equal(fs.existsSync(result.specificationRoot), true);
    assert.equal(fs.existsSync(result.deliveryRoot), true);
    assert.equal(fs.existsSync(path.join(root, '.work')), false);
    assert.equal(fs.existsSync(path.join(root, 'charts')), false);
    assert.equal(fs.existsSync(path.join(root, 'specs', 'runs')), false);
    const ledger = JSON.parse(fs.readFileSync(result.ledgerPath, 'utf8'));
    assert.equal(ledger.input.path, 'input/');
    assert.equal(ledger.input.kind, 'directory');
    assert.equal(ledger.input.bytes, Buffer.byteLength('temporary batch source\n'));
    assert.equal(ledger.input.files.length, 1);
    assert.match(ledger.input.sha256, /^[a-f0-9]{64}$/);
    assert.equal(ledger.inventoryComplete, false);

    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));
    assert.equal(manifest.projectId, RUN_ID);
    assert.deepEqual(manifest.paths, {
      input: 'input/',
      sourceLedger: 'source-ledger.json',
      specifications: 'specs/',
      output: 'output/',
      work: 'work/'
    });
    assert.deepEqual(manifest.retention.keepLocal, [
      'input/',
      'source-ledger.json',
      'specs/',
      'output/'
    ]);
    assert.deepEqual(manifest.retention.purge, ['work/']);
    assert.equal(manifest.retention.repository, 'ignored');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('production initialization rejects missing or empty input without searching elsewhere', () => {
  const root = temporaryProject();
  try {
    assert.throws(() => initializeRunWorkspace(root, 'missing-input'), /input\/ is missing|input\/ is empty/i);

    writeProjectInput(root, 'empty-input', '   \n');
    assert.throws(() => initializeRunWorkspace(root, 'empty-input'), /input\/ contains no non-empty source files/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('directory input snapshots inventory and hash every supplied source file', () => {
  const root = temporaryProject();
  try {
    const inputRoot = runProjectPath(root, 'directory-input', 'input');
    fs.mkdirSync(inputRoot, { recursive: true });
    fs.writeFileSync(path.join(inputRoot, 'data.csv'), 'Category,Value\nA,10\nB,8\n');
    fs.writeFileSync(path.join(inputRoot, 'context.ipynb'), JSON.stringify({
      cells: [
        { cell_type: 'markdown', source: ['# Context\n', 'Category analysis'] }
      ]
    }));

    const snapshot = readInputSnapshot(root, 'directory-input');
    assert.equal(snapshot.kind, 'directory');
    assert.equal(snapshot.relativePath, 'input/');
    assert.deepEqual(snapshot.files.map((file) => file.path), [
      'input/context.ipynb',
      'input/data.csv'
    ]);
    assert.match(snapshot.sha256, /^[a-f0-9]{64}$/);
    assert.match(snapshot.content, /Category analysis/);
    assert.match(snapshot.content, /Category,Value/);

    const result = initializeRunWorkspace(root, 'directory-input');
    const ledger = JSON.parse(fs.readFileSync(result.ledgerPath, 'utf8'));
    assert.equal(ledger.version, '2.0');
    assert.equal(ledger.input.path, 'input/');
    assert.equal(ledger.input.kind, 'directory');
    assert.equal(ledger.input.files.length, 2);
    assert.deepEqual(ledger.input.files.map((file) => file.path), snapshot.files.map((file) => file.path));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('project folders isolate source snapshots and durable outputs from sibling projects', () => {
  const root = temporaryProject();
  try {
    writeProjectInput(root, 'project-a', 'alpha source\n');
    writeProjectInput(root, 'project-b', 'beta source\n');
    const first = initializeRunWorkspace(root, 'project-a');
    const second = initializeRunWorkspace(root, 'project-b');

    const firstSnapshot = readInputSnapshot(root, 'project-a');
    const secondSnapshot = readInputSnapshot(root, 'project-b');
    assert.notEqual(firstSnapshot.sha256, secondSnapshot.sha256);
    assert.match(firstSnapshot.content, /alpha source/);
    assert.doesNotMatch(firstSnapshot.content, /beta source/);
    assert.match(secondSnapshot.content, /beta source/);
    assert.doesNotMatch(secondSnapshot.content, /alpha source/);

    fs.writeFileSync(path.join(first.specificationRoot, 'alpha.json'), '{}\n');
    fs.writeFileSync(path.join(second.deliveryRoot, 'beta.png'), 'png');
    assert.equal(fs.existsSync(path.join(second.specificationRoot, 'alpha.json')), false);
    assert.equal(fs.existsSync(path.join(first.deliveryRoot, 'beta.png')), false);
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
    assert.equal(fs.existsSync(runProjectPath(root, 'routing-stress', 'specs')), false);
    assert.equal(fs.existsSync(runProjectPath(root, 'routing-stress', 'output')), false);
    assert.equal(fs.existsSync(workspaceRoot(root, 'routing-stress')), true);
    const manifest = JSON.parse(fs.readFileSync(result.manifestPath, 'utf8'));
    assert.equal(manifest.paths, null);
    assert.deepEqual(manifest.retention.keepLocal, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('finalization removes only project work while preserving the complete durable project', () => {
  const root = temporaryProject();
  try {
    writeProjectInput(root, RUN_ID);
    const workspace = initializeRunWorkspace(root, RUN_ID);
    fs.mkdirSync(path.join(workspace.workRoot, 'research'), { recursive: true });
    fs.writeFileSync(path.join(workspace.workRoot, 'research', 'notes.txt'), 'private notes\n');
    fs.writeFileSync(path.join(workspace.specificationRoot, 'story.json'), '{}\n');
    fs.writeFileSync(path.join(workspace.deliveryRoot, 'story.html'), '<html></html>\n');
    fs.mkdirSync(path.join(root, 'previews', 'legacy-production'), { recursive: true });
    fs.writeFileSync(path.join(root, 'previews', 'legacy-production', 'build.log'), 'old output\n');

    const result = flushRunWorkspace(root, RUN_ID, {
      removeLegacy: true
    });

    assert.equal(fs.existsSync(workspace.root), true);
    assert.equal(fs.existsSync(workspace.workRoot), false);
    assert.equal(fs.existsSync(path.join(root, 'previews')), false);
    assert.equal(fs.readFileSync(path.join(workspace.root, 'input', 'brief.txt'), 'utf8'), 'temporary batch source\n');
    assert.equal(fs.existsSync(workspace.ledgerPath), true);
    assert.equal(fs.existsSync(workspace.manifestPath), true);
    assert.equal(fs.existsSync(path.join(workspace.specificationRoot, 'story.json')), true);
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, 'story.html')), true);
    assert.equal(result.input.preserved, true);
    assert.ok(result.preserved.includes(workspace.root));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('cold reset removes work from every project but preserves each project boundary', () => {
  const root = temporaryProject();
  try {
    writeProjectInput(root, 'internal-review', 'first project source\n');
    writeProjectInput(root, RUN_ID, 'second project source\n');
    const first = initializeRunWorkspace(root, 'internal-review');
    const second = initializeRunWorkspace(root, RUN_ID);
    fs.writeFileSync(path.join(first.specificationRoot, 'story.json'), '{}\n');
    fs.writeFileSync(path.join(second.deliveryRoot, 'story.html'), '<html></html>\n');
    fs.writeFileSync(path.join(first.workRoot, 'temporary.txt'), 'temporary\n');
    fs.writeFileSync(path.join(second.workRoot, 'temporary.txt'), 'temporary\n');
    fs.mkdirSync(path.join(root, 'previews'), { recursive: true });
    fs.writeFileSync(path.join(root, 'previews', 'temporary.html'), 'temporary\n');

    const result = resetTransientWorkspace(root, { removeLegacy: true });

    assert.equal(fs.existsSync(first.workRoot), false);
    assert.equal(fs.existsSync(second.workRoot), false);
    assert.equal(fs.existsSync(path.join(root, 'previews')), false);
    assert.equal(fs.readFileSync(path.join(first.root, 'input', 'brief.txt'), 'utf8'), 'first project source\n');
    assert.equal(fs.readFileSync(path.join(second.root, 'input', 'brief.txt'), 'utf8'), 'second project source\n');
    assert.equal(fs.existsSync(path.join(root, 'specs', 'examples', 'fixture.json')), true);
    assert.equal(fs.existsSync(path.join(first.specificationRoot, 'story.json')), true);
    assert.equal(fs.existsSync(path.join(second.deliveryRoot, 'story.html')), true);
    assert.deepEqual(result.preserved, [path.join(root, 'projects')]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('project ids are opaque labels and cannot escape the project root', () => {
  assert.throws(() => normalizeRunId('../client-alpha'), /Project id/);
  assert.throws(() => normalizeRunId('client/alpha'), /Project id/);
  assert.equal(normalizeRunId(RUN_ID), RUN_ID);
  assert.equal(normalizeRunId('2026-08-05'), '2026-08-05');
});

test('artifact slugs and project-specific paths reject traversal', () => {
  const root = temporaryProject();
  try {
    assert.equal(normalizeArtifactSlug('first-story-2026'), 'first-story-2026');
    assert.throws(() => normalizeArtifactSlug('../escape'), /Artifact slug/);
    assert.throws(() => normalizeArtifactSlug('Story One'), /Artifact slug/);
    assert.throws(() => normalizeArtifactSlug('a'.repeat(129)), /Artifact slug/);
    assert.throws(() => runSpecPath(root, RUN_ID, '..', 'escape.json'), /outside project specification root/);
    assert.throws(() => deliveryPath(root, RUN_ID, '..', 'escape.html'), /outside project output root/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('project chart builder rejects an unsafe ledger slug before staging artifacts', () => {
  const root = temporaryProject();
  const projectId = 'unsafe-slug';
  try {
    writeProjectInput(root, projectId);
    const workspace = initializeRunWorkspace(root, projectId);
    fs.writeFileSync(workspace.ledgerPath, JSON.stringify({
      candidates: [{ id: 'escape', decision: 'selected', outputSlug: '../escape', title: 'Escape' }]
    }));

    assert.throws(
      () => buildRunCharts(root, projectId, {
        dependencies: { verify: () => ({ valid: true, selected: 1, specificationsChecked: 1 }) }
      }),
      /invalid outputSlug.*Artifact slug/
    );
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, 'escape.html')), false);
    assert.equal(fs.readdirSync(workspace.workRoot).some((name) => name.startsWith('output-building-')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('project chart builder renders selected stories in ledger order and writes QA artifacts', () => {
  const root = temporaryProject();
  const projectId = 'batch-render';
  try {
    writeProjectInput(root, projectId);
    const workspace = initializeRunWorkspace(root, projectId);
    const ledger = {
      version: '2.0',
      projectId,
      input: {
        path: 'input/',
        kind: 'directory',
        bytes: 0,
        sha256: 'stub',
        files: []
      },
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
    fs.writeFileSync(path.join(workspace.deliveryRoot, `tochnyi-charts-${projectId}.pptx`), 'stale deck');
    fs.writeFileSync(path.join(workspace.deliveryRoot, 'editorial-notes.txt'), 'preserve me');

    const calls = [];
    const captures = [];
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

    const result = buildRunCharts(root, projectId, {
      dependencies: {
        verify: () => ({ valid: true, selected: 2, merged: 1, omitted: 0, specificationsChecked: 2 }),
        renderStandard: (specPath, htmlPath) => render('standard', specPath, htmlPath),
        renderRegional: (specPath, htmlPath) => render('regional', specPath, htmlPath),
        diagnose: () => ({ status: 'pass', runs: [{ diagnostics: { summary: { errors: 0, warnings: 0 } } }] }),
        capture: (htmlPath, pngPath, options) => {
          captures.push({ slug: path.basename(pngPath, '.png'), options });
          fs.writeFileSync(pngPath, 'png');
          const regional = path.basename(pngPath) === 'regional-story.png';
          return {
            bytes: 3,
            dimensions: { ...options.viewport },
            diagnostics: { status: 'pass', summary: { errors: 0, warnings: 0 } },
            chartAttributes: regional ? {
              'data-map-workflow': 'regional-breakdown',
              'data-map-leader-rendered-crossings': '0',
              'data-map-port-direction-reversal-routes': '0',
              'data-map-port-control-reversal-routes': '0',
              'data-map-port-terminal-box-turn-routes': '0'
            } : {}
          };
        }
      }
    });

    assert.deepEqual(calls, ['standard:first-story', 'regional:regional-story']);
    assert.deepEqual(captures.map((capture) => ({
      slug: capture.slug,
      viewport: capture.options.viewport,
      adaptiveCanvas: capture.options.adaptiveCanvas
    })), [
      { slug: 'first-story', viewport: { width: 1200, height: 900 }, adaptiveCanvas: true },
      { slug: 'regional-story', viewport: { width: 1450, height: 679 }, adaptiveCanvas: true }
    ]);
    assert.equal(result.chartCount, 2);
    assert.equal(result.passed, true);
    const manifest = fs.readFileSync(result.manifestPath, 'utf8');
    assert.ok(manifest.indexOf('first-story') < manifest.indexOf('regional-story'));
    assert.match(manifest, /comparison\.change/);
    assert.match(manifest, /map\.regional/);
    const qa = JSON.parse(fs.readFileSync(result.qaPath, 'utf8'));
    assert.equal(result.projectId, projectId);
    assert.equal(qa.projectId, projectId);
    assert.equal(qa.artifacts.htmlCharts, 2);
    assert.equal(qa.artifacts.pngCharts, 2);
    assert.equal(qa.visualQa.diagnosticErrors, 0);
    assert.equal(qa.presentation.requiredNext, false);
    assert.equal(qa.presentation.optionalNext, true);
    assert.equal(qa.presentation.titleSlidesAllowed, false);
    assert.equal(qa.presentation.expectedSlideCount, 2);
    const presentationPlan = JSON.parse(fs.readFileSync(result.presentationPlanPath, 'utf8'));
    assert.equal(presentationPlan.projectId, projectId);
    assert.equal(presentationPlan.titleSlidesAllowed, false);
    assert.equal(presentationPlan.expectedSlideCount, 2);
    assert.deepEqual(presentationPlan.slides.map((slide) => slide.kind), ['chart', 'chart']);
    assert.deepEqual(presentationPlan.slides.map((slide) => slide.slug), ['first-story', 'regional-story']);
    assert.deepEqual(qa.charts.map((chart) => chart.slug), ['first-story', 'regional-story']);
    assert.deepEqual(qa.charts.map((chart) => chart.image.requestedViewport), [
      { width: 1200, height: 900 },
      { width: 1450, height: 679 }
    ]);
    assert.ok(qa.charts.every((chart) => chart.image.profile === 'auto'));
    assert.ok(qa.charts.every((chart) => chart.image.expanded === false));
    assert.equal(qa.charts[0].image.regionalDiagnostics, null);
    assert.equal(qa.charts[1].image.regionalDiagnostics.workflow, 'regional-breakdown');
    assert.equal(qa.charts[1].image.regionalDiagnostics.renderedCrossings, 0);
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, 'first-story.png')), true);
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, 'regional-story.png')), true);
    assert.equal(fs.existsSync(path.join(workspace.deliveryRoot, `tochnyi-charts-${projectId}.pptx`)), false);
    assert.equal(fs.readFileSync(path.join(workspace.deliveryRoot, 'editorial-notes.txt'), 'utf8'), 'preserve me');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('project chart builder preserves the previous delivery when staged capture fails', () => {
  const root = temporaryProject();
  const projectId = 'atomic-render';
  try {
    writeProjectInput(root, projectId);
    const workspace = initializeRunWorkspace(root, projectId);
    fs.writeFileSync(workspace.ledgerPath, JSON.stringify({
      candidates: [{ id: 'story', decision: 'selected', outputSlug: 'story', title: 'Story' }]
    }));
    fs.writeFileSync(path.join(workspace.specificationRoot, 'story.json'), JSON.stringify({
      recipe: 'comparison.change', title: 'Story'
    }));
    fs.writeFileSync(path.join(workspace.deliveryRoot, 'story.html'), 'previous delivery\n');

    assert.throws(() => buildRunCharts(root, projectId, {
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
      fs.readdirSync(workspace.workRoot).some((name) => name.startsWith('output-building-') || name.startsWith('output-previous-')),
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
