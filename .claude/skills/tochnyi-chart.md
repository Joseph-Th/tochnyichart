---
name: chart
description: Turn sourced statistics into a validated Tochnyi ChartSpec and render it with the standard chart system
version: 2.5.0
triggers:
  - pattern: "chart"
  - pattern: "visualize"
  - pattern: "graph"
---

# Tochnyi Chart Generator

Create charts through the declarative v2 pipeline. Do not generate or edit chart HTML, CSS, JavaScript, or AMCharts code.

## Model responsibility

Focus on editorial and analytical decisions:

- Extract exact values, categories, dates, units, ranges, benchmarks, and source.
- Calculate only values directly implied by the supplied data.
- Identify the main finding and the story structure that best supports it.
- Choose one recipe from `recipes/catalog.json`.
- Add references, annotations, or supporting facts only when they improve interpretation.
- Produce a `ChartSpec` JSON file conforming to `schemas/chart-spec.schema.json`.

The renderer owns layout, typography, axes, colors, branding, labels, responsiveness, and export behavior. Semantic colors and mark opacity are renderer-owned; do not request saturated fills or add color/opacity fields to a ChartSpec.

## Required information

Do not invent a date, year, data source, unit, range endpoint, or geographic status.

If the material does not establish the applicable date or year, ask for it.
If the material does not identify a source, ask for it.
If a value is ambiguous, do not silently infer it.

## Choose the story structure first

Run the compact decision guide when needed:

```bash
node tools/chart.js guide
```

Use the full catalog only when recipe constraints are needed:

```bash
node tools/chart.js catalog
```

Available recipes:

- `headline.metric`: one decisive metric.
- `comparison.change`: exactly two values showing change.
- `comparison.scenarios`: actual, expected, prior, target, or alternatives.
- `comparison.diverging`: directional changes around a visible zero line.
- `comparison.range`: exact values, min-max intervals, and thresholds.
- `trend.line`: ordered time points; five or more preferred.
- `composition.stacked`: exact parts of one total, especially two-part splits.
- `composition.donut`: multi-part composition where the overall shape matters.
- `flow.waterfall`: start, additions or losses, and ending value.
- `ranking.horizontal`: ranked categories with long labels.
- `status.grid`: named places or operating areas with categorical status.
- `story.sequence`: a trigger-to-consequence or operational chain.

Do not default to bars simply because the source contains numbers. First decide whether the story is a change, threshold, range, composition, flow, ranking, status comparison, or causal sequence.

## Composable features

Use these without creating a new chart type:

- `references`: target, legal limit, prior norm, average, or other benchmark line.
- `data[].annotation`: one concise explanation tied to a specific item.
- `measure.scale: "logarithmic"`: only for positive values spanning orders of magnitude.
- `supportingFacts`: context in different units that should not be forced onto the same axis.
- `data[].low` and `data[].high`: uncertainty or policy ranges.
- `data[].status` and `data[].detail`: categorical operational or regional conditions.
- `data[].role`: waterfall semantics using `start`, `change`, `subtotal`, and `end`.

Before finalizing the specification, enforce information economy:

- Do not repeat the same percentage or value in segment labels, a legend, annotations, supporting facts, and a note.
- Supporting facts must add a different unit, cause, consequence, threshold, or comparison.
- Use the underlying publication or dataset as `source.name`, not `input.txt` or an internal working label.
- Avoid ambiguous compact units such as `5.60m m²`; prefer `5.60 million m²`.
- In a two-part composition, identify the editorially important segment with its semantic tone. The renderer will promote it and subordinate the total.

Use a zero baseline for ordinary magnitude comparisons. Use an explicit or automatic nonzero baseline only when the editorial comparison requires it and the scale remains clearly labeled.

## Workflow

1. Analyze the supplied material and identify the main finding.
2. Classify the story structure.
3. Select a recipe and optional composable features.
4. Write the specification to `specs/YYYY-week-WW/[slug].json`.
5. Validate it:

```bash
node tools/chart.js validate specs/YYYY-week-WW/[slug].json
```

6. Correct the specification until validation passes.
7. Render it:

```bash
node tools/chart.js render specs/YYYY-week-WW/[slug].json
```

8. Run automatic layout and mark-style diagnostics:

```bash
node tools/chart.js diagnose charts/YYYY-week-WW/[slug].html
```

Read the structured `issues` array. Correct error-level overlap, clipping, and mark-style
issues before continuing. Prefer specification-level changes such as shorter
labels, `options.labelMode`, `emphasis.position`, a taller layout, annotations,
or a recipe with more label space.

9. Capture a PNG when editorial visual review is needed:

```bash
node tools/chart.js review charts/YYYY-week-WW/[slug].html --screenshot --output previews/[slug].png
```

Only revise the ChartSpec. Never patch generated HTML to fix a chart.
Ordinary label-overlap checks do not require direct screenshot comparison.

## Output to the user

Report:

- The selected recipe and why it fits the story
- The key data, range, benchmark, or calculation used
- The ChartSpec path
- The generated HTML path
- The PNG path when screenshot review was run
- The layout diagnostic status and any remaining warning

Keep the explanation brief. Do not include generated implementation code.

## Sources of truth

1. `schemas/chart-spec.schema.json`: allowed ChartSpec structure
2. `recipes/catalog.json`: available recipes and feature catalog
3. `renderer/validate.js`: enforced constraints
4. `lib/tochnyi-runtime.js`: deterministic visual implementation
5. `lib/tochnyi-diagnostics.js`: measured overlap and clipping analysis
6. `lib/tochnyi.css`: shared design system

`reference.html` is legacy documentation. Do not read it before generating a chart.
