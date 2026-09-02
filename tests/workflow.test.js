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
const {
  createStaticImage,
  publishImage,
  validateImageOutputPath,
  defaultImageOutputPath
} = require('../renderer/image-workflow');
const { resolveImageProfile } = require('../renderer/image-profiles');
const { RUSSIA_GEODATA_URL } = require('../renderer/runtime-dependencies');
const TochnyiMaps = require('../lib/tochnyi-maps');
const {
  STANDARD_STATIC_VIEWPORT,
  REGIONAL_STATIC_VIEWPORT,
  STANDARD_DIAGNOSTIC_VIEWPORTS,
  REGIONAL_DIAGNOSTIC_VIEWPORTS
} = require('../renderer/workflow-contract');

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
  assert.match(orientation.sharedContract.sourceEnrichment.coreRule, /projects\/<project-id>\/input\/.*authoritative source set/i);
  assert.match(orientation.sharedContract.sourceEnrichment.inputRule, /structured datasets.*documented filters/i);
  assert.match(orientation.sharedContract.sourceEnrichment.inputIdentityRule, /exact non-empty projects\/<project-id>\/input\/ source set/i);
  assert.match(orientation.sharedContract.sourceEnrichment.inventoryRule, /inventory the source files/i);
  assert.match(orientation.sharedContract.sourceEnrichment.supplementationRule, /Do not replace, downgrade, or relabel/i);
  assert.match(orientation.sharedContract.sourceEnrichment.supplementationRule, /actual levels that directly express the same input-anchored change/i);
  assert.match(orientation.sharedContract.sourceEnrichment.supplementationRule, /may not create the subject, central claim, or title/i);
  assert.match(orientation.sharedContract.sourceEnrichment.titleFidelityRule, /titleBasis/i);
  assert.match(orientation.sharedContract.sourceEnrichment.subtitleRule, /supplied dataset|source-process metadata|provenance/i);
  assert.match(orientation.sharedContract.sourceEnrichment.contradictionRule, /direct material contradiction/i);
  assert.match(orientation.sharedContract.sourceEnrichment.presentationRule, /uncorroborated/i);
  assert.match(orientation.sharedContract.sharedScaleContract.sentenceTest, /Every mark encodes/);
  assert.match(orientation.sharedContract.valueRepresentationContract.actualLevelRule, /plot those levels/i);
  assert.match(orientation.sharedContract.valueRepresentationContract.syntheticBaselineRule, /0% before-event/i);
  assert.match(orientation.sharedContract.sourceEnrichment.complexityRule, /one-point|visual comparison/i);
  assert.deepEqual(
    orientation.sharedContract.visualEvidenceContract.rejectedRecipes,
    ['status.grid', 'headline.metric', 'comparison.pictogram']
  );
  assert.match(orientation.sharedContract.sourceEnrichment.routingRule, /explanatory.*regional-breakdown/i);
  assert.match(orientation.sharedContract.sourceEnrichment.routingRule, /three or more named administrative regions/i);
  assert.match(orientation.sharedContract.visualEvidenceContract.regionalDensityRule, /three or more distinct named administrative regions/i);
  assert.match(orientation.sharedContract.visualEvidenceContract.normalizedOrientationRule, /derived complement.*not independent/i);
  assert.match(orientation.sharedContract.staticImageContract.primaryArtifactRule, /final PNG.*primary chart artifact/i);
  assert.match(orientation.sharedContract.staticImageContract.visibleEvidenceRule, /Never rely on hover, tooltip, click, animation/i);
  assert.match(orientation.sharedContract.staticImageContract.treatmentRule, /mark families stay stable/i);
  assert.equal(orientation.sharedContract.runtimeDependencies.offlineReady, false);
  assert.equal(
    orientation.sharedContract.runtimeDependencies.dependencies.find((entry) => entry.id === 'amcharts5-core').version,
    '5.20.3'
  );
  assert.ok(orientation.sharedContract.recipeAmbiguityRules.some((entry) =>
    entry.candidates.includes('matrix.heat') && entry.candidates.includes('ranking.horizontal')
  ));
  assert.ok(orientation.sharedContract.recipeAmbiguityRules.some((entry) =>
    entry.candidates.includes('relationship.scatter') && entry.candidates.includes('trend.line')
  ));
  assert.match(orientation.sharedContract.sourceEnrichment.exactCountRule, /dot-counting|third comparable count/i);
  assert.match(orientation.sharedContract.sourceEnrichment.componentRule, /composition\.components|begins at zero/i);
  assert.equal(orientation.batchWorkflow.projectFolder, 'projects/<project-id>/');
  assert.equal(orientation.batchWorkflow.input, 'projects/<project-id>/input/');
  assert.match(orientation.batchWorkflow.inputAuthority, /user-supplied source materials/i);
  assert.match(orientation.batchWorkflow.inputAuthority, /authoritative for the assignment/i);
  assert.equal(orientation.batchWorkflow.deliveryFolder, 'projects/<project-id>/output/');
  assert.equal(orientation.batchWorkflow.specificationFolder, 'projects/<project-id>/specs/');
  assert.equal(orientation.batchWorkflow.presentation, 'projects/<project-id>/output/tochnyi-charts-<project-id>.pptx');
  assert.equal(orientation.batchWorkflow.sourceLedger, 'projects/<project-id>/source-ledger.json');
  assert.equal(orientation.batchWorkflow.temporaryWorkspace, 'projects/<project-id>/work/');
  assert.equal(orientation.batchWorkflow.sourceVerificationCommand, 'npm run run:verify-source -- <project-id>');
  assert.equal(orientation.batchWorkflow.sourceAndSpecVerificationCommand, 'npm run run:verify-source -- <project-id> --specs');
  assert.equal(orientation.batchWorkflow.chartBuildCommand, 'npm run run:charts -- <project-id>');
  assert.match(orientation.batchWorkflow.boundary, /orchestration layer still owns source interpretation/i);
  assert.deepEqual(
    orientation.decision.map((entry) => entry.workflow),
    ['regional-breakdown', 'standard-chart']
  );
  assert.equal(orientation.regional.workflow, 'regional-breakdown');
  assert.match(orientation.regional.guideCommand, /regional-guide russia/);
  assert.equal(orientation.standard.workflow, 'standard-chart');
  assert.match(orientation.standard.renderCommand, /render <spec\.json>/);
  assert.match(orientation.standard.imageCommand, /image <spec\.json>/);
  assert.match(orientation.regional.imageCommand, /image <spec\.json>/);

  const standard = standardAgentGuide();
  assert.equal(standard.workflow, 'standard-chart');
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'map.regional'), false);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'story.facets'), false);
  assert.ok(standard.authoringRules.some((rule) => /Never use status, card, bullet, or facet grids/.test(rule)));
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'status.grid'), false);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'headline.metric'), false);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'comparison.dumbbell'), true);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'comparison.area-squares'), true);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'relationship.scatter'), true);
  assert.equal(standard.selectionRules.some((entry) => entry.use === 'relationship.converging-signals'), true);
  assert.ok(standard.ambiguityRules.some((entry) =>
    entry.candidates.includes('composition.components') && entry.candidates.includes('flow.waterfall')
  ));
  assert.match(standard.visualEvidenceContract.minimumMarks, /at least three independent quantitative observations/i);
  assert.match(standard.visualEvidenceContract.standalonePairRule, /requires at least three independent values/i);
  assert.match(standard.visualEvidenceContract.redundancyRule, /complement|remainder|zero-gap/i);
  assert.match(standard.visualEvidenceContract.rankingColorRule, /hue-separated|brand palette.*shade-family/i);
  assert.match(standard.visualEvidenceContract.compositionRule, /policy|target|alternative/i);
  assert.match(standard.visualEvidenceContract.compositionRule, /shared-total benchmark geometry/i);
  assert.match(standard.sourceEnrichment.benchmarkGapRule, /prefer one comparison\.benchmark-gap row|two positive level values/i);
  assert.match(standard.sourceEnrichment.relationshipRule, /independent local quantitative signal/i);
  assert.match(standard.sourceEnrichment.relationshipRule, /mechanism evidence.*outcome.*driver/i);
  assert.match(standard.sourceEnrichment.relationshipRule, /continue with a short same-color connector|no decorative hub/i);
  assert.match(standard.visualEvidenceContract.claimGeometryRule, /exact marks.*prove|geometry.*fails/i);
  assert.match(standard.visualEvidenceContract.orientationQuestionRule, /Compared with what|primary geometry/i);
  assert.match(standard.visualEvidenceContract.chartWorthinessRule, /quantitative relationship|proxy scores/i);
  assert.match(standard.visualEvidenceContract.referenceClarityRule, /meaningful viewer-facing label|remove the line/i);
  assert.match(standard.visualEvidenceContract.notationConsistencyRule, /do not mix pp.*percent-rate.*labels/i);
  assert.match(standard.visualEvidenceContract.supportingFactsRule, /regional or peer observations/i);
  assert.match(standard.staticImageContract.directLabelRule, /direct labels and visible orientation/i);
  assert.match(standard.staticImageContract.interactionRule, /Interactivity never rescues.*PNG/i);
  assert.match(standard.staticImageContract.profileRule, /publishing intent.*landscape.*square.*portrait/i);
  assert.equal(standard.runtimeDependencies.offlineReady, false);
  assert.match(standard.commands.image, /--profile auto\|landscape\|square\|portrait/);
  assert.match(standard.sourceEnrichment.normalizedOrientationRule, /same-unit peer|regional observation/i);
  assert.ok(standard.authoringRules.some((rule) => /source-family sweep/i));
  assert.match(standard.sourceEnrichment.standalonePairRule, /merge,? or omit/i);
  assert.match(standard.valueRepresentationContract.hierarchy, /actual levels/i);
  assert.equal(standard.regionalHandoff.use, 'map.regional');
  assert.deepEqual(standard.sharedScaleContract.requiredFields, ['measure.quantity', 'data[].quantity', 'data[].scope', 'data[].period']);
  assert.deepEqual(standard.waterfallContract.requiredItemFields, ['role', 'value', 'valueStatus', 'period', 'scope']);
  assert.match(standard.waterfallContract.valueStatus, /reported/);

  const regional = regionalAgentGuide('russia');
  assert.equal(regional.workflow, 'regional-breakdown');
  assert.deepEqual(regional.requiredDataItem, ['label', 'regionId or regionIds']);
  assert.ok(regional.automaticByDefault.includes('straight region-to-card leader routing'));
  assert.ok(regional.neverAuthor.includes('coordinates or pixel positions'));
  assert.deepEqual(regional.regionSet.nonContinentalRegionIds, ['RU-KGD', 'RU-SAK']);
  assert.match(regional.authoringRule, /permanently omit Kaliningrad/i);
  assert.match(regional.commands.image, /image <spec\.json>/);
});

