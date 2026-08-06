# Chart-author workflow

This document defines the public Tool API contract for agents producing charts. It does not describe infrastructure maintenance.

A chart-author agent should treat the deterministic engine as a tool. It supplies source fidelity, calculations, editorial meaning, and a semantic `ChartSpec`. It does not inspect rendering machinery.

## Batch workflow

The normal assignment is one user-supplied `input.txt` containing multiple data
stories. The LLM agent owns the complete batch orchestration:

```text
initialize .work/<run-id>/
    -> input.txt
    -> fail if the exact project-root input is missing or blank
    -> inventory every quantitative story with exact excerpts
    -> record selected, omitted, or merged disposition for every candidate
    -> verify .work/<run-id>/source-ledger.json
    -> preserve inventoried claims and enrich without originating new stories
    -> audit actual-level availability and record the value representation
    -> decide the appropriate production tool for each story
    -> create and render accepted charts
    -> capture final PNG images
    -> assemble one PowerPoint presentation
    -> save retained specs and final artifacts
    -> finalize and purge transient run data
```

Start each batch with `npm run run:init -- <run-id>`. Keep research notes,
downloads, helper scripts, logs, review captures, and package staging under the
created `.work/<run-id>/` tree. Complete the generated source ledger and run
`npm run run:verify-source -- <run-id>` before external research. End with
`npm run run:finalize -- <run-id>`, which preserves
`specs/runs/<run-id>/` and `charts/<run-id>/` locally while removing transient
material and legacy previews. It also preserves `input.txt`. Both retained
production paths are ignored by Git. Finalization fails unless selected ledger
slugs and titles exactly match the final ChartSpecs.

The Tool API described below handles individual chart production. It does not
parse the complete batch assignment or assemble the PowerPoint deck. Those are
agent responsibilities.

The full batch contract is in [`docs/batch-workflow.md`](batch-workflow.md).
The required ledger fields are in [`docs/source-ledger.md`](source-ledger.md).

## 1. Enter through the Tool API

```bash
node tool-api/chart.js api
node tool-api/chart.js orient
```

`api` describes the public surface and role boundary. `orient` describes the two available workflows. Select the workflow only after the source has been verified and the evidence has been extracted.

### Geography-first routing preflight

Route by the explanatory role of geography, not by the visible chart form. Use
`regional-breakdown` when administrative locations are part of the evidence and
where something happens changes the interpretation through spatial distribution,
concentration, adjacency, regional contrast, or location-specific callouts.
This includes stories that otherwise look like status lists, rankings, or
comparisons. Use `standard-chart` only when place names are labels or categories
and a map would add no explanatory value.

Before writing any ChartSpec for a batch, create a routing matrix for every
accepted story:

| Story | Geographic evidence | Does where change the finding? | Workflow | Rationale |
| --- | --- | --- | --- | --- |
| ... | regions, sites, or none | yes / no | regional-breakdown / standard-chart | one sentence |

Do not choose `standard-chart` merely because the data is a status list or
because the source does not provide coordinates. Stable region IDs are enough
for the regional workflow; the renderer supplies the map geometry and callout
routing. For every story containing geographic names, a `standard-chart`
decision must state why geography is not explanatory. Do not write or render
specifications until each story has exactly one workflow decision.

| Question | Route |
| --- | --- |
| Does the explanation depend on where administrative regions are located? | `regional-breakdown` |
| Does each highlighted region need a callout attached to the map? | `regional-breakdown` |
| Is geography only a label, rank, status, or comparison category? | `standard-chart` |
| Is the story a number, change, trend, composition, flow, or causal chain? | `standard-chart` |

Do not combine both routes in one chart.

## 2. Public authoring surface

A chart-author agent may use:

```text
input.txt
tool-api/
docs/batch-workflow.md
docs/agent-workflows.md
docs/story-selection.md
docs/source-enrichment.md
schemas/chart-spec.schema.json
recipes/catalog.json
specs/examples/
specs/runs/<run-id>/
charts/<run-id>/
.work/<run-id>/
```

During normal chart production, do not inspect or modify:

```text
renderer/
lib/
tests/
tools/
```

Generated HTML and PNG files are disposable outputs and must not be edited.

Presentation copy must stay editorial. Use source attribution when available and omit it when unavailable. Never expose `input.txt`, internal provenance, verification labels, diagnostics, or workflow commentary in a chart or slide.

## 3. Source enrichment before recipe selection

`input.txt` is expert-authored editorial evidence. Assume its factual claims,
datapoints, comparisons, and interpretation are correct. It is also a routing
aid rather than the complete dataset for a chart, so reputable reporting may be
used to supplement it.

