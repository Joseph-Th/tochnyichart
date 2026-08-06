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
