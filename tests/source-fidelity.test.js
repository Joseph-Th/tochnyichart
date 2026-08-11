'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { initializeRunWorkspace } = require('../renderer/run-workspace');
const { validateSourceLedger } = require('../renderer/source-fidelity');

function project() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-source-fidelity-'));
  fs.writeFileSync(path.join(root, 'input.txt'), [
    'Ozon insurance prices rose 230%, while shares initially fell 8.5%.',
    'Online seller liquidations rose 19.6%, registrations fell 25%, and the seller population fell 4.9%.'
  ].join('\n'));
  return root;
}

function validLedger(workspace) {
  const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
  ledger.inventoryComplete = true;
  ledger.candidates = [
    {
      id: 'ozon-insurance',
      claim: 'Ozon insurance prices rose sharply.',
      decision: 'selected',
      outputSlug: 'ozon-insurance-price-increase',
      title: 'Ozon insurance prices rose 230%',
      titleBasis: 'Ozon insurance prices rose 230%, while shares initially fell 8.5%.',
      representationAudit: {
        selectedMode: 'relative-change',
        levelAvailability: 'unavailable',
        rationale: 'The fixture contains only the reported percentage increase.',
        tangibleTarget: 'Company-specific insurance premium amounts before and after the reported increase.',
        researchAttempts: [
          {
            source: 'Company filing',
            sourceType: 'company-filing',
            locator: 'Fixture annual filing, insurance-cost disclosures',
            outcome: 'The fixture filing contains the percentage but no before-and-after premium amounts.'
          },
          {
            source: 'Insurance market dataset',
            sourceType: 'industry-dataset',
            locator: 'Fixture insurer dataset, company premium table',
            outcome: 'The fixture dataset does not publish company-specific premium levels.'
          }
        ]
      },
      visualEvidenceAudit: {
        rationale: 'The fixture exposes one same-scale insurance change observation for this selected claim.',
        comparableObservations: [
          {
            label: 'Insurance price increase',
            quantity: 'insurance price change',
            unit: 'percent',
            period: 'reported period',
            value: 230
          }
        ]
      },
      routingAudit: {
        geographyRole: 'none',
        workflow: 'standard-chart',
        rationale: 'The selected claim is company-specific and contains no geographic evidence.'
      },
      anchors: ['Ozon insurance prices rose 230%, while shares initially fell 8.5%.'],
      evidence: [
        {
          statement: 'Insurance prices rose 230%.',
          origin: 'input',
          role: 'primary',
          anchor: 'Ozon insurance prices rose 230%, while shares initially fell 8.5%.'
        },
        {
          statement: 'A prior-year insurance price provides context.',
          origin: 'external',
          role: 'comparison',
          source: 'Company filing'
        }
      ]
    },
    {
      id: 'seller-population',
      claim: 'The online seller population contracted.',
      decision: 'omitted',
      reason: 'Reserved for a separate deck.',
      anchors: ['Online seller liquidations rose 19.6%, registrations fell 25%, and the seller population fell 4.9%.'],
      evidence: [
        {
          statement: 'Seller population fell 4.9%.',
          origin: 'input',
          role: 'primary',
          anchor: 'Online seller liquidations rose 19.6%, registrations fell 25%, and the seller population fell 4.9%.'
        }
      ]
    }
  ];
  fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
}