Do not treat external research as a vote on whether the input is true. Failure
to locate a second report is not a contradiction. Do not label an input claim
`uncorroborated`, `unsupported`, or `not independently confirmed`, and do not
replace it with an easier-to-source fact, solely because search results are
silent. Only a direct material contradiction from a reputable source should be
escalated for editorial resolution.

Before selecting a recipe:

1. Preserve the expert input claim and confirm that every supplied URL used for supplementation matches the entity, event, period, and finding.
2. Read the full primary source.
3. Extract the main result, comparator, components, cause, consequence, forecast, scale, denominator, and underlying dataset when they are relevant to the same claim.
4. Calculate only safe derivations that are directly supported by the sourced values, such as an absolute change, percentage-point change, ratio, share, coverage rate, implied shortfall, or combined amount.
5. Identify whether a material evidence gap remains.
6. Search beyond the source to fill that named gap or add useful attribution and context.
7. Determine whether actual levels are reported or retrievable. For a rate or share, separately determine whether the tangible numerator/denominator or population/affected amounts are available.
8. Record the choice in `representationAudit`. Any unavailable or incomparable level or basis requires at least two named source checks and outcomes.
9. Select one central finding, its evidence spine, the workflow, and the recipe.

Use this research order:

```text
full linked source
-> underlying official dataset, company filing, or named report
-> sources directly linked or cited by the article
-> another article from the same publisher about the same event
-> broader high-quality external research
```

Do not search for additional data merely to make a chart more complex. Additional context must concern the same entity, market, or causal event; use a compatible period and scope; fill a defined evidence role; materially clarify interpretation; and have a traceable source.

The evidence spine has one central finding and may use supporting facts for magnitude, comparison, mechanism, or consequence. Not every chart needs all four roles. A simple two-value chart is correct when the contrast itself is the complete story.

The complete policy is in [`docs/source-enrichment.md`](source-enrichment.md).

## 4. Shared stages

Every route follows the same semantic stages:

1. Preserve the expert input claim, then confirm and read supplied sources in full.
2. Extract the relevant evidence, supplemental context, and safe derivations.
3. Fill only material evidence gaps with conditional research.
4. Audit the value representation and any rate/share basis. For percentage-only prices, workforce, exports, production, spending, or revenue, search for the underlying amounts for the same scope and periods. Use actual levels and tangible basis amounts when reported or retrievable; never manufacture a `0%` or index-100 starting point.
5. Choose one central finding, the workflow, and the story recipe.
6. Write the smallest ChartSpec that expresses the enriched evidence spine, including `measure.valueMode`, `measure.levelAvailability`, and `measure.basisAvailability` for rates or shares.
7. Validate the JSON.
8. Render through the selected workflow.
9. Correct semantic errors and rerun the checks.
10. For a batch run, capture the final PNG into `charts/<run-id>/` after
   diagnostics pass. Use `.work/<run-id>/review/` only for temporary or ad
   hoc review.

Write new specifications to:

```text
specs/runs/<run-id>/[slug].json
```

The chart author owns source fidelity, calculations, copy, statuses, region IDs, and recipe choice. The engine owns HTML, CSS, chart-library configuration, geometry, typography, colors, responsive layout, map projection, callout placement, and leader routing.

### Semantic chart QA

Schema validation, shell review, and responsive diagnostics establish that a
chart can render; they do not establish that the chart is editorially correct
or intelligible. After rendering, inspect the chart at the delivery viewport
and state the intended reader takeaway in one sentence. Accept the chart only
if a reader can recover that takeaway without mentally reconstructing the
argument.

Check that:

- The visual grammar matches the evidence and the selected recipe.
- Any unavailable or incomparable tangible level has a named `tangibleTarget`
  and structured research attempts spanning two source types, including a
  data-bearing source.
- `valueMode: "index"` is used only for a named, source-reported index with
  actual point values. Generic visible labels such as `100 index` and `index
  points` are absent.
- Every comparison, trend, or ranking on a shared axis passes this literal sentence test: `Every mark
  encodes [measure.quantity] for [data.scope] in [data.period].` If the words in
  the brackets cannot stay the same for every mark, the values do not belong on
  one scale.
- Every displayed value is reported or transparently derived from compatible,
  same-scope inputs.
- Qualifiers such as `more than`, `about`, and ranges remain visible; a bound is
  not presented as an exact value.
- The title, labels, annotations, and axis describe what the marks actually
  encode.
- A simpler recipe would not communicate the finding more honestly.
- Composition charts retain a tangible absolute amount in `displayValue` when
  the source provides one; percentages alone are not enough when real amounts
  are known.
- Rates and shares expose their tangible basis in `basis` when recoverable.
- Risk ranges include a population or denominator plus a mechanism or
  consequence, not only two percentage endpoints.
- Exact start/end intervals use `timeline.duration` so calendar overlap and
  elapsed time remain visible.
