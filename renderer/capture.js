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
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    localAppData ? path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe') : null
  ].filter(Boolean);
}

function findBrowser() {
  return candidateBrowsers().find((candidate) => fs.existsSync(candidate)) || null;
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
    if (options.autoFit !== false) query.set('fit', '1');
  }
  const url = `${pathToFileURL(absoluteHtml).href}?${query.toString()}`;
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-browser-'));
  const result = spawnSync(browser, [...commonBrowserArgs(profileDir, viewport), '--dump-dom', url], {
    encoding: 'utf8',
    timeout: options.timeout || 30000,
    windowsHide: true
  });
  fs.rmSync(profileDir, { recursive: true, force: true });
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
  if (expectsDiagnostics && !diagnostics) {
    const state = result.stdout.match(/data-layout-diagnostics="([^"]+)"/)?.[1] || 'missing';
    throw new Error(`Layout diagnostics did not complete (state: ${state}).`);
  }

  return {
    browser,
    htmlPath: absoluteHtml,
    viewport,
    diagnostics,
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
    runs: runs.map((run) => ({ viewport: run.viewport, diagnostics: run.diagnostics }))
  };
}

function captureHtml(htmlPath, outputPath, options = {}) {
  const requireViewportFit = options.requireViewportFit !== false;
  const viewport = options.viewport || { width: 1200, height: 900 };
  const inspection = diagnoseHtml(htmlPath, { ...options, viewport, requireViewportFit });
  const overflowIssue = inspection.diagnostics?.issues?.find((issue) => issue.code === 'canvas-overflow');
  const adaptiveAttempts = options._adaptiveAttempts || 0;
  if (
    requireViewportFit &&
    options.adaptiveHeight !== false &&
    overflowIssue &&
    adaptiveAttempts < 4
  ) {
    const overflow = Number(overflowIssue.overflowPixels?.vertical) || 0;
    if (overflow > 0) {
      return captureHtml(htmlPath, outputPath, {
        ...options,
        viewport: {
          width: viewport.width,
          height: Math.ceil(viewport.height + overflow + 32)
        },
        autoFit: false,
        _adaptiveAttempts: adaptiveAttempts + 1
      });
    }
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
    if (options.autoFit !== false) query.set('fit', '1');
  }
  const url = `${pathToFileURL(absoluteHtml).href}?${query.toString()}`;
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tochnyi-browser-'));
  const args = [
    ...commonBrowserArgs(profileDir, inspection.viewport),
    `--screenshot=${absoluteOutput}`,
    url
  ];
  const result = spawnSync(browser, args, {
    encoding: 'utf8',
    timeout: options.timeout || 30000,
    windowsHide: true
  });
  fs.rmSync(profileDir, { recursive: true, force: true });
  if (result.error?.code === 'ETIMEDOUT' && !options._captureRetried) {
    return captureHtml(htmlPath, outputPath, { ...options, _captureRetried: true, timeout: Math.max(options.timeout || 30000, 60000) });
  }
  if (result.error) throw result.error;
  if (result.status !== 0 || !fs.existsSync(absoluteOutput)) {
    throw new Error(`Browser screenshot failed: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  return {
    browser,
    outputPath: absoluteOutput,
    bytes: fs.statSync(absoluteOutput).size,
    dimensions: pngDimensions(absoluteOutput),
    diagnostics: inspection.diagnostics
  };
}

module.exports = {
  captureHtml,
  diagnoseHtml,
  diagnoseHtmlResponsive,
  extractLayoutDiagnostics,
  DEFAULT_DIAGNOSTIC_VIEWPORTS,
  findBrowser,
  pngDimensions
};
