'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  renderStandardChart,
  validateStandardSpec,
  validateSpecFile
} = require('../renderer/workflow');
const { validateSpec } = require('../renderer/validate');
const {
  renderRegionalBreakdown,
  regionalAgentGuide,
  validateRegionalSpec
} = require('../renderer/regional-workflow');
const {
  agentWorkflowOrientation,
  standardAgentGuide,
  toolApiManifest
} = require('../renderer/agent-workflow');
const { renderSpecFile } = require('../renderer/render');

const root = path.join(__dirname, '..');
const examplesDir = path.join(root, 'specs', 'examples');

function example(name) {
  return path.join(examplesDir, name);
}

function tempDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test('agent orientation keeps standard and regional workflows distinct', () => {
  const orientation = agentWorkflowOrientation('russia');
  assert.equal(orientation.interface.type, 'tool-api');
  assert.equal(orientation.interface.role, 'chart-author');
  assert.match(orientation.interface.entrypoint, /tool-api\/chart\.js/);
  assert.ok(orientation.boundary.implementation.includes('renderer/'));
  assert.equal(orientation.sharedContract.resources.sourcePolicy, 'docs/source-enrichment.md');
  assert.equal(orientation.sharedContract.resources.batchPolicy, 'docs/batch-workflow.md');
  assert.equal(orientation.sharedContract.resources.storySelection, 'docs/story-selection.md');
  assert.equal(orientation.sharedContract.stages[0].id, 'verify-source');
  assert.match(orientation.sharedContract.sharedScaleContract.sentenceTest, /Every mark encodes/);
  assert.match(orientation.sharedContract.sourceEnrichment.complexityRule, /simple comparison/i);
  assert.equal(orientation.batchWorkflow.input, 'input.txt');
  assert.equal(orientation.batchWorkflow.deliveryFolder, 'charts/YYYY-week-WW/');
  assert.match(orientation.batchWorkflow.presentation, /tochnyi-charts-YYYY-week-WW\.pptx$/);
  assert.match(orientation.batchWorkflow.boundary, /LLM agent owns input parsing/i);
  assert.deepEqual(
    orientation.decision.map((entry) => entry.workflow),
    ['regional-breakdown', 'standard-chart']
  );
  assert.equal(orientation.regional.workflow, 'regional-breakdown');
  assert.match(orientation.regional.guideCommand, /regional-guide russia/);
  assert.equal(orientation.standard.workflow, 'standard-chart');
  assert.match(orientation.standard.renderCommand, /render <spec\.json>/);

  const standard = standardAgentGuide();
  assert.equal(standard.workflow, 'standard-chart');
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'map.regional'), false);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'story.facets'), true);
  assert.equal(standard.regionalHandoff.use, 'map.regional');
  assert.deepEqual(standard.sharedScaleContract.requiredFields, ['measure.quantity', 'data[].quantity', 'data[].scope', 'data[].period']);
  assert.deepEqual(standard.waterfallContract.requiredItemFields, ['role', 'value', 'valueStatus', 'period', 'scope']);
  assert.match(standard.waterfallContract.valueStatus, /reported/);

  const regional = regionalAgentGuide('russia');
  assert.equal(regional.workflow, 'regional-breakdown');
  assert.deepEqual(regional.requiredDataItem, ['label', 'regionId or regionIds']);
  assert.ok(regional.automaticByDefault.includes('leader routing'));
  assert.ok(regional.neverAuthor.includes('coordinates or pixel positions'));
  assert.deepEqual(regional.regionSet.nonContinentalRegionIds, ['RU-KGD', 'RU-SAK']);
  assert.match(regional.authoringRule, /permanently omit Kaliningrad/i);
});

