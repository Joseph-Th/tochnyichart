#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const TochnyiMaps = require('../lib/tochnyi-maps');
const { renderRegionalBreakdown } = require('../renderer/regional-workflow');

const projectRoot = path.resolve(__dirname, '..');
const specDirectory = path.join(projectRoot, 'charts', 'v2-examples');
const chartDirectory = path.join(projectRoot, 'charts', '2026-week-32');
const defaultSeed = 20260803;
const sampleCount = 3;

const detachedRegionIds = new Set(['RU-KGD', 'RU-SAK']);
const statusValues = ['stable', 'improving', 'strained', 'critical', 'unknown', 'blocked'];

const regionalBuckets = Object.freeze({
  west: [
    'RU-MUR', 'RU-ARK', 'RU-LEN', 'RU-PSK', 'RU-SPE', 'RU-NGR', 'RU-SMO',
    'RU-KRS', 'RU-TVE', 'RU-YAR', 'RU-MOS', 'RU-MOW', 'RU-TUL', 'RU-KLU'
  ],
  south: [
    'RU-KDA', 'RU-AD', 'RU-DA', 'RU-STA', 'RU-ROS', 'RU-AST', 'RU-VGG',
    'RU-VOR', 'RU-ORE', 'RU-SAR', 'RU-SAM', 'RU-PNZ', 'RU-ULY', 'RU-BA'
  ],
  ural: [
    'RU-PER', 'RU-SVE', 'RU-TYU', 'RU-CHE', 'RU-KGN', 'RU-BA', 'RU-UD',
    'RU-KIR', 'RU-KHM', 'RU-YAN'
  ],
  siberia: [
    'RU-OMS', 'RU-NVS', 'RU-TOM', 'RU-KEM', 'RU-ALT', 'RU-AL', 'RU-KYA',
    'RU-IRK', 'RU-BU', 'RU-ZAB', 'RU-TY', 'RU-KK', 'RU-AMU'
  ],
  farEast: [
    'RU-KHA', 'RU-PRI', 'RU-MAG', 'RU-CHU', 'RU-KAM', 'RU-AMU', 'RU-YEV',
    'RU-ZAB', 'RU-SA'
  ]
});

const clusterPools = Object.freeze([
  regionalBuckets.west,
  regionalBuckets.south,
  regionalBuckets.ural,
  regionalBuckets.siberia,
  regionalBuckets.farEast
]);

const edgePool = Object.freeze([
  'RU-MUR', 'RU-ARK', 'RU-NEN', 'RU-YAN', 'RU-CHU', 'RU-KAM', 'RU-MAG',
  'RU-KHA', 'RU-PRI', 'RU-AMU', 'RU-ZAB', 'RU-KDA', 'RU-DA', 'RU-SA'
]);

function parseSeed() {
  const index = process.argv.indexOf('--seed');
  if (index < 0) return defaultSeed;
  const parsed = Number(process.argv[index + 1]);
  if (!Number.isInteger(parsed)) throw new Error('--seed requires an integer.');
  return parsed >>> 0;
}

