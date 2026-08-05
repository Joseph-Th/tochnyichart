# Tochnyi Charts

Tochnyi Charts is a deterministic chart engine with a constrained Tool API for
LLM and human chart authors. Authors provide evidence and editorial meaning in a
compact `ChartSpec` JSON file. The engine owns HTML, CSS, chart configuration,
typography, layout, maps, diagnostics, and export behavior.

Generated HTML is an output artifact. Do not edit it directly.

The repository has two explicit roles:

- **Chart author:** uses `tool-api/`, the schema, catalog, and examples.
- **Infrastructure maintainer:** works on rendering, validation, diagnostics,
  tests, and Tool API implementation only when that work is explicitly requested.

See [`docs/architecture.md`](docs/architecture.md) for the boundary.

## Primary weekly workflow

The normal job begins with one user-supplied file:

```text
input.txt
```

The LLM agent is the batch orchestrator. It reads the complete file, separates it
into distinct data stories, verifies and enriches the sources, decides which
production tool and chart workflow each story requires, renders the accepted
charts, captures final PNG images, assembles those images into a PowerPoint
presentation, and saves the complete delivery in the weekly chart folder.

```text
input.txt
    -> parsed and verified data stories
    -> selected chart or slide treatment
    -> ChartSpec files
    -> rendered HTML charts
    -> final PNG images
    -> PowerPoint presentation
    -> charts/YYYY-week-WW/
```

The chart Tool API produces individual chart artifacts. PowerPoint assembly and
weekly batch coordination belong to the LLM orchestration layer.

The complete batch contract is in
[`docs/batch-workflow.md`](docs/batch-workflow.md).

## Start here

Ask the tool to orient the work before authoring a specification:

```bash
node tool-api/chart.js api
node tool-api/chart.js orient
```

There are two intentionally separate workflows:

| Story | Workflow | First command | Render command |
| --- | --- | --- | --- |
| Number, comparison, ranking, status list, composition, trend, flow, or sequence without a map | `standard-chart` | `node tool-api/chart.js guide` | `node tool-api/chart.js render <spec.json> [output.html]` |
| Administrative regions are part of the finding and need map callouts | `regional-breakdown` | `node tool-api/chart.js regional-guide russia` | `node tool-api/chart.js regional <spec.json> [output.html]` |

Verify and read the full primary source before choosing the workflow and recipe.
Then choose one workflow before writing the spec. A `map.regional` spec is
rejected by the standard render command and redirected to the regional workflow.

Route by meaning, not by chart type. A regional status list, ranking, or
comparison still belongs to `regional-breakdown` when the distribution across
administrative regions changes the finding. Use `standard-chart` only when
place names are labels or categories and geography adds no explanatory value.
For batch work, record this decision for every story in a routing matrix before
authoring specs; any standard-chart decision involving place names needs an
explicit rationale.

The per-chart lifecycle inside that batch is:

```text
input note or assignment
        |
        v
source verification and full-source review
        |
        v
evidence extraction and safe derivations
        |
        v
conditional gap-filling research
        |
        v
central finding, workflow, and recipe
        |
        v
semantic ChartSpec JSON
        |
        v
validation -> selected renderer -> shell review
                                      |
                                      v
                         browser diagnostics -> semantic QA -> final PNG
```

Validation and responsive diagnostics do not prove that a chart is editorially
correct. Inspect the rendered output and reject it if the visual grammar does
not match the evidence, qualifiers are lost, values are falsely precise, or a
reader must mentally reconstruct the takeaway.

Before using any shared-axis comparison, complete this sentence literally:
`Every mark encodes [measure.quantity] for [data.scope] in [data.period].` The
validator requires those fields and rejects unlike quantities, scopes, and
periods. When heterogeneous evidence jointly carries the argument, split it
into separate ChartSpecs. Keep secondary mixed-unit context in the unboxed
`supportingFacts` rail rather than substituting a grid of metric cards for a
chart.

Use `flow.waterfall` only for a source-supported start-to-end bridge whose
same-scope values reconcile arithmetically. Do not infer an exact opening value
from `more than`, `about`, or incomplete charges. When the bridge is uncertain,
prefer a simpler comparison or headline with supporting facts.

The Tool API makes this a hard contract: every waterfall item must declare
`valueStatus: "reported"`, the same `period`, and the same `scope`. Missing,
derived, bounded, approximate, or non-reconciling steps are rejected. Operating
profit is not automatically a pre-charge net result, and a prior-period expense
cannot be inserted into a current-period bridge.

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
node tool-api/chart.js api [region-set]
node tool-api/chart.js orient [region-set]
node tool-api/chart.js guide [region-set]
node tool-api/chart.js regional-guide [region-set]
node tool-api/chart.js catalog
node tool-api/chart.js regions [region-set]
```

These commands return machine-readable JSON. `orient` is the routing decision;
`guide` and `regional-guide` are the detailed authoring contracts.

### Standard chart

Use the standard workflow when geography is not the primary visual structure:

```bash
node tool-api/chart.js validate specs/examples/ai95-price-spike.json
node tool-api/chart.js render \
  specs/examples/ai95-price-spike.json \
  previews/examples/russia-ai95-price-spike-2026.html
