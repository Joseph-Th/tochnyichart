# Agent Guide

**BCA policy:** advisory

**Profiles:** Universal, Agent Tool, Artifact Generation

This file is the execution card for Tochnyi Charts. The project applies the Universal, Agent Tool, and Artifact Generation portfolio profiles. `README.md` owns workflow orientation, `STATUS.md` owns supported scope, `docs/architecture.md` owns role/layer boundaries, `docs/testing.md` owns infrastructure verification, and the batch/source-ledger/authoring documents own their specialized contracts.

<!-- workspace-contract:begin (generated from ../AGENTS.md by tools/sync_agent_context.py; edit the source, not this copy) -->
## Workspace contract

Applies to every agent in every harness. Source, rationale, and evidence: [../AGENTS.md](../AGENTS.md).

The user is a solo developer. Precedence: the user's current request → this contract → the project card → standards references. **Hard** rules cannot be waived by lower-level workflow advice.

### AG-1 Finish the work

Finish the authorized task; a plan, progress update, or deferred note is not delivery. Delegate only bounded, read-only work when delegation is authorized.

### AG-2 Make the calls yourself

Make design and implementation decisions within scope; state consequential choices briefly and continue. Ask only when the answer changes the result and cannot be inferred. Read the project card once, then the task's authority, owner, and proof route. Begin when those are clear; expand for unclear scope or crossed boundaries. Links and profiles are lookups, not a recursive reading list. Use product workflows before internals for research or artifact authoring.

### AG-3 Stay in your project (hard)

Identify the requested project before working. Do not create top-level directories or write output to the workspace root or a project's parent. Scratch work belongs in the project's ignored output location (normally `target/agent-output/`) or OS temp.

### AG-4 Done means the user's copy works (hard)

Check every requested requirement against the actual result. Refresh and verify the affected release binary, deployed site, or running application the user uses; source edits alone do not update it. Documentation-only work verifies the delivered documents and routes. Use the smallest complete project verification lane, and [`REVIEW.md`](../REVIEW.md) for consequential code changes. Claim only what you checked; report unverified requirements.

### AG-5 Look at what you made

Render or run changed visual, audio, interactive, or published output and inspect it against the applicable [`STANDARDS_QUALITY.md`](../STANDARDS_QUALITY.md) rubric and references. Inspect individual assets at useful scales and angles, verify every requested file, and fix defects. Include rendered evidence in the report. Internal prose needs readability and route review only, not a publication workflow. Tests do not prove appearance.

### AG-6 Real behavior over proxies

Observe the behavior the user experiences. A passing test, harness, validator, or metric is evidence, not the goal. Repair harness/product divergence; never pass a gate by weakening it, hardcoding outcomes, suppressing warnings, or retrying until green. Simulations use causal, parameterized systems (STANDARDS_QUALITY.md QUAL-3).

### AG-7 Answer first, then stop talking

Answer questions directly; do not treat them as permission to act. Reports state what changed, verification and its limits, and any required user action. Put long audits or research in a project file and link it. No lectures or revisiting dismissed topics.

### AG-8 Own mistakes; trust the user's evidence

When the user reports a failure, re-check your work before blaming their setup. Own mistakes plainly and fix them. Try a tool, file, or capability before claiming it is unavailable.

### AG-9 The outcome outranks the process

If a procedure harms the requested result or costs more than it protects, favor the result and briefly state what you skipped. This does not waive hard rules.

### AG-10 Leave nothing running

Stop task-owned processes, servers, watchers, and terminals; release locks and remove your scratch output. Keep requested deliverables and the updated application the user is meant to run. Never kill or replace the user's program without saying so. Built software must clean up its own child processes on exit.

### AG-11 Git: `main`, commit, push (hard)

Work on `main`; create branches or worktrees only when asked. Commit and push verified work unless the user says not to. Preserve others' changes: never revert, stash, or discard them. Include sound shared progress when appropriate; leave clearly broken unrelated work out and report it.

### AG-12 Current docs describe the present

Update the single authority for changed behavior. Keep history, session notes, and changelogs out of current docs and comments. Plans and design intent do not prove implemented capability.

### AG-13 CI is local; GitHub Actions are banned (hard)

Use repository-owned local build, test, check, and audit commands. Never create, enable, invoke, or push `.github/workflows/`; remove existing workflow files while retaining their local verification equivalent.
<!-- workspace-contract:end -->

## Start here

1. Preserve unrelated source sets/run artifacts.
2. Use `README.md` to select the workflow; consult the relevant scope in `STATUS.md` and role contract in `docs/architecture.md`.
3. Choose the role before editing: batch orchestration, chart authoring, or infrastructure maintenance.
4. Normal chart production enters through `tool-api/chart.js`; renderer internals are infrastructure-only.
5. Batch changes read `docs/batch-workflow.md` and `docs/source-ledger.md` before changing inventory, selection, staging, or finalization.
6. Infrastructure changes read `docs/testing.md`, the owner implementation, and focused tests.

If architecture, source-ledger contracts, Tool API schemas, recipes, tests, and implementation disagree, repair the owning authority rather than adding workaround instructions.

## Role guardrails

- The exact `projects/<project-id>/input/` set and adjacent source ledger own batch evidence/disposition. `ChartSpec` owns semantic chart intent. Renderer code owns coordinates/CSS/library mechanics. Generated HTML/PNG/manifests/QA/PPTX are outputs, not authority.
- Preserve source anchors, explicit structured selectors/derivations, and selected/merged/omitted dispositions. External research may fill documented gaps or add relevant context but must not silently originate an unrelated story.
- Chart authors own evidence fidelity, safe derivation, editorial meaning, workflow/recipe selection, and semantic values. Authoring defects are fixed in source ledger/spec; rendering defects are fixed in infrastructure. Do not hand-edit generated HTML.
- Publication is staged. Failed rebuilds leave the prior valid delivery intact; successful rebuilds remove/regenerate downstream artifacts containing stale images; finalization purges transient work only after source/spec consistency checks.
- Tool API commands remain bounded, semantic, and machine-readable. Reject unsupported fields instead of silently ignoring them; do not leak renderer knobs into `ChartSpec`; orientation commands expose the public workflow without repository-wide exploration.
- Compatibility entrypoints remain only while documented/tested. Keep source orchestration outside renderer internals and renderer policy outside the batch layer.

## Verification

Use the narrowest relevant lane during iteration. Routine infrastructure completion is:

```text
npm test
```

Use `npm run test:comparison` when workflow/browser comparison is the changed contract and `npm run test:performance` when planner performance is the changed contract. `npm run test:all` is a broad automated checkpoint, not an automatic next step after a passing narrower lane. Use diagnostics/samples/visual/quality only for their owned surfaces. Machine tests do not replace source-fidelity/editorial review, and visual review does not replace schema/workflow verification.
