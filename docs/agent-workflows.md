# Agent workflows

This document is the operational contract for agents authoring charts. The
important rule is simple: choose the workflow before writing the ChartSpec.

## 1. Route the story

Run:

```bash
node tools/chart.js orient
```

Choose `regional-breakdown` only when the finding is geographic and highlighted
regions need map callouts. Choose `standard-chart` for every other story. The
same data can be regional in subject matter without needing a map; use a
standard recipe when geography is only a category or a ranking.

| Question | Route |
| --- | --- |
| Does the explanation depend on where administrative regions are located? | `regional-breakdown` |
| Does each highlighted region need a callout card attached to the map? | `regional-breakdown` |
| Is geography just a label, rank, status, or comparison category? | `standard-chart` |
| Is the story a number, change, trend, composition, flow, or causal chain? | `standard-chart` |

Do not use both routes for one chart. `node tools/chart.js render` is the
standard route. `node tools/chart.js regional` is the regional route.

## 2. Shared authoring stages

Every route follows the same semantic stages:

1. Analyze the source, date, finding, and evidence.
2. Choose the story structure and recipe.
3. Write the smallest ChartSpec that expresses the finding.
4. Validate the JSON.
5. Render through the selected workflow.
6. Resolve shell-review errors and browser-diagnostic errors.
7. Capture a screenshot only when a human needs to judge editorial composition.

The author owns source fidelity, calculations, copy, statuses, region IDs, and
recipe choice. The renderer owns geometry, styling, layout, responsiveness,
projection, callout placement, and leader routing.

## 3. Standard chart workflow

Start with the recipe guide:

```bash
node tools/chart.js guide
```

Use these selection rules:

| Finding shape | Recipe |
| --- | --- |
| One decisive number | `headline.metric` |
| Two values showing change | `comparison.change` |
| Actual, expected, prior, target, or alternatives | `comparison.scenarios` |
| Directional changes around zero | `comparison.diverging` |
| Min-max interval, limit, or threshold | `comparison.range` |
| Ordered time points | `trend.line` |
| Exact parts of one total | `composition.stacked` |
| Multi-part composition where shape matters | `composition.donut` |
| Starting value, additions/losses, ending value | `flow.waterfall` |
| Ranked categories with long labels | `ranking.horizontal` |
| Categorical conditions by place or operation | `status.grid` |
| Trigger, transmission, consequence | `story.sequence` |

Composable features belong in semantic fields, not custom implementation:

- `references` for a target, average, legal limit, or benchmark.
- `data[].annotation` to explain a specific point.
- `measure.scale = "logarithmic"` when values span orders of magnitude.
- `supportingFacts` for important context in a different unit.

Run the route:

```bash
node tools/chart.js validate <spec.json>
node tools/chart.js render <spec.json> [output.html]
node tools/chart.js diagnose <output.html>
```

If the standard render command says the spec is regional, stop and follow the
regional route. Do not remove `map.regional` just to make the command pass.

## 4. Regional breakdown workflow

Start with the regional contract and registry:

```bash
node tools/chart.js regional-guide russia
node tools/chart.js regions russia
```

The minimal regional map contains:

- `recipe: "map.regional"`.
- `title`, `date`, `source`, `data`, and `metadata.slug`.
- `map.regionSet`.
- For every data item: `label` and `regionId` or `regionIds`.
- At least one evidence field per data item: `status`, `displayValue`, `detail`, or `value`.

Recommended status-map fields are `status`, `displayValue`, and `detail`.
Supported statuses are `stable`, `improving`, `strained`, `critical`,
`blocked`, and `unknown`.

Example:

```json
{
  "version": "2.0",
  "recipe": "map.regional",
  "title": "Fuel access is deteriorating in selected regions",
  "date": "2026-08-02",
  "source": { "name": "Underlying publication", "period": "July 2026" },
  "data": [
    {
      "label": "Zabaykalsky",
      "regionId": "RU-ZAB",
      "status": "strained",
      "displayValue": "Supply gap",
      "detail": "Short supporting explanation with the relevant evidence."
    }
  ],
  "map": { "regionSet": "russia" },
  "metadata": { "slug": "regional-fuel-access" }
}
```

Keep the map object minimal. Automatic fields should normally be omitted:

- `callouts`
- `calloutDistribution`
- `summaryPosition`
- `summaryDisplay`
- `anchorStyle`
- `leaderRouting`

Use an explicit override only for a clear editorial or semantic reason:

- `map.viewport` when the story needs all regions, only active regions, or an explicit automatic choice.
- `map.contextFit` when the story requires full national context or a local focus.
- `map.landmass` when the story requires continental or all-component context.
- `map.excludeRegions` to remove irrelevant context regions.
- `data[].calloutSide` when a particular card must stay on a side for editorial reasons.

Never author coordinates, pixel positions, card dimensions, route points,
manual lanes, SVG paths, HTML, CSS, JavaScript, or AMCharts configuration.

Run the consolidated route:

```bash
node tools/chart.js validate <spec.json>
node tools/chart.js regional <spec.json> [output.html]
```

The result is the regional handoff contract. It includes `diagnostics.status`,
one run for each configured viewport, and resolved `routing`, `placement`,
`predictedCrossings`, `renderedCrossings`, `finalCollisions`,
`fallbackRoutes`, and `sourceExitRoutes` values. Treat an error-level
diagnostic or nonzero collision/fallback count as a reason to revise the
ChartSpec or shared renderer, not the generated HTML.

## 5. Failure handling

| Failure | Correct response |
| --- | --- |
| Unknown or invalid field | Remove it or use the documented semantic field. |
| Data count or numeric error | Fix the source-derived data; do not pad the spec with fake values. |
| Copy length warning | Shorten the title, label, display value, or detail. |
| Regional ID error | Re-run `regions russia` and use a stable ID. |
| Regional collision or fallback | Shorten copy, reduce redundant callouts, or improve the shared planner. Do not add coordinates. |
| Standard command rejects `map.regional` | Use `regional-guide` and `regional`. |
| Browser unavailable | Use `--no-diagnose` only as a temporary local fallback; run browser checks before delivery. |

## 6. Delivery checklist

Before delivery, confirm:

- The route matches the story and is not mixed with the other route.
- The source, date, period, and calculations are correct.
- The title and subtitle state the finding rather than merely naming the data.
- The ChartSpec contains no implementation code or geometry.
- `validate` passes with no unresolved errors.
- The selected render command passes shell review.
- Standard charts pass `diagnose`; regional charts pass their embedded responsive diagnostics.
- A screenshot has been captured when visual editorial judgment is required.
- The generated HTML is treated as disposable output.
