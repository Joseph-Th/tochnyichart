# Agent Guide

**BCA policy:** advisory

**Profiles:** Universal, Agent Tool, Artifact Generation

This file is the execution card for Tochnyi Charts. The project applies the Universal, Agent Tool, and Artifact Generation portfolio profiles. `README.md` owns workflow orientation, `STATUS.md` owns supported scope, `docs/architecture.md` owns role/layer boundaries, `docs/testing.md` owns infrastructure verification, and the batch/source-ledger/authoring documents own their specialized contracts.

<!-- workspace-contract:begin (generated from ../AGENTS.md by tools/sync_agent_context.py; edit the source, not this copy) -->
## Workspace contract

Applies to every agent in every harness. Source, rationale, and evidence: [../AGENTS.md](../AGENTS.md).

The user is a solo developer. Precedence: current request → this contract → project card → standards. **Hard** rules survive lower-level workflow advice.

### AG-1 Finish the work

Finish the authorized task; plans, progress, or deferred notes are not delivery. Delegate only bounded read-only work when authorized.

### AG-2 Make the calls yourself

Make in-scope decisions yourself; state consequential choices briefly and continue. Ask only when the answer changes the result and cannot be inferred. Read the project card once, then resolve authority, owner, and proof. Expand only for unresolved scope or boundaries. Links and profiles are lookups; research and artifact work starts at the product workflow.

### AG-3 Stay in your project (hard)

Work only in the requested project. Do not create top-level directories or write to the workspace root or project parent. Put scratch work in the project's ignored output (normally `target/agent-output/`) or OS temp.

### AG-4 Done means the user's copy works (hard)

Verify every requirement against the user's actual copy. Refresh and check the affected release, deployment, or running app; source edits alone do not update it. Docs-only work verifies docs and routes. Use the smallest complete project lane and [`REVIEW.md`](../REVIEW.md) for consequential code. Claim only checked results; report what remains unverified.

### AG-5 Look at what you made

Run or render changed visual, audio, interactive, or published output; inspect it against [`STANDARDS_QUALITY.md`](../STANDARDS_QUALITY.md) and project references. Verify requested files, fix defects, and report rendered evidence. Internal prose needs only readability and route review. Tests do not prove appearance.

### AG-6 Real behavior over proxies

Observe user-experienced behavior. Tests, harnesses, validators, and metrics are evidence, not the goal. Repair proxy/product divergence; never weaken gates, hardcode outcomes, suppress warnings, or retry until green. Simulations stay causal and parameterized (STANDARDS_QUALITY.md QUAL-3).

### AG-7 Answer first, then stop talking

Answer questions directly; they are not permission to act. Reports state changes, verification limits, and required user action. Put long audits or research in a project file. No lectures or revisiting dismissed topics.

### AG-8 Own mistakes; trust the user's evidence

On a user-reported failure, re-check your work before blaming setup; own and fix mistakes. Try a tool, file, or capability before claiming it is unavailable.

### AG-9 The outcome outranks the process

If procedure harms the result or costs more than it protects, favor the result and state what you skipped. Hard rules still apply.

### AG-10 Leave nothing running

Stop task-owned processes, servers, watchers, and terminals; release locks and remove scratch. Keep deliverables and the app the user should run. Never kill or replace the user's program silently. Built software cleans up child processes on exit.

### AG-11 Git: `main`, commit, push (hard)

Work on `main`; branches or worktrees only when asked. Commit and push verified work unless told not to. Never revert, stash, or discard others' changes. Include sound shared progress when appropriate; leave broken unrelated work out and report it.

### AG-12 Current docs describe the present

Update the single authority for changed behavior. Keep history, session notes, and changelog prose out of current docs/comments. Plans and design intent do not prove capability.

### AG-13 CI is local; GitHub Actions are banned (hard)

Use repository-owned local verification. Never create, enable, invoke, or push `.github/workflows/`; remove existing workflows while keeping their local equivalent.
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
