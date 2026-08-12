# Chart-author workflow

This document defines the public Tool API contract for agents producing charts. It does not describe infrastructure maintenance.

A chart-author agent should treat the deterministic engine as a tool. It supplies source fidelity, calculations, editorial meaning, and a semantic `ChartSpec`. It does not inspect rendering machinery.

## Batch workflow

The normal assignment is a user-supplied `input/` folder containing source
materials for one or more data stories. The LLM agent owns the complete batch orchestration:

```text
initialize .work/<run-id>/
    -> input/
    -> fail if the exact project-root source set is missing or empty
    -> inventory supplied files and supported quantitative stories
    -> inventory every materially relevant same-scale observation in visualEvidenceAudit
    -> record selected, omitted, or merged disposition for every candidate
    -> verify .work/<run-id>/source-ledger.json
    -> preserve inventoried claims and enrich without originating new stories
    -> audit actual-level availability and record the value representation
    -> decide the appropriate production tool for each story
    -> author the complete selected ChartSpec set
    -> run the chart builder to render, diagnose, capture, and manifest the set
    -> if requested, assemble one PowerPoint presentation from presentation-plan.json, one chart per slide
    -> save retained specs and final artifacts
    -> finalize and purge transient run data
```

Start each batch with `npm run run:init -- <run-id>`. Keep research notes,
downloads, helper scripts, logs, review captures, and package staging under the
created `.work/<run-id>/` tree. Complete the generated source ledger and run
`npm run run:verify-source -- <run-id>` before external research. After all
selected ChartSpecs are authored, run `npm run run:charts -- <run-id>` to
produce the HTML charts, final PNGs, manifest, QA report, and
`presentation-plan.json`. The plan forbids unrequested cover, title, agenda,
divider, and closing slides. End with
`npm run run:finalize -- <run-id>`, which preserves
`specs/runs/<run-id>/` and `charts/<run-id>/` locally while removing transient
material and legacy previews. It also preserves `input/`. Both retained
production paths are ignored by Git. Finalization fails unless selected ledger
slugs and titles exactly match the final ChartSpecs.

The Tool API described below handles individual chart production. The run chart
builder coordinates the selected set through verified rendering and capture.
Neither component interprets the complete source set or assembles an optional
PowerPoint deck; those remain agent responsibilities.

Consumer-facing copy must not narrate the workflow. `subtitle` is optional and
should be absent unless it adds a real qualification, denominator, mechanism,
scope distinction, or interpretation. Do not write subtitles such as “from the
supplied dataset” or “based on the provided data.” Put a real public source name
in `source.name` when one exists; otherwise omit provenance rather than exposing
an internal working label.

Attribution has two separate semantic fields. Use `source` for the underlying
publication, dataset, organization, or source collection. Use optional
`analysis` for the analyst, author, team, or public account responsible for the
analysis; `analysis.url` may link that public identity. Do not hard-code analyst
handles in renderer code or repurpose `source` as an analyst byline.

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

Before writing any ChartSpec for a batch, record `routingAudit` on every
selected source-ledger candidate. The routing matrix below is still useful as a
working view, but `routingAudit` is the machine-enforced decision record:

| Story | Geographic evidence | Does where change the finding? | Workflow | Rationale |
| --- | --- | --- | --- | --- |
| ... | regions, sites, or none | yes / no | regional-breakdown / standard-chart | one sentence |

Do not choose `standard-chart` merely because the data is a status list or
because the source does not provide coordinates. Stable region IDs are enough
for the regional workflow; the renderer supplies the map geometry and callout
routing. For every story containing geographic names, a `standard-chart`
decision must state why geography is not explanatory. Do not write or render
specifications until each story has exactly one workflow decision.

Three or more distinct named administrative regions in comparable evidence are
already a regional distribution. In that case `routingAudit.geographyRole` must
be `explanatory`, `workflow` must be `regional-breakdown`, and `regionSet` must
be `russia`, even when the prose describes the result as a ranking or comparison
and never uses an explicit spatial cue. Grouped labels count every named region.
With two named regions, a claim about spread, border contrast, clustering,
adjacency, distribution, or concentration also forces regional routing.
Source/spec verification rejects a later ranking or bar chart that contradicts
either rule.

| Question | Route |
| --- | --- |
| Does the explanation depend on where administrative regions are located? | `regional-breakdown` |
| Does the story benefit from highlighting administrative regions, even if only some need callout cards? | `regional-breakdown` |
| Is geography only a label, rank, status, or comparison category? | `standard-chart` |
| Is the story a number, change, trend, composition, flow, or causal chain? | `standard-chart` |

