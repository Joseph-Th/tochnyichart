'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateSpec } = require('./validate');

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'chart';
}

function isoWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-week-${String(week).padStart(2, '0')}`;
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

function renderHtml(spec, options = {}) {
  const assetPrefix = ensureTrailingSlash(options.assetPrefix || '../../lib/');
  const metadata = spec.metadata || {};
  const description = metadata.keyFinding || spec.subtitle;
  const payload = jsonForHtml(spec);

  return `<!DOCTYPE html>
<html lang="en" data-assets="${htmlEscape(assetPrefix)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${htmlEscape(description)}">
  <title>${htmlEscape(spec.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${htmlEscape(assetPrefix)}tochnyi.css">
  <script src="https://cdn.amcharts.com/lib/5/index.js"></script>
  <script src="https://cdn.amcharts.com/lib/5/xy.js"></script>
  <script src="https://cdn.amcharts.com/lib/5/percent.js"></script>
  <script src="https://cdn.amcharts.com/lib/5/themes/Animated.js"></script>
  <script src="${htmlEscape(assetPrefix)}tochnyi-charts.js"></script>
</head>
<body>
  <div id="tochnyi-app"></div>
  <script id="tochnyi-spec" type="application/json">${payload}</script>
  <script src="${htmlEscape(assetPrefix)}tochnyi-runtime.js"></script>
  <script src="${htmlEscape(assetPrefix)}tochnyi-diagnostics.js"></script>
</body>
</html>
`;
}

function defaultOutputPath(projectRoot, spec) {
  const week = isoWeek(spec.date);
  const slug = spec.metadata?.slug || slugify(spec.title);
  return path.join(projectRoot, 'charts', week, `${slug}.html`);
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

  const targetPath = path.resolve(outputPath || defaultOutputPath(projectRoot, result.normalized));
  const targetDir = path.dirname(targetPath);
  fs.mkdirSync(targetDir, { recursive: true });
  const assetPrefix = ensureTrailingSlash(path.relative(targetDir, path.join(projectRoot, 'lib')).replace(/\\/g, '/') || '.');
  const html = renderHtml(result.normalized, { assetPrefix });
  fs.writeFileSync(targetPath, html, 'utf8');

  return {
    specPath: absoluteSpecPath,
    htmlPath: targetPath,
    recipe: result.normalized.recipe,
    bytes: Buffer.byteLength(html),
    warnings: result.warnings,
    normalized: result.normalized
  };
}

module.exports = {
  renderHtml,
  renderSpecFile,
  defaultOutputPath,
  slugify,
  isoWeek
};
