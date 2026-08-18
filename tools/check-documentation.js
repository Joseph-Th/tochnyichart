#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_DOCUMENTS = Object.freeze([
  'README.md',
  'AGENTS.md',
  'STATUS.md',
  'docs/agent-workflows.md',
  'docs/architecture.md',
  'docs/batch-workflow.md',
  'docs/maintainer-workflows.md',
  'docs/regional-routing.md',
  'docs/source-enrichment.md',
  'docs/source-ledger.md',
  'docs/story-selection.md',
  'docs/testing.md',
  'tool-api/README.md',
  '.claude/skills/tochnyi-chart.md',
  '.claude/skills/tochnyi-chart-maintainer.md'
]);

const README_ROUTED_AUTHORITIES = Object.freeze([
  'AGENTS.md',
  'STATUS.md',
  'docs/architecture.md',
  'docs/agent-workflows.md',
  'docs/batch-workflow.md',
  'docs/source-enrichment.md',
  'docs/source-ledger.md',
  'docs/story-selection.md',
  'docs/testing.md',
  'tool-api/README.md'
]);

const SOURCE_ROUTE_PREFIXES = Object.freeze([
  '.claude/skills/',
  'docs/',
  'lib/',
  'recipes/',
  'renderer/',
  'schemas/',
  'specs/examples/',
  'tests/',
  'tool-api/',
  'tools/'
]);

function normalizeRepositoryPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function readText(projectRoot, relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function markdownLinkTargets(document) {
  const targets = [];
  const pattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of document.matchAll(pattern)) {
    const raw = match[1].trim().replace(/^<|>$/g, '');
    const target = raw.split(/\s+/, 1)[0];
    if (target) targets.push(target);
  }
  return targets;
}

function inlineCodeSpans(document) {
  const spans = [];
  const pattern = /`([^`\n]+)`/g;
  for (const match of document.matchAll(pattern)) spans.push(match[1].trim());
  return spans;
}

function packageScripts(projectRoot) {
  return Object.keys(JSON.parse(readText(projectRoot, 'package.json')).scripts || {});
}

function implementedToolApiCommands(projectRoot) {
  const source = readText(projectRoot, 'tools/chart.js');
  return new Set(
    [...source.matchAll(/command\s*===\s*['"]([^'"]+)['"]/g)].map((match) => match[1])
  );
}

function documentedNpmScripts(document) {
  return [...document.matchAll(/\bnpm\s+run\s+([A-Za-z0-9:_-]+)/g)].map((match) => match[1]);
}

function documentedToolApiCommands(document) {
  return [...document.matchAll(/\bnode\s+tool-api\/chart\.js\s+([A-Za-z0-9-]+)/g)].map(
    (match) => match[1]
  );
}

function isTemplateOrGeneratedRoute(value) {
  return (
    value.includes('<') ||
    value.includes('>') ||
    value.includes('*') ||
    value.startsWith('.work/') ||
    value.startsWith('charts/') ||
    value.startsWith('specs/runs/') ||
    value === 'input.txt' ||
    value.startsWith('input/')
  );
}

function sourceRouteFromSpan(value) {
  const normalized = normalizeRepositoryPath(value).replace(/[.,;:]$/, '');
  if (isTemplateOrGeneratedRoute(normalized)) return null;
  return SOURCE_ROUTE_PREFIXES.some((prefix) => normalized.startsWith(prefix)) ? normalized : null;
}

function checkDocumentation(projectRoot = path.resolve(__dirname, '..')) {
  const errors = [];
  const existing = new Set();

  for (const relativePath of REQUIRED_DOCUMENTS) {
    const absolute = path.join(projectRoot, relativePath);
    if (!fs.statSync(absolute, { throwIfNoEntry: false })?.isFile()) {
      errors.push(`Missing required current document: ${relativePath}`);
      continue;
    }
    existing.add(relativePath);
  }

  const readme = existing.has('README.md') ? readText(projectRoot, 'README.md') : '';
  for (const relativePath of README_ROUTED_AUTHORITIES) {
    if (!readme.includes(relativePath)) {
      errors.push(`README.md does not route to current authority: ${relativePath}`);
    }
  }

  const scripts = new Set(packageScripts(projectRoot));
  const toolApiCommands = implementedToolApiCommands(projectRoot);

  for (const relativePath of existing) {
    const document = readText(projectRoot, relativePath);
    const sourceDir = path.dirname(path.join(projectRoot, relativePath));

    for (const rawTarget of markdownLinkTargets(document)) {
      if (
        rawTarget.startsWith('#') ||
        rawTarget.startsWith('/') ||
        rawTarget.startsWith('../AGENTS.md') ||
        rawTarget.includes('://') ||
        rawTarget.startsWith('mailto:')
      ) {
        continue;
      }
      const localTarget = decodeURIComponent(rawTarget.split('#', 1)[0]);
      if (!localTarget) continue;
      if (!fs.existsSync(path.resolve(sourceDir, localTarget))) {
        errors.push(`${relativePath} links to missing local path: ${rawTarget}`);
      }
    }

    for (const span of inlineCodeSpans(document)) {
      const route = sourceRouteFromSpan(span);
      if (route && !fs.existsSync(path.join(projectRoot, route))) {
        errors.push(`${relativePath} advertises missing repository route: ${route}`);
      }
    }

    for (const script of documentedNpmScripts(document)) {
      if (!scripts.has(script)) {
        errors.push(`${relativePath} advertises missing npm script: ${script}`);
      }
    }

    for (const command of documentedToolApiCommands(document)) {
      if (!toolApiCommands.has(command)) {
        errors.push(`${relativePath} advertises missing Tool API command: ${command}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    documentCount: existing.size,
    checkedNpmScripts: scripts.size,
    checkedToolApiCommands: toolApiCommands.size,
    errors
  };
}

function main() {
  const result = checkDocumentation();
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  REQUIRED_DOCUMENTS,
  README_ROUTED_AUTHORITIES,
  normalizeRepositoryPath,
  markdownLinkTargets,
  inlineCodeSpans,
  documentedNpmScripts,
  documentedToolApiCommands,
  sourceRouteFromSpan,
  checkDocumentation
};
