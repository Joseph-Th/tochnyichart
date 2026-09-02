# Architecture

Tochnyi Charts has three deliberately separate operational layers.

## 1. LLM project orchestration

The LLM agent owns one complete `projects/<project-id>/` production job.

```text
projects/<project-id>/input/
    |
    v
initialize project, ledger, specs/, output/, work/
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
projects/<project-id>/output/
    |
    v
finalize and delete only work/
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
final PNG, with disposable HTML and diagnostics when needed
```

The Tool API exposes:

- Source verification, enrichment, derivation, and relevance policy.
- Workflow orientation and recipe guidance.
- The `ChartSpec` schema and recipe catalog.
- Validated examples.
- A first-class static `image` command that validates, routes, renders, diagnoses the target capture, and publishes a PNG without retaining its temporary HTML shell.
- Rendering, diagnostics, and review commands for HTML-level inspection.
- Structured JSON results and failure signals.

The Tool API does not inventory the complete project `input/` source set or assemble the
PowerPoint deck. It also does not expose implementation decisions. Chart authors
do not choose chart-library configuration, HTML structure, CSS, typography,
color policy, coordinates, responsive geometry, map projection, callout
placement, leader routing, or arbitrary image pixel dimensions. Authors may select a bounded publishing profile such as `auto`, `landscape`, `square`, or `portrait`; the renderer owns the actual canvas contract and fit behavior.

For fixed publishing profiles, the output dimensions remain exact while the renderer may shrink or expand its internal chart stage to use the available canvas without clipping. This adaptation is reported as result metadata (`fitMode` and `stageDelta`) and is never an author-facing geometry parameter.

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

The browser shell currently has an explicit external-runtime boundary. Core
amCharts JavaScript is loaded from a version-pinned CDN release. The Mukta
webfont and Russia geodata remain provider-managed remote dependencies, so the
current capture stack is not an air-gapped/offline bundle. That dependency
contract is machine-readable through the Tool API. Moving those assets local is
a maintainer dependency/licensing change, not a ChartSpec option and not a
reason for chart authors to edit generated HTML.

Infrastructure work is performed only when the task explicitly concerns the engine, validation rules, rendering behavior, diagnostics, performance, tests, or extension of the Tool API.

## Role boundary

### Batch orchestrator

The batch orchestrator may read or write:

```text
projects/<project-id>/
docs/batch-workflow.md
docs/agent-workflows.md
docs/source-enrichment.md
```

It interprets the source set, conducts source work, invokes the Tool API for each
accepted chart, captures final PNGs, optionally assembles
`tochnyi-charts-<project-id>.pptx`, finalizes the project work subtree, and reports
omissions or failures.

The entire `projects/` tree is ignored by Git. Legacy root `input/`, `.work/`,
`charts/`, and `specs/runs/` remain ignored only for migration safety. The
repository hygiene check rejects project-local data if it is force-added.

### Chart author

A chart author may read or write:

```text
tool-api/
projects/<project-id>/
docs/batch-workflow.md
docs/agent-workflows.md
docs/source-enrichment.md
schemas/chart-spec.schema.json
recipes/catalog.json
specs/examples/
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
| A requested deck is missing after accepted charts are complete | Batch orchestrator | Assemble the PowerPoint from the final PNGs and save it in `projects/<project-id>/output/`. |
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
