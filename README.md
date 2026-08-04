# Tochnyi Charts

Tochnyi Charts turns a compact, validated `ChartSpec` JSON file into a branded,
responsive chart. Agents choose the story structure and provide the evidence;
the renderer owns HTML, CSS, chart configuration, typography, layout, maps, and
export behavior.

Generated HTML is an output artifact. Do not edit it directly.

## Start here

Ask the tool to orient the work before authoring a specification:

```bash
node tools/chart.js orient
```

There are two intentionally separate workflows:

| Story | Workflow | First command | Render command |
| --- | --- | --- | --- |
| Number, comparison, ranking, status list, composition, trend, flow, or sequence without a map | `standard-chart` | `node tools/chart.js guide` | `node tools/chart.js render <spec.json> [output.html]` |
| Administrative regions are part of the finding and need map callouts | `regional-breakdown` | `node tools/chart.js regional-guide russia` | `node tools/chart.js regional <spec.json> [output.html]` |

Choose one workflow before writing the spec. A `map.regional` spec is rejected by
the standard render command and redirected to the regional workflow.

The shared lifecycle is:

```text
source and evidence
        |
        v
semantic ChartSpec JSON
        |
        v
validation -> selected renderer -> shell review
                                      |
                                      v
                         browser diagnostics -> optional screenshot
```

## Requirements

- Node.js 20 or newer.
- A modern browser to view charts.
- Microsoft Edge or Google Chrome for browser diagnostics and screenshots.
- Internet access when loading a chart, because AMCharts and Mukta are loaded from CDNs.

There are no npm runtime dependencies. Set `TOCHNYI_BROWSER` when the browser
executable is installed in a nonstandard location.

## Workflow commands

### Orientation and contracts

```bash
node tools/chart.js orient [region-set]
node tools/chart.js guide [region-set]
node tools/chart.js regional-guide [region-set]
node tools/chart.js catalog
node tools/chart.js regions [region-set]
```

These commands return machine-readable JSON. `orient` is the routing decision;
`guide` and `regional-guide` are the detailed authoring contracts.

### Standard chart

Use the standard workflow when geography is not the primary visual structure:

```bash
node tools/chart.js validate specs/examples/ai95-price-spike.json
node tools/chart.js render specs/examples/ai95-price-spike.json
node tools/chart.js diagnose charts/2026-week-30/russia-ai95-price-spike-2026.html
```

`render` performs validation and shell review. `diagnose` launches the browser
at the default responsive viewports and exits nonzero when error-level layout
issues are found. Use `--single` for a targeted viewport or `--fit` when strict
viewport containment is part of the check.

### Regional breakdown

Use the regional workflow only for geographic findings with highlighted regions:

```bash
node tools/chart.js regional-guide russia
node tools/chart.js regions russia
node tools/chart.js validate specs/examples/russia-regional-map.json
node tools/chart.js regional specs/examples/russia-regional-map.json
```

The regional command validates, renders, performs shell review, and runs the
desktop/tablet/mobile diagnostics used by the regional workflow. It reports the
resolved routing mode, placement mode, crossings, collisions, fallback routes,
and source-exit routes for every viewport. It does not create a screenshot.

Use `--no-diagnose` only when a browser is unavailable. Use the generic review
command for human visual inspection:

```bash
node tools/chart.js review charts/<week>/<chart>.html \
  --screenshot --output previews/<chart>.png
```

The regional authoring contract and routing policy are documented in
[`docs/agent-workflows.md`](docs/agent-workflows.md) and
[`docs/regional-routing.md`](docs/regional-routing.md).

## Authoring contract

The model or agent owns:

- Source, date, period, and evidence.
- Calculations that are not directly derivable by the renderer.
- The finding, title, subtitle, recipe, labels, statuses, and concise details.
- Stable region identifiers for regional maps.

The renderer owns:

- HTML, CSS, AMCharts configuration, and JavaScript.
- Scales, axes, colors, typography, spacing, animation, and branding.
- Responsive layout, label placement, map projection, callout placement, and leader routing.

ChartSpec files cannot contain HTML, JavaScript, CSS, templates, inline styles,
coordinates, pixel geometry, or generated SVG paths. The validator rejects
implementation fields and unknown schema fields.

