'use strict';

const fs = require('node:fs');
const { validateSpec } = require('./validate');

function extractSpec(html) {
  const match = html.match(/<script\s+id="tochnyi-spec"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match) return null;
  return JSON.parse(match[1]);
}

function reviewHtml(html, options = {}) {
  const errors = [];
  const warnings = [];
  let spec = null;

  if (!/^<!DOCTYPE html>/i.test(html.trim())) errors.push('Missing HTML doctype.');
  if (!html.includes('id="tochnyi-app"')) errors.push('Missing #tochnyi-app mount point.');
  if (!html.includes('tochnyi-runtime.js')) errors.push('Missing declarative runtime.');
  if (!html.includes('tochnyi-diagnostics.js')) errors.push('Missing automatic layout diagnostics.');
  if (!html.includes('tochnyi.css')) errors.push('Missing shared stylesheet.');
  if (/<style[\s>]/i.test(html)) errors.push('Generated chart contains an inline <style> block.');
  if (/\sstyle\s*=\s*["']/i.test(html)) errors.push('Generated chart contains an inline style attribute.');
  if (/am5(?:xy|percent)?\.[A-Za-z]+\.new\s*\(/.test(html)) {
    errors.push('Generated chart contains direct AMCharts implementation code.');
  }
  if (html.length > 12000) warnings.push(`Generated shell is ${html.length} characters; consider shortening editorial copy.`);

  try {
    spec = extractSpec(html);
    if (!spec) errors.push('Missing embedded ChartSpec.');
  } catch (error) {
    errors.push(`Embedded ChartSpec is invalid JSON: ${error.message}`);
  }

  if (spec) {
    const validation = validateSpec(spec);
    errors.push(...validation.errors.map((message) => `ChartSpec: ${message}`));
    warnings.push(...validation.warnings.map((message) => `ChartSpec: ${message}`));

    const labels = spec.data.map((item) => item.label);
    const longestLabel = Math.max(...labels.map((label) => label.length));
    if (spec.recipe.startsWith('comparison.') && longestLabel > 42) {
      warnings.push('A comparison label exceeds 42 characters; ranking.horizontal may provide more space.');
    }
    if (spec.recipe === 'trend.line' && spec.data.length > 12) {
      errors.push('trend.line contains more than 12 points in the publication renderer.');
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
  reviewHtml,
  reviewFile
};