node tool-api/chart.js diagnose previews/examples/russia-ai95-price-spike-2026.html
```

`render` performs validation and shell review. `diagnose` launches the browser
at the default responsive viewports and exits nonzero when error-level layout
issues are found. Use `--single` for a targeted viewport or `--fit` when strict
viewport containment is part of the check.

### Regional breakdown

Use the regional workflow only for geographic findings with highlighted regions:

```bash
node tool-api/chart.js regional-guide russia
node tool-api/chart.js regions russia
node tool-api/chart.js validate specs/examples/russia-regional-map.json
node tool-api/chart.js regional \
  specs/examples/russia-regional-map.json \
  previews/examples/russia-regional-map.html
```

Example and smoke-test renders must use an explicit path under `previews/`.
Do not allow fixtures to use their default dated output path because that mixes
test artifacts into a weekly delivery folder.

The regional command validates, renders, performs shell review, and runs the
desktop/tablet/mobile diagnostics used by the regional workflow. It reports the
resolved routing mode, placement mode, crossings, collisions, fallback routes,
and source-exit routes for every viewport. It does not create a screenshot.

Use `--no-diagnose` only when a browser is unavailable. Use the generic review
command for human visual inspection:

```bash
node tool-api/chart.js review charts/<week>/<chart>.html \
  --screenshot --output previews/<chart>.png
```

The chart-author contract is documented in
[`docs/agent-workflows.md`](docs/agent-workflows.md). The source-enrichment,
safe-derivation, research-order, and relevance rules are in
[`docs/source-enrichment.md`](docs/source-enrichment.md). The shared-scale,
mixed-evidence, composition-value, pictogram, and regional information-economy
contracts are in [`docs/story-selection.md`](docs/story-selection.md). Regional routing
internals are maintainer-only and documented in `docs/regional-routing.md`.

Final weekly delivery uses `charts/YYYY-week-WW/`. The folder contains the
rendered HTML files, the final PNG images used in the deck, and
`tochnyi-charts-YYYY-week-WW.pptx`. The `previews/` directory remains available
for temporary or ad hoc review images.

## Authoring contract

The model or agent owns:

- Source, date, period, and evidence.
- Calculations that are not directly derivable by the renderer.
- The finding, title, subtitle, recipe, labels, statuses, and concise details.
- Stable region identifiers for regional maps.

An input note, headline, excerpt, or `input.txt` entry is routing information,
not the complete chart dataset. The chart author must verify supplied links,
read the full primary source, and extract all evidence that materially supports
the same central claim before selecting a recipe.

Search beyond the primary source only to fill a named material evidence gap.
Prefer the underlying official dataset, company filing, or named report before
another article from the same publisher. Reject context that is merely adjacent,
interesting, or useful only for making the chart look more complex.

A simple two-value chart remains correct when the contrast itself is the full
story. The objective is information density within one claim, not maximum data
volume or visual novelty.

“Both values are percentages” is not a valid comparison rule. Shared-axis marks
must measure the same real-world quantity for the same scope. Composition charts
should retain tangible absolute values in `displayValue`, and single headline
metrics may use progress or pictogram treatments only when a real denominator
or counted population exists.

Source attribution is optional. Include the underlying publication or dataset when available and omit the source line when it is not. Never place `input.txt`, internal provenance, verification labels, diagnostics, or workflow commentary in chart or presentation copy.

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
    {
      "label": "Before",
      "quantity": "AI-95 wholesale price",
      "scope": "Saint Petersburg commodity exchange AI-95 gasoline",
      "period": "Before July 2026 spike",
      "value": 70000,
      "displayValue": "70,000 rubles"
    },
    {
      "label": "Latest",
      "quantity": "AI-95 wholesale price",
      "scope": "Saint Petersburg commodity exchange AI-95 gasoline",
      "period": "July 2026 peak",
      "value": 80000,
      "displayValue": "80,000 rubles",
      "tone": "critical"
    }
  ],
  "measure": {
    "quantity": "AI-95 wholesale price",
    "unit": "RUB/ton",
    "decimals": 0
  },
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
Russian regional maps use the continental mainland silhouette only. Kaliningrad
and island fragments are excluded from the geometry and cannot be active map
items; detached-region evidence must use a non-map recipe.

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
tool-api/                 Public chart-author CLI and boundary documentation
schemas/                  ChartSpec schema
recipes/                  Recipe catalog
specs/examples/           One validated fixture per recipe
specs/samples/             Editorial sample specs
renderer/                 Validation, workflows, rendering, review, capture
lib/                      Shared runtime, visual plan, maps, styles, diagnostics
tools/                    Internal scripts and compatibility CLI implementation
tests/                    Unit, workflow, browser, and performance tests
docs/                     Architecture, author, maintainer, routing, and testing guidance
charts/                   Weekly delivery: HTML, final PNG, and PPTX by ISO week
previews/                 Temporary review screenshots and manifests
```

## Extending the system

Extension is infrastructure-maintainer work. Normal chart-author agents should
report engine defects rather than entering implementation directories. See
[`docs/maintainer-workflows.md`](docs/maintainer-workflows.md).

To add a recipe:

1. Add the recipe to `recipes/catalog.json`.
2. Add schema constraints to `renderer/validate.js`.
3. Add the deterministic implementation to the shared runtime.
4. Add a fixture under `specs/examples/`.
5. Add unit, workflow, and browser coverage where the recipe changes layout behavior.
6. Run `npm run test:all`, then the relevant fixture and visual commands.

Keep implementation guidance in maintainer documentation. Keep the chart-author
skill and Tool API focused on editorial decisions, semantic ChartSpec authoring,
structured checks, and the correct workflow route.

Generated HTML and PNG output under `charts/` and `previews/` is intentionally
ignored. Recreate it with the documented render, sample, or visual commands;
the ChartSpec files remain the source of truth.
