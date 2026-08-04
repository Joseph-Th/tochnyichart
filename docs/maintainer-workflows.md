# Infrastructure maintainer workflows

This document is for explicit infrastructure work. It is not part of the normal chart-author workflow.

Use this role when the task concerns validation, rendering, layout, map planning, diagnostics, browser behavior, performance, tests, or extension of the Tool API.

## Maintainer responsibilities

A maintainer may:

- Change schema and validation behavior.
- Add or modify recipes.
- Change rendering and responsive layout.
- Change map projection, callout placement, or leader routing.
- Improve diagnostics and browser capture.
- Add regression fixtures and tests.
- Change the Tool API while preserving compatibility or documenting a version change.

A maintainer must not solve engine defects by editing generated HTML or PNG files.

## Implementation map

```text
renderer/                  workflow adapters, validation, rendering, review, capture
lib/                       shared runtime, map planner, styles, diagnostics
tools/                     internal scripts and compatibility CLI implementation
tests/                     unit, workflow, browser, and performance coverage
schemas/                   public ChartSpec schema
recipes/                   public recipe catalog
specs/examples/            validated public fixtures
specs/samples/             editorial samples
```

The public chart-author entrypoint is `tool-api/chart.js`. Its implementation currently delegates to `tools/chart.js`.

## Required checks

```bash
npm test
npm run test:workflow
npm run test:browser
npm run test:performance
npm run test:all
```

Use the narrower test first, then `npm run test:all` before completing changes that affect shared behavior.

Additional quality commands:

```bash
npm run diagnostics
npm run examples
npm run visual
npm run samples
npm run layout
npm run quality
```

## Extending the Tool API

When adding or changing a public command or contract:

1. Update the machine-readable manifest returned by `node tool-api/chart.js api`.
2. Update `tool-api/README.md` and `docs/architecture.md`.
3. Keep command output structured and suitable for agents.
4. Add workflow tests for routing, error behavior, and compatibility.
5. Avoid exposing internal implementation fields through the public contract.

## Adding a recipe

1. Add the recipe to `recipes/catalog.json`.
2. Add schema and semantic constraints to validation.
3. Add the deterministic implementation.
4. Add a validated fixture under `specs/examples/`.
5. Add the fixture path to the standard guide when applicable.
6. Add unit, workflow, and browser coverage where behavior changes.
7. Run the full automated gate.

## Defect handoff from chart authors

A chart-author report should contain:

- Workflow and recipe.
- ChartSpec path.
- Command that failed.
- Structured validation, review, or diagnostic output.
- Generated artifact path when one exists.
- Whether the same failure reproduces from a validated example.

The maintainer reproduces the issue, changes the implementation, adds a regression test, and regenerates disposable artifacts as needed.
