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

## Primary batch workflow

The normal job begins with one user-supplied file:

```text
input.txt
```

The LLM agent is the batch orchestrator. It reads the exact project-root file,
inventories every quantitative story with exact excerpts, records a selected,
omitted, or merged disposition, verifies that ledger, and only then enriches the
selected input-supported stories. It renders the accepted charts, captures final
PNG images, assembles those images into a PowerPoint presentation, and saves the
complete delivery in the run delivery folder.

Initialize a disposable run workspace before reading the input:

```bash
npm run run:init -- <run-id>
```

Initialization fails when `input.txt` is missing or blank and creates
`.work/<run-id>/source-ledger.json` with the input hash. Never substitute a
sibling project file, prior batch, or alternate brief. Complete the ledger and
verify it before research:

```bash
npm run run:verify-source -- <run-id>
```

The run ID is an opaque caller-supplied label. It may be a date, issue number,
client slug, or another stable identifier. The renderer never derives storage
paths from chart dates.

All research notes, downloads, helper scripts, logs, review captures, and package
staging must stay under `.work/<run-id>/`. Only `specs/runs/<run-id>/` and
`charts/<run-id>/` are retained locally. `input.txt`, generated specifications,
charts, previews, and workspaces are ignored by Git. After the selected
ChartSpecs are complete, build every chart in ledger order with one command:

```bash
npm run run:charts -- <run-id>
```

This command verifies source/spec coverage, routes standard and regional
charts correctly, runs responsive browser diagnostics, captures the final PNGs,
and writes `manifest.csv` plus `qa-report.json` in `charts/<run-id>/`.
It publishes through a staged directory, so a failed rebuild leaves the prior
delivery untouched. A successful chart rebuild removes any prior presentation
and chart-image archive because those files would contain stale images.
PowerPoint assembly remains an orchestration step. After delivery, finalize the
run:

```bash
npm run run:finalize -- <run-id>
```

Finalization removes the run workspace and legacy `previews/`. It preserves
`input.txt` and never deletes `specs/` or `charts/`. It refuses to finalize
unless the selected source-ledger slugs and titles exactly match the ChartSpecs.

```text
input.txt
    -> complete anchored source ledger
    -> verified selected, omitted, or merged decisions
    -> input-supported stories enriched with supplemental context
    -> selected chart or slide treatment
    -> ChartSpec files
    -> rendered HTML charts
    -> final PNG images
    -> PowerPoint presentation
    -> charts/<run-id>/
```

The chart Tool API produces individual chart artifacts. The run chart builder
coordinates verified specifications through rendering, diagnostics, PNG
capture, and QA reporting. PowerPoint assembly belongs to the LLM orchestration
layer.

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
periods. When two drivers and one outcome jointly carry the argument but use
different quantities, use `relationship.converging-signals` rather than forcing
them onto one axis. The renderer gives each factor and the outcome an independent
local quantitative signal, then converges the factor paths at one operator.
Connector width is fixed and never implies comparable magnitude. Reserve
`relationship.mode: "identity"` for exactly reconciling scope and periods; use
`directional` with an explicit note when the evidence only supports the direction
of the relationship. Keep merely secondary mixed-unit context in the unboxed
`supportingFacts` rail.

A two-item `comparison.scenarios` chart is not automatically sufficient. It
must add a numeric reference, basis, or source-supported numeric mechanism,
consequence, denominator, or comparison fact. Before giving a simple pair its
own slide, check whether it belongs inside an existing same-topic chart. If it
cannot be enriched and does not carry a distinct editorial conclusion, merge or
omit it.

Use `comparison.benchmark-gap` with one row when one actual-plus-benchmark
relationship is the complete story. The actual segment, gap segment, and
benchmark marker already supply distinct marks. Do not add another row that is
only the benchmark endpoint or the derived remainder. For discounts, plot the
underlying discounted price as `value`, the undiscounted reference price as
`benchmark`, and the discount as `gapDisplayValue`; never plot the discount
amount itself as the actual level.