Do not combine both routes in one chart.

For `map.regional`, treat `data[]` as the complete regional evidence inventory,
not as the set of cards. Keep materially reported regions in `data[]` so they
remain highlighted. Use `data[].callout: "none"` when a region should stay on
the map without a box. Reserve callouts for the locations whose value, status,
or explanation needs explicit labeling; the validator allows at most 12 cards.

## 2. Public authoring surface

A chart-author agent may use:

```text
input/
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

Presentation copy must stay editorial. Use source attribution when available and omit it when unavailable. Never expose internal file-handling language, verification labels, diagnostics, or workflow commentary in a chart or slide.

## 3. Source enrichment before recipe selection

The initialized `input/` folder is the authoritative assignment source set.
Preserve supplied claims and datapoints by default. Structured datasets may
support a finding through a documented filter, grouping, or calculation, and
reputable reporting may supplement the supplied material.

Do not treat external research as a vote on whether the input is true. Failure
to locate a second report is not a contradiction. Do not label an input claim
`uncorroborated`, `unsupported`, or `not independently confirmed`, and do not
replace it with an easier-to-source fact, solely because search results are
silent. Only a direct material contradiction from a reputable source should be
marked `conflictStatus: "material"` in external evidence and escalated for
editorial resolution. A conflicted candidate must not be selected or visualized.

Before selecting a recipe:

1. Preserve the supplied editorial claim or dataset finding and confirm that every supplied URL used for supplementation matches the entity, event, period, and finding.
2. Read the full primary source and perform a source-family sweep before splitting the material into separate visuals. Collect related regional, peer, historical, denominator, and same-unit comparison observations first.
3. Extract the main result, comparator, components, cause, consequence, forecast, scale, denominator, and underlying dataset when they are relevant to the same claim. Merge a proposed chart when it is only a summary, complement, subset, or single-point restatement of richer same-topic evidence.
4. Calculate only safe derivations that are directly supported by the sourced values, such as an absolute change, percentage-point change, ratio, share, coverage rate, implied shortfall, or combined amount.
5. Identify whether a material evidence gap remains.
6. Search beyond the source to fill that named gap or add useful attribution and context.
7. Determine whether tangible levels are reported or retrievable. For repeated category/time pairs, evaluate comparability within each pair rather than across unrelated category magnitudes. For a rate or share, separately determine whether the tangible numerator/denominator or population/affected amounts are available; when they are, select level geometry.
8. Record the choice in `representationAudit`. Any unavailable or incomparable level or basis requires completed, source-specific checks and outcomes; pending research notes are invalid.
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

The evidence spine has one central finding and may use supporting facts for
magnitude, comparison, mechanism, or consequence. Not every chart needs all four
roles. Two generic categorical bars are not sufficient. A two-value chart is
valid only when a relationship-specific recipe makes the relationship itself
the geometry; otherwise recover a third independent same-scale observation,
merge, or omit.

For a rate or share whose tangible basis remains unavailable or incomparable,
one reported percentage plus its derived complement is still only one
independent observation. Recover a same-unit peer, regional observation,
prior/current point, benchmark, or target. If the full source already contains
that richer comparison, it belongs in primary geometry rather than
`supportingFacts`; if it belongs to a richer same-topic visual, merge the thin
claim instead of creating another slide.

The complete policy is in [`docs/source-enrichment.md`](source-enrichment.md).

## 4. Shared stages

Every route follows the same semantic stages:

1. Preserve the supplied claim or data-derived finding, then confirm and read supplied sources in full.
2. Extract the relevant evidence, supplemental context, and safe derivations.
3. Fill only material evidence gaps with conditional research.
4. Audit the value representation and any rate/share basis. For normalized changes or shares, search for underlying tangible amounts for the same scope and periods when material and reasonably retrievable. Use actual levels and tangible basis amounts as the plotted geometry when available; never manufacture a `0%` or index-100 starting point.
5. Choose one central finding, the workflow, and the story recipe.
6. Write the smallest ChartSpec that expresses the enriched evidence spine, including `measure.valueMode`, `measure.levelAvailability`, and `measure.basisAvailability` for rates or shares.
7. Validate the JSON.
8. Render through the selected workflow.
9. Run the claim-to-geometry check: state the headline and identify the exact
   marks that prove it. Reject a chart whose geometry only shows adjacent facts
   while the title asserts a mechanism or consequence that the evidence does
   not support.
10. Correct semantic errors and rerun the checks.
11. For a batch run, capture the final PNG into `charts/<run-id>/` after
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
- Every derived display value inherits the precision and uncertainty of the
  source values that constrain it. A rounded or approximate benchmark must not
  produce a multi-decimal calculator result. Round to the coarsest materially
  constraining input precision and preserve approximation/bound qualifiers.
- The title, labels, annotations, and axis describe what the marks actually
  encode.
- The exact plotted marks establish the title's comparison or mechanism. If a
  directional relationship is used, one source-ledger mechanism statement
  explicitly links the plotted outcome to at least one plotted driver;
  chronology or adjacent facts are not enough.
- When the title is defined by crossing or approaching a breakeven,
  profitability floor, threshold, cap, ceiling, limit, or cutoff, that anchor
  is visible in primary geometry as a labeled reference, benchmark, or
  threshold mark. Before/after values alone do not establish a threshold story.
- Every reference line is necessary, has a meaningful visible label, and does
  not duplicate another reference. A reference that needs a punctuation-only
  label to stay out of the way should be removed and moved to supporting
  context.
- Relationship signal cards do not mix `pp`/percentage-point notation with `%`
  rate notation. Preserve the mathematical distinction in detail or note copy,
  or choose a different representation rather than silently relabeling it.
- A simpler recipe would not communicate the finding more honestly.
- Composition charts retain a tangible absolute amount in `displayValue` when
  the source provides one; percentages alone are not enough when real amounts
  are known. Two-part compositions use one label treatment per segment rather
  than repeating the same category, percentage, and amount inside and below the
  bar.
- Rates and shares switch to tangible level geometry when their basis is
  recoverable; the denominator or population must be visible on the primary
  scale and a `basis` rail alone does not satisfy the requirement.
- If a rate or share basis remains unavailable or incomparable, one independent
  percentage is not enough for a standalone chart. A `100% - share` complement
  is derived, not independent orientation. Require a same-unit peer, regional
  observation, prior/current point, benchmark, or target, and keep every
  headline-relevant normalized comparator in primary geometry.
- Three or more distinct named administrative regions in comparable evidence
  must use the regional workflow even if a ranking would be numerically valid.
  Grouped labels count every named region; do not rely on the title or subtitle
  containing words such as `regional`, `spread`, or `border` to trigger routing.
- Risk ranges include a population or denominator shown on the plotted scale
  plus a mechanism or consequence, not only two percentage endpoints.
- Three or more ordered observations that establish slowdown, acceleration,
  reversal, or persistence use `trend.line`; those observations cannot be
  reduced to supporting facts around a two-value chart.
- Repeated additive category mixes across ordered periods use `trend.stacked`.
  Every period must carry the same category labels in the same order, including
  explicit zero values, so the legend and stack colors remain stable over time.
- A 3–4 point sequence of tiny exact counts is not accepted as a trend merely
  because the points are ordered in time. Require an independent same-unit
  reviewed universe, portfolio/network denominator, population, capacity,
  affected sales/volume/value, or richer quantitative series. If chronology is
  the meaningful dimension, prefer event/calendar structure instead.
- Three or more materially relevant observations of one quantity and unit must
  all be recorded in `visualEvidenceAudit` and preserved as primary `data[]`
  items. Do not collapse named components, categories, or time points into one
  aggregate, one range, one total, or one headline value.
- Before accepting a chart sourced from an article or dataset that also produced
  another candidate, confirm that the chart is not merely a summary,
  complement, subset, or single-point restatement of the richer same-topic
  evidence. If it is, merge it. A technically valid thin chart is still a QA
  failure when the same source already provides the comparison needed to make
  the point intelligible.
- Duration comparisons use `timeline.duration` so calendar overlap and elapsed
  time remain visible. Use exact start/end intervals or one verified
  `timeline.anchorDate` plus exact `duration` and `durationUnit` fields.
- Shipment, reserve, or shortage amounts described as days of consumption,
  demand coverage, or share of need include a visible denominator reference.
  Keep the physical supply components in their original unit. A denominator may
  be shown as a numeric reference rather than a redundant category row.
- When the point is that amounts are small relative to a baseline, do not use a
  logarithmic scale. The visual distance must preserve the proportional gap.
  If a monthly or annual denominator is at least about 8× the largest retained
  component, period-normalize that same denominator to a shorter familiar
  interval, usually a week or day, and keep the chart linear. Record the
  rate-preserving derivation and leave all components unchanged.
- Prices, costs, freight, margins, discounts, premiums, shortfalls, and
  overages use segmented `comparison.benchmark-gap` geometry when the prior or
  total benchmark can be recovered. The plotted `value` is the underlying
  actual level, not the gap amount. One row is preferred when one relationship
  fully carries the finding; two category-level before/after pairs use two
  benchmark-gap rows rather than four independent bars. No row merely repeats
  the total or remainder.
- More generally, when two positive levels are naturally current/actual versus
  prior, standard, limit, target, or another reference, use one
  `comparison.benchmark-gap` row rather than two `comparison.change` bars.
- Do not use dot-counting or pictograms. Two exact count categories must gain a
  third comparable count, a tangible denominator/population, an independent
  benchmark, or a time series before they deserve a standalone chart. Their
  own sum is derived and does not count as an anchor. Different-unit numeric
  context does not satisfy this gate.
- Positive additive components of one total use `composition.components` so
  every component starts at zero and the reported total is one reference.
  With only two components, that reconciled total is not independent
  orientation; require another same-scale benchmark/denominator, recover a
  third component, or use a more meaningful recipe. `flow.waterfall` is
  reserved for a genuine running balance moving through exact changes.
- Three or more categories with one before/benchmark value and one after/actual
  value use `comparison.dumbbell` when the category-level movement is the
  finding. Different category magnitudes do not invalidate within-category
  paired comparisons.
- Never flatten repeated category/time pairs into `comparison.scenarios`.
  Scenarios are same-period alternatives. Use `comparison.benchmark-gap` for
  one or two paired categories and `comparison.dumbbell` for three or more.
- When two unlike quantitative drivers or formula inputs and one outcome are all essential, use
  `relationship.converging-signals` instead of a common axis. The two drivers
  and outcome must measure three distinct real-world quantities, and
  `relationship.formula` must state the source-supported mechanism or identity,
  including material derivations such as quantity × unit price = value. Repeated
  prices, repeated volumes, or one measure at different dates require change,
  scenarios, dumbbell, or trend geometry. Each measure renders as an independent
  local quantitative signal. In directional mode, a source-ledger mechanism
  statement must explicitly link the outcome to at least one driver. Both
  driver paths meet and continue briefly toward the outcome in the same
  connector color, without a decorative hub or node. Generic Factor 1, Factor
  2, and Outcome captions are not rendered.
  Connector width is fixed and
  never represents magnitude. Identity mode requires an exact same-scope,
  same-period equation; directional mode requires a note when periods or scopes
  differ.
- A headline built around opposing quantities cannot plot only one side and
  relegate the other numeric signals to `supportingFacts`.
- `subtitle` is optional and should be absent when it repeats the title,
  category labels, percentages, or amounts already visible in the marks.
- Leave `options.labelMode` on `auto` for ordinary column charts. Auto placement
  is family-coherent: all labels stay outside when they fit; when endpoint
  headroom forces labels inside and every bar can support that treatment, the
  whole bar family moves inside. Mixed inside/outside treatment is reserved for
  a genuine physical-fit conflict. Use explicit `inside` or `outside` only as
  an intentional editorial override.
- `comparison.scenarios` must contain at least three independent values.
  Supporting facts, annotations, a numeric reference, or a derived total do not
  rescue two generic bars. Use a relationship-specific two-value recipe when
  justified; otherwise enrich, merge, or omit.
- Generic categorical/bar charts need at least three independent quantitative
  observations. A lone metric must gain real structure. Relationship-specific
  two-value recipes remain valid when their geometry itself encodes the
  comparison, such as a true benchmark gap, sign-crossing change, diverging
  comparison, or duration.
- For forecasts, targets, outlooks, guidance, and scenario ranges, search for a
  same-unit actual/current/latest realized observation. If available, show it
  on the visual scale as a numeric reference; do not leave it only in
  `supportingFacts`.
- A range endpoint, floor, ceiling, total, remainder, or zero-gap endpoint that
  is already encoded by the primary geometry does not count as an independent
  anchor. Do not add a duplicate endpoint merely to make a thin chart pass.

For `comparison.change`, `comparison.scenarios`, `comparison.diverging`,
`comparison.range`, `comparison.benchmark-gap`, `comparison.dumbbell`,
`composition.components`, `trend.line`, `trend.stacked`, and `ranking.horizontal`, the validator requires `measure.quantity`,
`data[].quantity`, `data[].scope`, and `data[].period`. The item quantity must
match the measure quantity exactly and scopes must match. Rankings and
non-change comparisons must share a period; trend periods may advance while
quantity and scope remain fixed. Generic declarations such as `reported change`
or `metric` are rejected because they hide unlike measures behind one axis.

When exactly two quantitative facts act as drivers or formula inputs of one
outcome, and all three are essential, measure distinct quantities, and have an
explicit source-supported mechanism or identity, `relationship.converging-signals` may keep them in one visual without
a shared scale. The local signal lengths are meaningful only within each
measure; connector geometry communicates convergence, not relative size, and stops at the merge rather than drawing a separate output line into the outcome signal.
More diffuse facts with different units, scopes, periods, or operational stages
belong in separate ChartSpecs. When mixed-unit facts are secondary context, keep
the primary chart simple and place them in the unboxed `supportingFacts` rail.
Do not normalize unrelated facts into percentages or turn them into a grid of
metric cards merely to make them look comparable.

Apply an information-economy test before accepting the spec. Every mark must add
an independent period, category, scenario, or measurement. Reject complement
rows, duplicated totals, and zero-gap benchmark rows already encoded by another
segment or marker.

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
| Ordered periods with the same additive category mix | `trend.stacked` |
| Exact parts of one total when the mix itself is the finding and there is no more informative same-total policy, target, prior, or alternative comparator | `composition.stacked` |
| Multi-part composition where shape matters | `composition.donut` |
| Starting value, additions or losses, ending value | `flow.waterfall` |
| Ranked categories with long labels | `ranking.horizontal` |
| Categorical conditions with a common measurable dimension | Enrich and select a quantitative recipe |
| Categorical conditions where place explains the finding | `map.regional` |
| One unsupported value or prose-only evidence | Omit until source enrichment supplies visual structure |
| Several essential mixed-unit or mixed-stage measures | Separate ChartSpecs |

For `ranking.horizontal`, distinguish a categorical profile from a focus story.
A categorical profile uses the renderer's qualitative palette, ordered so
adjacent bars are visibly different hue families. Do not manually simulate
multi-color output by cycling through blue/yellow shade variants. A focus story
may instead use the restrained focus treatment when one or two ranks are the
actual editorial emphasis.

Composable semantic features include:

- `references` for targets, averages, legal limits, or benchmarks.
- `data[].annotation` for a concise explanation tied to a point.
- `measure.scale = "logarithmic"` only for genuinely multiplicative
  comparisons spanning orders of magnitude. Never use it to make a benchmark
  or denominator comparison fit when the intended message is that the primary
  amounts are small relative to that baseline.
- `supportingFacts` as an unboxed inline rail for secondary context in a
  different unit.
- Separate ChartSpecs when mixed-unit evidence is the main story rather than
  context.
- `composition.stacked` for a bounded share only when the tangible whole is
  reported or retrievable and the part-versus-remainder split itself is the
  finding. Do not use `100% - share` as invented orientation when the tangible
  basis is unavailable. If the source provides a meaningful policy, target,
  prior, peer, regional, or alternative share, use that independent comparison
  in primary geometry instead.
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
reserve more room for the map. Automatic routing uses one straight segment from
each region anchor to its card. Cards stay on their geographically sensible side
and are vertically reordered from anchor geometry to eliminate crossings and
minimize total travel. `data[]` order and legacy `calloutOrder` do not control
automatic card placement. Any rendered leader crossing fails regional delivery.
Highlighted regions are evidence, not routing obstacles. Leader-origin dots are
never rendered. Use explicit `ports` routing only for a verified special case.

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
| External search does not repeat an input claim | Keep the supplied claim. Silence is not contradiction and must not become an `uncorroborated` label. |
| A reputable source directly contradicts a material input claim | Mark the external evidence `conflictStatus: "material"`, preserve both positions in working notes, and hold/omit the candidate until editorial resolution. Never chart the disagreement itself. |
| Source has only two generic categorical values | Research a third independent same-scale observation, use a defensible relationship-specific recipe, merge, or omit. Do not publish two generic bars. |
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
- Assemble the accepted images into one PowerPoint presentation when requested.
- Save the rendered HTML files and final PNGs in `charts/<run-id>/`; save
  `tochnyi-charts-<run-id>.pptx` there when a deck is requested.
- Save authored ChartSpecs in `specs/runs/<run-id>/`.
- Run `npm run run:finalize -- <run-id>` after delivery.
- Report omitted, duplicate, non-visual, directly conflicted, or failed stories.

Temporary review belongs in `.work/<run-id>/review/`. Final images belong in
the local `charts/<run-id>/` folder. No run-specific
notes, scripts, logs, downloads, or staging files should remain elsewhere.
Production input, generated specifications, chart output, previews, and run
workspaces must remain untracked; `npm run check:repo` enforces that boundary.

Infrastructure architecture and maintenance are documented separately in `docs/architecture.md` and `docs/maintainer-workflows.md`.
