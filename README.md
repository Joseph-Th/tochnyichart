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

## Primary project workflow

The normal job lives in one folder:

```text
projects/<project-id>/
├── input/
├── source-ledger.json
├── project.json
├── specs/
├── output/
└── work/
```

The project's `input/` folder may contain prose briefs, CSV/TSV data, JSON, notebooks, or other
supporting material. The LLM agent is the batch orchestrator. It inventories the
exact project-local source set, records a selected, omitted, or merged disposition
for each proposed story, inventories every materially relevant same-scale
observation in `visualEvidenceAudit`, verifies that ledger, and only then enriches
the selected input-supported stories. Prose sources use exact excerpts; structured
data may use explicit file selectors and documented groupings or calculations.
The agent renders accepted charts, captures final PNG images, and assembles a
PowerPoint presentation when the assignment calls for one.

Create the project input folder, place the source material there, and initialize
the project:

```bash
mkdir -p projects/<project-id>/input
npm run run:init -- <project-id>
```

Initialization fails when `projects/<project-id>/input/` is missing or contains no source files and
creates `projects/<project-id>/source-ledger.json` with a deterministic file inventory,
per-file hashes, and a source-set hash. Never substitute a sibling project or
prior batch. Complete the ledger and verify it before research:

```bash
npm run run:verify-source -- <project-id>
```

The project ID is an opaque caller-supplied label. It may be a date, issue number,
client slug, or another stable identifier. The renderer never derives storage
paths from chart dates.

All durable material stays inside the same project. `input/`,
`source-ledger.json`, `project.json`, `specs/`, and `output/` are retained;
temporary research notes, downloads, helper scripts, logs, review captures,
renders, and staging stay under `work/`. Scratch subfolders are created only on
demand. Production project folders under `projects/<project-id>/` are ignored
by Git; the tracked `projects/README.md` keeps the entrypoint visible in a clean
checkout. After the selected
ChartSpecs are complete, build every chart in ledger order with one command:

```bash
npm run run:charts -- <project-id>
```

This command verifies source/spec coverage, routes standard and regional
charts correctly, runs responsive browser diagnostics, captures the final PNGs,
and writes `manifest.csv`, `presentation-plan.json`, and `qa-report.json` in
`projects/<project-id>/output/`.
It publishes through a staged directory, so a failed rebuild leaves the prior
delivery untouched. Staging lives inside the same project's `work/` subtree. A successful chart rebuild removes any prior presentation
and chart-image archive because those files would contain stale images.
PowerPoint assembly remains an optional orchestration step when the requested
deliverable includes a deck. After delivery, finalize the run:

```bash
npm run run:finalize -- <project-id>
```

Finalization removes only `projects/<project-id>/work/`. It preserves the
project input, ledger, manifest, specs, and output. It refuses to finalize
unless the selected source-ledger slugs and titles exactly match the ChartSpecs.

```text
projects/<project-id>/input/
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
    -> projects/<project-id>/output/
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

| Story | Workflow | First command | Primary image command |
| --- | --- | --- | --- |
| Number, comparison, ranking, composition, trend, flow, or sequence without a map | `standard-chart` | `node tool-api/chart.js guide` | `node tool-api/chart.js image <spec.json> [output.png]` |
| Administrative regions are part of the finding | `regional-breakdown` | `node tool-api/chart.js regional-guide russia` | `node tool-api/chart.js image <spec.json> [output.png]` |

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
                         target capture diagnostics -> semantic QA -> final PNG
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

Use the standard workflow when geography is not the primary visual structure. For the normal static artifact:

```bash
node tool-api/chart.js validate specs/examples/ai95-price-spike.json
node tool-api/chart.js image specs/examples/ai95-price-spike.json --profile auto --project-id examples
```

`image` validates, renders through a disposable shell, runs target-size browser diagnostics, and writes the PNG only after the capture is acceptable. Use `render` and `diagnose` for HTML-level inspection. `diagnose` launches the browser
at the default responsive viewports and exits nonzero when error-level layout
issues are found. Use `--single` for a targeted viewport or `--fit` when strict
viewport containment is part of the check.

Image profiles are bounded publishing intents. `auto` starts standard charts at 1200×900 and regional maps at 1450×679 and may expand only to avoid clipping. Fixed `landscape`, `square`, and `portrait` profiles use 1200×900, 1080×1080, and 1080×1350 respectively and fail rather than changing shape when content cannot fit.

### Regional breakdown

Use the regional workflow only for geographic findings with highlighted regions:

```bash
node tool-api/chart.js regional-guide russia
node tool-api/chart.js regions russia
node tool-api/chart.js validate specs/examples/russia-regional-map.json
node tool-api/chart.js regional specs/examples/russia-regional-map.json \
  --project-id examples
```

Example and smoke-test renders must use an explicit output path or an explicit
`--project-id`. There is no implicit `default` project. With `--project-id`,
HTML inspection output defaults to `projects/<project-id>/work/rendered/` and
final images default to `projects/<project-id>/output/`.

The regional command validates, renders, performs shell review, and runs the
desktop/tablet/mobile diagnostics used by the regional workflow. It reports the
resolved routing mode, placement mode, crossings, collisions, fallback routes,
and source-exit routes for every viewport. It does not create a screenshot.

Use `--no-diagnose` only when a browser is unavailable. Use the generic review
command for human visual inspection:

```bash
node tool-api/chart.js review projects/<project-id>/output/<chart>.html \
  --screenshot --output projects/<project-id>/work/review/<chart>.png
```

For a direct final regional PNG without retaining HTML, use:

```bash
node tool-api/chart.js image specs/examples/russia-regional-map.json --profile auto --project-id examples
```

The chart-author contract is documented in
[`docs/agent-workflows.md`](docs/agent-workflows.md). The source-enrichment,
safe-derivation, research-order, and relevance rules are in
[`docs/source-enrichment.md`](docs/source-enrichment.md). The shared-scale,
mixed-evidence, composition-value, pictogram, and regional information-economy
contracts are in [`docs/story-selection.md`](docs/story-selection.md). Regional routing
internals are maintainer-only and documented in `docs/regional-routing.md`.

Final project delivery uses `projects/<project-id>/output/`. The folder contains the
rendered HTML files, final PNG images, `manifest.csv`, `presentation-plan.json`,
and `qa-report.json`. When a deck is requested, it also contains
`tochnyi-charts-<project-id>.pptx`; finalization reads its slide count and rejects a
deck that does not contain exactly the chart slides listed in the plan.
Temporary review images belong under the
matching `projects/<project-id>/work/review/` directory and are deleted at finalization.

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
renderer/                 Validation, workflows, rendering, review, capture
lib/                      Shared runtime, visual plan, maps, styles, diagnostics
tools/                    Internal scripts and compatibility CLI implementation
tests/                    Unit, workflow, browser, and performance tests
docs/                     Architecture, author, maintainer, routing, and testing guidance
projects/                 Ignored local project folders: input, ledger, specs, output, and work
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

Production project folders under `projects/` are intentionally ignored; only
`projects/README.md` is tracked so the production entrypoint remains visible.
Each project keeps its input, ledger, ChartSpecs, delivery output, and disposable work together.
Legacy root `input/`, `.work/`, `charts/`, and `specs/runs/` remain ignored for
migration safety but are not used for new production. Curated fixtures under
`specs/examples/`, `specs/samples/`, and `specs/stress/` remain tracked.
