'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const VENDOR_ROOT = path.join(__dirname, '..', 'vendor');
const VENDOR_MANIFEST = require('../vendor/manifest.json');

const AMCHARTS_VERSION = VENDOR_MANIFEST.dependencies.find((dependency) => dependency.id === 'amcharts5-core').version;
const AMCHARTS_SCRIPTS = Object.freeze(['index.js', 'xy.js', 'percent.js', 'themes/Animated.js']
  .map((file) => `amcharts5/${AMCHARTS_VERSION}/${file}`));
const MUKTA_FONT_CSS = 'fonts/mukta/mukta.css';

const RUNTIME_DEPENDENCY_CONTRACT = Object.freeze({
  offlineReady: true,
  selfContainedHtml: true,
  rule: 'Every generated chart HTML inlines the engine stylesheet and scripts, the Mukta webfont, and brand images; regional maps also inline the vendored amCharts core and map geodata. The file renders offline and can be handed over as a standalone, editable deliverable.',
  dependencies: Object.freeze(VENDOR_MANIFEST.dependencies.map((dependency) => Object.freeze({
    id: dependency.id,
    mode: 'vendored',
    version: dependency.version,
    license: dependency.license,
    sourceUrl: dependency.sourceUrl,
    files: Object.freeze(dependency.files.map((entry) => `vendor/${entry.file}`))
  }))),
  updateRule: 'Update vendored assets only together with vendor/manifest.json checksums and vendor/README.md provenance; tests verify every checksum.'
});

function vendorPath(relativePath) {
  const resolved = path.resolve(VENDOR_ROOT, relativePath);
  if (!resolved.startsWith(path.resolve(VENDOR_ROOT) + path.sep)) {
    throw new Error(`Vendored asset path escapes vendor/: ${relativePath}`);
  }
  return resolved;
}

function verifyVendorAssets() {
  const problems = [];
  VENDOR_MANIFEST.dependencies.forEach((dependency) => {
    dependency.files.forEach((entry) => {
      const absolute = vendorPath(entry.file);
      if (!fs.existsSync(absolute)) {
        problems.push(`${entry.file} is missing.`);
        return;
      }
      const actual = crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
      if (actual !== entry.sha256) problems.push(`${entry.file} checksum ${actual} does not match manifest ${entry.sha256}.`);
    });
  });
  return { valid: problems.length === 0, problems };
}

module.exports = {
  AMCHARTS_VERSION,
  AMCHARTS_SCRIPTS,
  MUKTA_FONT_CSS,
  RUNTIME_DEPENDENCY_CONTRACT,
  VENDOR_MANIFEST,
  VENDOR_ROOT,
  vendorPath,
  verifyVendorAssets
};