- Discounts, premiums, shortfalls, and overages use
  `comparison.benchmark-gap` when both the benchmark and actual amount are
  available.
- A non-map chart must contain at least two quantitative marks. A lone metric
  must gain a real prior value, target, benchmark, denominator, remainder,
  peer, range, or time series from the source. If none exists, omit the story.

For `comparison.change`, `comparison.scenarios`, `comparison.diverging`,
`comparison.range`, `comparison.benchmark-gap`, `trend.line`, and `ranking.horizontal`, the validator requires `measure.quantity`,
`data[].quantity`, `data[].scope`, and `data[].period`. The item quantity must
match the measure quantity exactly and scopes must match. Rankings and
non-change comparisons must share a period; trend periods may advance while
quantity and scope remain fixed. Generic declarations such as `reported change`
or `metric` are rejected because they hide unlike measures behind one axis.

When several facts with different units, scopes, periods, or operational stages
jointly carry the main argument, split them into separate ChartSpecs. When the
mixed-unit facts are secondary context, keep the primary chart simple and place
them in the unboxed `supportingFacts` rail. Do not normalize unrelated facts
into percentages or turn them into a grid of metric cards merely to make them
look comparable.

For `flow.waterfall`, require a real source-supported start-to-end bridge. The
start, each change, and the ending value must share scope and period, reconcile
arithmetically, and be visually readable as cumulative steps. Do not infer an
exact opening value from charges described as `more than`, `about`, or otherwise
incomplete. If the bridge is inferred or not mutually exclusive, mark it as a
bound and prefer `comparison.change`, `comparison.scenarios`,
`comparison.range`, or a separate chart. A structurally valid waterfall that requires mental
reconstruction fails semantic QA and must be revised or rejected.

The machine contract is strict: every waterfall item must include
`valueStatus: "reported"`, `period`, and `scope`; all three fields must agree
across the bridge. The validator rejects missing or non-reported values,
approximation language, mixed periods or scopes, and arithmetic mismatches. Do
not treat operating profit as a pre-charge net result or move a prior-period
expense into the current-period bridge.

### Branding and watermark QA

Every standard chart uses the shared watermark in its large, centered treatment:
it is centered inside the chart container, remains large enough to survive PNG
and slide export, and uses the shared standard opacity. Do not select a small or
corner watermark because a recipe contains labels, cards, or a dense layout;
solve those layout problems with the recipe's spacing, chart height, and label
placement. The only intentional exception is `map.regional`, whose watermark is
repositioned as a restrained background behind the geography. Inspect the
watermark at the delivery viewport and at the responsive diagnostic widths; it
must be loaded, visible, and not reduced to a corner icon.

## 5. Standard chart workflow

Start with:

```bash
node tool-api/chart.js guide
```

The guide returns recipe selection rules and a validated example path for each recipe. Use it after source enrichment, not directly from an abbreviated input note.

| Finding shape | Recipe |
| --- | --- |
| Two periods of the same named quantity for the same scope | `comparison.change` |
| Actual, expected, prior, target, or alternatives for one quantity, scope, and period | `comparison.scenarios` |
| Positive and negative values of one quantity, scope, and period | `comparison.diverging` |
| Min-max interval, limit, or threshold for one quantity, scope, and period | `comparison.range` |
| Ordered time points | `trend.line` |
| Exact parts of one total | `composition.stacked` |
| Multi-part composition where shape matters | `composition.donut` |
| Starting value, additions or losses, ending value | `flow.waterfall` |
| Ranked categories with long labels | `ranking.horizontal` |
| Categorical conditions with a common measurable dimension | Enrich and select a quantitative recipe |
| Categorical conditions where place explains the finding | `map.regional` |
| One unsupported value or prose-only evidence | Omit until source enrichment supplies visual structure |
| Several essential mixed-unit or mixed-stage measures | Separate ChartSpecs |

Composable semantic features include:

- `references` for targets, averages, legal limits, or benchmarks.
- `data[].annotation` for a concise explanation tied to a point.
- `measure.scale = "logarithmic"` for positive values spanning orders of magnitude.
- `supportingFacts` as an unboxed inline rail for secondary context in a
  different unit.
- Separate ChartSpecs when mixed-unit evidence is the main story rather than
  context.
- `composition.stacked` for a bounded share when both numerator and remainder
  can be encoded as tangible parts.
- `data[].displayValue` for the tangible amount in composition charts; the
  renderer shows it together with the calculated share.

`status.grid` and `headline.metric` are disabled in the production catalog,
schema, and validator. They remain only as legacy renderer code for previously
generated HTML. The Tool API will reject new specs that attempt to create a
text wall or single-number chart.

Run:

```bash
node tool-api/chart.js validate <spec.json>
node tool-api/chart.js render <spec.json> [output.html] [--run-id <id>]
node tool-api/chart.js diagnose <output.html>
```

