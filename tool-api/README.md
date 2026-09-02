# Tochnyi Charts Tool API

This directory is the public interface for chart-author agents.

A chart-author agent should treat the chart system as a tool, not as a repository to explore. The agent provides evidence and editorial meaning through a semantic `ChartSpec` JSON file. The deterministic engine validates that specification and owns all implementation details.

## Start

```bash
node tool-api/chart.js api
node tool-api/chart.js orient
```

`api` describes the available commands, resources, allowed work, and escalation boundary. `orient` selects exactly one workflow before a specification is written.

## Public surface

Chart-author agents may use:

```text
projects/<project-id>/
tool-api/chart.js
docs/batch-workflow.md
docs/agent-workflows.md
docs/source-enrichment.md
docs/source-ledger.md
schemas/chart-spec.schema.json
recipes/catalog.json
specs/examples/
```

The normal authoring lifecycle is:

```text
exact non-empty projects/<project-id>/input/ source set
    |
    v
inventory every source and quantitative story with excerpts or structured selectors
    |
    v
record selected, omitted, or merged disposition and verify the source ledger
    |
    v
preserve selected input claims and read supplied sources
    |
    v
extract evidence and safe derivations
    |
    v
conditionally fill material evidence gaps
    |
    v
select the central finding, workflow, and recipe
    |
    v
semantic ChartSpec JSON
    |
    v
validate -> image -> final PNG
```

The PNG is the primary individual-chart artifact. `image` performs the renderer routing and target-size browser checks itself. Use `render`, `regional`, `diagnose`, and `review` when HTML-level inspection or responsive debugging is specifically needed.

Fixed publishing profiles keep their exact output dimensions while allowing the renderer to adapt its internal chart-stage height. The structured `image` result reports `profile.fitMode` (`natural`, `shrink`, or `fill`) and `profile.stageDelta`; these are diagnostic outcomes, not ChartSpec controls.

## Project orchestration

The normal user assignment is `projects/<project-id>/input/`, which may
contain multiple files and multiple data stories. The LLM agent, not the chart
engine, owns the complete batch:

```text
projects/<project-id>/input/
    -> initialize the project
    -> reject a missing or empty project-local source set
    -> inventory every supplied source file and quantitative story
    -> record selected, omitted, or merged disposition
    -> verify the source ledger before research
    -> preserve input-supported claims and enrich without originating stories
    -> record routingAudit and choose the appropriate tool and chart workflow for each accepted story
    -> render and diagnose chart HTML
    -> capture final PNG images
    -> assemble a PowerPoint presentation only when requested
    -> save ChartSpecs and final delivery artifacts in the same project folder
    -> finalize and delete only work/
```

Create `projects/<project-id>/input/`, put the source files there, then use
`npm run run:init -- <project-id>`. The project keeps `input/`,
`source-ledger.json`, `project.json`, `specs/`, `output/`, and `work/` together.
Only `work/` is transient. Scratch subfolders are created on demand, and chart
build staging also stays there. After delivery, run
`npm run run:finalize -- <project-id>`; it verifies source/spec consistency and
removes only `work/`. The entire `projects/` tree is ignored by Git.

The Tool API is used once per accepted chart story. PowerPoint creation is a
separate agent capability and must use the final generated PNGs rather than
recreating the charts manually.

The canonical presentation filename is:

```text
tochnyi-charts-<project-id>.pptx
```

See [`docs/batch-workflow.md`](../docs/batch-workflow.md) for the complete batch
contract. See [`docs/source-ledger.md`](../docs/source-ledger.md) for the exact
ledger fields and evidence-origin rules.

## Source policy

Treat the initialized `projects/<project-id>/input/` files as the authoritative
assignment source set. Assume supplied factual claims, values, comparisons, and
interpretation are correct unless a reputable source directly contradicts a
material point. Structured files may support findings through documented
selectors, filters, groupings, or calculations rather than literal prose
excerpts.

Confirm that a supplied URL used for supplementation matches the story and read
the full source before recipe selection. Extract directly relevant comparators,
components, causes, consequences, forecasts, scale, denominators, and underlying
datasets when they strengthen the same central claim.

Search beyond the supplied source when a material evidence gap remains or useful
attribution and context can be added. Prefer the underlying official dataset,
company filing, named report, or reputable Russian business publication before
broader research. Additional context must fill a defined role in magnitude,
comparison, mechanism, or consequence.

External research may not originate a story. The subject, central claim, and
title must be supported by the recorded `input/` evidence in the source ledger:
exact excerpts for prose or explicit selectors/derivations for structured data.
After inventory, a supplied source or directly relevant dataset may provide
actual levels that express the same anchored percentage or indexed change more
clearly. External facts may also supplement comparison, denominator, mechanism,
consequence, context, or attribution.

External silence is not contradiction. Do not delete, downgrade, replace, or
label an input claim `uncorroborated`, `unsupported`, or `not independently
confirmed` merely because a second source was not found. Only a direct material
contradiction from a reputable source should be escalated for editorial
resolution.

Do not add facts merely to make a chart more complex or visually varied. A simple comparison is correct when the contrast itself is the complete story.

The complete contract, safe-derivation rules, research order, and relevance test are in [`docs/source-enrichment.md`](../docs/source-enrichment.md).

