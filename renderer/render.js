'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateSpec } = require('./validate');
const { normalizeRunId, workspacePath } = require('./run-workspace');
const TochnyiMaps = require('../lib/tochnyi-maps');
const catalog = require('../recipes/catalog.json');
const {
  AMCHARTS_VERSION,
  AMCHARTS_SCRIPTS,
  MUKTA_FONT_CSS,
  vendorPath
} = require('./runtime-dependencies');

const LIB_ROOT = path.join(__dirname, '..', 'lib');
const IMAGE_ASSETS = Object.freeze({
  'tochnyi-logo.png': 'image/png',
  'watermark.svg': 'image/svg+xml'
});

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
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

// ---------- inline asset bundle ----------
// Assets are read once per process; generated HTML is self-contained and renders offline.
const assetCache = new Map();

function readCached(absolutePath, encoding) {
  const key = `${encoding || 'buffer'}:${absolutePath}`;
  if (!assetCache.has(key)) assetCache.set(key, fs.readFileSync(absolutePath, encoding));
  return assetCache.get(key);
}

function dataUri(absolutePath, mediaType) {
  return `data:${mediaType};base64,${readCached(absolutePath).toString('base64')}`;
}

function fontCss() {
  const cssPath = vendorPath(MUKTA_FONT_CSS);
  return readCached(cssPath, 'utf8').replace(/url\(([^)]+\.woff2)\)/g, (match, file) =>
    `url(${dataUri(path.join(path.dirname(cssPath), file), 'font/woff2')})`);
}

function inlineScript(name, source) {
  // A literal "</script" inside inlined code would end the element early.
  const safe = source.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  return `<script data-tochnyi-asset="${htmlEscape(name)}">\n${safe}\n</script>`;
}

function inlineStyle(name, source) {
  return `<style data-tochnyi-asset="${htmlEscape(name)}">\n${source.replace(/<\/style/gi, '<\\/style')}\n</style>`;
}

function libScript(filename) {
  return inlineScript(`lib/${filename}`, readCached(path.join(LIB_ROOT, filename), 'utf8'));
}

// Exact-match fixes applied when a vendored file is inlined; the vendored file itself stays byte-identical
// to upstream. amCharts derives its lazy-chunk base path from document.currentScript.src, which is empty
// for an inline script, so the unguarded regex match crashes before am5 is defined. Lazy chunks are only
// used by export plugins, which charts never load, so an empty base path is safe.
const INLINE_PATCHES = Object.freeze({
  [`amcharts5/${AMCHARTS_VERSION}/index.js`]: Object.freeze([{
    find: '/(.*\\/)[^\\/]*$/.exec(_)[1]',
    replace: '(/(.*\\/)[^\\/]*$/.exec(_)||[0,""])[1]'
  }])
});

function vendorScript(relativePath) {
  let source = readCached(vendorPath(relativePath), 'utf8');
  for (const patch of INLINE_PATCHES[relativePath] || []) {
    const occurrences = source.split(patch.find).length - 1;
    if (occurrences !== 1) {
      throw new Error(`Inline patch for vendor/${relativePath} expected 1 match of ${patch.find}, found ${occurrences}.`);
    }
    source = source.replace(patch.find, () => patch.replace);
  }
  return inlineScript(`vendor/${relativePath}`, source);
}

function imageAssetsScript() {
  const assets = Object.fromEntries(Object.entries(IMAGE_ASSETS).map(([filename, mediaType]) =>
    [filename, dataUri(path.join(LIB_ROOT, filename), mediaType)]));
  return inlineScript('lib/brand-images', `window.TOCHNYI_ASSETS = ${JSON.stringify(assets)};`);
}

// ---------- editing guide ----------
function commentSafe(value) {
  return String(value || '').replace(/--/g, '–').replace(/>/g, '›');
}

