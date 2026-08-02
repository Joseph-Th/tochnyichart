# Tochnyi Charts v2.10.1

Tochnyi Charts is a declarative chart system for producing consistent, publication-ready visuals from compact JSON specifications.

The model decides what the chart should communicate. The renderer owns HTML, CSS, AMCharts configuration, typography, spacing, branding, accessibility, and export behavior.

## Core contract

A chart is authored as a `ChartSpec` JSON file. Generated HTML is an output artifact and should not be edited directly.

```text
source material
    ↓
editorial analysis
    ↓
ChartSpec JSON
    ↓
validation
    ↓
deterministic renderer
    ↓
HTML + optional PNG review
```

Chart specifications cannot contain HTML, JavaScript, CSS, templates, or inline styles. The validator rejects implementation fields.

## Requirements

- Node.js 20 or newer
- A modern browser to view charts
- Microsoft Edge or Google Chrome for automated screenshots
- Internet access when viewing or capturing charts because AMCharts and Mukta are loaded from CDNs

There are no npm runtime dependencies.

## Commands

List the available chart recipes:

```bash
node tools/chart.js catalog
```

List reusable map region sets and their region identifiers:

```bash
node tools/chart.js regions russia
```

Get the compact story-to-recipe decision guide:

```bash
node tools/chart.js guide
```

Validate a specification:

```bash
node tools/chart.js validate specs/examples/ai95-price-spike.json
```

Render a specification. When no output path is supplied, the renderer creates a file under `charts/YYYY-week-WW/` using the specification date and slug.

```bash
node tools/chart.js render specs/examples/ai95-price-spike.json
```

Render to a specific path:

```bash
node tools/chart.js render specs/examples/ai95-price-spike.json charts/v2-examples/ai95-price-spike.html
```

Review the generated shell and capture a 1200 × 900 PNG:

```bash
node tools/chart.js review charts/v2-examples/ai95-price-spike.html \
  --screenshot \
  --output previews/ai95-price-spike.png
```

Run automatic layout diagnostics without producing or inspecting an image:

```bash
node tools/chart.js diagnose charts/v2-examples/ai95-price-spike.html
```

The command checks measured browser layout and returns structured JSON. It exits
with a nonzero status when an error-level collision is found.

Run the test suite and regenerate all examples:

```bash
npm test
npm run examples
npm run visual
```

Render the editorial samples extracted from `input.txt`, run responsive diagnostics
at 1200, 768, and 480 pixels, and capture review PNGs:

```bash
npm run samples
```

The sample specifications live in `specs/samples/`. Their generated HTML is written
to the date-derived `charts/YYYY-week-WW/` directory and their PNGs and manifest are
written to `previews/new-workflow/`.

`npm run visual` renders every recipe fixture, verifies that the browser runtime
reports success, captures the previews, and writes `previews/manifest.json` with
dimensions and SHA-256 hashes.

## Recipes

The machine-readable catalog is `recipes/catalog.json`.

| Recipe | Use |
|---|---|
| `comparison.change` | Exactly two values showing a change |
| `comparison.scenarios` | Actual, expected, previous, target, or alternatives |
| `comparison.diverging` | Directional changes around a visible zero line |
| `comparison.range` | Exact values, min-max intervals, limits, and thresholds |
| `trend.line` | Ordered time series |
| `composition.donut` | Two to six parts of a whole |
| `composition.stacked` | Exact parts of one total, especially two-part splits |
| `flow.waterfall` | Starting value, additions or losses, and ending value |
| `ranking.horizontal` | Ranked categories with longer labels |
| `status.grid` | Places or operations with categorical conditions |
| `map.regional` | Administrative regions with highlighted geography, callout cards, and an optional summary panel |
| `story.sequence` | Trigger-to-consequence or operational chain |
| `headline.metric` | One decisive number with supporting context |

Each recipe owns its chart geometry, axes, label placement, color assignment, watermark behavior, responsive rules, and animation.

## ChartSpec

The formal schema is `schemas/chart-spec.schema.json`.

A minimal comparison specification:

```json
{
  "version": "2.0",
  "recipe": "comparison.change",
  "title": "Ten Thousand Rubles a Ton in One Week",
  "subtitle": "Ai-95 prices moved above 80,000 rubles per ton.",
  "date": "2026-07-26",
  "source": {
    "name": "Saint Petersburg International Mercantile Exchange",
    "period": "July 2026"
  },
  "data": [
    {
      "label": "Before the spike",
      "value": 70000,
      "displayValue": "70,000 rubles",
      "tone": "primary"
    },
    {
      "label": "Current peak",
      "value": 80000,
      "displayValue": "over 80,000 rubles",
      "tone": "critical"
    }
  ],
  "measure": {
    "unit": "RUB/ton",
    "axisTitle": "Rubles per ton",
    "decimals": 0,
    "baseline": "zero"
  },
  "emphasis": {
    "direction": "up",
    "displayValue": "10,000",
    "label": "rubles per ton"
  },
  "metadata": {
    "slug": "russia-ai95-price-spike-2026"
  }
}
```

