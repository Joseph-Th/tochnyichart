# Testing and verification

This is infrastructure-maintainer documentation. Normal chart authors use the
validation and diagnostic commands exposed by `tool-api/chart.js` and do not
need the internal test strategy.

The project uses Node's built-in test runner and keeps deterministic checks,
browser checks, and performance checks as separate layers. This makes a fast
local loop possible while preserving a full delivery gate.

## Commands

| Command | Scope |
| --- | --- |
| `npm test` | Fast deterministic unit and workflow suite. |
| `npm run test:unit` | Explicit unit suite: renderer, validation, diagnostics, planner, and workflow contracts. |
| `npm run test:workflow` | Orientation, route selection, CLI handoff, malformed-file handling, and wrapper contracts. |
| `npm run test:browser` | Browser-backed standard and regional responsive comparison. |
| `npm run test:performance` | Warm dense regional planner performance check. |
| `npm run test:comparison` | Workflow contract tests plus browser comparison. |
| `npm run check:docs` | Current authority pages, local documentation links/routes, npm scripts, and Tool API command references. |
| `npm run test:all` | Repository/documentation preflights plus unit, browser, and performance layers. |
| `npm run diagnostics` | Standalone diagnostics self-test. |
| `npm run layout` | Synthetic narrow-label and reference-line regression. |

The browser test skips when no supported Edge or Chrome executable is found.
That is useful for a local edit loop, but a delivery environment should provide
a browser and run `npm run test:all`.

## Test layout

### `tests/chart-pipeline.test.js`

The broad deterministic regression suite covers:

- Recipe coverage and ChartSpec validation.
- Generated-shell policy and asset cache versioning.
- Visual planning and shared quantitative mark policy.
- Regional registry, projection, framing, landmass, summary, routing, and
  collision behavior.
- Diagnostic issue classification, branding, watermark, and layout contracts.
- Regional workflow normalization and output generation.

### `tests/workflow.test.js`

The workflow suite is the agent-facing contract. It verifies that:

- `orient`, `guide`, and `regional-guide` describe separate paths.
- Standard validation accepts every non-map recipe and redirects `map.regional`.
- Regional validation accepts only `map.regional`.
- The generic CLI cannot bypass the regional route.
- Standard and regional wrappers preserve the underlying renderer output.
- Missing, malformed, or structurally invalid data returns structured errors.
- Malformed JSON produces a path-aware workflow error.

### `tests/browser-workflow.test.js`

This is the comparison test for the two user-facing workflows. It renders one
standard example and one regional example, runs the standard example through the
regional viewport set for comparable coverage, and runs the regional wrapper
through its full responsive diagnostics. It checks:

- Successful browser rendering at desktop, tablet, and mobile sizes.
- Zero diagnostic errors.
- Regional workflow metadata in the rendered chart.
- No final leader collisions or fallback routes in the comparison fixture.
- Ranking value labels retain enough measured/estimated right gutter that the
  complete label, including trailing units, survives desktop, tablet, and
  mobile rendering.
- Converging-signal relationships retain a post-join connector segment toward
  the outcome so the factor paths do not terminate abruptly at their meeting
  point.

### `tests/performance.test.js`

This test constructs a deterministic twelve-entry dense layout, warms the
planner, measures five runs, confirms candidate evaluation occurred, and keeps
the total below the repository budget of three seconds. If a machine is
consistently slower, compare the planner metrics before changing the threshold;
do not hide a regression by removing the warmup or reducing the fixture.

## Comparison protocol

When changing a workflow or regional planner:

1. Run `npm run test:unit`.
2. Run `npm run test:workflow`.
3. Run `npm run test:performance`.
4. Run `npm run test:browser` with Edge or Chrome available.
5. Compare the returned workflow, recipe, byte count, warnings, review status,
   and diagnostic fields.
6. For rendering changes, run `npm run visual` and inspect the generated
   manifest or relevant preview.

The wrapper contract intentionally exposes comparable fields:

```text
workflow, specPath, htmlPath, assetVersion, recipe, bytes,
warnings, review, diagnostics (regional only)
```

The regional wrapper is also compared with the lower-level renderer in the
workflow tests. Their HTML must be byte-for-byte identical when diagnostics are
disabled; the wrapper adds workflow metadata around the same render, not a
second rendering implementation.

## Writing tests

- Use `node:test` and `node:assert/strict`.
- Load fixtures from `specs/examples/` instead of duplicating large specs.
- Use a temporary directory for generated HTML and remove it in `finally`.
- Assert semantic outcomes and diagnostics, not incidental DOM order.
- Keep routing fixtures deterministic and record why a geometry threshold exists.
- Add a regression test next to the layer that owns the behavior.
- When a visual defect involves clipped or truncated text, assert both the
  responsive diagnostic result and the renderer layout contract that reserves
  the required gutter or label space. Do not rely on a screenshot-only check.
- Prefer a focused helper or contract test over another opaque snapshot.

For browser-backed tests, pass the browser path through the existing capture
module. Do not introduce a second browser launcher or a new dependency for a
single test. For performance tests, measure with `node:perf_hooks` and report
the fixture size and number of iterations in the assertion message.

## Full verification

The thorough local gate is:

```bash
npm run test:all
npm run diagnostics
npm run layout
npm run examples
npm run visual
```

`npm run quality` runs the same quality path as a single npm script. Generated
HTML, PNGs, manifests, and dated chart artifacts are outputs; inspect their
status before committing and do not hand-edit them to make a test pass.
