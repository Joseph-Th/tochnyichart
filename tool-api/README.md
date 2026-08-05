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
input.txt
tool-api/chart.js
docs/batch-workflow.md
docs/agent-workflows.md
docs/source-enrichment.md
docs/source-ledger.md
schemas/chart-spec.schema.json
recipes/catalog.json
specs/examples/
specs/runs/<run-id>/
charts/<run-id>/
.work/<run-id>/
```

The normal authoring lifecycle is:

```text
exact project-root input.txt
    |
    v
inventory every quantitative story with exact excerpts
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
validate -> render -> diagnose or regional diagnostics -> final PNG for the batch run
```

## Batch orchestration

The normal user assignment is `input.txt`, which may contain multiple data
stories. The LLM agent, not the chart engine, owns the complete batch:

```text
initialize .work/<run-id>/
    -> input.txt
    -> reject missing or blank project-root input
    -> inventory every quantitative story with exact excerpts
    -> record selected, omitted, or merged disposition
    -> verify the source ledger before research
    -> preserve input-supported claims and enrich without originating stories
    -> choose the appropriate tool and chart workflow for each accepted story
    -> render and diagnose chart HTML
    -> capture final PNG images
    -> assemble one PowerPoint presentation
    -> save ChartSpecs and final delivery artifacts
    -> finalize and purge transient run data
```

Use `npm run run:init -- <run-id>` before production. Store research,
downloads, helper scripts, logs, review captures, and package staging only under
the created `.work/<run-id>/` tree. After delivery, run
`npm run run:finalize -- <run-id>`; it preserves
`specs/runs/<run-id>/` and `charts/<run-id>/` locally while removing transient
material and legacy previews. It also preserves `input.txt`. Both retained
production paths are ignored by Git. The run cannot finalize until
`.work/<run-id>/source-ledger.json` passes validation and exactly covers the
final ChartSpecs.

The Tool API is used once per accepted chart story. PowerPoint creation is a
separate agent capability and must use the final generated PNGs rather than
recreating the charts manually.

The canonical presentation filename is:

```text
tochnyi-charts-<run-id>.pptx
```

See [`docs/batch-workflow.md`](../docs/batch-workflow.md) for the complete batch
contract. See [`docs/source-ledger.md`](../docs/source-ledger.md) for the exact
ledger fields and evidence-origin rules.

## Source policy

Treat `input.txt` as expert-authored editorial evidence. Assume its factual
claims, values, comparisons, and interpretation are correct unless a reputable
source directly contradicts a material point. Entries are also routing
information and may not contain the complete chart dataset.

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
title must be supported by exact `input.txt` excerpts in the source ledger.
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

Use source attribution when an underlying publication or dataset is available. Omit the source when it is not. Presentation output must not mention `input.txt`, internal provenance, verification status, diagnostics, or workflow commentary.

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
node tool-api/chart.js render <spec.json> [output.html] [--run-id <id>]
node tool-api/chart.js regional <spec.json> [output.html] [--run-id <id>] [--no-diagnose]
node tool-api/chart.js diagnose <chart.html> [--single] [--fit]
node tool-api/chart.js review <chart.html> [--screenshot] [--output .work/<run-id>/review/<chart>.png]
```

The older `node tools/chart.js` entrypoint remains available for compatibility, but it is not the documented chart-author surface.

Final PNGs used in the run presentation belong beside the rendered HTML and PPTX in
`charts/<run-id>/`. Temporary or ad hoc review belongs in
`.work/<run-id>/review/` and is removed during finalization.
Production input, generated specifications, chart output, previews, and run
workspaces are ignored by Git and checked by `npm run check:repo`.
