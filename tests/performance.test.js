'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const TochnyiMaps = require('../lib/tochnyi-maps');

function denseEntries() {
  return Array.from({ length: 12 }, (_, index) => ({
    index,
    item: {},
    point: { x: 220 + index * 52, y: 80 + index * 40 },
    height: 76,
    side: index < 6 ? 'left' : 'right'
  }));
}

function denseOptions() {
  return {
    map: { leaderRouting: 'auto', calloutDistribution: 'auto' },
    dense: true,
    width: 1450,
    cardWidth: 210,
    topLeft: 10,
    topRight: 10,
    bottom: 650,
    summaryShown: false,
    summaryOnRight: false
  };
}

test('dense regional planning stays within the routing performance budget', () => {
  const entries = denseEntries();
  const options = denseOptions();
  for (let index = 0; index < 2; index += 1) {
    TochnyiMaps.planRegionalBreakdown(entries, options);
  }

  const start = performance.now();
  let evaluations = 0;
  const iterations = 5;
  for (let index = 0; index < iterations; index += 1) {
    const result = TochnyiMaps.planRegionalBreakdown(entries, options);
    evaluations += result.placement.assignmentEvaluations;
  }
  const elapsedMs = performance.now() - start;

  assert.ok(evaluations > 0, 'dense planning should evaluate placement candidates');
  assert.ok(elapsedMs < 3000, `dense planning took ${elapsedMs.toFixed(1)}ms for ${iterations} runs`);
});
