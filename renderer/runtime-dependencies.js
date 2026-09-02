'use strict';

const AMCHARTS_VERSION = '5.20.3';
const AMCHARTS_CDN_ROOT = `https://cdn.amcharts.com/lib/version/${AMCHARTS_VERSION}`;
const RUSSIA_GEODATA_URL = 'https://cdn.amcharts.com/lib/5/geodata/russiaLow.js';
const MUKTA_FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700&display=swap';

function amChartsScriptUrl(relativePath) {
  return `${AMCHARTS_CDN_ROOT}/${String(relativePath || '').replace(/^\/+/, '')}`;
}

const RUNTIME_DEPENDENCY_CONTRACT = Object.freeze({
  offlineReady: false,
  rule: 'Chart geometry and renderer policy are repository-owned, but browser capture still requires remote runtime assets. Core amCharts scripts are pinned to a reviewed version; the Mukta webfont and Russia geodata remain provider-managed remote assets. Do not describe the current renderer as fully offline-reproducible.',
  dependencies: Object.freeze([
    Object.freeze({
      id: 'amcharts5-core',
      mode: 'pinned-cdn',
      version: AMCHARTS_VERSION,
      baseUrl: AMCHARTS_CDN_ROOT
    }),
    Object.freeze({
      id: 'amcharts5-russia-geodata',
      mode: 'provider-managed-cdn',
      version: 'provider-managed',
      url: RUSSIA_GEODATA_URL
    }),
    Object.freeze({
      id: 'mukta-webfont',
      mode: 'provider-managed-css',
      version: 'provider-managed',
      url: MUKTA_FONT_CSS_URL
    })
  ]),
  offlineMigrationRule: 'If offline or air-gapped capture becomes a product requirement, vendor reviewed amCharts, geodata, and font assets under an explicit dependency/licensing change. Do not copy remote binaries into the repository ad hoc.'
});

module.exports = {
  AMCHARTS_VERSION,
  AMCHARTS_CDN_ROOT,
  RUSSIA_GEODATA_URL,
  MUKTA_FONT_CSS_URL,
  RUNTIME_DEPENDENCY_CONTRACT,
  amChartsScriptUrl
};
