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
schemas/chart-spec.schema.json
recipes/catalog.json
specs/examples/
specs/YYYY-week-WW/
charts/
previews/
```

The normal authoring lifecycle is:

```text
input note or assignment
    |
    v
verify and read the full primary source
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
validate -> render -> diagnose or regional diagnostics -> final PNG for weekly batch
```

## Weekly batch orchestration

The normal user assignment is `input.txt`, which may contain multiple data
stories. The LLM agent, not the chart engine, owns the complete batch:

```text
input.txt
    -> parse and verify stories
    -> choose the appropriate tool and chart workflow for each accepted story
    -> render and diagnose chart HTML
    -> capture final PNG images
    -> assemble one PowerPoint presentation
    -> save HTML, PNG, and PPTX files in charts/YYYY-week-WW/
```

The Tool API is used once per accepted chart story. PowerPoint creation is a
separate agent capability and must use the final generated PNGs rather than
recreating the charts manually.

The canonical presentation filename is:

```text
tochnyi-charts-YYYY-week-WW.pptx
```

See [`docs/batch-workflow.md`](../docs/batch-workflow.md) for the complete batch
contract.

## Source policy

Treat an input note, headline, excerpt, or `input.txt` entry as routing information rather than the complete dataset.

Always verify that a supplied URL matches the story and read the full primary source before recipe selection. Extract directly relevant comparators, components, causes, consequences, forecasts, scale, denominators, and underlying datasets when they strengthen the same central claim.

Search beyond the primary source only when a material evidence gap remains. Prefer the underlying official dataset, company filing, or named report before searching for another publisher article. Additional context must fill a defined role in magnitude, comparison, mechanism, or consequence.

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
node tool-api/chart.js render <spec.json> [output.html]
node tool-api/chart.js regional <spec.json> [output.html] [--no-diagnose]
node tool-api/chart.js diagnose <chart.html> [--single] [--fit]
node tool-api/chart.js review <chart.html> [--screenshot] [--output preview.png]
```

The older `node tools/chart.js` entrypoint remains available for compatibility, but it is not the documented chart-author surface.

Final PNGs used in the weekly deck belong beside the rendered HTML and PPTX in
`charts/YYYY-week-WW/`. Use `previews/` only for temporary or ad hoc review.
