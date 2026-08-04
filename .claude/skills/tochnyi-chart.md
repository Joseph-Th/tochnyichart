---
name: chart
description: Turn sourced statistics into a validated Tochnyi ChartSpec through the standard or regional workflow
version: 3.0.0
triggers:
  - pattern: "chart"
  - pattern: "visualize"
  - pattern: "graph"
---

# Tochnyi Chart Generator

Create charts through the declarative v2 pipeline. The model owns editorial
meaning; the renderer owns implementation. Never generate or edit chart HTML,
CSS, JavaScript, AMCharts code, coordinates, or pixel geometry.

## Start here

Choose the workflow before writing a specification:

```bash
node tools/chart.js orient
```

Use the regional workflow only when geography is part of the finding and the
highlighted regions need map callout cards. Use the standard workflow for every
other story, including a status comparison that does not need a map.

For the full routing contract and failure-handling rules, use
`docs/agent-workflows.md`. For regional planner behavior and diagnostic fields,
use `docs/regional-routing.md`.

## Shared authoring rules

- Extract exact values, categories, dates, units, ranges, benchmarks, and source.
- Do not invent missing dates, sources, values, endpoints, or regional statuses.
- Choose the story structure before the chart geometry.
- Keep the specification as small and semantic as possible.
- Use the underlying publication or dataset as `source.name`, not `input.txt`.
- Revise the ChartSpec or shared renderer after a failed check; never patch generated HTML.

## Standard chart workflow

Use the compact recipe guide:

```bash
node tools/chart.js guide
```

Select one of the standard recipes: `headline.metric`, `comparison.change`,
`comparison.scenarios`, `comparison.diverging`, `comparison.range`, `trend.line`,
`composition.stacked`, `composition.donut`, `flow.waterfall`,
`ranking.horizontal`, `status.grid`, or `story.sequence`.

Then:

1. Analyze the source and identify the central finding.
2. Write the ChartSpec to `specs/YYYY-week-WW/[slug].json`.
3. Validate it:

   ```bash
   node tools/chart.js validate specs/YYYY-week-WW/[slug].json
   ```

4. Render it:

   ```bash
   node tools/chart.js render specs/YYYY-week-WW/[slug].json
   ```

5. Diagnose the generated chart:

   ```bash
   node tools/chart.js diagnose charts/YYYY-week-WW/[slug].html
   ```

6. Resolve error-level overlap, clipping, or mark-style issues. Capture a PNG
   only when editorial visual review is useful:

   ```bash
   node tools/chart.js review charts/YYYY-week-WW/[slug].html \
     --screenshot --output previews/[slug].png
   ```

If the story needs administrative regions on a map, stop this workflow. Do not
use the generic `render` command for `map.regional`; it will direct you to the
regional workflow.

## Regional breakdown workflow

Start with the dedicated contract and region registry:

```bash
node tools/chart.js regional-guide russia
node tools/chart.js regions russia
```

Author only the semantic content. A minimal regional item has:

- `label`
- `regionId` or `regionIds`
- at least one of `status`, `displayValue`, `detail`, or `value`

For a status map, `status`, `displayValue`, and `detail` are the clearest
combination. The map normally needs only `{ "regionSet": "russia" }`.

Do not author `leaderRouting`, `calloutDistribution`, `summaryDisplay`,
`summaryPosition`, `anchorStyle`, coordinates, card positions, route points, or
other implementation details. Only override `viewport`, `contextFit`,
`landmass`, `excludeRegions`, or `data[].calloutSide` when the story itself
requires that semantic constraint.

Run the consolidated regional workflow:

```bash
node tools/chart.js regional \
  specs/YYYY-week-WW/[slug].json \
  charts/YYYY-week-WW/[slug].html
```

This validates the regional recipe, renders the shell, reviews the generated
artifact, and runs responsive diagnostics at desktop, tablet, and mobile sizes.
Use `--no-diagnose` only when no browser is available. Use the generic
`review --screenshot` command for optional human visual review.

The renderer automatically owns map projection, landmass/context fitting,
callout placement, column ordering, leader routing, obstacle avoidance, summary
visibility, and responsive behavior. Agents should read the returned diagnostics
as a pass/fail signal, not tune the routing internals.

## Composable features

Use these only when they add information without changing the story structure:

- `references`: target, legal limit, average, or other benchmark.
- `data[].annotation`: one concise explanation tied to a point.
- `measure.scale: "logarithmic"`: positive values spanning orders of magnitude.
- `supportingFacts`: context in a different unit that should not share the axis.
- `data[].low` and `data[].high`: uncertainty or policy ranges.

## Delivery checklist

Report the selected workflow and recipe, the ChartSpec path, generated HTML path,
optional PNG path, diagnostic status, and any remaining warning. Do not include
generated implementation code in the response.

## Sources of truth

1. `node tools/chart.js orient`: workflow routing
2. `schemas/chart-spec.schema.json`: allowed ChartSpec structure
3. `recipes/catalog.json`: recipe purposes and constraints
4. `renderer/validate.js`: enforced validation
5. `renderer/agent-workflow.js`: agent-facing workflow contract
6. `lib/tochnyi-runtime.js` and `lib/tochnyi-map-runtime.js`: rendering behavior
7. `lib/tochnyi-diagnostics.js`: measured overlap and clipping analysis

Testing guidance lives in `docs/testing.md`; the complete automated gate is
`npm run test:all`.

Generated HTML and PNG files are disposable outputs; the ChartSpec and renderer
are the sources of truth.