test('source fidelity accepts a complete anchored inventory and exact spec coverage', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-1');
    validLedger(workspace);
    fs.writeFileSync(path.join(workspace.specificationRoot, 'ozon-insurance-price-increase.json'), JSON.stringify({
      title: 'Ozon insurance prices rose 230%',
      measure: { valueMode: 'relative-change', levelAvailability: 'unavailable' }
    }));
    const result = validateSourceLedger(root, 'issue-1', { requireSpecs: true });
    assert.equal(result.valid, true);
    assert.equal(result.candidates, 2);
    assert.equal(result.selected, 1);
    assert.equal(result.omitted, 1);
    assert.equal(result.specificationsChecked, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('directional relationship mechanism evidence must explicitly link a driver to the plotted outcome', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-relationship-linkage-'));
  const anchor = 'Twenty logistics sites were hit, 1.18 million square metres were damaged, and the company later sought partner warehouses of at least 200 square metres.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'issue-relationship-linkage');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'warehouse-response',
      claim: 'The company sought partner warehouses of at least 200 square metres.',
      decision: 'selected',
      outputSlug: 'warehouse-response',
      title: 'The company sought 200 m²+ partner warehouses',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'level', levelAvailability: 'reported',
        rationale: 'All three quantities are reported directly.'
      },
      visualEvidenceAudit: {
        rationale: 'The draft attempts to connect disruption magnitudes to a later warehouse threshold.',
        comparableObservations: [
          { label: 'Sites hit', quantity: 'logistics sites hit', unit: 'sites', period: 'disruption period', value: 20 },
          { label: 'Area damaged', quantity: 'warehouse area damaged', unit: 'million square metres', period: 'disruption period', value: 1.18 },
          { label: 'Partner-space minimum', quantity: 'minimum partner warehouse area', unit: 'square metres', period: 'later search', value: 200 }
        ]
      },
      routingAudit: {
        geographyRole: 'none', workflow: 'standard-chart',
        rationale: 'The story is operational, not geographic.'
      },
      anchors: [anchor],
      evidence: [
        { statement: anchor, origin: 'input', role: 'primary', anchor },
        { statement: 'Twenty sites were hit and 1.18 million square metres of warehouse area were damaged.', origin: 'external', role: 'mechanism', source: 'Fixture source' }
      ]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    fs.writeFileSync(path.join(workspace.specificationRoot, 'warehouse-response.json'), JSON.stringify({
      title: 'The company sought 200 m²+ partner warehouses',
      recipe: 'relationship.converging-signals',
      relationship: { mode: 'directional', operator: 'combine', formula: 'Site losses plus damaged area led to the partner-space threshold' },
      data: [
        { label: 'Sites hit', relationshipRole: 'driver', value: 20, displayValue: '20 sites' },
        { label: 'Area damaged', relationshipRole: 'driver', value: 1.18, displayValue: '1.18 million m²' },
        { label: 'Partner-space minimum', relationshipRole: 'outcome', value: 200, displayValue: '200 m²' }
      ],
      measure: { valueMode: 'level', levelAvailability: 'reported' }
    }));
    assert.throws(
      () => validateSourceLedger(root, 'issue-relationship-linkage', { requireSpecs: true }),
      /does not explicitly link the plotted outcome to at least one plotted driver|causal connector geometry/i
    );

    ledger.candidates[0].evidence[1].statement = 'After 20 sites were hit, the company said the disruption drove its search for partner warehouses of at least 200 square metres.';
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(validateSourceLedger(root, 'issue-relationship-linkage', { requireSpecs: true }).valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity blocks selected stories with a material external contradiction', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-material-conflict');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].evidence.push({
      statement: 'A reputable external report directly contradicts the input-supported claim.',
      origin: 'external',
      role: 'comparison',
      source: 'Independent regulatory filing',
      conflictStatus: 'material'
    });
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-material-conflict'),
      /material contradiction.*cannot be selected or visualized|editorial resolution/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity requires forecast stories to promote input-reported actual rates into references', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-forecast-anchor-'));
  const anchor = 'The 2026 inflation forecast was raised from 4.5–5.5% to 6–7%; actual inflation so far is 4.84%.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'forecast-anchor');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'inflation-forecast',
      claim: 'The 2026 inflation forecast was raised.',
      decision: 'selected',
      outputSlug: 'inflation-forecast',
      title: 'The 2026 inflation forecast was raised to 6–7%',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'rate',
        levelAvailability: 'not-applicable',
        basisAvailability: 'not-applicable',
        basisRationale: 'Inflation is a native price-index rate rather than a single numerator/denominator ratio.',
        rationale: 'The source reports forecast and actual inflation rates directly.'
      },
      visualEvidenceAudit: {
        rationale: 'The forecast revision is expressed as two comparable rate ranges.',
        comparableObservations: [
          { label: 'Previous forecast', quantity: 'annual inflation rate', unit: 'percent', period: '2026', low: 4.5, high: 5.5 },
          { label: 'Revised forecast', quantity: 'annual inflation rate', unit: 'percent', period: '2026', low: 6, high: 7 }
        ]
      },
      routingAudit: {
        geographyRole: 'none', workflow: 'standard-chart',
        rationale: 'The story is a national forecast comparison with no spatial finding.'
      },
      anchors: [anchor],
      evidence: [{ statement: anchor, origin: 'input', role: 'primary', anchor }]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    const specPath = path.join(workspace.specificationRoot, 'inflation-forecast.json');
    const baseSpec = {
      title: 'The 2026 inflation forecast was raised to 6–7%',
      measure: { valueMode: 'rate', levelAvailability: 'not-applicable', basisAvailability: 'not-applicable' }
    };
    fs.writeFileSync(specPath, JSON.stringify(baseSpec));
    assert.throws(
      () => validateSourceLedger(root, 'forecast-anchor', { requireSpecs: true }),
      /realized\/current rate outside primary geometry/i
    );

    baseSpec.references = [{ value: 4.84, label: 'Actual inflation so far' }];
    fs.writeFileSync(specPath, JSON.stringify(baseSpec));
    assert.equal(validateSourceLedger(root, 'forecast-anchor', { requireSpecs: true }).valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity forces spatial multi-region findings through regional-breakdown', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-routing-audit-'));
  const anchor = 'Restrictions spread across border Russia: Belgorod logged 12 hours, Kursk 20 hours, and Bryansk 30 hours.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'issue-routing-audit');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'border-restrictions',
      claim: 'Restrictions spread across border Russia.',
      decision: 'selected',
      outputSlug: 'border-restrictions',
      title: 'Restrictions spread across border Russia',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'level',
        levelAvailability: 'reported',
        rationale: 'The source reports comparable restriction durations by region.'
      },
      visualEvidenceAudit: {
        rationale: 'Three border regions have same-period restriction durations on one scale.',
        comparableObservations: [
          { label: 'Belgorod', quantity: 'restriction duration', unit: 'hours', period: 'August 2026', value: 12 },
          { label: 'Kursk', quantity: 'restriction duration', unit: 'hours', period: 'August 2026', value: 20 },
          { label: 'Bryansk', quantity: 'restriction duration', unit: 'hours', period: 'August 2026', value: 30 }
        ]
      },
      routingAudit: {
        geographyRole: 'categorical',
        workflow: 'standard-chart',
        rationale: 'The regions were initially treated as ranking labels.'
      },
      anchors: [anchor],
      evidence: [{ statement: anchor, origin: 'input', role: 'primary', anchor }]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-routing-audit'),
      /geography as explanatory|spatial finding|regional-breakdown/i
    );

    ledger.candidates[0].routingAudit = {
      geographyRole: 'explanatory',
      workflow: 'regional-breakdown',
      regionSet: 'russia',
      rationale: 'The headline is explicitly about a border-region spatial pattern.'
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(validateSourceLedger(root, 'issue-routing-audit').valid, true);

    const regionalLabels = [
      'Belgorod', 'Kursk', 'Bryansk', 'Tambov', 'Ryazan', 'Krasnodar', 'Dagestan',
      'Kemerovo', 'Krasnoyarsk', 'Zabaykalsky', 'Omsk', 'Volgograd', 'Astrakhan'
    ];
    ledger.candidates[0].visualEvidenceAudit.comparableObservations = regionalLabels.map((label, index) => ({
      label,
      quantity: 'restriction duration',
      unit: 'hours',
      period: 'August 2026',
      value: index + 1
    }));
    ledger.candidates[0].visualEvidenceAudit.rationale = 'The regional workflow retains the complete same-scale geographic evidence inventory.';
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(
      validateSourceLedger(root, 'issue-routing-audit').valid,
      true,
      'regional source audits may inventory more than 12 observations when the region set supports them'
    );

    ledger.candidates[0].visualEvidenceAudit = {
      rationale: 'Three border regions have same-period restriction durations on one scale.',
      comparableObservations: [
        { label: 'Belgorod', quantity: 'restriction duration', unit: 'hours', period: 'August 2026', value: 12 },
        { label: 'Kursk', quantity: 'restriction duration', unit: 'hours', period: 'August 2026', value: 20 },
        { label: 'Bryansk', quantity: 'restriction duration', unit: 'hours', period: 'August 2026', value: 30 }
      ]
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

    fs.writeFileSync(path.join(workspace.specificationRoot, 'border-restrictions.json'), JSON.stringify({
      title: 'Restrictions spread across border Russia',
      recipe: 'ranking.horizontal',
      data: [
        { label: 'Belgorod', value: 12 },
        { label: 'Kursk', value: 20 },
        { label: 'Bryansk', value: 30 }
      ],
      measure: { valueMode: 'level', levelAvailability: 'reported' }
    }));
    assert.throws(
      () => validateSourceLedger(root, 'issue-routing-audit', { requireSpecs: true }),
      /must use map\.regional|cannot bypass an explanatory geography decision/i
    );

    fs.writeFileSync(path.join(workspace.specificationRoot, 'border-restrictions.json'), JSON.stringify({
      title: 'Restrictions spread across border Russia',
      recipe: 'map.regional',
      map: { regionSet: 'russia' },
      data: [
        { label: 'Belgorod', regionId: 'RU-BEL', value: 12 },
        { label: 'Kursk', regionId: 'RU-KRS', value: 20 },
        { label: 'Bryansk', regionId: 'RU-BRY', value: 30 }
      ],
      measure: { valueMode: 'level', levelAvailability: 'reported' }
    }));
    assert.equal(validateSourceLedger(root, 'issue-routing-audit', { requireSpecs: true }).valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity treats dense administrative-region evidence as a regional distribution without relying on cue words', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-regional-density-'));
  const anchor = 'Mobile sessions without restrictions were 12% in Bryansk, Kursk and Belgorod, 49% in Moscow and Moscow Oblast, and 58.9% in Leningrad Oblast.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'regional-density');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'mobile-access-readings',
      claim: 'Mobile access readings varied materially.',
      decision: 'selected',
      outputSlug: 'mobile-access-readings',
      title: 'Mobile access readings varied materially',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'rate',
        levelAvailability: 'not-applicable',
        basisAvailability: 'not-applicable',
        basisRationale: 'The fixture treats the published session-access reading as a native monitoring rate.',
        rationale: 'The source reports comparable session-access rates directly.'
      },
      visualEvidenceAudit: {
        rationale: 'The source reports comparable readings for several administrative geographies.',
        comparableObservations: [
          { label: 'Bryansk, Kursk and Belgorod', quantity: 'mobile sessions without restrictions', unit: 'percent', period: 'July 2026', value: 12 },
          { label: 'Moscow and Moscow Oblast', quantity: 'mobile sessions without restrictions', unit: 'percent', period: 'July 2026', value: 49 },
          { label: 'Leningrad Oblast', quantity: 'mobile sessions without restrictions', unit: 'percent', period: 'July 2026', value: 58.9 }
        ]
      },
      routingAudit: {
        geographyRole: 'categorical',
        workflow: 'standard-chart',
        rationale: 'The draft treated the locations as ordinary ranking labels.'
      },
      anchors: [anchor],
      evidence: [{ statement: anchor, origin: 'input', role: 'primary', anchor }]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'regional-density'),
      /three or more administrative regions|regional distribution|regional-breakdown/i
    );

    ledger.candidates[0].routingAudit = {
      geographyRole: 'explanatory',
      workflow: 'regional-breakdown',
      regionSet: 'russia',
      rationale: 'Several administrative regions define the comparable evidence, so location is part of the finding.'
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(validateSourceLedger(root, 'regional-density').valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects a lone normalized rate or share plus its derived complement as a standalone chart', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-thin-share-'));
  const anchor = 'Whitelisted access accounted for 90% of mobile connections.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'thin-share');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'whitelist-share',
      claim: 'Whitelisted access accounted for 90% of mobile connections.',
      decision: 'selected',
      outputSlug: 'whitelist-share',
      title: 'Whitelisted access accounted for 90% of mobile connections',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'share',
        levelAvailability: 'unavailable',
        basisAvailability: 'unavailable',
        basisRationale: 'The fixture source does not publish the connection-count denominator.',
        tangibleTarget: 'Total mobile connections and whitelisted connections for the reported cohort.',
        rationale: 'Only the normalized share is available after the required data checks.',
        researchAttempts: [
          {
            source: 'Fixture article',
            sourceType: 'supplied-source',
            locator: 'https://example.test/fixture-mobile-access',
            outcome: 'The article reports the 90% share but not the underlying connection counts.'
          },
          {
            source: 'Fixture network dataset',
            sourceType: 'industry-dataset',
            locator: 'Fixture mobile-access dataset, reported-cohort connection table',
            outcome: 'The public table reports normalized shares but not cohort connection counts.'
          }
        ]
      },
      visualEvidenceAudit: {
        rationale: 'The initial draft contains only one independent normalized observation.',
        comparableObservations: [
          { label: 'Whitelisted access', quantity: 'share of mobile connections using whitelisted access', unit: 'percent', period: 'reported period', value: 90 }
        ]
      },
      routingAudit: {
        geographyRole: 'none',
        workflow: 'standard-chart',
        rationale: 'The fixture has no administrative geography.'
      },
      anchors: [anchor],
      evidence: [{ statement: anchor, origin: 'input', role: 'primary', anchor }]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'thin-share'),
      /only one independent share observation|derived complement|same-unit peer/i
    );

    ledger.candidates[0].visualEvidenceAudit.comparableObservations.push({
      label: 'Peer network',
      quantity: 'share of mobile connections using whitelisted access',
      unit: 'percent',
      period: 'reported period',
      value: 65
    });
    ledger.candidates[0].evidence.push({
      statement: 'A comparable peer network reported 65% of connections using whitelisted access.',
      origin: 'external',
      role: 'comparison',
      source: 'Fixture network dataset'
    });
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(validateSourceLedger(root, 'thin-share').valid, true);

    const specPath = path.join(workspace.specificationRoot, 'whitelist-share.json');
    fs.writeFileSync(specPath, JSON.stringify({
      title: 'Whitelisted access accounted for 90% of mobile connections',
      recipe: 'composition.stacked',
      data: [
        { label: 'Whitelisted access', value: 90 },
        { label: 'Derived remainder', value: 10 }
      ],
      measure: { valueMode: 'share', levelAvailability: 'unavailable', basisAvailability: 'unavailable' }
    }));
    assert.throws(
      () => validateSourceLedger(root, 'thin-share', { requireSpecs: true }),
      /collapses a richer same-scale dataset|Missing plotted labels: Peer network/i
    );

    fs.writeFileSync(specPath, JSON.stringify({
      title: 'Whitelisted access accounted for 90% of mobile connections',
      recipe: 'comparison.change',
      data: [
        { label: 'Whitelisted access', value: 90 },
        { label: 'Peer network', value: 65 }
      ],
      measure: { valueMode: 'share', levelAvailability: 'unavailable', basisAvailability: 'unavailable' }
    }));
    assert.equal(validateSourceLedger(root, 'thin-share', { requireSpecs: true }).valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects two-count stories without a denominator, benchmark, third count, or time series', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-exact-count-quality-'));
  const anchor = 'Regulator banned 2 Alpha truck models and 4 Beta truck models.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'issue-exact-count-quality');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'truck-model-counts',
      claim: 'Regulator banned truck models from two brands.',
      decision: 'selected',
      outputSlug: 'truck-model-counts',
      title: 'Regulator banned six truck models',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'level',
        levelAvailability: 'reported',
        rationale: 'The source reports exact model counts.'
      },
      visualEvidenceAudit: {
        rationale: 'The draft contains two brand-level model counts.',
        comparableObservations: [
          { label: 'Alpha', quantity: 'truck models banned', unit: 'models', period: 'August 2026', value: 2 },
          { label: 'Beta', quantity: 'truck models banned', unit: 'models', period: 'August 2026', value: 4 }
        ]
      },
      routingAudit: {
        geographyRole: 'none',
        workflow: 'standard-chart',
        rationale: 'The story is about manufacturers, not geography.'
      },
      anchors: [anchor],
      evidence: [
        { statement: anchor, origin: 'input', role: 'primary', anchor },
        { statement: 'Broader truck sales fell 66.5%.', origin: 'external', role: 'consequence', source: 'Market report' }
      ]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-exact-count-quality'),
      /only two exact count observations|third comparable count|denominator or benchmark/i
    );

    ledger.candidates[0].evidence.push({
      statement: 'The regulator reviewed a total of 20 truck models in the same action.',
      origin: 'external',
      role: 'denominator',
      source: 'Regulator notice'
    });
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(validateSourceLedger(root, 'issue-exact-count-quality').valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects collapsing a richer same-scale dataset into one plotted item', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-rich-evidence');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].visualEvidenceAudit = {
      rationale: 'Three named same-scale observations are available and should remain visible.',
      comparableObservations: [
        { label: 'Initial move', quantity: 'market move', unit: 'percent', period: 'initial reaction', value: -8.5 },
        { label: 'Partial recovery', quantity: 'market move', unit: 'percent', period: 'later reaction', value: -3 },
        { label: 'Insurance increase', quantity: 'market move', unit: 'percent', period: 'reported period', value: 230 }
      ]
    };
    fs.writeFileSync(workspace.ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
    fs.writeFileSync(path.join(workspace.specificationRoot, 'ozon-insurance-price-increase.json'), JSON.stringify({
      title: 'Ozon insurance prices rose 230%',
      data: [{ label: 'Aggregate', value: 230 }],
      measure: { valueMode: 'relative-change', levelAvailability: 'unavailable' }
    }));
    assert.throws(
      () => validateSourceLedger(root, 'issue-rich-evidence', { requireSpecs: true }),
      /collapses a richer same-scale dataset|all must remain primary data items/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity requires story-defining thresholds to be inventoried and plotted', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-threshold-anchor-'));
  const anchor = 'Wheat offers fell from 14,000 rubles per ton to 8,000 rubles per ton, below the profitability threshold of 10,000 rubles per ton.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'issue-threshold-anchor');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'wheat-threshold',
      claim: 'Wheat offers fell below the 10,000-ruble profitability threshold.',
      decision: 'selected',
      outputSlug: 'wheat-threshold',
      title: 'Wheat offers fell below the 10,000-ruble profitability threshold',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'level', levelAvailability: 'reported',
        rationale: 'The prior and current offer prices are reported directly.'
      },
      visualEvidenceAudit: {
        rationale: 'The prior and current offer prices show the move through the profitability threshold.',
        comparableObservations: [
          { label: 'Before', quantity: 'wheat offer price', unit: 'RUB/t', period: 'before', value: 14000 },
          { label: 'After', quantity: 'wheat offer price', unit: 'RUB/t', period: 'after', value: 8000 }
        ]
      },
      routingAudit: { geographyRole: 'none', workflow: 'standard-chart', rationale: 'This is a price comparison, not a geographic story.' },
      anchors: [anchor],
      evidence: [{ statement: anchor, origin: 'input', role: 'primary', anchor }]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-threshold-anchor'),
      /orientationAnchors is required|numeric threshold/i
    );

    ledger.candidates[0].visualEvidenceAudit.orientationAnchors = [{
      label: 'Profitability threshold', role: 'threshold', quantity: 'wheat offer price', unit: 'RUB/t', period: 'comparison window', value: 10000
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(validateSourceLedger(root, 'issue-threshold-anchor').valid, true);

    fs.writeFileSync(path.join(workspace.specificationRoot, 'wheat-threshold.json'), JSON.stringify({
      title: 'Wheat offers fell below the 10,000-ruble profitability threshold',
      data: [
        { label: 'Before', value: 14000 },
        { label: 'After', value: 8000 }
      ],
      measure: { valueMode: 'level', levelAvailability: 'reported' }
    }));
    assert.throws(
      () => validateSourceLedger(root, 'issue-threshold-anchor', { requireSpecs: true }),
      /drops the source-ledger orientation anchor|profitability threshold/i
    );

    fs.writeFileSync(path.join(workspace.specificationRoot, 'wheat-threshold.json'), JSON.stringify({
      title: 'Wheat offers fell below the 10,000-ruble profitability threshold',
      data: [
        { label: 'Before', value: 14000 },
        { label: 'After', value: 8000 }
      ],
      references: [{ value: 10000, label: 'Profitability threshold' }],
      measure: { valueMode: 'level', levelAvailability: 'reported' }
    }));
    assert.equal(validateSourceLedger(root, 'issue-threshold-anchor', { requireSpecs: true }).valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects short tiny-count series without an independent anchor', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-small-count-series-'));
  const anchor = 'Restrictions covered 1 truck model in February 2025, 6 in July 2025, and 6 in August 2026.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'issue-small-count-series');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'truck-restrictions',
      claim: 'Truck-model restrictions expanded over time.',
      decision: 'selected',
      outputSlug: 'truck-restrictions',
      title: 'Truck-model restrictions expanded over time',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'level', levelAvailability: 'reported',
        rationale: 'The action counts are reported directly.'
      },
      visualEvidenceAudit: {
        rationale: 'Three dated restriction counts are available.',
        comparableObservations: [
          { label: 'Feb 2025', quantity: 'restricted truck models', unit: 'models', period: 'February 2025', value: 1 },
          { label: 'Jul 2025', quantity: 'restricted truck models', unit: 'models', period: 'July 2025', value: 6 },
          { label: 'Aug 2026', quantity: 'restricted truck models', unit: 'models', period: 'August 2026', value: 6 }
        ]
      },
      routingAudit: { geographyRole: 'none', workflow: 'standard-chart', rationale: 'The story concerns regulation over time.' },
      anchors: [anchor],
      evidence: [{ statement: anchor, origin: 'input', role: 'primary', anchor }]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-small-count-series'),
      /small exact-count observations|visually self-evident|portfolio\/universe/i
    );

    ledger.candidates[0].evidence.push({
      statement: 'The regulator reviewed a total portfolio of 20 truck models in the same program.',
      origin: 'external', role: 'denominator', source: 'Regulator notice'
    });
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(validateSourceLedger(root, 'issue-small-count-series').valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity requires mechanism evidence for converging signals', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-relationship-mechanism');
    validLedger(workspace);
    fs.writeFileSync(path.join(workspace.specificationRoot, 'ozon-insurance-price-increase.json'), JSON.stringify({
      recipe: 'relationship.converging-signals',
      title: 'Ozon insurance prices rose 230%',
      measure: { valueMode: 'relative-change', levelAvailability: 'unavailable' }
    }));
    assert.throws(
      () => validateSourceLedger(root, 'issue-relationship-mechanism', { requireSpecs: true }),
      /without source-ledger mechanism evidence|role mechanism/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity requires structured tangible-value research before normalized evidence is unavailable', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-research-proof');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    delete ledger.candidates[0].representationAudit.researchAttempts;
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-research-proof'),
      /at least two structured source checks/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects percentage-only price geometry when the input already reports tangible prices', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-source-fidelity-price-levels-'));
  const anchor = 'Export wheat prices fell 9.6% to 15 100 rubles per ton; barley prices fell 12.2% to 13 000 rubles per ton.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'issue-price-levels');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'grain-price-moves',
      claim: 'Barley prices fell faster than wheat prices.',
      decision: 'selected',
      outputSlug: 'grain-price-moves',
      title: 'Barley Prices Fell Faster Than Wheat Prices',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'relative-change',
        levelAvailability: 'incomparable',
        rationale: 'The products have different absolute price levels.',
        tangibleTarget: 'Current and prior wheat and barley prices.',
        researchAttempts: [
          {
            source: 'Market report',
            sourceType: 'market-data',
            locator: 'Fixture market price table for wheat and barley',
            outcome: 'Current prices were reported for both categories.'
          },
          {
            source: 'Industry dataset',
            sourceType: 'industry-dataset',
            locator: 'Fixture grain assessment table for the prior period',
            outcome: 'The categories use distinct product bases.'
          }
        ]
      },
      visualEvidenceAudit: {
        rationale: 'The normalized changes are on the same percentage scale.',
        comparableObservations: [
          { label: 'Wheat', quantity: 'grain price change', unit: '%', period: 'reported interval', value: -9.6 },
          { label: 'Barley', quantity: 'grain price change', unit: '%', period: 'reported interval', value: -12.2 }
        ]
      },
      anchors: [anchor],
      evidence: [{ statement: 'Barley prices fell faster than wheat prices.', origin: 'input', role: 'primary', anchor }]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-price-levels'),
      /tangible currency price|within-category price pairs|category-specific before\/after/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('workforce percentages require a company-filing headcount check', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-workforce-research');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].claim = 'The company plans to cut 10% of staff.';
    ledger.candidates[0].representationAudit.tangibleTarget = 'Company headcount and the implied number of positions removed.';
    ledger.candidates[0].representationAudit.rationale = 'The percentage is reported but the workforce count has not been recovered.';
    ledger.candidates[0].representationAudit.researchAttempts = [
      {
        source: 'Supplied staffing article',
        sourceType: 'supplied-source',
        locator: 'Full staffing article and linked materials',
        outcome: 'The article reports the percentage reduction but no headcount.'
      },
      {
        source: 'Industry employment dataset',
        sourceType: 'industry-dataset',
        locator: 'Company employment table for the reporting year',
        outcome: 'The dataset does not publish a consistent company headcount.'
      }
    ];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-workforce-research'),
      /company-filing check for workforce or staffing percentages/i
    );

    ledger.candidates[0].representationAudit.researchAttempts[1] = {
      source: 'Company annual filing',
      sourceType: 'company-filing',
      locator: 'Annual filing, employee note and group headcount table',
      outcome: 'The filing does not provide a headcount for the staffing perimeter used by the announced cut.'
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(validateSourceLedger(root, 'issue-workforce-research').valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('consumption coverage requires an official or industry denominator check', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-consumption-research');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].claim = 'Announced fuel volumes cover only a few days of consumption.';
    ledger.candidates[0].representationAudit.tangibleTarget = 'Daily national fuel consumption for the reported shortage period.';
    ledger.candidates[0].representationAudit.rationale = 'The shipment volumes are reported but the daily consumption denominator has not been recovered.';
    ledger.candidates[0].representationAudit.researchAttempts = [
      {
        source: 'Supplied shortage article',
        sourceType: 'supplied-source',
        locator: 'Full shortage article and linked tables',
        outcome: 'The article reports shipment volumes but no national daily consumption amount.'
      },
      {
        source: 'Company fuel filing',
        sourceType: 'company-filing',
        locator: 'Annual filing, domestic sales note',
        outcome: 'The filing covers one company and cannot supply national daily consumption.'
      }
    ];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-consumption-research'),
      /official or industry dataset for consumption, demand, or coverage denominators/i
    );

    ledger.candidates[0].representationAudit.researchAttempts[1] = {
      source: 'Official fuel balance',
      sourceType: 'official-dataset',
      locator: 'National motor-fuel balance, monthly domestic consumption, July 2026',
      outcome: 'The dataset does not publish a compatible daily figure for the shortage period.'
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.equal(validateSourceLedger(root, 'issue-consumption-research').valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('public aggregate shares require a tangible denominator and level geometry', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-public-share-'));
  const anchor = 'E-commerce represents an estimated 8–10% of the Russian economy.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'issue-public-share');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'ecommerce-economic-share',
      claim: 'E-commerce represents an estimated 8–10% of the Russian economy.',
      decision: 'selected',
      outputSlug: 'ecommerce-economic-share',
      title: 'E-commerce represents 8–10% of the Russian economy',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'share',
        levelAvailability: 'not-applicable',
        basisAvailability: 'unavailable',
        basisTarget: 'Nominal Russian GDP and the corresponding e-commerce economic-footprint range.',
        rationale: 'The claim was initially left as a percentage.',
        basisRationale: 'The public economy denominator was not researched.'
      },
      visualEvidenceAudit: {
        rationale: 'The initial draft contains only the reported share range.',
        comparableObservations: [{
          label: 'Economic share', quantity: 'economic activity share', unit: '%', period: '2026 estimate', low: 8, high: 10
        }]
      },
      routingAudit: {
        geographyRole: 'none',
        workflow: 'standard-chart',
        rationale: 'The claim is a national aggregate rather than a subnational spatial pattern.'
      },
      anchors: [anchor],
      evidence: [{ statement: 'E-commerce represents 8–10% of the economy.', origin: 'input', role: 'primary', anchor }]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-public-share'),
      /public aggregate denominator|must select reported or retrievable level geometry|denominator item/i
    );

    const candidate = ledger.candidates[0];
    candidate.representationAudit = {
      selectedMode: 'level',
      levelAvailability: 'retrievable',
      basisAvailability: 'retrievable',
      basisTarget: 'Nominal Russian GDP and the corresponding e-commerce economic-footprint range.',
      rationale: 'The public GDP total converts the reported share into a tangible value range.',
      basisRationale: 'An official nominal-GDP total supplies the denominator for the reported share.'
    };
    candidate.visualEvidenceAudit = {
      rationale: 'The derived footprint and total economy value form the tangible basis of the share.',
      comparableObservations: [
        { label: 'E-commerce footprint', quantity: 'economic value', unit: 'trillion RUB', period: '2026 estimate', low: 16, high: 20 },
        { label: 'Economy total', quantity: 'economic value', unit: 'trillion RUB', period: '2026 estimate', value: 200 }
      ]
    };
    candidate.evidence.push({
      statement: 'Nominal GDP is 200 trillion rubles for the compatible period.',
      origin: 'external',
      role: 'denominator',
      source: 'Official national accounts dataset'
    });
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    fs.writeFileSync(path.join(workspace.specificationRoot, 'ecommerce-economic-share.json'), JSON.stringify({
      title: candidate.title,
      recipe: 'comparison.range',
      data: [
        { label: 'E-commerce footprint', low: 16, high: 20 },
        { label: 'Economy total', value: 200 }
      ],
      measure: { valueMode: 'level', levelAvailability: 'retrievable' },
      basis: {
        type: 'ratio',
        items: [
          { role: 'numerator', label: 'E-commerce footprint', low: 16, high: 20 },
          { role: 'denominator', label: 'Economy total', value: 200 }
        ]
      }
    }));
    assert.equal(validateSourceLedger(root, 'issue-public-share', { requireSpecs: true }).valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('coverage audits retain each supply component and the demand denominator', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-coverage-audit-'));
  const anchor = 'Replacement fuel included 60–100 thousand tons from India, 30 thousand tons from Morocco, and 10 thousand tons from Kazakhstan, against 900 thousand tons of monthly demand.';
  fs.writeFileSync(path.join(root, 'input.txt'), anchor);
  try {
    const workspace = initializeRunWorkspace(root, 'issue-coverage-audit');
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.inventoryComplete = true;
    ledger.candidates = [{
      id: 'replacement-fuel-coverage',
      claim: 'Replacement fuel covers only a few days of monthly demand.',
      decision: 'selected',
      outputSlug: 'replacement-fuel-coverage',
      title: 'Replacement fuel covers only a fraction of monthly demand',
      titleBasis: anchor,
      representationAudit: {
        selectedMode: 'level',
        levelAvailability: 'reported',
        rationale: 'The shipment components and monthly demand are reported in one tangible volume unit.'
      },
      visualEvidenceAudit: {
        rationale: 'Every reported inbound component and the monthly demand denominator belong on one scale.',
        comparableObservations: [
          { label: 'India tankers', quantity: 'fuel volume', unit: 'thousand tons', period: 'August 2026', low: 60, high: 100 },
          { label: 'Morocco tanker', quantity: 'fuel volume', unit: 'thousand tons', period: 'August 2026', value: 30 },
          { label: 'Kazakhstan pledge', quantity: 'fuel volume', unit: 'thousand tons', period: 'August 2026', value: 10 },
          { label: 'Monthly demand', quantity: 'fuel volume', unit: 'thousand tons', period: 'August 2026', value: 900 }
        ]
      },
      routingAudit: {
        geographyRole: 'none',
        workflow: 'standard-chart',
        rationale: 'Origin countries are supply-source categories; spatial distribution is not the finding.'
      },
      anchors: [anchor],
      evidence: [{ statement: 'The input reports three replacement sources against monthly demand.', origin: 'input', role: 'primary', anchor }]
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-coverage-audit'),
      /coverageAudit is required|inventory each supply component/i
    );

    const candidate = ledger.candidates[0];
    candidate.visualEvidenceAudit.rationale = 'Every reported inbound component stays in tons; the monthly denominator is safely period-normalized to a weekly baseline for proportional linear geometry.';
    candidate.visualEvidenceAudit.comparableObservations[3] = {
      label: 'Weekly demand baseline', quantity: 'fuel volume', unit: 'thousand tons', period: 'August 2026', value: 207
    };
    candidate.visualEvidenceAudit.coverageAudit = {
      rationale: 'The coverage result keeps three inbound components in tons and converts the reported monthly denominator to the equivalent weekly rate.',
      denominatorLabel: 'Weekly demand baseline',
      sourceEvidence: [
        { anchor: '60–100 thousand tons from India', disposition: 'component', label: 'India tankers' },
        { anchor: '30 thousand tons from Morocco', disposition: 'component', label: 'Morocco tanker' },
        { anchor: '10 thousand tons from Kazakhstan', disposition: 'component', label: 'Kazakhstan pledge' },
        { anchor: '900 thousand tons of monthly demand', disposition: 'denominator', label: 'Weekly demand baseline' }
      ]
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    fs.writeFileSync(path.join(workspace.specificationRoot, 'replacement-fuel-coverage.json'), JSON.stringify({
      title: candidate.title,
      recipe: 'comparison.range',
      data: [{ label: 'Replacement coverage', low: 1, high: 3 }],
      measure: { unit: 'days', valueMode: 'level', levelAvailability: 'reported' }
    }));
    assert.throws(
      () => validateSourceLedger(root, 'issue-coverage-audit', { requireSpecs: true }),
      /collapses a richer same-scale dataset|full supply-versus-demand decomposition|time-only geometry/i
    );

    fs.writeFileSync(path.join(workspace.specificationRoot, 'replacement-fuel-coverage.json'), JSON.stringify({
      title: candidate.title,
      recipe: 'comparison.range',
      data: [
        { label: 'India tankers', low: 60, high: 100 },
        { label: 'Morocco tanker', value: 30 },
        { label: 'Kazakhstan pledge', value: 10 }
      ],
      references: [{ label: 'Weekly demand baseline', value: 207 }],
      measure: { unit: 'thousand tons', valueMode: 'level', levelAvailability: 'reported' }
    }));
    assert.equal(validateSourceLedger(root, 'issue-coverage-audit', { requireSpecs: true }).valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects vague research notes without source types and locators', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-research-structure');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].representationAudit.researchAttempts = [
      { source: 'Company filing', outcome: 'No values found.' },
      { source: 'Market report', outcome: 'No values found.' }
    ];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-research-structure'),
      /sourceType|locator|data-bearing source/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects synthetic index fallbacks', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-synthetic-index');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].representationAudit.selectedMode = 'index';
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-synthetic-index'),
      /cannot use a synthetic index/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity requires tangible level selection when a rate or share basis is retrievable', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-basis');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].representationAudit = {
      selectedMode: 'share',
      levelAvailability: 'not-applicable',
      basisAvailability: 'retrievable',
      rationale: 'The claim is natively expressed as a share.',
      basisRationale: 'The numerator and denominator can be recovered from the named dataset.'
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-basis'),
      /cannot select share|select level values/i
    );

    ledger.candidates[0].representationAudit = {
      selectedMode: 'level',
      levelAvailability: 'retrievable',
      rationale: 'The reported share and total allow the tangible numerator to be derived.'
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    const specPath = path.join(workspace.specificationRoot, 'ozon-insurance-price-increase.json');
    fs.writeFileSync(specPath, JSON.stringify({
      title: 'Ozon insurance prices rose 230%',
      measure: { valueMode: 'level', levelAvailability: 'retrievable' }
    }));
    assert.equal(validateSourceLedger(root, 'issue-basis', { requireSpecs: true }).valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects pending or generic research attempts', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-pending-research');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].representationAudit = {
      selectedMode: 'relative-change',
      levelAvailability: 'unavailable',
      tangibleTarget: 'Monthly export volume for the reported periods.',
      rationale: 'The source reports percentage changes only.',
      researchAttempts: [
        {
          source: 'Supplied article',
          sourceType: 'supplied-source',
          locator: 'website',
          outcome: 'To be checked for monthly volumes.'
        },
        {
          source: 'Official trade database',
          sourceType: 'official-dataset',
          locator: 'Monthly commodity table, July 2026',
          outcome: 'Pending review.'
        }
      ]
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-pending-research'),
      /completed result|pending or generic lookup/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects stories originated by external research', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-2');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].evidence = [{
      statement: 'An unrelated ownership fact.',
      origin: 'external',
      role: 'primary',
      source: 'Unrelated article'
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(() => validateSourceLedger(root, 'issue-2'), /may not originate one|no primary evidence anchored/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects unsupported anchors, changed input, and untracked specs', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-3');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].titleBasis = 'Arctic LNG 2 ownership';
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(() => validateSourceLedger(root, 'issue-3'), /titleBasis must be an exact input excerpt/i);

    validLedger(workspace);
    fs.writeFileSync(path.join(workspace.specificationRoot, 'unsupported-story.json'), JSON.stringify({ title: 'Unsupported story' }));
    assert.throws(() => validateSourceLedger(root, 'issue-3', { requireSpecs: true }), /must exactly match ChartSpecs/i);

    fs.appendFileSync(path.join(root, 'input.txt'), '\nChanged after inventory.');
    assert.throws(() => validateSourceLedger(root, 'issue-3'), /input\.txt changed/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects invalid merge targets and detached title evidence', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-4');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[1] = {
      ...ledger.candidates[1],
      decision: 'merged',
      mergedInto: 'missing-candidate'
    };
    ledger.candidates[0].anchors = [
      'Online seller liquidations rose 19.6%, registrations fell 25%, and the seller population fell 4.9%.'
    ];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(() => validateSourceLedger(root, 'issue-4'), /mergedInto must name another candidate|titleBasis must be covered/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects quantitative input that has no candidate disposition', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-5');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates = [ledger.candidates[0]];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    assert.throws(() => validateSourceLedger(root, 'issue-5'), /Unassigned numeric evidence/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity permits explicitly justified non-story numeric metadata', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-6');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates = [ledger.candidates[0]];
    ledger.ignoredEvidence = [{
      anchor: 'Online seller liquidations rose 19.6%, registrations fell 25%, and the seller population fell 4.9%.',
      reason: 'Fixture treats this passage as non-story metadata for coverage testing only.'
    }];
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
    const result = validateSourceLedger(root, 'issue-6');
    assert.equal(result.valid, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects duplicate charts with the same source and series skeleton', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-7');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates.push({
      id: 'ozon-share-drop',
      claim: 'Ozon shares fell after the event.',
      decision: 'selected',
      outputSlug: 'ozon-share-drop',
      title: 'Ozon shares initially fell 8.5%',
      titleBasis: 'Ozon insurance prices rose 230%, while shares initially fell 8.5%.',
      representationAudit: {
        selectedMode: 'relative-change',
        levelAvailability: 'unavailable',
        rationale: 'The fixture contains only the reported percentage decline.',
        tangibleTarget: 'Event-window share prices for the prior close, intraday low, and later close.',
        researchAttempts: [
          {
            source: 'Exchange data',
            sourceType: 'market-data',
            locator: 'Fixture ticker, event-date intraday history',
            outcome: 'The fixture provides only the reported relative move.'
          },
          {
            source: 'Company filing',
            sourceType: 'company-filing',
            locator: 'Fixture event filing and investor-relations release',
            outcome: 'No event-window share-price levels are included in the fixture.'
          }
        ]
      },
      anchors: ['Ozon insurance prices rose 230%, while shares initially fell 8.5%.'],
      evidence: [
        {
          statement: 'Shares initially fell 8.5%.',
          origin: 'input',
          role: 'primary',
          anchor: 'Ozon insurance prices rose 230%, while shares initially fell 8.5%.'
        }
      ]
    });
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);

    const commonSpec = {
      recipe: 'trend.line',
      source: { name: 'Company filing', period: 'August 2026' },
      metadata: { dataPeriod: 'August 2026' },
      data: [{ label: 'Before' }, { label: 'After' }]
    };
    fs.writeFileSync(path.join(workspace.specificationRoot, 'ozon-insurance-price-increase.json'), JSON.stringify({
      ...commonSpec,
      title: 'Ozon insurance prices rose 230%',
      measure: { unit: 'index points', valueMode: 'relative-change', levelAvailability: 'unavailable' }
    }));
    fs.writeFileSync(path.join(workspace.specificationRoot, 'ozon-share-drop.json'), JSON.stringify({
      ...commonSpec,
      title: 'Ozon shares initially fell 8.5%',
      measure: { unit: '%', valueMode: 'relative-change', levelAvailability: 'unavailable' }
    }));

    assert.throws(
      () => validateSourceLedger(root, 'issue-7', { requireSpecs: true }),
      /repeat the same source passage, reporting context, recipe, and category\/time skeleton/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('source fidelity rejects normalized geometry when actual levels are retrievable', () => {
  const root = project();
  try {
    const workspace = initializeRunWorkspace(root, 'issue-8');
    validLedger(workspace);
    const ledger = JSON.parse(fs.readFileSync(workspace.ledgerPath, 'utf8'));
    ledger.candidates[0].representationAudit = {
      selectedMode: 'relative-change',
      levelAvailability: 'retrievable',
      rationale: 'The underlying filing contains actual before and after values.'
    };
    fs.writeFileSync(workspace.ledgerPath, `${JSON.stringify(ledger, null, 2)}
`);
    assert.throws(
      () => validateSourceLedger(root, 'issue-8'),
      /actual levels are retrievable|select level values/i
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