See `specs/examples/` for a validated example of every recipe.

Regional maps use stable region identifiers rather than coordinates. For Russia,
use `map.regionSet = "russia"` and assign `data[].regionId`, such as `RU-OMS` or
`RU-VGG`. One callout can cover several regions with `data[].regionIds`. The
renderer calculates geographic anchors, balances cards between the two sides,
packs them to avoid collisions, and draws leader lines. `primaryMetric` and
`supportingFacts` become an optional map summary panel. `map.viewport` controls
whether the renderer shows the complete region set (`all`), fits the highlighted
regions (`data`), or chooses automatically (`auto`). `map.excludeRegions` removes
irrelevant polygons from the display. Region registries can also identify detached
areas, which are omitted automatically unless they are part of the data. Regional
status maps use a restrained teal, ochre, brick, plum, and slate palette rather
than saturated red-green signaling. Region callouts do not show centroid dots by
default because the filled polygon already identifies the area. Set
`map.anchorStyle = "dot"` only when an explicit point marker is useful.
Leader lines use automatic lane routing when several callouts would otherwise
share nearly the same path. The router preserves geographic order, separates
parallel segments, adds a light halo, and colors each line to match its region.
All leader geometry is orthogonal and uses a single vertical adjustment between
the region and its card. Dense layouts stagger that one bend across separate
columns, avoiding both arbitrary diagonals and double-step routes.
Use `map.leaderRouting = "direct"` for sparse maps or `"lanes"` to force the
collision-resistant layout.

## Project structure

```text
stanichart_2/
├── schemas/
│   └── chart-spec.schema.json
├── recipes/
│   └── catalog.json
├── renderer/
│   ├── catalog.js
│   ├── validate.js
│   ├── render.js
│   ├── review.js
│   └── capture.js
├── tools/
│   ├── chart.js
│   └── render-examples.js
├── specs/
│   └── examples/
├── tests/
│   └── chart-pipeline.test.js
├── lib/
│   ├── tochnyi.css
│   ├── tochnyi-charts.js
│   ├── tochnyi-maps.js
│   ├── tochnyi-map-runtime.js
│   ├── tochnyi-runtime.js
│   ├── tochnyi-logo.png
│   └── watermark.svg
├── charts/
└── previews/
```

## Responsibilities

The model is responsible for:

- Extracting and checking the data
- Calculating explicitly derivable comparison values
- Choosing the strongest editorial story
- Selecting a recipe
- Writing the title and subtitle
- Choosing the primary comparison and supporting facts
- Providing the date and source

The renderer is responsible for:

- Chart implementation
- Axes and scales
- Typography and spacing
- Colors and contrast
- Label placement
- Watermarks and branding
- Supporting-card layout
- Responsive behavior
- Animation and static export mode

## Validation and visual review

`validate` checks:

- Required date and source
- Recipe-specific item counts
- Numeric values
- Numeric ranges, benchmarks, and logarithmic scale constraints
- Label and copy lengths
- Donut composition constraints
- Waterfall roles and endpoints
- Regional status and sequence requirements
- Region-set membership and regional map callout requirements
- Explicit axis bounds
- Semantic emphasis direction
- Unsupported fields
- Attempts to include implementation code or styling

`review` checks:

- Valid embedded ChartSpec
- Shared stylesheet and runtime usage
- Absence of inline styles
- Absence of direct AMCharts code
- Recipe-specific layout risks

Screenshot review launches Edge or Chrome with a clean temporary profile, waits for the runtime to report a successful render, and then captures a fixed-size PNG. Set `TOCHNYI_BROWSER` to use a nonstandard browser path.

## Automatic overlap diagnostics

Generated charts load `lib/tochnyi-diagnostics.js`. The diagnostic layer reads
the resolved AMCharts sprite tree and ordinary DOM layout after fonts and chart
layout settle. It does not use OCR or compare screenshots.

It checks:

- Text-to-text overlap
- Text crossing unrelated columns or reference lines
- Labels extending outside the chart or page boundary
- HTML overlays colliding with canvas-rendered labels
- Intentional labels inside their own data column, which are excluded by matching
  AMCharts data-item identities
- Quantitative columns that are too opaque or too faint
- Translucent columns with insufficient outline contrast
- AMCharts columns and CSS-rendered stacked segments against the same shared mark policy

The report is embedded in the rendered page as
`#tochnyi-layout-diagnostics` and includes:

- Exact label text and role
- Bounding rectangles
- Overlap percentage
- Warning or error severity
- A specification-level remedy

