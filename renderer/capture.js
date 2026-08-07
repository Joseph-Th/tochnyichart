'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const os = require('node:os');

const DEFAULT_DIAGNOSTIC_VIEWPORTS = [
  { width: 1200, height: 900 },
  { width: 768, height: 900 },
  { width: 480, height: 900 }
];

function candidateBrowsers() {
  const programFiles = process.env.PROGRAMFILES || 'C:\Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA || '';
  return [
    process.env.TOCHNYI_BROWSER,
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    localAppData ? path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ].filter(Boolean);
}

const browserCapabilityCache = new Map();

function browserSupportsHeadless(candidate) {
  if (browserCapabilityCache.has(candidate)) return browserCapabilityCache.get(candidate);
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-browser-probe-'));
  let supported = false;
  try {
    const result = spawnSync(candidate, [
      '--headless=new',
      '--no-first-run',
      '--disable-gpu',
      '--disable-extensions',
      `--user-data-dir=${profileDir}`,
      '--dump-dom',
      'data:text/html,<html><body>tochnyi-browser-probe</body></html>'
    ], {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true
    });
    supported = !result.error && result.status === 0 && result.stdout.includes('tochnyi-browser-probe');
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  browserCapabilityCache.set(candidate, supported);
  return supported;
}

function findBrowser() {
  return candidateBrowsers().find((candidate) =>
    fs.existsSync(candidate) && browserSupportsHeadless(candidate)
  ) || null;
}

function pngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error('Screenshot output is not a valid PNG file.');
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function extractLayoutDiagnostics(dom) {
  const match = dom.match(/<script\s+id="tochnyi-layout-diagnostics"\s+type="application\/json">([\s\S]*?)<\/script>/i);
  if (!match) return null;
  const payload = decodeHtmlEntities(match[1].trim());
  return JSON.parse(payload);
}

function extractDataAttributes(dom, elementId = null, prefix = 'data-map-') {
  const tags = String(dom || '').match(/<[^>]+>/g) || [];
  const requested = elementId
    ? tags.find((candidate) => new RegExp(`\\bid=["']${elementId}["']`).test(candidate))
    : null;
  const tag = requested || tags
    .map((candidate) => ({
      candidate,
      matches: (candidate.match(new RegExp(`\\s${prefix}[\\w-]+=`, 'g')) || []).length
    }))
    .sort((first, second) => second.matches - first.matches)[0]?.candidate;
  if (!tag) return {};
  const result = {};
  const attributes = tag.matchAll(/\s([A-Za-z_:][\w:.-]*)="([^"]*)"/g);
  for (const match of attributes) {
    if (!match[1].startsWith(prefix)) continue;
    result[match[1]] = decodeHtmlEntities(match[2]);
  }
  return result;
}

function commonBrowserArgs(profileDir, viewport) {
  return [
    '--headless=new',
    '--no-first-run',
    '--disable-gpu',
    '--disable-extensions',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--run-all-compositor-stages-before-draw',
    '--virtual-time-budget=4500',
    `--user-data-dir=${profileDir}`,
    `--window-size=${viewport.width},${viewport.height}`
  ];
}

function diagnoseHtml(htmlPath, options = {}) {
  const browser = options.browser || findBrowser();
  if (!browser) throw new Error('No supported Edge or Chrome executable was found. Set TOCHNYI_BROWSER to override.');

  const absoluteHtml = path.resolve(htmlPath);
  const viewport = options.viewport || { width: 1200, height: 900 };
  const query = new URLSearchParams({
    static: '1',
    captureWidth: String(viewport.width),
    captureHeight: String(viewport.height)
  });
  if (options.requireViewportFit) {
    query.set('checkFit', '1');
    if (options.autoFit === true) query.set('fit', '1');
  }
  const url = `${pathToFileURL(absoluteHtml).href}?${query.toString()}`;
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-browser-'));
  let result;
  try {
    result = spawnSync(browser, [...commonBrowserArgs(profileDir, viewport), '--dump-dom', url], {
      encoding: 'utf8',
      timeout: options.timeout || 30000,
      windowsHide: true
    });
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  if (result.error?.code === 'ETIMEDOUT' && !options._retried) {
    return diagnoseHtml(htmlPath, { ...options, _retried: true, timeout: Math.max(options.timeout || 30000, 60000) });
  }
  if (result.error) throw result.error;
  if (result.status !== 0 || !result.stdout.includes('data-rendered="true"')) {
    const renderedState = result.stdout.match(/data-rendered="([^"]+)"/)?.[1] || 'missing';
    const renderMessage = result.stdout.match(/<pre>([\s\S]*?)<\/pre>/)?.[1] || '';
    throw new Error(`Browser render check failed (state: ${renderedState}). ${renderMessage}`.trim());
  }

  const source = fs.readFileSync(absoluteHtml, 'utf8');
  const expectsDiagnostics = source.includes('tochnyi-diagnostics.js');
  const diagnostics = extractLayoutDiagnostics(result.stdout);
  const chartAttributes = extractDataAttributes(result.stdout);
  const trendAttributes = extractDataAttributes(result.stdout, 'chartdiv', 'data-trend-');
  const scaleAttributes = extractDataAttributes(result.stdout, 'chartdiv', 'data-zero-');
  const columnAttributes = extractDataAttributes(result.stdout, 'chartdiv', 'data-column-');
  if (expectsDiagnostics && !diagnostics) {
    const state = result.stdout.match(/data-layout-diagnostics="([^"]+)"/)?.[1] || 'missing';
    throw new Error(`Layout diagnostics did not complete (state: ${state}).`);
  }

  return {
    browser,
    htmlPath: absoluteHtml,
    viewport,
    diagnostics,
    chartAttributes,
    trendAttributes,
    scaleAttributes,
    columnAttributes,
    rendered: true
  };
}

