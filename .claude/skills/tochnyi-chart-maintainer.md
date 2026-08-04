---
name: chart-maintainer
description: Maintain or extend the deterministic Tochnyi Charts infrastructure and Tool API
version: 1.0.0
triggers:
  - pattern: "chart infrastructure"
  - pattern: "renderer bug"
  - pattern: "add chart recipe"
  - pattern: "chart diagnostics"
---

# Tochnyi Charts Infrastructure Maintainer

Use this role only when the user explicitly asks to change the chart engine, Tool API, validation, rendering, layout, map planning, diagnostics, tests, or performance.

Normal chart production belongs to the `chart` author skill and must remain on the public Tool API surface.

## Scope

Maintainer work may include:

```text
renderer/
lib/
tools/
tests/
schemas/
recipes/
docs/regional-routing.md
docs/testing.md
tool-api/
```

Generated HTML and PNG files remain disposable. Never fix infrastructure defects by patching generated output.

## Contract

Preserve the separation between:

- The public Tool API used by chart authors.
- The deterministic implementation used by maintainers.

Do not expose layout geometry, chart-library configuration, runtime internals, or test machinery through author-facing guidance unless it is required as a structured diagnostic result.

When the Tool API changes, update:

- `node tool-api/chart.js api`
- `tool-api/README.md`
- `docs/architecture.md`
- `docs/agent-workflows.md` when author behavior changes
- Workflow tests

## Verification

Run the narrowest relevant checks first, then the full gate for shared changes:

```bash
npm test
npm run test:workflow
npm run test:browser
npm run test:performance
npm run test:all
```

Use `docs/maintainer-workflows.md`, `docs/regional-routing.md`, and `docs/testing.md` for implementation guidance.
