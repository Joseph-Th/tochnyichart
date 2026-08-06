'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { validateSpec } = require('./validate');
const { normalizeRunId, workspacePath } = require('./run-workspace');
const TochnyiMaps = require('../lib/tochnyi-maps');

const SHARED_ASSET_FILES = Object.freeze([
  'tochnyi.css',
  'tochnyi-charts.js',
  'tochnyi-visual-plan.js',
  'tochnyi-runtime.js',
  'tochnyi-diagnostics.js',
  'tochnyi-maps.js',
  'tochnyi-map-runtime.js',
  'tochnyi-logo.png',
  'watermark.svg'
]);

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'chart';
}

function jsonForHtml(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}

function assetFingerprint(projectRoot) {
  const hash = crypto.createHash('sha256');
  SHARED_ASSET_FILES.forEach((filename) => {
    const absolutePath = path.join(projectRoot, 'lib', filename);
    if (!fs.existsSync(absolutePath)) return;
    hash.update(filename);
    hash.update('\0');
    hash.update(fs.readFileSync(absolutePath));
    hash.update('\0');
  });
  return hash.digest('hex').slice(0, 12);
}

function localAssetUrl(assetPrefix, filename, assetVersion) {
  const base = `${assetPrefix}${filename}`;
  return assetVersion
    ? `${base}?v=${encodeURIComponent(assetVersion)}`
    : base;
}

function renderHtml(spec, options = {}) {
  const assetPrefix = ensureTrailingSlash(options.assetPrefix || '../../lib/');
  const assetVersion = options.assetVersion ? String(options.assetVersion) : '';
  const metadata = spec.metadata || {};
  const description = metadata.keyFinding || spec.subtitle || spec.title;
  const payload = jsonForHtml(spec);
  const regionSet = spec.recipe === 'map.regional' ? TochnyiMaps.getRegionSet(spec.map.regionSet) : null;
  const mapScripts = regionSet
    ? `\n  <script src="${htmlEscape(regionSet.geodataScript)}"></script>\n  <script src="${htmlEscape(localAssetUrl(assetPrefix, 'tochnyi-maps.js', assetVersion))}"></script>\n  <script src="${htmlEscape(localAssetUrl(assetPrefix, 'tochnyi-map-runtime.js', assetVersion))}"></script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" data-assets="${htmlEscape(assetPrefix)}" data-assets-version="${htmlEscape(assetVersion)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${htmlEscape(description)}">
  <title>${htmlEscape(spec.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${htmlEscape(localAssetUrl(assetPrefix, 'tochnyi.css', assetVersion))}">
  <script src="https://cdn.amcharts.com/lib/5/index.js"></script>
  <script src="https://cdn.amcharts.com/lib/5/xy.js"></script>
  <script src="https://cdn.amcharts.com/lib/5/percent.js"></script>
${mapScripts}
  <script src="https://cdn.amcharts.com/lib/5/themes/Animated.js"></script>
  <script src="${htmlEscape(localAssetUrl(assetPrefix, 'tochnyi-charts.js', assetVersion))}"></script>
  <script src="${htmlEscape(localAssetUrl(assetPrefix, 'tochnyi-visual-plan.js', assetVersion))}"></script>
</head>
<body>
  <div id="tochnyi-app"></div>
  <script id="tochnyi-spec" type="application/json">${payload}</script>
  <script src="${htmlEscape(localAssetUrl(assetPrefix, 'tochnyi-runtime.js', assetVersion))}"></script>
  <script src="${htmlEscape(localAssetUrl(assetPrefix, 'tochnyi-diagnostics.js', assetVersion))}"></script>
</body>
</html>
`;
}

function defaultOutputPath(projectRoot, spec, options = {}) {
  const runId = normalizeRunId(options.runId || process.env.TOCHNYI_RUN_ID || 'default');
  const slug = spec.metadata?.slug || slugify(spec.title);
  return workspacePath(projectRoot, runId, 'rendered', `${slug}.html`);
}

function renderValidatedSpecFile(specPath, normalized, outputPath, options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '..'));
  const absoluteSpecPath = path.resolve(specPath);
  const targetPath = path.resolve(outputPath || defaultOutputPath(projectRoot, normalized, options));
  const targetDir = path.dirname(targetPath);
  fs.mkdirSync(targetDir, { recursive: true });
  const assetPrefix = ensureTrailingSlash(path.relative(targetDir, path.join(projectRoot, 'lib')).replace(/\\/g, '/') || '.');
  const version = options.assetVersion || assetFingerprint(projectRoot);
  const html = renderHtml(normalized, { assetPrefix, assetVersion: version });
  fs.writeFileSync(targetPath, html, 'utf8');

  return {
    specPath: absoluteSpecPath,
    htmlPath: targetPath,
    recipe: normalized.recipe,
    bytes: Buffer.byteLength(html),
    warnings: options.warnings || [],
    normalized
  };
}

function renderSpecFile(specPath, outputPath, options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '..'));
  const absoluteSpecPath = path.resolve(specPath);
  const source = JSON.parse(fs.readFileSync(absoluteSpecPath, 'utf8'));
  const result = validateSpec(source);
  if (!result.valid) {
    const error = new Error(`ChartSpec validation failed:\n- ${result.errors.join('\n- ')}`);
    error.validation = result;
    throw error;
  }

  return renderValidatedSpecFile(absoluteSpecPath, result.normalized, outputPath, {
    ...options,
    projectRoot,
    warnings: result.warnings
  });
}

module.exports = {
  renderHtml,
  renderValidatedSpecFile,
  renderSpecFile,
  defaultOutputPath,
  assetFingerprint,
  slugify
};