Example result:

```json
{
  "status": "fail",
  "summary": {
    "labelsChecked": 28,
    "objectsChecked": 4,
    "errors": 1,
    "warnings": 0
  },
  "issues": [
    {
      "code": "text-text-overlap",
      "severity": "error",
      "message": "The emphasis badge overlaps the current-value label.",
      "overlapPercent": 100,
      "remedy": "Shorten the badge or move it using emphasis.position."
    }
  ]
}
```

Agents should run `diagnose` after every render and revise only the ChartSpec or
shared recipe implementation. Screenshot comparison remains useful for editorial
judgment, but it is no longer required to discover ordinary label collisions.

## Shared visual components

The design system includes reusable components for:

- Change badges
- Statistic grids
- Notes
- Headline metrics
- Reference lines and data annotations
- Range and threshold plots
- Exact stacked compositions
- Waterfalls
- Regional status grids
- Causal sequences
- Sources and attribution
- Full, small, and corner watermarks

## Visual planning

Before a recipe is rendered, `lib/tochnyi-visual-plan.js` resolves a deterministic
visual plan from the ChartSpec, item count, and viewport width. This layer controls
layout decisions that should not be authored as CSS or pixel values in the spec:

- Item-count-aware chart height
- Editorial or minimal title alignment
- Responsive category-label width
- Axis-title and grid density
- Ranking focus colors and secondary emphasis
- Automatic inside or outside value-label placement
- Watermark prominence

For `ranking.horizontal`, the requested sort order is preserved at the top of the
chart, rank numbers are added to category labels, and five-row rankings no longer
inherit the same canvas height as twelve-row rankings. `narrative.density`,
`narrative.emphasis`, and `options.labelMode` now affect the rendered result rather
than serving only as validation metadata.

Semantic tones are used instead of one-off classes:

- `primary`
- `secondary`
- `warning`
- `critical`
- `neutral`
- `positive`

The runtime derives arrows, badge classes, and colors from the specification, preventing combinations such as an upward arrow with a decline style.



## Quantitative mark styling

Bar-like marks use one renderer-owned visual policy rather than recipe-specific fill settings. The policy preserves the project’s semantic brand hues as outlines while using translucent fills for a calmer editorial result.

The shared defaults are:

- Column fill opacity: `0.66`
- Column outline opacity: `0.90`
- Column outline width: `1.5px`
- Hover fill opacity: `0.78`
- Watermark opacity behind quantitative charts: `0.14`

The policy applies to vertical comparisons, horizontal rankings, diverging bars, waterfalls, the shared legacy column helper, and CSS-rendered stacked compositions. Labels use dark text because translucent fills no longer guarantee sufficient contrast for white text. ChartSpec authors cannot override these implementation values.

## Existing charts

Files already present under the dated `charts/` directories remain valid legacy artifacts. New charts should use the v2 specification pipeline. `reference.html` remains available as a historical visual reference but is no longer a machine-readable source of truth and should not be loaded before chart generation.

## Extending the system

To add a recipe:

1. Add it to `recipes/catalog.json`.
2. Add its constraints to `renderer/validate.js`.
3. Add its deterministic implementation to `lib/tochnyi-runtime.js`.
4. Add a fixture under `specs/examples/`.
5. Add or update tests.
6. Run `npm test`, `npm run examples`, and screenshot review.

Do not add recipe implementation instructions to the model skill. The skill should remain limited to editorial decisions and ChartSpec production.


## Automatic label placement

The diagnostic result includes:

- The two elements involved
- Their semantic roles and visible text
- Measured bounding rectangles
- Overlap percentage
- Error or warning severity
- A specification-level remedy

`diagnose` runs at 1200, 768, and 480 pixel widths by default. Use `--single` only for targeted debugging.

For custom SVG recipes, the renderer registers labels and marks with semantic groups, measures text after fonts load, and tries approved placements around each anchor. A range is represented by one consolidated interval label rather than two independent endpoint labels. If no collision-free placement exists, the label is marked unresolved and diagnostics fail instead of silently accepting the chart.

A synthetic regression fixture exercises narrow ranges and a central reference line:

```bash
npm run layout
```


## Information economy

The renderer and validator now treat redundancy as a review failure mode separate from geometric overlap. For two-part stacked compositions, the renderer automatically:

- Promotes the strongest semantic segment as the headline metric
- Uses exact percentage precision consistently
- Removes the legend when both segment labels fit inside the bar
- Suppresses annotation strips when supporting facts already provide the context
- Removes supporting facts whose values simply repeat a segment value or share
- Renders one remaining supporting fact as a compact callout
- Subordinates derived totals and calculation notes

Validation warns when source names reference internal files, display values contain ambiguous repeated unit abbreviations, or composition facts repeat values already encoded visually.
