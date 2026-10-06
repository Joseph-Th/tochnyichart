# Current Status

**Document role:** Current supported capability and explicit exclusions for Tochnyi Charts. This file answers what the repository supports now. It does not own renderer implementation, editorial policy detail, package versioning, historical rationale, or future work.

Read [`README.md`](README.md) for the operating workflow, [`docs/architecture.md`](docs/architecture.md) for role and dependency boundaries, [`docs/testing.md`](docs/testing.md) for verification, and [`docs/source-ledger.md`](docs/source-ledger.md) for the source-evidence contract. `package.json` owns the package version, Node engine requirement, and script names.

## Supported product surface

Tochnyi Charts currently provides a declarative, validated chart-production system for LLM and human chart authors.

The supported authoring model is:

```text
verified evidence
  -> source ledger
  -> semantic ChartSpec
  -> Tool API validation
  -> deterministic renderer
  -> static capture diagnostics
  -> final PNG artifact
```

Chart authors provide evidence, calculations, editorial meaning, workflow selection, and semantic `ChartSpec` values. The engine owns HTML structure, CSS, typography, chart-library configuration, coordinates, responsive layout, map geometry, callout placement, diagnostics, and capture behavior.

Generated HTML is not an editable source of truth inside this repository.

Generated chart HTML is self-contained and renders offline. The engine
stylesheet and scripts, the Mukta webfont, and brand images are inlined into
every file from `lib/` and `vendor/` (checksummed in `vendor/manifest.json`).
Standard charts are drawn as plain SVG by the engine; only regional maps also
inline amCharts 5.20.3 and the Russia geodata. Each delivered PNG has a companion HTML of
the same name whose embedded `ChartSpec` and editing guide let a recipient, or
their assistant, change the chart without this repository.

## Supported project boundary

Every production assignment has one local folder:

```text
projects/<project-id>/
├── input/
├── source-ledger.json
├── project.json
├── specs/
├── output/
└── work/
```

The exact `projects/<project-id>/input/` directory is the source boundary for
that project. A project begins by inventorying and hashing those source files.

- `input/`, `source-ledger.json`, `specs/`, and `output/` are durable project material.
- `work/` is the only disposable subtree and is removed by finalization.
- Optional research, download, review, render, and staging folders are created under `work/` only when a tool needs them; initialization does not pre-create empty scratch directories.
- Prose may be anchored by exact excerpts.
- Structured sources may use explicit selectors and documented groupings or calculations.
- The generated source ledger records selected, merged, omitted, and conflicted story decisions.
- External research may enrich an input-supported story under the source policy but does not silently originate unrelated stories.

`input.txt`, repository-root `input/`, `.work/`, `specs/runs/`, and `charts/` are
legacy locations and are not used for new projects. Legacy durable output is
never deleted implicitly.

## Supported chart workflows

The public chart-author entrypoint is `tool-api/chart.js`.

Current workflow families are:

| Workflow | Supported role |
| --- | --- |
| `standard-chart` | Numbers, comparisons, rankings, status lists, composition, trends, flows, sequences, and other non-map stories supported by the recipe catalog. |
| `regional-breakdown` | Findings where supported administrative geography is explanatory and the regional workflow is selected by the documented routing contract. |

The semantic contract is owned by `schemas/chart-spec.schema.json`, `recipes/catalog.json`, and Tool API validation. Unknown or forbidden fields are rejected rather than treated as hidden renderer controls.

The standard recipe catalog includes one- and two-dimensional quantitative
contracts. `matrix.heat` preserves complete categorical row×column evidence;
`relationship.scatter` preserves two distinct measured numeric variables per
labeled observation through `xMeasure`/`xValue` and `measure`/`value`. Scatter
does not infer regression, causality, bubble size, or a third color variable.
The source ledger verifies both plotted coordinates before batch publication.
`comparison.grouped` carries cross-tabs of one quantity (categories × 2–4
series) and side-by-side panels of related measures for the same categories,
with optional labeled benchmark references; the validator rejects compound
"A · B" labels that flatten such a cross-tab into a ranking, scenario, or
scatter chart.

Standard charts carry the large centered watermark at a faint 4.25% opacity
(maps keep a restrained mark behind geography), draw quantitative fills at 90%
opacity without outlines, and place the source at the left, an
optional note centered, and credits at the right of the footer. They use the
full publishing column, and on a fixed image profile the chart stage grows or
shrinks so the page fills the canvas from header to footer. Columns, waterfalls,
rankings, diverging bars, trends, stacked trends, donuts, scatters, and area
squares are laid out from the measured stage with text measured in the loaded
webfont; every mark is labelled directly and axis ticks stay numeric with the
unit named once above the plot.