test('tool API manifest exposes a narrow chart-author surface', () => {
  const manifest = toolApiManifest('russia');
  assert.equal(manifest.role, 'chart-author');
  assert.match(manifest.entrypoint, /tool-api\/chart\.js/);
  assert.equal(manifest.resources.schema, 'schemas/chart-spec.schema.json');
  assert.equal(manifest.resources.sourcePolicy, 'docs/source-enrichment.md');
  assert.equal(manifest.resources.batchPolicy, 'docs/batch-workflow.md');
  assert.equal(manifest.resources.storySelection, 'docs/story-selection.md');
  assert.equal(fs.existsSync(path.join(root, manifest.resources.sourcePolicy)), true);
  assert.equal(fs.existsSync(path.join(root, manifest.resources.batchPolicy)), true);
  assert.equal(fs.existsSync(path.join(root, manifest.resources.storySelection)), true);
  assert.equal(manifest.batchWorkflow.owner, 'llm-agent');
  assert.equal(manifest.batchWorkflow.input, 'input.txt');
  assert.equal(manifest.batchWorkflow.deliveryFolder, 'charts/YYYY-week-WW/');
  assert.ok(manifest.batchWorkflow.steps.some((step) => step.includes('PowerPoint')));
  assert.ok(manifest.allowedWork.some((entry) => entry.includes('PowerPoint')));
  assert.deepEqual(
    manifest.sourceEnrichment.evidenceRoles,
    ['magnitude', 'comparison', 'mechanism', 'consequence']
  );
  assert.match(manifest.sourceEnrichment.coreRule, /full primary source/i);
  assert.match(manifest.sourceEnrichment.complexityRule, /visually interesting/i);
  assert.match(manifest.sourceEnrichment.attributionRule, /omit source/i);
  assert.match(manifest.sourceEnrichment.attributionRule, /presentation copy/i);
  assert.ok(manifest.excludedWork.some((entry) => entry.includes('renderer/')));
  assert.match(manifest.escalation, /report an infrastructure issue/i);
  assert.deepEqual(manifest.waterfallContract.requiredItemFields, ['role', 'value', 'valueStatus', 'period', 'scope']);
  assert.match(manifest.waterfallContract.reconciliation, /reconcile/i);
  assert.match(manifest.sharedScaleContract.rejectionRule, /story\.facets/);

  const guide = standardAgentGuide('russia');
  guide.selectionRules.forEach((entry) => {
    assert.ok(entry.example, `Missing example for ${entry.use}`);
    assert.equal(fs.existsSync(path.join(root, entry.example)), true, `Missing ${entry.example}`);
  });
});