function createRng(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function randomInt(random, minimum, maximum) {
  return minimum + Math.floor(random() * (maximum - minimum + 1));
}

function shuffled(random, values) {
  const result = values.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function uniqueRegionIds(values) {
  return [...new Set(values)].filter((regionId) => !detachedRegionIds.has(regionId));
}

function sampleFromBuckets(random, buckets, count) {
  const selected = [];
  const remaining = new Set();
  buckets.forEach((bucket) => {
    const candidates = shuffled(random, uniqueRegionIds(bucket));
    if (candidates.length) selected.push(candidates[0]);
    candidates.slice(1).forEach((regionId) => remaining.add(regionId));
  });
  const fill = shuffled(random, [...remaining]);
  for (const regionId of fill) {
    if (selected.length >= count) break;
    if (!selected.includes(regionId)) selected.push(regionId);
  }
  return shuffled(random, selected).slice(0, count);
}

function sampleFromPool(random, pool, count) {
  return shuffled(random, uniqueRegionIds(pool)).slice(0, count);
}

function categoryRegionIds(random, category) {
  if (category === 'dense') {
    return sampleFromBuckets(random, clusterPools, randomInt(random, 9, 12));
  }
  if (category === 'marginal') {
    const allMainland = Object.keys(TochnyiMaps.getRegionSet('russia').regions)
      .filter((regionId) => !detachedRegionIds.has(regionId));
    return sampleFromPool(random, allMainland, randomInt(random, 2, 5));
  }
  if (category === 'clustered') {
    const pool = clusterPools[randomInt(random, 0, clusterPools.length - 1)];
    return sampleFromPool(random, pool, randomInt(random, 8, Math.min(12, pool.length)));
  }
  if (category === 'edge') {
    return sampleFromPool(random, edgePool, randomInt(random, 8, 10));
  }
  throw new Error(`Unknown regional routing category: ${category}`);
}

function categoryDescription(category) {
  return {
    dense: 'Broad random coverage stresses balanced columns, ports, and obstacle avoidance.',
    marginal: 'Low-count random coverage checks whether sparse leaders stay short and readable.',
    clustered: 'A tight random geographic cluster stresses adjacent polygons and parallel leaders.',
    edge: 'Remote random regions stress full-context geography and map-edge routing.'
  }[category];
}

function buildSpec(random, category, sampleIndex, seed) {
  const regionSet = TochnyiMaps.getRegionSet('russia');
  const regionIds = categoryRegionIds(random, category);
  const items = regionIds.map((regionId, index) => {
    const name = regionSet.regions[regionId];
    const status = statusValues[randomInt(random, 0, statusValues.length - 1)];
    return {
      label: name,
      regionId,
      status,
      displayValue: `${randomInt(random, 2, 38)} units`,
      detail: `${category[0].toUpperCase()}${category.slice(1)} sample ${sampleIndex + 1}, anchor ${index + 1}.`
    };
  });
  const criticalCount = items.filter((item) => item.status === 'critical' || item.status === 'blocked').length;
  const improvingCount = items.filter((item) => item.status === 'improving').length;
  const slug = `regional-routing-${category}-${String(sampleIndex + 1).padStart(2, '0')}`;
  const map = category === 'edge'
    ? { regionSet: 'russia', viewport: 'all', landmass: 'continental' }
    : { regionSet: 'russia' };

  return {
    version: '2.0',
    recipe: 'map.regional',
    title: `Synthetic Routing Matrix: ${category[0].toUpperCase()}${category.slice(1)} ${String(sampleIndex + 1).padStart(2, '0')}`,
    subtitle: categoryDescription(category),
    date: '2026-08-03',
    source: { name: 'Seeded synthetic routing matrix', period: `Seed ${seed}` },
    data: items,
    map,
    primaryMetric: {
      value: `${items.length} regions`,
      label: `${category} routing sample`
    },
    supportingFacts: [
      { value: String(criticalCount), label: 'critical or blocked dummy regions', tone: 'critical' },
      { value: String(improvingCount), label: 'dummy regions improving', tone: 'positive' }
    ],
    narrative: { frame: 'neutral', density: 'detailed', emphasis: 'geography' },
    options: { height: 'tall', animate: false },
    metadata: {
      slug,
      topic: 'synthetic regional routing matrix',
      country: 'Russia',
      dataPeriod: `Seed ${seed}`,
      keyFinding: categoryDescription(category)
    }
  };
}

function main() {
  const seed = parseSeed();
  const categories = ['dense', 'marginal', 'clustered', 'edge'];
  const random = createRng(seed);
  fs.mkdirSync(specDirectory, { recursive: true });
  fs.mkdirSync(chartDirectory, { recursive: true });

  const manifest = {
    seed,
    sampleCount,
    categories,
    charts: []
  };

  categories.forEach((category) => {
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const spec = buildSpec(random, category, sampleIndex, seed);
      const specPath = path.join(specDirectory, `${spec.metadata.slug}.json`);
      const htmlPath = path.join(chartDirectory, `${spec.metadata.slug}.html`);
      fs.writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
      const rendered = renderRegionalBreakdown(specPath, htmlPath, { diagnose: false });
      manifest.charts.push({
        category,
        sample: sampleIndex + 1,
        specPath: path.relative(projectRoot, specPath).replace(/\\/g, '/'),
        htmlPath: path.relative(projectRoot, rendered.htmlPath).replace(/\\/g, '/'),
        regionIds: spec.data.map((item) => item.regionId)
      });
    }
  });

  const manifestPath = path.join(specDirectory, 'regional-routing-matrix-manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
}

main();