Use `comparison.dumbbell` when several categories each have two comparable
values, such as before and after or benchmark and actual. It preserves the
direction and magnitude of every category-level movement without duplicating a
pair of bars for each category.

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
rendered HTML files, the final PNG images used in the deck, and
`tochnyi-charts-<run-id>.pptx`. Temporary review images belong under the
matching `.work/<run-id>/review/` directory and are deleted at finalization.

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

Comparable evidence that proves the title cannot be reduced to supporting
facts. Three or more ordered observations establishing slowdown, acceleration,
reversal, or persistence must be plotted as `trend.line`. Mixed-unit signals
that jointly define a claim, such as falling purchase volume, rising prices,
and rising spending, belong in `relationship.converging-signals` or separate
complete charts.

“Both values are percentages” is not a valid comparison rule. Shared-axis marks
must measure the same real-world quantity for the same scope. Composition charts
should retain tangible absolute values in `displayValue`, and single headline
metrics may use progress or pictogram treatments only when a real denominator
or counted population exists.

Percentage evidence must also be anchored when its basis is recoverable. Rate
and share stories audit `basisAvailability`; reported or retrievable
numerator/denominator or population/affected amounts become the primary level
geometry. The percentage remains secondary copy, and a `basis` rail alone is
not sufficient. The total population or denominator must also be visible as a
point, reference, benchmark, or complete composition. Before a batch ledger may
classify actual levels or a basis as
unavailable or incomparable, it must name the exact tangible value sought and
record at least two completed, source-specific checks spanning two source
types, including a data-bearing source. Pending or generic lookup notes are
rejected.

Percentage-only prices, workforce, exports, production, spending, and revenue
must trigger a search for the underlying amounts for the same scope and periods.
Workforce research must include the company filing or official employee
disclosure for the relevant reporting perimeter. Consumption and coverage
stories must use an official or industry denominator when available.
Synthetic 100-based indexes and fabricated 0% starting observations are
rejected. `valueMode: "index"` is reserved for named, source-reported indices
with actual point values, and generic visible labels such as `100 index` or
`index points` are not permitted.

Use `comparison.pictogram` for two to four exact counts from 0 to 400 when one
symbol per unit makes the magnitude difference tangible. Use
`timeline.duration` whenever duration is the comparison. It accepts exact
start-to-end intervals or one verified `timeline.anchorDate` plus exact
`duration` and `durationUnit` values. Use segmented
`comparison.benchmark-gap` geometry for prices, costs, freight, margins,
discounts, premiums, shortfalls, or overages where the prior or total benchmark
can be recovered. Risk ranges must identify the exposed population or
denominator, show that total on the plotted scale, and include at least one
mechanism or consequence. Shipment or reserve volumes described as days of
consumption must show a consumption benchmark or be converted to coverage time.

`subtitle` is optional. Omit it when it repeats the title, category labels,
percentages, or amounts already printed on the chart. Two-part compositions use
one label treatment per segment, inside when both segments fit and outside when
one does not.

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
npm run samples           # render curated editorial sample fixtures
npm run layout            # synthetic label-layout regression
npm run quality           # full automated and visual quality pipeline
npm run check:repo        # reject tracked inputs, generated specs, charts, and other run data
npm run run:init -- <id>  # create one isolated transient workspace
npm run run:verify-source -- <id> # validate the complete anchored story inventory
npm run run:charts -- <id> # render, diagnose, capture, and manifest the complete selected chart set
npm run run:flush -- <id> # remove one transient workspace, preserving input
npm run run:finalize -- <id> # verify source/spec coverage, then clean transient work
npm run run:reset         # cold reset all transient work and input
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
charts/                   Local run delivery: HTML, final PNG, and presentation by run ID
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
user-supplied `input.txt` are also ignored. Curated fixtures under
`specs/examples/`, `specs/samples/`, and `specs/stress/` remain tracked.
