const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const WEEK = '2026-week-32';
const SPEC_DIR = path.join(ROOT, 'specs', WEEK);
const CHART_DIR = path.join(ROOT, 'charts', WEEK);
const manifest = JSON.parse(fs.readFileSync(path.join(SPEC_DIR, 'manifest.json'), 'utf8'));
const requestedSlugs = new Set(process.argv.slice(2));

fs.mkdirSync(CHART_DIR, { recursive: true });

function run(args, label, attempts = 1) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'tool-api', 'chart.js'), ...args], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    const stdout = result.stdout || '';
    const stderr = result.stderr || '';
    process.stdout.write(`\n=== ${label}${attempts > 1 ? ` (attempt ${attempt}/${attempts})` : ''} ===\n`);
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    if (result.status === 0) return;
    if (attempt < attempts) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1200);
      continue;
    }
    throw new Error(`${label} failed with exit code ${result.status}`);
  }
}

const selectedSpecs = requestedSlugs.size
  ? manifest.specs.filter((filename) => requestedSlugs.has(path.basename(filename, '.json')))
  : manifest.specs;

if (requestedSlugs.size && selectedSpecs.length !== requestedSlugs.size) {
  const found = new Set(selectedSpecs.map((filename) => path.basename(filename, '.json')));
  const missing = [...requestedSlugs].filter((slug) => !found.has(slug));
  throw new Error(`Unknown chart slug(s): ${missing.join(', ')}`);
}

for (const filename of selectedSpecs) {
  const specPath = path.join(SPEC_DIR, filename);
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const slug = spec.metadata.slug;
  const htmlPath = path.join(CHART_DIR, `${slug}.html`);
  const pngPath = path.join(CHART_DIR, `${slug}.png`);

  run(['validate', specPath], `validate ${slug}`);

  if (spec.recipe === 'map.regional') {
    run(['regional', specPath, htmlPath], `regional render ${slug}`);
  } else {
    run(['render', specPath, htmlPath], `standard render ${slug}`);
    run(['diagnose', htmlPath], `diagnose ${slug}`, 3);
  }

  run(['review', htmlPath, '--screenshot', '--output', pngPath], `capture ${slug}`);
}

console.log(`\nRendered and captured ${selectedSpecs.length} charts in ${CHART_DIR}`);
