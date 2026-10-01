'use strict';

const fs = require('node:fs');
const { validateSpec } = require('./validate');

function extractSpec(html) {
  const match = html.match(/<script\s+id="tochnyi-spec"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match) return null;
  return JSON.parse(match[1]);
}

const ASSET_BLOCK = /<(script|style) data-tochnyi-asset="([^"]+)">[\s\S]*?<\/\1>/gi;

function embeddedAssets(html) {
  return [...html.matchAll(ASSET_BLOCK)].map((match) => match[2]);
}

// The shell without its embedded engine/vendor blocks: what the generator authored for this chart.
function authoredShell(html) {
  return html.replace(ASSET_BLOCK, '');
}

function reviewHtml(html, options = {}) {
  const errors = [];
  const warnings = [];
  let spec = null;
  const assets = embeddedAssets(html);
  const shell = authoredShell(html);

  if (!/^<!DOCTYPE html>/i.test(html.trim())) errors.push('Missing HTML doctype.');
  if (!shell.includes('id="tochnyi-app"')) errors.push('Missing #tochnyi-app mount point.');
  if (!assets.includes('lib/tochnyi-runtime.js')) errors.push('Missing embedded declarative runtime.');
  if (!assets.includes('lib/tochnyi-diagnostics.js')) errors.push('Missing embedded automatic layout diagnostics.');
  if (!assets.includes('lib/tochnyi.css')) errors.push('Missing embedded shared stylesheet.');
  if (!assets.some((name) => /^vendor\/amcharts5\/[^/]+\/index\.js$/.test(name))) errors.push('Missing embedded amCharts core.');
  if (/<(?:script|link|img)\b[^>]*\s(?:src|href)\s*=\s*["'](?!data:)/i.test(shell)) {
    errors.push('Generated chart references an external file; the shell must be self-contained.');
  }
  if (/<style[\s>]/i.test(shell)) errors.push('Generated chart contains an authored inline <style> block.');
  if (/\sstyle\s*=\s*["']/i.test(shell)) errors.push('Generated chart contains an inline style attribute.');
  if (/am5(?:xy|percent)?\.[A-Za-z]+\.new\s*\(/.test(shell)) {
    errors.push('Generated chart contains direct AMCharts implementation code.');
  }
  try {
    spec = extractSpec(html);
    if (!spec) errors.push('Missing embedded ChartSpec.');
  } catch (error) {
    errors.push(`Embedded ChartSpec is invalid JSON: ${error.message}`);
  }

  if (spec) {
    const structuredPointCount = (spec.data || []).reduce((total, item) =>
      total + (Array.isArray(item?.segments) ? item.segments.length : 1), 0
    );
    if (shell.length > 12000 && structuredPointCount <= 12) {
      warnings.push(`Generated shell is ${shell.length} characters without embedded assets; consider shortening editorial copy.`);
    }
    const validation = validateSpec(spec);
    errors.push(...validation.errors.map((message) => `ChartSpec: ${message}`));
    warnings.push(...validation.warnings.map((message) => `ChartSpec: ${message}`));

    const labels = spec.data.map((item) => item.label);
    const longestLabel = Math.max(...labels.map((label) => label.length));
    if (spec.recipe.startsWith('comparison.') && longestLabel > 42) {
      warnings.push('A comparison label exceeds 42 characters; ranking.horizontal may provide more space.');
    }
    if (spec.options.height === 'short' && spec.supportingFacts.length > 3) {
      warnings.push('A short chart with four supporting facts may exceed a compact canvas.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    bytes: Buffer.byteLength(html),
    spec
  };
}

function reviewFile(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  return reviewHtml(html, { filePath });
}

module.exports = {
  extractSpec,
  embeddedAssets,
  authoredShell,
  reviewHtml,
  reviewFile
};