function editingGuide(spec) {
  const recipe = (catalog.recipes || []).find((entry) => entry.id === spec.recipe) || {};
  const fields = Object.keys(spec).filter((key) => key !== 'recipe').join(', ');
  return `<!--
  TOCHNYI CHART: SELF-CONTAINED, EDITABLE FILE
  Everything this page needs is embedded (chart engine, amCharts ${AMCHARTS_VERSION}, fonts, logo, watermark),
  so it opens offline in any modern browser and can be handed over on its own.

  HOW TO CHANGE THE CHART
  Edit the ChartSpec JSON in <script id="tochnyi-spec"> directly below, then reopen the page. The chart,
  axes, labels and layout are recomputed from it on load. Titles, subtitle, notes, sources, data values,
  labels and highlights all live there. Keep field names and nesting as they are: change values, and
  add or remove data rows in the same shape as the existing ones. Numbers and the text written about them
  are separate fields (for example value vs displayValue, gap or benchmark labels, title, notes, facts):
  when a number changes, update every label and sentence that states it. Do not edit the embedded engine
  code (blocks marked data-tochnyi-asset); it is generated.

  Recipe: ${commentSafe(spec.recipe)}
  Purpose: ${commentSafe(recipe.purpose)}
  Data: ${commentSafe(recipe.data)}
  Top-level fields in this chart: ${commentSafe(fields)}
-->`;
}

// ---------- shell ----------
function renderHtml(spec) {
  const metadata = spec.metadata || {};
  const description = metadata.keyFinding || spec.subtitle || spec.title;
  const regionSet = spec.recipe === 'map.regional' ? TochnyiMaps.getRegionSet(spec.map.regionSet) : null;
  const mapScripts = regionSet
    ? [vendorScript(regionSet.geodataScript), libScript('tochnyi-maps.js'), libScript('tochnyi-map-runtime.js')]
    : [];

  return `<!DOCTYPE html>
${editingGuide(spec)}
<html lang="en" data-standalone="true">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${htmlEscape(description)}">
  <title>${htmlEscape(spec.title)}</title>
  <script id="tochnyi-spec" type="application/json">${jsonForHtml(spec)}</script>
${inlineStyle('vendor/fonts/mukta/mukta.css', fontCss())}
${inlineStyle('lib/tochnyi.css', readCached(path.join(LIB_ROOT, 'tochnyi.css'), 'utf8'))}
${AMCHARTS_SCRIPTS.filter((file) => !file.endsWith('themes/Animated.js')).map(vendorScript).join('\n')}
${mapScripts.join('\n')}
${vendorScript(AMCHARTS_SCRIPTS.find((file) => file.endsWith('themes/Animated.js')))}
${libScript('tochnyi-charts.js')}
${libScript('tochnyi-visual-plan.js')}
${imageAssetsScript()}
</head>
<body>
  <div id="tochnyi-app"></div>
${libScript('tochnyi-runtime.js')}
${libScript('tochnyi-diagnostics.js')}
</body>
</html>
`;
}

function defaultOutputPath(projectRoot, spec, options = {}) {
  const requestedProject = options.projectId || options.runId || process.env.TOCHNYI_PROJECT_ID || process.env.TOCHNYI_RUN_ID;
  if (!requestedProject) {
    throw new Error('HTML output requires either an explicit output path or --project-id <id>.');
  }
  const runId = normalizeRunId(requestedProject);
  const slug = spec.metadata?.slug || slugify(spec.title);
  return workspacePath(projectRoot, runId, 'rendered', `${slug}.html`);
}

function renderValidatedSpecFile(specPath, normalized, outputPath, options = {}) {
  const projectRoot = path.resolve(options.projectRoot || path.join(__dirname, '..'));
  const absoluteSpecPath = path.resolve(specPath);
  const targetPath = path.resolve(outputPath || defaultOutputPath(projectRoot, normalized, options));
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const html = renderHtml(normalized);
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
  AMCHARTS_VERSION,
  slugify
};