function diagnoseHtmlResponsive(htmlPath, options = {}) {
  const browser = options.browser || findBrowser();
  if (!browser) throw new Error('No supported Edge or Chrome executable was found. Set TOCHNYI_BROWSER to override.');
  const viewports = options.viewports || DEFAULT_DIAGNOSTIC_VIEWPORTS;
  const runs = viewports.map((viewport) => diagnoseHtml(htmlPath, { ...options, browser, viewport }));
  const statuses = runs.map((run) => run.diagnostics?.status || 'pass');
  const status = statuses.includes('fail') ? 'fail' : statuses.includes('warn') ? 'warn' : 'pass';
  return {
    browser,
    htmlPath: path.resolve(htmlPath),
    status,
    runs: runs.map((run) => ({
      viewport: run.viewport,
      diagnostics: run.diagnostics,
      chartAttributes: run.chartAttributes,
      trendAttributes: run.trendAttributes,
      scaleAttributes: run.scaleAttributes,
      columnAttributes: run.columnAttributes
    }))
  };
}

function captureHtml(htmlPath, outputPath, options = {}) {
  const requireViewportFit = options.requireViewportFit !== false;
  const viewport = options.viewport || { width: 1200, height: 900 };
  const inspection = diagnoseHtml(htmlPath, {
    ...options,
    viewport,
    requireViewportFit,
    autoFit: options.autoFit === true
  });
  const overflowIssue = inspection.diagnostics?.issues?.find((issue) => issue.code === 'canvas-overflow');
  const adaptiveAttempts = options._adaptiveAttempts || 0;
  if (
    requireViewportFit &&
    options.adaptiveCanvas !== false &&
    options.adaptiveHeight !== false &&
    overflowIssue &&
    adaptiveAttempts < 6
  ) {
    const requiredCanvas = inspection.diagnostics?.viewportFit || overflowIssue.requiredCanvas || {};
    const requiredWidth = Math.ceil(Number(requiredCanvas.requiredWidth || requiredCanvas.width) || viewport.width);
    const requiredHeight = Math.ceil(Number(requiredCanvas.requiredHeight || requiredCanvas.height) || viewport.height);
    const horizontalOverflow = Number(overflowIssue.overflowPixels?.horizontal) || Math.max(0, requiredWidth - viewport.width);
    const verticalOverflow = Number(overflowIssue.overflowPixels?.vertical) || Math.max(0, requiredHeight - viewport.height);
    if (horizontalOverflow > 0 || verticalOverflow > 0) {
      return captureHtml(htmlPath, outputPath, {
        ...options,
        viewport: {
          width: horizontalOverflow > 0
            ? Math.max(viewport.width + 1, requiredWidth + 24)
            : viewport.width,
          height: verticalOverflow > 0
            ? Math.max(viewport.height + 1, requiredHeight + 24)
            : viewport.height
        },
        autoFit: false,
        _adaptiveAttempts: adaptiveAttempts + 1
      });
    }
  }
  if (requireViewportFit && overflowIssue) {
    const horizontal = Number(overflowIssue.overflowPixels?.horizontal) || 0;
    const vertical = Number(overflowIssue.overflowPixels?.vertical) || 0;
    throw new Error(
      `PNG capture refused because content still exceeds the canvas by ${horizontal}px horizontally and ${vertical}px vertically.`
    );
  }
  const browser = inspection.browser;
  const absoluteHtml = inspection.htmlPath;
  const absoluteOutput = path.resolve(outputPath || absoluteHtml.replace(/\.html?$/i, '.png'));
  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
  const query = new URLSearchParams({
    static: '1',
    captureWidth: String(inspection.viewport.width),
    captureHeight: String(inspection.viewport.height)
  });
  if (requireViewportFit) {
    query.set('checkFit', '1');
    if (options.autoFit === true) query.set('fit', '1');
  }
  const url = `${pathToFileURL(absoluteHtml).href}?${query.toString()}`;
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-browser-'));
  const args = [
    ...commonBrowserArgs(profileDir, inspection.viewport),
    `--screenshot=${absoluteOutput}`,
    url
  ];
  let result;
  try {
    result = spawnSync(browser, args, {
      encoding: 'utf8',
      timeout: options.timeout || 30000,
      windowsHide: true
    });
  } finally {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
  if (result.error?.code === 'ETIMEDOUT' && !options._captureRetried) {
    return captureHtml(htmlPath, outputPath, { ...options, _captureRetried: true, timeout: Math.max(options.timeout || 30000, 60000) });
  }
  if (result.error) throw result.error;
  if (result.status !== 0 || !fs.existsSync(absoluteOutput)) {
    throw new Error(`Browser screenshot failed: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  const dimensions = pngDimensions(absoluteOutput);
  if (dimensions.width !== inspection.viewport.width || dimensions.height !== inspection.viewport.height) {
    fs.rmSync(absoluteOutput, { force: true });
    throw new Error(
      `Browser screenshot dimensions ${dimensions.width}x${dimensions.height} do not match the approved canvas ` +
      `${inspection.viewport.width}x${inspection.viewport.height}.`
    );
  }
  return {
    browser,
    outputPath: absoluteOutput,
    bytes: fs.statSync(absoluteOutput).size,
    dimensions,
    diagnostics: inspection.diagnostics
  };
}

module.exports = {
  captureHtml,
  diagnoseHtml,
  diagnoseHtmlResponsive,
  extractLayoutDiagnostics,
  extractDataAttributes,
  DEFAULT_DIAGNOSTIC_VIEWPORTS,
  findBrowser,
  pngDimensions
};
