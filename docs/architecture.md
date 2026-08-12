# Architecture

Tochnyi Charts has three deliberately separate operational layers.

## 1. LLM batch orchestration

The LLM agent receives `input/` and owns the complete batch production job.

```text
initialize .work/<run-id>/
    |
    v
input/
    |
    v
story parsing, source verification, enrichment, and tool selection
    |
    v
individual chart production through the Tool API
    |
    v
final PNG capture and optional PowerPoint assembly
    |
    v
charts/<run-id>/
    |
    v
finalize and purge transient run data
```

The orchestrator decides which stories are accepted, merged, omitted, or
rendered as charts. It also creates a PowerPoint presentation from accepted
chart images when the requested deliverable includes one.

The orchestrator does not implement chart layout or renderer behavior.

## 2. Tool API

The Tool API is the individual chart-production surface. It is designed for
LLMs and humans producing one chart from one verified data story.

```text
chart author
    |
    v
tool-api/chart.js + ChartSpec contract
    |
    v
deterministic chart engine
    |
    v
HTML, diagnostics, and final PNG for the batch run
```

The Tool API exposes:

- Source verification, enrichment, derivation, and relevance policy.
- Workflow orientation and recipe guidance.
- The `ChartSpec` schema and recipe catalog.
- Validated examples.
- Validation, rendering, diagnostics, and review commands.
- Structured JSON results and failure signals.

The Tool API does not inventory the complete batch `input/` source set or assemble the
PowerPoint deck. It also does not expose implementation decisions. Chart authors
do not choose chart-library configuration, HTML structure, CSS, typography,
color policy, coordinates, responsive geometry, map projection, callout
placement, or leader routing.

The public entrypoint is:

```bash
node tool-api/chart.js
```

The machine-readable manifest is:

```bash
node tool-api/chart.js api
```

## 3. Deterministic infrastructure

The infrastructure implements the Tool API. It is maintainer-facing software rather than chart-author context.

It owns:

- Schema and editorial validation.
- Recipe-specific visual planning.
- HTML shell generation.
- Runtime chart and map rendering.
- Responsive layout and label placement.
- Regional projection, callout placement, and leader routing.
- Browser diagnostics, screenshots, and performance checks.
- Automated tests and fixture generation.

Infrastructure work is performed only when the task explicitly concerns the engine, validation rules, rendering behavior, diagnostics, performance, tests, or extension of the Tool API.

## Role boundary

### Batch orchestrator

The batch orchestrator may read or write:

```text
input/
docs/batch-workflow.md
docs/agent-workflows.md
docs/source-enrichment.md
specs/runs/<run-id>/
charts/<run-id>/
.work/<run-id>/
```

It interprets the source set, conducts source work, invokes the Tool API for each
accepted chart, captures final PNGs, optionally assembles
`tochnyi-charts-<run-id>.pptx`, finalizes the run workspace, and reports
omissions or failures.

`input/`, `.work/`, `charts/`, `previews/`, and production specifications
outside the curated fixture directories are ignored by Git. The repository
hygiene check rejects them if they are force-added.

### Chart author

A chart author may read or write:

```text
tool-api/
docs/batch-workflow.md
docs/agent-workflows.md
docs/source-enrichment.md
schemas/chart-spec.schema.json
recipes/catalog.json
specs/examples/
specs/runs/<run-id>/
charts/<run-id>/
.work/<run-id>/
```

A chart author verifies and enriches source evidence, corrects semantic inputs, and reports infrastructure defects. It does not investigate implementation code during normal chart production.

### Infrastructure maintainer

An infrastructure maintainer may work across:

```text
renderer/
lib/
tools/
tests/
schemas/
recipes/
docs/regional-routing.md
docs/testing.md
```

A maintainer changes the deterministic implementation and preserves the public Tool API contract.

## Failure boundary

Failures are classified before files are changed.

| Failure type | Owner | Correct action |
| --- | --- | --- |
| Duplicate, weak, or non-visual story derived from `input/` | Batch orchestrator | Merge or omit it and report the decision. Do not omit a supplied editorial claim merely because external search is silent. |
| Reputable source directly contradicts a material input claim | Batch orchestrator | Preserve both positions in working notes and escalate for editorial resolution. Do not silently rewrite the supplied evidence. |
| A requested deck is missing after accepted charts are complete | Batch orchestrator | Assemble the PowerPoint from the final PNGs and save it in the run delivery folder. |
| Supplied URL does not match the input note | Chart author | Resolve or report the mismatch. Do not silently combine the sources. |
| Primary source lacks a material comparator, denominator, scale, or explanation | Chart author | Research only the named evidence gap using the documented source order. |
| Additional context is adjacent but does not strengthen the central claim | Chart author | Exclude it. Do not add noise for visual complexity. |
| Wrong source, value, date, unit, calculation, title, label, status, or recipe | Chart author | Revise the ChartSpec. |
| Unknown or forbidden ChartSpec field | Chart author | Use the schema and documented semantic fields. |
| Invalid regional identifier | Chart author | Use the region registry. |
| Valid ChartSpec produces broken rendering, unresolved collision, clipping, or incorrect diagnostics | Infrastructure maintainer | Record the failure and repair the engine under an explicit infrastructure task. |
| Generated HTML needs manual editing | Neither | Fix the ChartSpec or engine and regenerate the artifact. |

## Dependency direction

The dependency direction is one-way:

```text
LLM batch orchestration
    |
    v
Tool API contract
    |
    v
workflow adapters
    |
    v
renderer and runtime libraries
```

Implementation modules may satisfy the Tool API. The Tool API must not require chart authors to understand implementation modules.

## Compatibility

`tools/chart.js` remains available as the original implementation entrypoint. `tool-api/chart.js` is the documented public entrypoint and currently delegates to it. This preserves existing integrations while making the authoring boundary explicit.