test('public Tool API entrypoint returns the machine-readable manifest', () => {
  const cliPath = path.join(root, 'tool-api', 'chart.js');
  const result = spawnSync(process.execPath, [cliPath, 'api'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(result.stdout);
  assert.equal(manifest.name, 'Tochnyi Charts Tool API');
  assert.equal(manifest.version, '1.4');
  assert.equal(manifest.role, 'chart-author');
  assert.equal(manifest.resources.sourcePolicy, 'docs/source-enrichment.md');
  assert.equal(manifest.resources.batchPolicy, 'docs/batch-workflow.md');
  assert.equal(manifest.resources.storySelection, 'docs/story-selection.md');
  assert.equal(manifest.batchWorkflow.input, 'input.txt');
  assert.equal(manifest.batchWorkflow.presentation, 'charts/YYYY-week-WW/tochnyi-charts-YYYY-week-WW.pptx');
  assert.match(manifest.firstCommand, /tool-api\/chart\.js orient/);
});

test('workflow validation reports the correct route for each recipe family', () => {
  const standard = validateStandardSpec(example('ai95-price-spike.json'));
  assert.equal(standard.validation.normalized.recipe, 'comparison.change');
  const regional = validateRegionalSpec(example('russia-regional-map.json'));
  assert.equal(regional.validation.normalized.recipe, 'map.regional');

  assert.throws(
    () => validateStandardSpec(example('russia-regional-map.json')),
    /This is a regional breakdown.*regional-guide.*regional <spec/si
  );
  assert.throws(
    () => validateRegionalSpec(example('ai95-price-spike.json')),
    /only accepts recipe "map\.regional"/
  );
});

test('generic CLI render refuses to bypass the regional workflow', () => {
  const cliPath = path.join(root, 'tools', 'chart.js');
  const result = spawnSync(process.execPath, [cliPath, 'render', example('russia-regional-map.json')], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /regional-guide/);
  assert.match(result.stderr, /regional <spec\.json>/);
});

test('standard and regional workflow wrappers preserve renderer output contracts', () => {
  const tempDir = tempDirectory('tochnyi-workflow-compare-');
  try {
    const standardCorePath = path.join(tempDir, 'standard-core.html');
    const standardPath = path.join(tempDir, 'standard.html');
    const standardCore = renderSpecFile(example('ai95-price-spike.json'), standardCorePath, { projectRoot: root });
    const standard = renderStandardChart(example('ai95-price-spike.json'), standardPath, { projectRoot: root });
    assert.equal(standard.workflow, 'standard-chart');
    assert.equal(standard.recipe, 'comparison.change');
    assert.equal(standard.review.valid, true);
    assert.ok(standard.bytes > 0);
    assert.equal(standardCore.recipe, standard.recipe);
    assert.equal(fs.readFileSync(standardCorePath, 'utf8'), fs.readFileSync(standardPath, 'utf8'));

    const regionalCorePath = path.join(tempDir, 'regional-core.html');
    const regionalWorkflowPath = path.join(tempDir, 'regional-workflow.html');
    const regionalCore = renderSpecFile(example('russia-regional-map.json'), regionalCorePath, { projectRoot: root });
    const regional = renderRegionalBreakdown(example('russia-regional-map.json'), regionalWorkflowPath, {
      projectRoot: root,
      diagnose: false
    });
    assert.equal(regional.workflow, 'regional-breakdown');
    assert.equal(regional.recipe, 'map.regional');
    assert.equal(regional.review.valid, true);
    assert.equal(regional.bytes, fs.statSync(regionalWorkflowPath).size);
    assert.equal(regionalCore.recipe, regional.recipe);
    assert.equal(fs.readFileSync(regionalCorePath, 'utf8'), fs.readFileSync(regionalWorkflowPath, 'utf8'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('workflow helpers keep validation errors structured', () => {
  const tempDir = tempDirectory('tochnyi-invalid-');
  const invalidPath = path.join(tempDir, 'invalid.json');
  fs.writeFileSync(invalidPath, JSON.stringify({ recipe: 'comparison.change' }), 'utf8');
  try {
    assert.throws(() => validateSpecFile(invalidPath), (error) => {
      assert.match(error.message, /ChartSpec validation failed/);
      assert.equal(error.validation.valid, false);
      assert.ok(Array.isArray(error.validation.errors));
      return true;
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('validator returns structured errors for malformed data containers', () => {
  const malformedSpecs = [
    { recipe: 'comparison.change' },
    { recipe: 'comparison.range', data: null },
    { recipe: 'flow.waterfall', data: [null] },
    { recipe: 'composition.stacked', data: [null, { value: 1 }] },
    { recipe: 'map.regional', data: [null], map: { regionSet: 'russia' } },
    { recipe: 'map.regional', data: [{ regionIds: 'RU-OMS' }], map: { regionSet: 'russia' } },
    { recipe: 'trend.line', data: [1, null] }
  ];

  malformedSpecs.forEach((spec) => {
    const result = validateSpec(spec);
    assert.equal(result.valid, false);
    assert.ok(Array.isArray(result.errors));
    assert.ok(result.errors.length > 0);
  });
});

test('workflow helpers explain malformed JSON files with structured context', () => {
  const tempDir = tempDirectory('tochnyi-malformed-json-');
  const invalidPath = path.join(tempDir, 'invalid.json');
  fs.writeFileSync(invalidPath, '{"recipe":', 'utf8');
  try {
    assert.throws(() => validateSpecFile(invalidPath), (error) => {
      assert.match(error.message, /ChartSpec JSON is malformed/);
      assert.equal(error.validation.valid, false);
      assert.ok(error.validation.errors.length > 0);
      return true;
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
