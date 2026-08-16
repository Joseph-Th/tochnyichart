# Agent Guide

This repository follows [`../STANDARDS.md`](../STANDARDS.md). The applicable profiles are Universal, Agent Tool, and Artifact Generation. Tochnyi Charts separates batch source orchestration, semantic chart authoring, and deterministic rendering infrastructure; preserve those boundaries.

When multiple agents may be active in this workspace, read [`../COORDINATION.md`](../COORDINATION.md) and the live [`../COORDINATION_STATUS.md`](../COORDINATION_STATUS.md) before the first consequential write. Coordination claims reserve active write scope only; they do not override the source-set ledger, batch workflow, Tool API, schema/recipe, infrastructure, or staged-publication authorities below.

## Cold start

1. Run `git status --short` and preserve unrelated source sets and run artifacts.
2. Read [`STATUS.md`](STATUS.md) before assuming a workflow, input form, artifact, or compatibility surface is currently supported.
3. Read `README.md` and [`docs/architecture.md`](docs/architecture.md) to identify whether the task belongs to batch orchestration, chart authoring, or infrastructure maintenance.
4. For normal chart production, enter through `tool-api/chart.js` and the documented authoring surface. Do not inspect renderer internals unless the task explicitly concerns infrastructure.
5. For batch changes, read `docs/batch-workflow.md` and `docs/source-ledger.md` before changing source inventory, selection, staging, or finalization.
6. For infrastructure changes, read `docs/testing.md`, the owning implementation, and focused tests before editing.

If README guidance, architecture docs, source-ledger contracts, Tool API schemas, recipes, tests, and implementation disagree, treat the contradiction as a defect. Repair the owning authority and dependents instead of adding workaround instructions.

## Authority and role boundaries

| Question | Authority |
| --- | --- |
| Repository orientation and primary workflow | `README.md` |
| Current supported capability and explicit exclusions | `STATUS.md` |
| Operational layer and role ownership | `docs/architecture.md` |
| Batch source inventory and production sequence | `docs/batch-workflow.md`, `docs/source-ledger.md` |
| Chart-author behavior | `docs/agent-workflows.md`, `tool-api/README.md` |
| Semantic chart contract | `schemas/chart-spec.schema.json`, `recipes/catalog.json`, Tool API validation |
| Infrastructure behavior and test lanes | owning implementation modules and `docs/testing.md` |

Generated HTML is an output artifact. `ChartSpec` is the semantic source for a chart; renderer code owns implementation details. Final PNG, QA, manifest, archive, and optional PPTX outputs are delivery artifacts.

## Source-set discipline

The exact project-root `input/` directory is the batch source boundary. Initialization hashes and inventories that source set before story selection.

- Do not substitute a sibling repository, prior run, or convenient alternate input folder.
- Prose evidence should remain anchored to exact excerpts; structured files may use explicit selectors and documented calculations/groupings.
- Every selected, merged, or omitted story must remain represented in the source ledger according to its schema.
- External research may fill a documented evidence gap or add relevant context under the repository source policy; it must not silently originate an unrelated story.
- A direct material contradiction should be surfaced for editorial resolution rather than silently rewriting supplied evidence.

## Chart-author contract

Chart authors own evidence fidelity, safe derivations, editorial meaning, workflow/recipe selection, and semantic `ChartSpec` values. They do not own CSS, HTML structure, chart-library configuration, coordinates, map projection, label routing, or other renderer implementation details.

- Fix authoring problems in the source ledger or ChartSpec.
- Fix rendering defects in infrastructure under an explicit infrastructure task.
- Never hand-edit generated HTML as a production repair.
- Automatic validation and browser diagnostics do not establish editorial correctness or visual persuasiveness.

## Artifact publication

The run builder publishes through staging. Preserve the guarantee that a failed rebuild leaves the prior valid delivery untouched.

- Do not expose a partial `charts/<run-id>/` rebuild as complete.
- A successful chart rebuild must remove or regenerate downstream artifacts that embed stale images.
- PowerPoint is optional and belongs to orchestration only when the requested deliverable includes a deck.
- Finalization may purge transient `.work/<run-id>/` data only after source-ledger and ChartSpec consistency checks pass.
- Regenerate HTML/PNG/manifest/QA/deck artifacts from current semantic inputs rather than patching delivery files manually.

## Agent Tool rules

Keep the Tool API bounded, semantic, and machine-readable.

- Prefer structured validation/failure results over prose parsing.
- Reject unknown or forbidden semantic fields rather than silently ignoring them.
- Do not leak internal rendering knobs into the public ChartSpec merely to bypass an infrastructure change.
- Orientation commands should expose the supported public workflow without requiring repository-wide exploration.
- Compatibility entrypoints remain only while explicitly documented and tested; `tool-api/chart.js` is the public authoring surface.

## Verification

Use the narrowest relevant test during iteration. The complete automated suite is:

```text
npm run test:all
```

Use `npm run diagnostics`, `npm run samples`, and `npm run visual` for their owned rendering surfaces. `npm run quality` combines those broader checks.

Machine tests do not replace source-fidelity review, and visual review does not replace schema or workflow verification.

## Complexity control

Extend the semantic API only for a genuine new authoring meaning. Keep source orchestration outside renderer internals and renderer policy outside the LLM batch layer. Avoid one-off low-level fields, manual artifact corrections, or alternative rendering paths that create a second implementation of the chart contract.
