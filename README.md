# Tochnyi Charts

Tochnyi Charts is a deterministic chart engine with a constrained Tool API for
LLM and human chart authors. Authors provide evidence and editorial meaning in a
compact `ChartSpec` JSON file. The engine owns HTML, CSS, chart configuration,
typography, layout, maps, diagnostics, and export behavior.

Generated HTML is an output artifact. Do not edit it directly.

[`STATUS.md`](STATUS.md) owns the current supported capability and exclusion boundary. Read it before assuming that an input form, workflow, compatibility entrypoint, artifact, or orchestration step is supported merely because related code or historical output exists. Repository contributors and coding agents start with [`AGENTS.md`](AGENTS.md); chart-author agents that only need the public authoring surface start with [`tool-api/README.md`](tool-api/README.md).

The repository has three explicit operating roles:

- **Batch orchestrator:** owns the complete source-set run, source-ledger decisions,
  enrichment, chart/slide routing, delivery assembly, and finalization. It uses the
  Tool API for individual charts and does not implement renderer behavior.
- **Chart author:** uses `tool-api/`, the schema, catalog, and examples for one
  verified data story.
- **Infrastructure maintainer:** works on rendering, validation, diagnostics,
  tests, and Tool API implementation only when that work is explicitly requested.

See [`docs/architecture.md`](docs/architecture.md) for the boundary.

## Primary batch workflow

The normal job begins with a user-supplied source folder:

```text
input/
```

The folder may contain prose briefs, CSV/TSV data, JSON, notebooks, or other
supporting material. The LLM agent is the batch orchestrator. It inventories the
exact project-root source set, records a selected, omitted, or merged disposition
for each proposed story, inventories every materially relevant same-scale
observation in `visualEvidenceAudit`, verifies that ledger, and only then enriches
the selected input-supported stories. Prose sources use exact excerpts; structured
data may use explicit file selectors and documented groupings or calculations.
The agent renders accepted charts, captures final PNG images, and assembles a
PowerPoint presentation when the assignment calls for one.

Initialize a disposable run workspace before reading the input:

```bash
npm run run:init -- <run-id>
```

Initialization fails when `input/` is missing or contains no source files and
creates `.work/<run-id>/source-ledger.json` with a deterministic file inventory,
per-file hashes, and a source-set hash. Never substitute a sibling project or
prior batch. Complete the ledger and verify it before research:

```bash
npm run run:verify-source -- <run-id>
```

The run ID is an opaque caller-supplied label. It may be a date, issue number,
client slug, or another stable identifier. The renderer never derives storage
paths from chart dates.

All research notes, downloads, helper scripts, logs, review captures, and package
staging must stay under `.work/<run-id>/`. Only `specs/runs/<run-id>/` and
`charts/<run-id>/` are retained locally. `input/`, generated specifications,
charts, previews, and workspaces are ignored by Git. After the selected
ChartSpecs are complete, build every chart in ledger order with one command:

```bash
npm run run:charts -- <run-id>
```

This command verifies source/spec coverage, routes standard and regional
charts correctly, runs responsive browser diagnostics, captures the final PNGs,
and writes `manifest.csv`, `presentation-plan.json`, and `qa-report.json` in
`charts/<run-id>/`.
It publishes through a staged directory, so a failed rebuild leaves the prior
delivery untouched. A successful chart rebuild removes any prior presentation
and chart-image archive because those files would contain stale images.
PowerPoint assembly remains an optional orchestration step when the requested
deliverable includes a deck. After delivery, finalize the run:

```bash
npm run run:finalize -- <run-id>
```

Finalization removes the run workspace and legacy `previews/`. It preserves
`input/` and never deletes `specs/` or `charts/`. It refuses to finalize
unless the selected source-ledger slugs and titles exactly match the ChartSpecs.

```text
input/
    -> hashed source-set inventory
    -> complete anchored/derived source ledger
    -> complete same-scale observation inventory
    -> verified selected, omitted, or merged decisions
    -> input-supported stories enriched with supplemental context
    -> selected chart or slide treatment
    -> ChartSpec files
    -> rendered HTML charts
    -> final PNG images
    -> optional PowerPoint presentation
    -> charts/<run-id>/
```

The chart Tool API produces individual chart artifacts. The run chart builder
coordinates verified specifications through rendering, diagnostics, PNG
capture, and QA reporting. When requested, PowerPoint assembly belongs to the LLM orchestration
layer and must follow `presentation-plan.json`: one slide per accepted chart,
with no cover, title, agenda, divider, or closing slide unless the user explicitly
requested one.

The complete batch contract is in
[`docs/batch-workflow.md`](docs/batch-workflow.md). The ledger format is defined
in [`docs/source-ledger.md`](docs/source-ledger.md).

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
| Administrative regions are part of the finding | `regional-breakdown` | `node tool-api/chart.js regional-guide russia` | `node tool-api/chart.js regional <spec.json> [output.html]` |

Verify and read the full primary source before choosing the workflow and recipe.
Then choose one workflow before writing the spec. A `map.regional` spec is
rejected by the standard render command and redirected to the regional workflow.

Route by meaning, not by chart type. The complete geography-first decision
contract and `routingAudit` requirements are owned by
[`docs/agent-workflows.md`](docs/agent-workflows.md) and
[`docs/source-ledger.md`](docs/source-ledger.md); the Tool API enforces the
selected route.

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