Every selected source-ledger candidate must record `routingAudit` before its
ChartSpec is authored. Multiple named administrative regions plus a spatial
finding such as spread, border contrast, clustering, adjacency, distribution,
or concentration require `geographyRole: "explanatory"` and
`workflow: "regional-breakdown"`; source/spec verification rejects a later
ranking or bar chart that contradicts that route.

For two positive level values, prefer one `comparison.benchmark-gap` row when
one value is naturally the current or actual value and the other is a prior
level, standard, limit, target, or benchmark. Do not default to two independent
bars. Benchmark labels use the renderer's fixed below-bar lanes and collision
handling.

Do not use dot-counting charts. A story with only two exact count categories
must gain a third comparable count, a tangible denominator or population, a
meaningful benchmark, or a time series before it is selected as a standalone
chart. Different-unit numeric context does not satisfy this gate.

When positive values are additive components of one reported total, use
`composition.components`. Every component starts at zero and the total is one
numeric reference. `flow.waterfall` is reserved for a genuine existing balance
moving through exact changes; it must not be used for a simple component
decomposition.

`flow.waterfall` is a strict exception to ordinary numeric charting. Use it
only for one exact reported quantity moving through additive steps to a
reported endpoint. Every item must declare `valueStatus: "reported"`, the same
`period`, and the same `scope`; the validator checks the running arithmetic and
rejects bounds, approximations, derived openings, and mixed periods. If a source
describes a loss plus incomplete or prior-period charges, use a headline or
comparison instead of manufacturing a pre-charge result.

## Boundary

During normal chart production, do not inspect or modify:

```text
renderer/
lib/
tests/
tools/
```

Do not edit generated HTML or PNG artifacts.

Use source attribution when an underlying publication or dataset is available. Omit the source when it is not. Presentation output must not mention internal input paths, provenance mechanics, verification status, diagnostics, or workflow commentary.

Correct the ChartSpec when the problem concerns data, source fidelity, copy, recipe choice, statuses, region IDs, or semantic structure. If a valid specification still produces a rendering, layout, planner, or diagnostic failure, report an infrastructure issue. Only enter implementation directories when the user explicitly requests infrastructure maintenance.

## Commands

```bash
node tool-api/chart.js api [region-set]
node tool-api/chart.js orient [region-set]
node tool-api/chart.js guide [region-set]
node tool-api/chart.js regional-guide [region-set]
node tool-api/chart.js catalog
node tool-api/chart.js regions [region-set]
node tool-api/chart.js validate <spec.json>
node tool-api/chart.js image <spec.json> [output.png] [--profile auto|landscape|square|portrait] [--project-id <id>]
node tool-api/chart.js render <spec.json> [output.html] [--project-id <id>]
node tool-api/chart.js regional <spec.json> [output.html] [--project-id <id>] [--no-diagnose]
node tool-api/chart.js diagnose <chart.html> [--single] [--fit]
node tool-api/chart.js review <chart.html> [--screenshot] [--output projects/<project-id>/work/review/<chart>.png]
```

`catalog` returns the recipe definitions together with the standard selection
rules, close-alternative ambiguity checks, runtime dependency contract, and
static-image priorities needed to choose among them,
so an agent can make the common recipe decision from one machine-readable
response.

`relationship.scatter` is the bounded two-measure relationship recipe. Each
observation supplies `xValue` plus the ordinary `value`; `xMeasure` names and
units the horizontal quantity while `measure` owns the vertical quantity. Both
axes are linear in the initial contract, every point remains directly labeled,
and the renderer does not infer a regression line, bubble size, or third color
variable. Use it only when both numeric variables are observed for every
labeled item; ordered time remains `trend.line`.

When two neighboring recipes remain plausible, use `ambiguityRules` to reject
the closest alternative explicitly. Typical boundaries include benchmark-gap
versus change, scenarios versus dumbbell, matrix versus ranking, scatter versus
trend/ranking, trend versus duration timeline, positive components versus waterfall, and categorical
geography versus a regional map. This is a semantic check, not a requirement to
render several competing charts.

Use `image` for the normal individual-chart deliverable. With no explicit output
path, `--project-id <id>` is required and the PNG is published to
`projects/<id>/output/`. There is no implicit default project. The default
`auto` profile starts standard charts at 1200×900 and regional maps at their
maintained 1450×679 wide canvas; it may expand only to avoid clipping.
`landscape` is fixed at 1200×900, `square` at 1080×1080, and `portrait` at
1080×1350. Fixed profiles fail rather than silently changing shape when the
chart does not fit. These profiles are publishing intents, not author-accessible
layout coordinates. `--run-id` remains accepted only as a compatibility alias
for `--project-id`.

The older `node tools/chart.js` entrypoint remains available for compatibility, but it is not the documented chart-author surface.

The current browser capture stack is not fully offline. The Tool API reports
`runtimeDependencies.offlineReady: false`. Core amCharts scripts are pinned to
a reviewed release; the Mukta webfont and Russia geodata remain remote
provider-managed dependencies. Offline packaging is maintainer work, not a
ChartSpec option.

Batch final PNGs and retained HTML belong in `projects/<project-id>/output/`;
any requested presentation belongs there as well. Authored production ChartSpecs
belong in the same project's `specs/`. An individual `image` call does not retain
HTML unless the author separately requests a render. Temporary or ad hoc review
belongs in `projects/<project-id>/work/review/` and is removed during
finalization. The entire local `projects/` tree is ignored by Git and checked by
`npm run check:repo`.
