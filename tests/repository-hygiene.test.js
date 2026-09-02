'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  transientReason,
  checkIgnoreContract,
  checkRepositoryHygiene
} = require('../tools/check-repository-hygiene');

const root = path.join(__dirname, '..');

function productionJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return productionJavaScriptFiles(target);
    return entry.isFile() && entry.name.endsWith('.js') ? [target] : [];
  });
}

test('repository hygiene classifies generated data and permits curated fixtures', () => {
  assert.match(transientReason('projects/client-a/input/source.csv'), /project data.*local/i);
  assert.match(transientReason('projects/client-a/source-ledger.json'), /project data.*local/i);
  assert.match(transientReason('projects/client-a/specs/chart.json'), /project data.*local/i);
  assert.match(transientReason('projects/client-a/output/chart.png'), /project data.*local/i);
  assert.match(transientReason('projects/client-a/work/review/chart.png'), /project data.*local/i);
  assert.match(transientReason('input.txt'), /local/);
  assert.match(transientReason('input/source.csv'), /local/);
  assert.match(transientReason('.work/client-a/logs/render.log'), /transient/);
  assert.match(transientReason('charts/client-a/chart.html'), /generated/);
  assert.match(transientReason('specs/runs/client-a/chart.json'), /local run data/);
  assert.match(transientReason('specs/client-a/chart.json'), /curated spec fixtures/);
  assert.match(transientReason('exports/deck.pptx'), /generated package/);
  assert.equal(transientReason('specs/examples/chart.json'), null);
  assert.equal(transientReason('specs/samples/chart.json'), null);
  assert.equal(transientReason('specs/stress/chart.json'), null);
  assert.equal(transientReason('lib/tochnyi-logo.png'), null);
});

test('production rendering code does not depend on ambient Math.random', () => {
  const files = [
    ...productionJavaScriptFiles(path.join(root, 'lib')),
    ...productionJavaScriptFiles(path.join(root, 'renderer'))
  ];
  const offenders = files.filter((filePath) => /\bMath\.random\s*\(/.test(fs.readFileSync(filePath, 'utf8')))
    .map((filePath) => path.relative(root, filePath).replace(/\\/g, '/'));
  assert.deepEqual(offenders, [], `Use an explicit seeded generator for renderer-visible randomness: ${offenders.join(', ')}`);
});

test('gitignore protects all production and transient paths', () => {
  assert.deepEqual(checkIgnoreContract(root), []);
});

test('the repository currently tracks no production or transient artifacts', () => {
  const result = checkRepositoryHygiene(root);
  assert.equal(result.valid, true, JSON.stringify(result, null, 2));
  assert.deepEqual(result.forbidden, []);
  assert.deepEqual(result.ignoreErrors, []);
});