test('fixed image profile failure preserves the prior PNG and gives model-safe guidance', () => {
  const tempDir = tempDirectory('tochnyi-static-profile-failure-');
  const outputPath = path.join(tempDir, 'chart.png');
  try {
    fs.writeFileSync(outputPath, 'previous-valid-image', 'utf8');
    assert.throws(() => createStaticImage(example('ai95-price-spike.json'), outputPath, {
      projectRoot: root,
      profile: 'square',
      dependencies: {
        renderStandard(specPath, htmlPath) {
          fs.writeFileSync(htmlPath, '<!DOCTYPE html><div>fixture</div>', 'utf8');
          return { workflow: 'standard-chart', recipe: 'comparison.benchmark-gap', warnings: [] };
        },
        capture() {
          throw new Error('PNG capture refused because content still exceeds the canvas by 0px horizontally and 80px vertically.');
        }
      }
    }), /profile "square" \(1080×1080\).*Use the auto profile.*do not add pixel geometry/is);
    assert.equal(fs.readFileSync(outputPath, 'utf8'), 'previous-valid-image');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('default image output stays in project output and rejects unsafe or unscoped paths', () => {
  assert.equal(defaultImageOutputPath(root, {
    title: 'Safe title',
    metadata: { slug: 'safe-title' }
  }, { projectId: 'image-path-safety' }), path.join(root, 'projects', 'image-path-safety', 'output', 'safe-title.png'));
  assert.throws(() => defaultImageOutputPath(root, {
    title: 'Safe title',
    metadata: { slug: '../escape' }
  }, { projectId: 'image-path-safety' }), /Artifact slug/);
  assert.throws(() => defaultImageOutputPath(root, {
    title: 'Safe title',
    metadata: { slug: 'safe-title' }
  }), /explicit output path or --project-id/i);
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
  assert.equal(manifest.batchWorkflow.projectFolder, 'projects/<project-id>/');
  assert.equal(manifest.batchWorkflow.input, 'projects/<project-id>/input/');
  assert.match(manifest.batchWorkflow.inputAuthority, /user-supplied source materials/i);
  assert.equal(manifest.batchWorkflow.deliveryFolder, 'projects/<project-id>/output/');
  assert.equal(manifest.batchWorkflow.specificationFolder, 'projects/<project-id>/specs/');
  assert.ok(manifest.batchWorkflow.steps.some((step) => step.includes('PowerPoint')));
  assert.ok(manifest.allowedWork.some((entry) => entry.includes('PowerPoint')));
  assert.deepEqual(
    manifest.sourceEnrichment.evidenceRoles,
    ['magnitude', 'comparison', 'mechanism', 'consequence']
  );
  assert.match(manifest.sourceEnrichment.coreRule, /projects\/<project-id>\/input\/.*authoritative source set/i);
  assert.match(manifest.sourceEnrichment.complexityRule, /one-point|visual comparison/i);
  assert.match(manifest.sourceEnrichment.redundancyRule, /duplicated totals|zero-gap/i);
  assert.deepEqual(manifest.visualEvidenceContract.rejectedRecipes, ['status.grid', 'headline.metric', 'comparison.pictogram']);
  assert.match(manifest.sourceEnrichment.attributionRule, /presentation copy/i);
  assert.match(manifest.sourceEnrichment.attributionRule, /source.*analysis.*separate/i);
  assert.match(manifest.sourceEnrichment.attributionRule, /article\/page title|publisher sigil/i);
  assert.ok(manifest.excludedWork.some((entry) => entry.includes('renderer/')));
  assert.match(manifest.escalation, /report an infrastructure issue/i);
  assert.deepEqual(manifest.waterfallContract.requiredItemFields, ['role', 'value', 'valueStatus', 'period', 'scope']);
  assert.match(manifest.waterfallContract.reconciliation, /reconcile/i);
  assert.match(manifest.sharedScaleContract.rejectionRule, /split the evidence into separate charts/i);
  assert.match(manifest.valueRepresentationContract.exceptionRule, /normalizationNote/i);
  assert.equal(manifest.commands.image.includes('image <spec.json>'), true);
  assert.deepEqual(manifest.imageProfiles.map((profile) => profile.id), ['auto', 'landscape', 'square', 'portrait']);
  assert.deepEqual(manifest.imageProfiles[0].regionalViewport, { width: 1450, height: 679 });

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
  assert.equal(manifest.version, '1.23');
  assert.ok(manifest.recipeAmbiguityRules.length >= 6);
  assert.equal(manifest.runtimeDependencies.offlineReady, false);
  assert.equal(TochnyiMaps.getRegionSet('russia').geodataScript, RUSSIA_GEODATA_URL);
  assert.match(manifest.staticImageContract.visibleEvidenceRule, /tooltip|panning/i);
  assert.equal(manifest.role, 'chart-author');
  assert.equal(manifest.resources.sourcePolicy, 'docs/source-enrichment.md');
  assert.equal(manifest.resources.batchPolicy, 'docs/batch-workflow.md');
  assert.equal(manifest.resources.storySelection, 'docs/story-selection.md');
  assert.equal(manifest.batchWorkflow.projectFolder, 'projects/<project-id>/');
  assert.equal(manifest.batchWorkflow.input, 'projects/<project-id>/input/');
  assert.equal(manifest.batchWorkflow.presentation, 'projects/<project-id>/output/tochnyi-charts-<project-id>.pptx');
  assert.equal(manifest.batchWorkflow.temporaryWorkspace, 'projects/<project-id>/work/');
  assert.equal(manifest.batchWorkflow.finalizeCommand, 'npm run run:finalize -- <project-id>');
  assert.match(manifest.batchWorkflow.retentionRule, /complete durable project stays in projects\/<project-id>/i);
  assert.match(manifest.batchWorkflow.retentionRule, /Only work\/ is transient/i);
  assert.match(manifest.batchWorkflow.retentionRule, /ignored by Git/i);
  assert.match(manifest.firstCommand, /tool-api\/chart\.js orient/);
  assert.equal(manifest.imageProfiles.find((profile) => profile.id === 'square').width, 1080);
});

test('static image profiles are semantic publishing choices with engine-owned dimensions', () => {
  assert.deepEqual(resolveImageProfile('auto', 'ranking.horizontal').viewport, STANDARD_STATIC_VIEWPORT);
  assert.deepEqual(resolveImageProfile('auto', 'map.regional').viewport, REGIONAL_STATIC_VIEWPORT);
  assert.deepEqual(resolveImageProfile('square', 'trend.line').viewport, { width: 1080, height: 1080 });
  assert.equal(resolveImageProfile('portrait', 'trend.line').adaptive, false);
  assert.equal(STANDARD_DIAGNOSTIC_VIEWPORTS[0], STANDARD_STATIC_VIEWPORT);
  assert.equal(REGIONAL_DIAGNOSTIC_VIEWPORTS[0], REGIONAL_STATIC_VIEWPORT);
  assert.throws(() => resolveImageProfile('poster', 'trend.line'), /Unknown image profile/);
});

test('static image workflow routes a standard spec, captures a strict profile, and retains no HTML artifact', () => {
  const tempDir = tempDirectory('tochnyi-static-image-');
  const outputPath = path.join(tempDir, 'chart.png');
  let capturedOptions = null;
  try {
    const result = createStaticImage(example('ai95-price-spike.json'), outputPath, {
      projectRoot: root,
      profile: 'square',
      dependencies: {
        renderStandard(specPath, htmlPath) {
          fs.writeFileSync(htmlPath, '<!DOCTYPE html><div>fixture</div>', 'utf8');
          return { workflow: 'standard-chart', recipe: 'comparison.benchmark-gap', warnings: [] };
        },
        renderRegional() {
          throw new Error('standard image must not route through regional rendering');
        },
        capture(htmlPath, pngPath, options) {
          capturedOptions = options;
          fs.writeFileSync(pngPath, 'png-fixture', 'utf8');
          return {
            bytes: 11,
            dimensions: { width: 1080, height: 1080 },
            diagnostics: { status: 'pass', summary: { errors: 0, warnings: 0, labelsChecked: 8, marksChecked: 4 } },
            chartAttributes: {},
            canvasAttributes: {}
          };
        },
        publish: publishImage
      }
    });
    assert.equal(result.workflow, 'standard-chart');
    assert.equal(result.profile.id, 'square');
    assert.equal(result.profile.adaptive, false);
    assert.equal(result.profile.fitMode, 'natural');
    assert.equal(result.profile.stageDelta, 0);
    assert.equal(result.profile.expanded, false);
    assert.equal(result.htmlRetained, false);
    assert.equal(result.diagnostics.status, 'pass');
    assert.deepEqual(capturedOptions.viewport, { width: 1080, height: 1080 });
    assert.equal(capturedOptions.autoFit, true);
    assert.equal(capturedOptions.fillViewport, undefined);
    assert.equal(capturedOptions.adaptiveCanvas, false);
    assert.equal(fs.readFileSync(outputPath, 'utf8'), 'png-fixture');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('static image workflow auto-routes regional specs and validates final leader geometry', () => {
  const tempDir = tempDirectory('tochnyi-static-regional-image-');
  const outputPath = path.join(tempDir, 'map.png');
  try {
    const result = createStaticImage(example('russia-regional-map.json'), outputPath, {
      projectRoot: root,
      profile: 'auto',
      dependencies: {
        renderStandard() {
          throw new Error('regional image must not route through standard rendering');
        },
        renderRegional(specPath, htmlPath) {
          fs.writeFileSync(htmlPath, '<!DOCTYPE html><div>map fixture</div>', 'utf8');
          return { workflow: 'regional-breakdown', recipe: 'map.regional', warnings: [] };
        },
        capture(htmlPath, pngPath, options) {
          fs.writeFileSync(pngPath, 'map-png-fixture', 'utf8');
          return {
            bytes: 15,
            dimensions: { ...options.viewport },
            diagnostics: { status: 'pass', summary: { errors: 0, warnings: 0 } },
            chartAttributes: {
              'data-map-workflow': 'regional-breakdown',
              'data-map-leader-rendered-crossings': '0',
              'data-map-port-direction-reversal-routes': '0',
              'data-map-port-control-reversal-routes': '0',
              'data-map-port-terminal-box-turn-routes': '0'
            }
          };
        },
        publish: publishImage
      }
    });
    assert.equal(result.workflow, 'regional-breakdown');
    assert.equal(result.profile.id, 'auto');
    assert.deepEqual(result.profile.requestedViewport, { width: 1450, height: 679 });
    assert.equal(result.regionalDiagnostics.renderedCrossings, 0);
    assert.equal(fs.existsSync(outputPath), true);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('static image publication requires PNG output and replaces only after a valid staged artifact exists', () => {
  const tempDir = tempDirectory('tochnyi-static-publish-');
  const staged = path.join(tempDir, 'staged.png');
  const target = path.join(tempDir, 'final.png');
  try {
    fs.writeFileSync(staged, 'new-image', 'utf8');
    fs.writeFileSync(target, 'previous-image', 'utf8');
    publishImage(staged, target);
    assert.equal(fs.readFileSync(target, 'utf8'), 'new-image');
    assert.throws(() => validateImageOutputPath(path.join(tempDir, 'chart.jpg')), /must use a \.png filename/);
    assert.equal(fs.readdirSync(tempDir).some((name) => /\.building-|\.previous-/.test(name)), false);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('catalog gives an LLM recipe definitions plus compact static-image decision support', () => {
  const cliPath = path.join(root, 'tool-api', 'chart.js');
  const result = spawnSync(process.execPath, [cliPath, 'catalog'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const catalog = JSON.parse(result.stdout);
  assert.ok(Array.isArray(catalog.recipes) && catalog.recipes.length > 0);
  assert.deepEqual(catalog.imageProfiles.map((profile) => profile.id), ['auto', 'landscape', 'square', 'portrait']);
  assert.equal(catalog.runtimeDependencies.offlineReady, false);
  assert.equal(catalog.decision.primaryKey, 'quantitative relationship and data shape');
  assert.ok(Array.isArray(catalog.decision.selectionRules));
  assert.ok(catalog.decision.selectionRules.some((entry) => entry.use === 'ranking.horizontal'));
  assert.ok(Array.isArray(catalog.decision.ambiguityRules));
  assert.ok(catalog.decision.ambiguityRules.some((entry) =>
    entry.candidates.includes('trend.line') && entry.candidates.includes('timeline.duration')
  ));
  assert.ok(catalog.decision.selectionRules.some((entry) => entry.use === 'relationship.scatter'));
  const standardRecipeIds = catalog.recipes
    .map((recipe) => recipe.id)
    .filter((id) => id !== 'map.regional')
    .sort();
  const guidedRecipeIds = [...new Set(catalog.decision.selectionRules.map((entry) => entry.use))].sort();
  assert.deepEqual(guidedRecipeIds, standardRecipeIds, 'every production standard recipe must be reachable from the machine-readable selection guide');
  const knownRecipeIds = new Set(catalog.recipes.map((recipe) => recipe.id));
  catalog.decision.ambiguityRules.forEach((entry) => {
    assert.ok(entry.candidates.length >= 2);
    entry.candidates.forEach((candidate) => assert.equal(knownRecipeIds.has(candidate), true, `unknown ambiguity candidate ${candidate}`));
  });
  assert.match(catalog.decision.staticImagePriorities.visibleEvidence, /static image|tooltip|panning/i);
  assert.match(catalog.decision.staticImagePriorities.directLabels, /direct labels/i);
  assert.match(catalog.decision.staticImagePriorities.density, /preserve the selected recipe and all primary evidence/i);
});

test('workflow validation reports the correct route for each recipe family', () => {
  const standard = validateStandardSpec(example('ai95-price-spike.json'));
  assert.equal(standard.validation.normalized.recipe, 'comparison.benchmark-gap');
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
    assert.equal(standard.recipe, 'comparison.benchmark-gap');
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