The formal schema is [`schemas/chart-spec.schema.json`](schemas/chart-spec.schema.json).
The machine-readable recipe catalog is [`recipes/catalog.json`](recipes/catalog.json).
Every recipe has a validated fixture under [`specs/examples/`](specs/examples/).

### Minimal standard spec

```json
{
  "version": "2.0",
  "recipe": "comparison.change",
  "title": "Ai-95 prices moved above 80,000 rubles per ton",
  "subtitle": "The latest exchange price is 10,000 rubles above the prior reading.",
  "date": "2026-07-26",
  "source": {
    "name": "Saint Petersburg International Mercantile Exchange",
    "period": "July 2026"
  },
  "data": [
    { "label": "Before", "value": 70000, "displayValue": "70,000 rubles" },
    { "label": "Latest", "value": 80000, "displayValue": "80,000 rubles", "tone": "critical" }
  ],
  "measure": { "unit": "RUB/ton", "decimals": 0 },
  "metadata": { "slug": "russia-ai95-price-spike-2026" }
}
```

### Minimal regional spec

```json
{
  "version": "2.0",
  "recipe": "map.regional",
  "title": "Regional fuel conditions",
  "date": "2026-08-02",
  "source": { "name": "Underlying publication", "period": "July 2026" },
  "data": [
    {
      "label": "Omsk region",
      "regionId": "RU-OMS",
      "status": "improving",
      "displayValue": "Limits lifted",
      "detail": "A concise explanation of the regional condition."
    }
  ],
  "map": { "regionSet": "russia" },
  "metadata": { "slug": "regional-fuel-conditions" }
}
```

Regional data items need `label` and `regionId` or `regionIds`, plus at least one
of `status`, `displayValue`, `detail`, or `value`. Author stable IDs, not
coordinates. Leave automatic map layout and routing fields out of the spec;
use only the documented semantic overrides when the story requires them.

## Verification

The test layers are intentionally separate:

```bash
npm test                  # deterministic unit and workflow tests
npm run test:workflow     # agent orientation and CLI route tests
npm run test:browser      # browser-backed standard/regional comparison
npm run test:performance  # dense regional planner budget
npm run test:comparison   # workflow contract plus browser comparison
npm run test:all          # all automated layers
```

Additional checks and fixture generators:

```bash
npm run diagnostics       # diagnostics self-test
npm run examples          # render every recipe fixture
npm run visual            # render fixtures and capture preview manifest
npm run samples           # render editorial samples from input.txt
npm run layout            # synthetic label-layout regression
npm run quality           # full automated and visual quality pipeline
```

The browser test skips with a clear reason when Edge or Chrome is unavailable.
The full testing strategy, comparison contract, and performance budget are in
[`docs/testing.md`](docs/testing.md).

## Project structure

```text
schemas/                  ChartSpec schema
recipes/                  Recipe catalog
specs/examples/           One validated fixture per recipe
specs/samples/             Editorial sample specs
renderer/                 Validation, workflows, rendering, review, capture
lib/                      Shared runtime, visual plan, maps, styles, diagnostics
tools/chart.js             Agent-facing CLI
tests/                    Unit, workflow, browser, and performance tests
docs/                     Agent workflow, routing, and testing guidance
charts/                   Generated HTML artifacts grouped by ISO week
previews/                 Generated screenshots and manifests
```

## Extending the system

To add a recipe:

1. Add the recipe to `recipes/catalog.json`.
2. Add schema constraints to `renderer/validate.js`.
3. Add the deterministic implementation to the shared runtime.
4. Add a fixture under `specs/examples/`.
5. Add unit, workflow, and browser coverage where the recipe changes layout behavior.
6. Run `npm run test:all`, then the relevant fixture and visual commands.

Keep implementation guidance in the renderer and technical docs. Keep the
agent skill focused on editorial decisions, semantic ChartSpec authoring, and
the correct workflow route.

Generated HTML and PNG output under `charts/` and `previews/` is intentionally
ignored. Recreate it with the documented render, sample, or visual commands;
the ChartSpec files remain the source of truth.
