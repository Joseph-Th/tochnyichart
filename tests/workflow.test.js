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
  assert.equal(orientation.sharedContract.resources.sourceLedger, 'docs/source-ledger.md');
  assert.equal(orientation.sharedContract.resources.batchPolicy, 'docs/batch-workflow.md');
  assert.equal(orientation.sharedContract.resources.storySelection, 'docs/story-selection.md');
  assert.equal(orientation.sharedContract.stages[0].id, 'preserve-input');
  assert.match(orientation.sharedContract.sourceEnrichment.coreRule, /expert-authored editorial evidence/i);
  assert.match(orientation.sharedContract.sourceEnrichment.inputRule, /external silence is not a contradiction/i);
  assert.match(orientation.sharedContract.sourceEnrichment.inputIdentityRule, /exact non-empty project-root input\.txt/i);
  assert.match(orientation.sharedContract.sourceEnrichment.inventoryRule, /inventory every distinct quantitative input story/i);
  assert.match(orientation.sharedContract.sourceEnrichment.supplementationRule, /Do not replace, downgrade, or relabel/i);
  assert.match(orientation.sharedContract.sourceEnrichment.supplementationRule, /actual levels that directly express the same input-anchored change/i);
  assert.match(orientation.sharedContract.sourceEnrichment.supplementationRule, /may not create the subject, central claim, or title/i);
  assert.match(orientation.sharedContract.sourceEnrichment.titleFidelityRule, /titleBasis/i);
  assert.match(orientation.sharedContract.sourceEnrichment.contradictionRule, /direct material contradiction/i);
  assert.match(orientation.sharedContract.sourceEnrichment.presentationRule, /uncorroborated/i);
  assert.match(orientation.sharedContract.sharedScaleContract.sentenceTest, /Every mark encodes/);
  assert.match(orientation.sharedContract.valueRepresentationContract.actualLevelRule, /plot those levels/i);
  assert.match(orientation.sharedContract.valueRepresentationContract.syntheticBaselineRule, /0% before-event/i);
  assert.match(orientation.sharedContract.sourceEnrichment.complexityRule, /one-point|visual comparison/i);
  assert.deepEqual(
    orientation.sharedContract.visualEvidenceContract.rejectedRecipes,
    ['status.grid', 'headline.metric']
  );
  assert.equal(orientation.batchWorkflow.input, 'input.txt');
  assert.match(orientation.batchWorkflow.inputAuthority, /expert-authored editorial evidence/i);
  assert.match(orientation.batchWorkflow.inputAuthority, /external silence is not contradiction/i);
  assert.equal(orientation.batchWorkflow.deliveryFolder, 'charts/<run-id>/');
  assert.equal(orientation.batchWorkflow.specificationFolder, 'specs/runs/<run-id>/');
  assert.equal(orientation.batchWorkflow.presentation, 'charts/<run-id>/tochnyi-charts-<run-id>.pptx');
  assert.equal(orientation.batchWorkflow.sourceLedger, '.work/<run-id>/source-ledger.json');
  assert.equal(orientation.batchWorkflow.sourceVerificationCommand, 'npm run run:verify-source -- <run-id>');
  assert.equal(orientation.batchWorkflow.sourceAndSpecVerificationCommand, 'npm run run:verify-source -- <run-id> --specs');
  assert.equal(orientation.batchWorkflow.chartBuildCommand, 'npm run run:charts -- <run-id>');
  assert.match(orientation.batchWorkflow.boundary, /orchestration layer still owns input parsing/i);
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
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'story.facets'), false);
  assert.ok(standard.authoringRules.some((rule) => /Never use status, card, bullet, or facet grids/.test(rule)));
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'status.grid'), false);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'headline.metric'), false);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'comparison.dumbbell'), true);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'relationship.converging-signals'), true);
  assert.match(standard.visualEvidenceContract.minimumMarks, /at least two quantitative marks/i);
  assert.match(standard.visualEvidenceContract.standalonePairRule, /two-item comparison\.scenarios/i);
  assert.match(standard.visualEvidenceContract.redundancyRule, /complement|remainder|zero-gap/i);
  assert.match(standard.visualEvidenceContract.compositionRule, /policy|target|alternative/i);
  assert.match(standard.visualEvidenceContract.compositionRule, /shared-total benchmark geometry/i);
  assert.match(standard.sourceEnrichment.benchmarkGapRule, /one segmented row|one row/i);
  assert.match(standard.sourceEnrichment.relationshipRule, /independent local quantitative signal/i);
  assert.match(standard.sourceEnrichment.relationshipRule, /join directly|no decorative hub/i);
  assert.match(standard.sourceEnrichment.standalonePairRule, /merge or omit/i);
  assert.match(standard.valueRepresentationContract.hierarchy, /actual levels/i);
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
  assert.equal(manifest.resources.sourceLedger, 'docs/source-ledger.md');
  assert.equal(manifest.resources.batchPolicy, 'docs/batch-workflow.md');
  assert.equal(manifest.resources.storySelection, 'docs/story-selection.md');
  assert.equal(fs.existsSync(path.join(root, manifest.resources.sourcePolicy)), true);
  assert.equal(fs.existsSync(path.join(root, manifest.resources.sourceLedger)), true);
  assert.equal(fs.existsSync(path.join(root, manifest.resources.batchPolicy)), true);
  assert.equal(fs.existsSync(path.join(root, manifest.resources.storySelection)), true);
  assert.equal(manifest.batchWorkflow.owner, 'llm-agent');
  assert.equal(manifest.batchWorkflow.input, 'input.txt');
  assert.match(manifest.batchWorkflow.inputAuthority, /presume claims and datapoints are correct/i);
  assert.equal(manifest.batchWorkflow.deliveryFolder, 'charts/<run-id>/');
  assert.equal(manifest.batchWorkflow.specificationFolder, 'specs/runs/<run-id>/');
  assert.ok(manifest.batchWorkflow.steps.some((step) => step.includes('PowerPoint')));
  assert.ok(manifest.allowedWork.some((entry) => entry.includes('PowerPoint')));
  assert.deepEqual(
    manifest.sourceEnrichment.evidenceRoles,
    ['magnitude', 'comparison', 'mechanism', 'consequence']
  );
  assert.match(manifest.sourceEnrichment.coreRule, /expert-authored editorial evidence/i);
  assert.match(manifest.sourceEnrichment.complexityRule, /one-point|visual comparison/i);
  assert.match(manifest.sourceEnrichment.redundancyRule, /duplicated totals|zero-gap/i);
  assert.deepEqual(manifest.visualEvidenceContract.rejectedRecipes, ['status.grid', 'headline.metric']);
  assert.match(manifest.sourceEnrichment.attributionRule, /omit source/i);
  assert.match(manifest.sourceEnrichment.attributionRule, /presentation copy/i);
  assert.ok(manifest.excludedWork.some((entry) => entry.includes('renderer/')));
  assert.match(manifest.escalation, /report an infrastructure issue/i);
  assert.deepEqual(manifest.waterfallContract.requiredItemFields, ['role', 'value', 'valueStatus', 'period', 'scope']);
  assert.match(manifest.waterfallContract.reconciliation, /reconcile/i);
  assert.match(manifest.sharedScaleContract.rejectionRule, /split the evidence into separate charts/i);
  assert.match(manifest.valueRepresentationContract.exceptionRule, /normalizationNote/i);

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
  assert.equal(manifest.version, '1.11');
  assert.equal(manifest.role, 'chart-author');
  assert.equal(manifest.resources.sourcePolicy, 'docs/source-enrichment.md');
  assert.equal(manifest.resources.batchPolicy, 'docs/batch-workflow.md');
  assert.equal(manifest.resources.storySelection, 'docs/story-selection.md');
  assert.equal(manifest.batchWorkflow.input, 'input.txt');
  assert.equal(manifest.batchWorkflow.presentation, 'charts/<run-id>/tochnyi-charts-<run-id>.pptx');
  assert.equal(manifest.batchWorkflow.temporaryWorkspace, '.work/<run-id>/');
  assert.equal(manifest.batchWorkflow.finalizeCommand, 'npm run run:finalize -- <run-id>');
  assert.match(manifest.batchWorkflow.retentionRule, /specs\/runs\/<run-id>\/ and charts\/<run-id>\/ are retained locally/i);
  assert.match(manifest.batchWorkflow.retentionRule, /input\.txt is also retained/i);
  assert.match(manifest.batchWorkflow.retentionRule, /ignored by Git/i);
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