Inspect the rendered chart for semantic QA before delivery. Use the review
command to capture the inspected artifact:

```bash
node tool-api/chart.js review <output.html> \
  --screenshot --output .work/<run-id>/review/<chart>.png
```

If the standard render command identifies a regional specification, stop and use the regional workflow. Do not remove `map.regional` merely to pass the command.

## 6. Regional breakdown workflow

Start with:

```bash
node tool-api/chart.js regional-guide russia
node tool-api/chart.js regions russia
```

A minimal regional specification contains:

- `recipe: "map.regional"`
- `title`, `date`, `source`, `data`, and `metadata.slug`
- `map.regionSet`
- `label` and `regionId` or `regionIds` for every item
- At least one of `status`, `displayValue`, `detail`, or `value` for every item

For a status map, `status`, `displayValue`, and `detail` are the clearest combination. Supported statuses are `stable`, `improving`, `strained`, `critical`, `blocked`, and `unknown`.

Keep the map object minimal. Do not author coordinates, card positions, route
points, manual lanes, SVG paths, HTML, CSS, JavaScript, or chart-library
configuration. Russian regional maps always use the continental mainland
silhouette. Kaliningrad and island fragments are permanently excluded from the
map geometry and cannot be active map items. Use a separate standard chart,
`status.grid`, or another non-map recipe for detached-region evidence.

Regional summary cards are permanently disabled. The callout cards carry the
evidence, while the compact header, smaller watermark, and wide regional canvas
reserve more room for the map. Automatic sparse routing preserves geographic
card order and favors direct leaders; dense maps switch to crossing-aware ports.
A leader may exit its own highlighted region, but every other highlighted
region is a routing obstacle. The planner prefers one continuous spline and
only adds detours when another highlighted region or leader requires them.

Use a semantic override only when the story requires it:

- `data[].calloutSide`

Run:

```bash
node tool-api/chart.js validate <spec.json>
node tool-api/chart.js regional <spec.json> [output.html] [--run-id <id>]
```

The regional command performs validation, rendering, shell review, and responsive diagnostics. Use `--no-diagnose` only when a browser is unavailable.

## 7. Failure boundary

| Failure | Chart-author response |
| --- | --- |
| Unknown or invalid field | Remove it or use the documented semantic field. |
| Incorrect data count or number | Correct the source-derived data. Do not invent padding values. |
| Supplied link does not match the input note | Preserve the input claim, do not combine it with the mismatched page, and seek a better supplemental source or report the mismatch. |
| External search does not repeat an input claim | Keep the expert-authored claim. Silence is not contradiction and must not become an `uncorroborated` label. |
| A reputable source directly contradicts a material input claim | Preserve both positions in working notes and escalate the conflict for editorial resolution. Do not silently rewrite the report. |
| Source has only a simple comparison | Keep the chart simple unless a material evidence gap justifies targeted research. |
| Additional context is merely adjacent or interesting | Exclude it. Context must strengthen magnitude, comparison, mechanism, or consequence. |
| Copy-length warning | Shorten the title, label, display value, or detail. |
| Regional ID error | Run `regions` and use a stable identifier. |
| Wrong workflow | Use the route returned by the Tool API. |
| Valid specification still has rendering, layout, routing, or diagnostic defects | Report an infrastructure issue with the command output and artifact path. Do not inspect implementation directories. |
| Browser unavailable | Use `--no-diagnose` only as a temporary fallback and report that browser verification remains outstanding. |

## 8. Delivery contract

For an individual chart, report:

- Selected workflow and recipe.
- ChartSpec path.
- Generated HTML path.
- Optional PNG path.
- Validation and diagnostic status.
- Remaining warnings or infrastructure defects.

Do not include generated implementation code in the response.

For a completed batch run, the agent must also:

- Capture one final PNG for every accepted chart.
- Assemble the accepted images into one PowerPoint presentation.
- Save the rendered HTML files, final PNGs, and
  `tochnyi-charts-<run-id>.pptx` in `charts/<run-id>/`.
- Save authored ChartSpecs in `specs/runs/<run-id>/`.
- Run `npm run run:finalize -- <run-id>` after delivery.
- Report omitted, duplicate, non-visual, directly conflicted, or failed stories.

Temporary review belongs in `.work/<run-id>/review/`. Final images used in
the deck belong in the local `charts/<run-id>/` folder. No run-specific
notes, scripts, logs, downloads, or staging files should remain elsewhere.
Production input, generated specifications, chart output, previews, and run
workspaces must remain untracked; `npm run check:repo` enforces that boundary.

Infrastructure architecture and maintenance are documented separately in `docs/architecture.md` and `docs/maintainer-workflows.md`.