Where the evidence already defines a comparison, the renderer draws it rather
than leaving it to the reader. A `comparison.scenarios` set with exactly one
`neutral` item treats that item as the baseline: its level is ruled across the
chart and every alternative states its distance from it. A multi-series trend
of six or fewer periods labels every reading on its line and ends each line
with the series name, latest value, and change over the plotted span. A single
series of twelve or fewer periods always states its first and last reading,
and, for a level with no authored `emphasis`, the change between them;
`options.showLabels: false` only drops the readings in between. Distances are
percentages for levels and points for values that are already percentages.

For an individual chart, `node tool-api/chart.js image` is the primary static-output command. It validates the specification, routes standard versus regional rendering, captures the final PNG at a maintained output profile, and retains no HTML shell. `render`, `regional`, `diagnose`, and `review` remain supported inspection and debugging surfaces. Standard charts default to fixed `landscape` at 1600×900 and fail instead of expanding when they do not fit. Regional maps default to the adaptive `auto` profile. `auto` remains available as an explicit variable-height standard-chart opt-in, while fixed `square` and `portrait` profiles express other publishing shapes without exposing arbitrary pixel geometry to chart authors.

## Supported project lifecycle

The maintained lifecycle is:

```text
run:init
  -> complete source ledger
  -> run:verify-source
  -> author selected ChartSpecs
  -> run:charts
  -> optional requested PowerPoint assembly
  -> run:finalize
```

The chart builder verifies source/spec coverage, routes each specification through its supported workflow, renders charts, runs browser diagnostics, captures standard-chart PNGs at fixed 1600×900 landscape and regional-map PNGs on the maintained adaptive wide canvas, and writes manifest/plan/QA artifacts under the same project's `output/` folder.

Publication stages inside `projects/<project-id>/work/`. A failed rebuild must leave the previous valid `output/` untouched. A successful chart rebuild invalidates downstream artifacts that would embed stale chart images.

Finalization removes only `projects/<project-id>/work/` after source-ledger and ChartSpec consistency checks pass. It preserves the project folder, input, ledger, specs, output, and project manifest.

## Current artifact boundary

The following are generated delivery or evidence artifacts, not architecture authorities:

- rendered HTML;
- final PNG images;
- manifests and QA reports;
- presentation plans;
- optional requested PowerPoint files;
- transient research notes, captures, logs, downloads, and staging data under the project's `work/` subtree.

Production artifacts must be regenerated from current semantic inputs rather than manually repaired after rendering.

## Compatibility surface

`tool-api/chart.js` is the documented public chart-author interface.

`tools/chart.js` remains a compatibility implementation entrypoint as described by [`docs/architecture.md`](docs/architecture.md). Its presence does not make renderer internals part of the chart-author API.

## Explicit exclusions

The current supported product does not treat these as normal authoring behavior:

- manually editing generated HTML to fix a chart;
- chart authors selecting low-level CSS, chart-library, coordinate, map-projection, or label-routing implementation knobs;
- using renderer internals as ordinary chart-author context;
- bypassing the source ledger for normal batch production;
- treating browser diagnostics as proof of editorial or factual correctness;
- treating external-search silence as proof that supplied editorial evidence is false;
- treating an optional PowerPoint deck as mandatory when the requested deliverable does not include one;
- treating ignored project artifacts as repository architecture authorities rather than project-local data.
- describing the current browser renderer as fully offline-reproducible while remote font and regional-geodata dependencies remain.

## Verification

Use the narrowest lane owned by [`docs/testing.md`](docs/testing.md). Routine infrastructure completion is `npm test`; `npm run test:comparison` owns workflow/browser comparison, `npm run test:performance` owns planner performance, and `npm run test:all` is the broad automated checkpoint when a change spans those surfaces. Broader rendering review uses the documented diagnostics, samples, and visual lanes only when their contracts change.

Repository hygiene is checked separately through the maintained repository-hygiene script.

Do not copy transient test counts or one-run success claims into this file.

## Authority rule

If this file says a capability is supported but the public Tool API, schema/recipe contract, batch workflow, tests, or implementation no longer provide it, that disagreement is a current-contract defect. Reconcile the owning authority and this status document in the same coherent change.

Future features and experiments do not become supported merely by existing in source. They become part of this boundary only when their public contract, verification, and documentation are deliberately updated.