Validation and responsive diagnostics prove machine-checkable rendering
contracts, not editorial correctness. Inspect the final output, and use the
dedicated authoring authorities below for evidence and visual-story rules.

The shared-scale, mixed-unit relationship, comparable-observation,
normalization, thin-story, benchmark, duration, trend, composition, and
waterfall rules are owned by
[`docs/story-selection.md`](docs/story-selection.md). Source-family sweeps,
safe derivations, representation research, and evidence-gap policy are owned by
[`docs/source-enrichment.md`](docs/source-enrichment.md). The source ledger owns
the machine-checked evidence inventory and dispositions.

## Requirements

- Node.js satisfying the `engines.node` requirement in `package.json`.
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
node tool-api/chart.js render specs/examples/ai95-price-spike.json --run-id examples
node tool-api/chart.js diagnose .work/examples/rendered/russia-ai95-price-spike-2026.html
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
node tool-api/chart.js regional specs/examples/russia-regional-map.json \
  --run-id examples
```

Example and smoke-test renders must use an explicit path under `.work/`.
Pass an explicit `--run-id`; otherwise the renderer uses the isolated
`.work/default/` workspace. It never writes default output into `charts/`.

The regional command validates, renders, performs shell review, and runs the
desktop/tablet/mobile diagnostics used by the regional workflow. It reports the
resolved routing mode, placement mode, crossings, collisions, fallback routes,
and source-exit routes for every viewport. It does not create a screenshot.

Use `--no-diagnose` only when a browser is unavailable. Use the generic review
command for human visual inspection:

```bash
node tool-api/chart.js review charts/<run-id>/<chart>.html \
  --screenshot --output .work/<run-id>/review/<chart>.png
```

The chart-author contract is documented in
[`docs/agent-workflows.md`](docs/agent-workflows.md). The source-enrichment,
safe-derivation, research-order, and relevance rules are in
[`docs/source-enrichment.md`](docs/source-enrichment.md). The shared-scale,
mixed-evidence, composition-value, pictogram, and regional information-economy
contracts are in [`docs/story-selection.md`](docs/story-selection.md). Regional routing
internals are maintainer-only and documented in `docs/regional-routing.md`.

Final run delivery uses `charts/<run-id>/`. The folder contains the
rendered HTML files, final PNG images, `manifest.csv`, `presentation-plan.json`,
and `qa-report.json`. When a deck is requested, it also contains
`tochnyi-charts-<run-id>.pptx`; finalization reads its slide count and rejects a
deck that does not contain exactly the chart slides listed in the plan.
Temporary review images belong under the
matching `.work/<run-id>/review/` directory and are deleted at finalization.

## Authoring contract

The model or agent owns:

- Source, date, period, and evidence.
- Calculations that are not directly derivable by the renderer.
- The finding, title, subtitle, recipe, labels, statuses, and concise details.
- Stable region identifiers for regional maps.

The chart-author workflow, source enrichment policy, and story-selection rules
are intentionally separate current authorities:

- [`docs/agent-workflows.md`](docs/agent-workflows.md) owns the public authoring
  sequence and role boundary.
- [`docs/source-enrichment.md`](docs/source-enrichment.md) owns source-family
  review, research order, safe derivations, and representation research.
- [`docs/story-selection.md`](docs/story-selection.md) owns evidence sufficiency,
  shared-scale semantics, recipe-selection constraints, and copy economy.
- [`docs/source-ledger.md`](docs/source-ledger.md) owns batch evidence inventory,
  dispositions, routing, and machine-checked provenance fields.

Those documents, the schema, catalog, and Tool API validation are the current
authoring contract. Do not maintain a second copy of their detailed semantic
rules in this repository overview.

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
npm run samples           # render curated editorial sample fixtures
npm run layout            # synthetic label-layout regression
npm run quality           # full automated and visual quality pipeline
npm run check:repo        # reject tracked inputs, generated specs, charts, and other run data
npm run run:init -- <id>  # create one isolated transient workspace
npm run run:verify-source -- <id> # validate the complete anchored story inventory
npm run run:charts -- <id> # render, diagnose, capture, and manifest the complete selected chart set
npm run run:flush -- <id> # remove one transient workspace, preserving input
npm run run:finalize -- <id> # verify source/spec coverage, then clean transient work
npm run run:reset         # cold reset all transient work, preserving input
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
specs/runs/               Local production ChartSpecs, ignored by Git
renderer/                 Validation, workflows, rendering, review, capture
lib/                      Shared runtime, visual plan, maps, styles, diagnostics
tools/                    Internal scripts and compatibility CLI implementation
tests/                    Unit, workflow, browser, and performance tests
docs/                     Architecture, author, maintainer, routing, and testing guidance
charts/                   Local run delivery: HTML, final PNG, QA artifacts, and optional presentation by run ID
.work/                    Disposable research, scripts, logs, review, and staging by run id
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

Generated delivery output under `charts/` and transient output under `.work/`
is intentionally ignored. Production ChartSpecs under `specs/runs/` and the
user-supplied `input/` source set are also ignored. Curated fixtures under
`specs/examples/`, `specs/samples/`, and `specs/stress/` remain tracked.
