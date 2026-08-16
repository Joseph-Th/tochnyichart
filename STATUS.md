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
  -> browser diagnostics
  -> final HTML/PNG delivery artifacts
```

Chart authors provide evidence, calculations, editorial meaning, workflow selection, and semantic `ChartSpec` values. The engine owns HTML structure, CSS, typography, chart-library configuration, coordinates, responsive layout, map geometry, callout placement, diagnostics, and capture behavior.

Generated HTML is not an editable source of truth.

## Supported batch input

The exact project-root `input/` directory is the current batch source boundary.

- A run begins by inventorying and hashing the source files under `input/`.
- Prose may be anchored by exact excerpts.
- Structured sources may use explicit selectors and documented groupings or calculations.
- The generated source ledger records selected, merged, omitted, and conflicted story decisions.
- External research may enrich an input-supported story under the source policy but does not silently originate unrelated stories.

`input.txt` is not the current batch-input contract for this repository. Do not substitute a sibling repository, prior run, or alternate input path.

## Supported chart workflows

The public chart-author entrypoint is `tool-api/chart.js`.

Current workflow families are:

| Workflow | Supported role |
| --- | --- |
| `standard-chart` | Numbers, comparisons, rankings, status lists, composition, trends, flows, sequences, and other non-map stories supported by the recipe catalog. |
| `regional-breakdown` | Findings where supported administrative geography is explanatory and the regional workflow is selected by the documented routing contract. |

The semantic contract is owned by `schemas/chart-spec.schema.json`, `recipes/catalog.json`, and Tool API validation. Unknown or forbidden fields are rejected rather than treated as hidden renderer controls.

## Supported batch lifecycle

The maintained run lifecycle is:

```text
run:init
  -> complete source ledger
  -> run:verify-source
  -> author selected ChartSpecs
  -> run:charts
  -> optional requested PowerPoint assembly
  -> run:finalize
```

The chart builder verifies source/spec coverage, routes each specification through its supported workflow, renders charts, runs browser diagnostics, captures final PNGs, and writes run-level manifest/plan/QA artifacts.

Publication uses a staged directory. A failed rebuild must leave the previous valid delivery untouched. A successful chart rebuild invalidates downstream artifacts that would embed stale chart images.

Finalization removes transient run workspace material only after source-ledger and ChartSpec consistency checks pass. It preserves the retained specification and delivery trees defined by the batch workflow.

## Current artifact boundary

The following are generated delivery or evidence artifacts, not architecture authorities:

- rendered HTML;
- final PNG images;
- manifests and QA reports;
- presentation plans;
- optional requested PowerPoint files;
- transient research notes, captures, logs, downloads, and staging data under the run workspace.

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
- treating ignored run artifacts as repository architecture or durable source-of-truth documents.

## Verification

Use the narrowest lane owned by [`docs/testing.md`](docs/testing.md). The maintained complete automated suite is exposed by `npm run test:all`; broader rendering review uses the documented diagnostics, samples, and visual lanes when their contracts change.

Repository hygiene is checked separately through the maintained repository-hygiene script.

Do not copy transient test counts or one-run success claims into this file.

## Authority rule

If this file says a capability is supported but the public Tool API, schema/recipe contract, batch workflow, tests, or implementation no longer provide it, that disagreement is a current-contract defect. Reconcile the owning authority and this status document in the same coherent change.

Future features and experiments do not become supported merely by existing in source. They become part of this boundary only when their public contract, verification, and documentation are deliberately updated.
