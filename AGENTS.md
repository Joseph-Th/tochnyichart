# Agent Guide

**BCA policy:** advisory

**Profiles:** Universal, Agent Tool, Artifact Generation

This file is the execution card for Tochnyi Charts. The project applies the Universal, Agent Tool, and Artifact Generation portfolio profiles. `README.md` owns workflow orientation, `STATUS.md` owns supported scope, `docs/architecture.md` owns role/layer boundaries, `docs/testing.md` owns infrastructure verification, and the batch/source-ledger/authoring documents own their specialized contracts.

<!-- workspace-contract:begin (generated from ../AGENTS.md by tools/sync_agent_context.py; edit the source, not this copy) -->
## Workspace contract

Applies to every agent in every harness. Source, rationale, and evidence: [../AGENTS.md](../AGENTS.md).

The user is a solo developer. Precedence: current request → this contract → project card → standards. This is a safety kernel, not a prescribed workflow. **Hard** rules survive lower-level advice.

### AG-1 Finish the work

Finish the authorized task. On open-ended goals, iterate from evidence until the goal is met or useful in-scope improvements are exhausted; pivot around blockers instead of stopping at them.

### AG-2 Make the calls yourself

Make routine in-scope decisions yourself. Read the project card once, identify the owner and proof route, then work. Ask only when a choice materially changes the deliverable and cannot be inferred.

### AG-3 Write only in your project (hard)

Write only in the requested project. Read-only sibling inspection is allowed when it materially helps. Do not write to the workspace root, parent, or siblings; use project-ignored output or OS temp for scratch.

### AG-4 Done means the user's copy works (hard)

Verify the result in the user's actual copy, including the release, deployment, or running app when applicable. Use the smallest complete project lane and [`REVIEW.md`](../REVIEW.md) for consequential code. Claim only checked results.

### AG-5 Look at what you made

Run or render changed visual, audio, interactive, or published output and inspect the real result against project references and [`STANDARDS_QUALITY.md`](../STANDARDS_QUALITY.md). Tests do not prove appearance.

### AG-6 Real behavior over proxies

Prefer observed product behavior over proxy success. Use tests, harnesses, validators, and metrics as evidence; fix production root causes and proxy divergence rather than weakening gates or hardcoding outcomes.

### AG-7 Answer first, then stop talking

Answer questions directly. Reports state changes, verification limits, and required user action; keep long audit material in project files instead of chat.

### AG-8 Own mistakes; trust the user's evidence

On a reported failure, re-check your work before blaming setup. Try a capability before claiming it is unavailable.

### AG-9 The outcome outranks the process

Skip ceremony and optional diagnostics when they cost more than they protect. Do not skip the proof required by AG-4 through AG-6 or any hard rule.

### AG-10 Leave nothing running

Run automation without disrupting the desktop. Stop task-owned processes, release locks, and remove scratch; never kill or replace the user's program silently.

### AG-11 Git: `main`, commit, push (hard)

Work on `main`; branches or worktrees only when asked. Commit and push verified work unless told not to. Stage task-owned paths explicitly in dirty trees and never discard or sweep in unrelated work.

### AG-12 Current docs describe the present

Update the authority for changed behavior. Keep history and session notes out of current docs and comments.

### AG-13 CI is local; GitHub Actions are banned (hard)

Use repository-owned local verification. Never create, enable, invoke, or push `.github/workflows/`.

### Optional workspace accelerator

Use native navigation first. If cold-start routing is still expensive or ambiguous, run:

```text
python ../tools/agent_context.py brief tochnyichart <task ...>
```

It returns bounded authority, verification, and likely-source evidence. Tool output is evidence, not authority. Use `python ../tools/agent_context.py --help` only when a specific unresolved question justifies a deeper probe. No shared analysis command is a prerequisite to editing.
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
