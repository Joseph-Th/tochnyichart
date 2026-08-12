# Batch workflow

This is the primary end-to-end workflow for producing Tochnyi chart and infographic deliverables from a supplied source set.

## Input

The user provides source materials in the project-root folder:

```text
input/
```

`input/` may contain editorial notes, source documents, structured datasets,
notebooks, links, and partially summarized evidence. Treat the supplied source
set as authoritative for the assignment unless a reputable source directly
contradicts a material point. Structured data can support a story through a
documented filter, grouping, or calculation rather than a literal prose excerpt.

The exact project-root source set is mandatory. A missing, empty, or changed
`input/` stops the run. Never substitute a sibling project, prior batch, or
alternate source collection.

## Agent responsibility

The LLM agent is the batch orchestrator. It owns the sequence across source review, chart production, image capture, and any requested presentation assembly.

The deterministic chart engine is one tool used by the agent. It does not interpret the entire source set or build an optional PowerPoint deck by itself.

## Required sequence

```text
initialize .work/<run-id>/
    |
    v
input/
    |
    v
inventory source files and derive supported data stories
    |
    v
inventory supported quantitative claims with prose excerpts or structured-data derivations
    |
    v
inventory every materially relevant same-scale observation in visualEvidenceAudit
    |
    v
inventory same-unit orientation anchors and material mixed-unit formula inputs
    |
    v
record selected, omitted, or merged disposition for every candidate
    |
    v
verify .work/<run-id>/source-ledger.json
    |
    v
preserve each inventoried claim and enrich it from reputable sources
    |
    v
apply the visual-evidence gate; enrich or omit prose-only and one-point stories
    |
    v
audit actual levels and the tangible basis behind rates and shares
    |
    v
decide whether each story needs a chart and select the appropriate workflow and recipe
    |
    v
author and validate one ChartSpec per selected story
    |
    v
compare the authored set for duplicate source, reporting context, recipe, and series skeleton
    |
    v
consolidate duplicate visuals and update the ledger to merged where needed
    |
    v
render and diagnose the chart HTML
    |
    v
capture one final PNG image per accepted chart
    |
    v
write the run manifest and visual QA report
    |
    v
if requested, assemble the accepted images into a PowerPoint presentation
    |
    v
save the complete run delivery in charts/<run-id>/
    |
    v
finalize the run and purge transient material
```

## 0. Initialize isolated transient storage

Before reading the assignment, create the run workspace:

```bash
npm run run:init -- <run-id>
```

Store every non-retained artifact under `.work/<run-id>/`, including
research notes, downloaded sources, helper scripts, logs, diagnostic dumps,
review screenshots, and package staging. Do not create run-specific scripts or
data files at the repository root. Do not use `previews/` for new work.

Production input, generated ChartSpecs, chart output, previews, and workspaces
are local artifacts. Git ignores `input/`, `specs/runs/`, `charts/`,
`previews/`, and `.work/`. Run `npm run check:repo` before committing; it fails
if any production or transient artifact is tracked, including force-added files.

## 1. Parse the assignment

Read the complete `input/` source set and separate it into distinct data stories.

`npm run run:init -- <run-id>` creates
`.work/<run-id>/source-ledger.json` with the input file inventory, per-file
hashes, aggregate byte count, and source-set SHA-256 hash. Complete this ledger
before external research. Every selected quantitative story must receive one
disposition: `selected`, `omitted`, or `merged`. Follow `docs/source-ledger.md`
for the required fields. Prose sources use exact excerpt anchors; structured
sources use file selectors and documented derivations.

For each candidate, identify:

- Working subject and central claim
- Supplied source links
- Reporting period
- Values already present in the note
- Whether the story duplicates or overlaps another item
- Whether the story is sufficiently material and visual to include
- One or more exact excerpts, structured-data selectors, or source references
- The exact excerpt or documented derivation that supports any proposed chart title
- Which evidence is primary input evidence versus external or derived context
- Whether actual values are reported, retrievable, unavailable, incomparable,
  or not applicable, and the least normalized representation the chart should use

For structured categorical rankings, inventory the full non-empty category
domain before choosing a cutoff. Default to all materially relevant categories.
If a top-N subset is genuinely the editorial requirement, document the cutoff
and why omitted categories are not needed for the claim. Visible titles should
also replace internal dataset codes or unexplained acronyms with plain-language
audience-facing wording. Do not use the subtitle to explain internal dataset
names or to say that values came from the supplied/provided input. A subtitle
must add reader-facing analytical context; provenance belongs in `source.name`
only when an audience-facing source name is actually available.
Use `note` only for a material reader-facing caveat. Parsing behavior,
partial-date recovery, row-exclusion bookkeeping, and similar production
methodology belong in the source ledger or metadata rather than the chart footer
unless omitting them would materially mislead the reader.
If the assignment specifies an analyst, author, team, or public account, record
that separately in ChartSpec `analysis.name` with optional `analysis.url`.
Never substitute the analyst identity for the underlying `source`, and never
hard-code recurring analyst handles into renderer code.
When the input contains several sheets, tabs, notebook sections, or analysis
views, inventory which view is intended for the requested deliverable. A view
that explicitly generates separate plots should be preferred for individual
chart extraction. Record any assignment-specific category renaming as a ledger
`specLabel` alias while preserving the raw source category in `label`.
- Every named same-scale observation that materially supports the central claim,
  including the exact label that will appear in the ChartSpec when it differs
  from the working evidence label
- For rates and shares, whether the numerator/denominator or
  population/affected amounts are reported, retrievable, unavailable,
  incomparable, or not applicable
- Named research attempts and outcomes when levels or a basis are proposed as
  unavailable or incomparable

Do not assume every paragraph requires a chart. Merge duplicate notes when they
describe the same finding. Exclude items that are duplicative, immaterial, or do
not support a clear visual story. Do not omit a story merely because an external
search failed to repeat a supplied claim.

An omission requires a specific editorial reason. A merged candidate must name
its destination. Set `inventoryComplete` to true only after the complete input
has been checked against the ledger, then run:

```bash
npm run run:verify-source -- <run-id>
```

## 2. Verify and enrich each story

Follow `docs/source-enrichment.md` before selecting a chart recipe.

The agent must preserve supplied editorial claims and data-derived findings,
confirm and read supplied sources, extract relevant evidence, calculate safe derivations, and fill useful
evidence gaps. It must not add unrelated context merely to make the chart more
complex. External sources may supplement or attribute the input, but may not
silently override it unless they directly contradict a material point.

External research may not originate a selected story. Every selected item must
have primary evidence anchored in the current `input/` source set, and its
`titleBasis` must be an exact prose excerpt or documented structured-data
derivation that directly supports the title. External evidence may be
comparison, denominator, mechanism, consequence, or context, but never the
primary claim.

Before accepting a chart candidate, apply the visual-evidence gate:

- Perform a source-family sweep before splitting one supplied article, dataset,
  or paragraph into multiple selected visuals. Collect related regional, peer,
  historical, denominator, and same-unit comparison observations first. If a
  proposed chart is only a summary, complement, subset, or single-point
  restatement of a richer same-topic visual, merge it into the richer candidate.
- A generic categorical/bar chart must contain at least three independent
  quantitative observations. Two-value charts are reserved for
  relationship-specific geometry where the relationship itself is the visual
  evidence, such as benchmark-gap, sign-crossing change, diverging comparison,
  or duration.
- Forecast, target, outlook, guidance, and scenario stories must search for a
  same-unit actual/current/latest realized observation. When one exists, put it
  on the visual scale as primary geometry or a numeric reference; leaving it in
  `supportingFacts` is not sufficient orientation.
- If the finding is defined by a numeric breakeven, profitability floor,
  threshold, cap, ceiling, limit, or cutoff, record it in
  `visualEvidenceAudit.orientationAnchors` before recipe selection and preserve
  it in primary geometry. Prior/current values do not replace the threshold
  that gives them meaning.
- Derived display values must inherit source precision and uncertainty. Round
  derived gaps, averages, shortfalls, and implied values to the coarsest
  materially constraining input precision and preserve qualifiers such as
  `about`, `approximately`, `up to`, or `at least`. Raw calculator decimals
  from rounded source values are a validation failure.
- A lone value must gain a source-supported prior value, target, benchmark,
  denominator, peer, range, or time series. A single-row
  `comparison.benchmark-gap` is valid because the actual segment, gap segment,
  and benchmark marker are separate quantitative marks.
- `comparison.scenarios` requires at least three independent same-scale values.
  A numeric reference, tangible basis, supporting fact, annotation, or derived
  total does not rescue two generic bars. Use a defensible relationship-specific
  recipe, merge the pair into a richer same-topic visual, or omit it.
- A normalized change or share should use underlying tangible amounts when they
  are material to interpretation and reasonably retrievable for the same scope
  and periods before normalized geometry is accepted.
- A categorical status list must be quantified on one common dimension or
  routed to `map.regional` when geography explains the finding.
- A low/high range endpoint, floor, ceiling, total, remainder, or zero-gap value
  that is already encoded by the primary geometry is not an independent anchor.
  Do not add a duplicate endpoint merely to make a thin chart appear richer.
- When two quantitative inputs in different units materially explain a headline
  outcome, such as area × price per square metre = transaction value, keep the
  inputs in the primary visual argument. Prefer `relationship.converging-signals`
  with an explicit formula when both inputs and the outcome are material.
- When three or more materially relevant observations share one quantity and
  unit, inventory all of them in `visualEvidenceAudit` and keep all of them as
  primary `data[]` items. Do not collapse named shipment components, categories,
  or time points into one aggregate, one range, one total, or one headline value.
- A rate or share with a reported or retrievable tangible basis must switch to
  level geometry and plot the tangible amounts; a floating percentage plus a
  basis rail is not sufficient. The total population or denominator must also
  appear on the plotted scale as a point, reference, benchmark, or complete
  composition.
- If a rate or share basis remains unavailable or incomparable, one reported
  percentage plus its derived complement is still only one independent
  observation. Recover a same-unit peer, regional observation, prior/current
  point, benchmark, or target. Once two or more such normalized observations
  are available, keep all of them in primary geometry rather than relegating
  headline-relevant comparators to `supportingFacts`.
- A share of a named concrete total must record `basisTarget` and recover the
  compatible total when it is supplied or reasonably retrievable. Derive the
  tangible numerator when appropriate and prefer level geometry. A 100%
  reference does not satisfy this requirement.
- Do not use dot-counting or pictograms. A story with only two exact count
  categories must gain a third comparable count, a tangible denominator or
  population, an independent meaningful benchmark, or a time series before it
  is selected as a standalone chart. The sum of those two counts is derived and
  does not count as an anchor. Different-unit percentage context does not
  satisfy this evidence gate.
- The same quality gate extends to short 3–4 point exact-count series when the
  counts are tiny or barely vary. Do not publish a line merely because the
  observations have dates. Recover an independent reviewed universe,
  portfolio/network total, population, capacity, affected sales/volume/value,
  or a richer series. If chronology is the real information, use event/calendar
  structure; otherwise merge or omit the story.
- A risk estimate must include the exposed population or denominator, show that
  total on the plotted scale, and include at least one mechanism or consequence.
- Three or more ordered observations that establish slowdown, acceleration,
  reversal, or persistence must use `trend.line`. Do not plot two values and
  move the rest of the series into `supportingFacts`.
- Ordered monthly or periodic compositions use `trend.stacked` when every
  period contains the same additive categories. Preserve zero-valued cells,
  keep category order stable, and use the period total only as a label rather
  than duplicating it as another stack segment. The renderer must reserve a
  dedicated responsive legend band above the plot so wrapped legend items and
  period-total labels cannot occupy the same vertical space.
- Duration comparisons should use `timeline.duration`. Supply exact start and
  end dates, or one verified `timeline.anchorDate` plus exact `duration` and
  `durationUnit` values.
- Amounts described as days of consumption, demand coverage, or share of need
  must show the demand denominator. When the input contains two or more
  physical-volume contributors, complete `visualEvidenceAudit.coverageAudit`,
  disposition every reported volume, and plot all retained components plus the
  denominator in one tangible unit. The denominator may be a visible numeric
  reference rather than a redundant category row. Coverage time is secondary
  context, not a substitute for the supply-versus-demand decomposition.
- Do not use a logarithmic scale when the editorial point is that one or more
  amounts are small relative to a baseline. Logarithmic geometry compresses the
  proportional gap and therefore weakens the intended magnitude comparison.
  Keep the scale linear.
- If a monthly or annual flow denominator is at least about 8× the largest
  retained component, period-normalize that same denominator to a shorter
  familiar interval before charting. Prefer a week when practical, or a day if
  a week is still too large. Keep all components in the original physical unit;
  only the denominator period changes. Use the derived weekly/daily amount as a
  visible reference and record the rate-preserving derivation in the evidence
  audit or basis.
- Prices, costs, freight, margins, discounts, premiums, shortfalls, and
  overages should use segmented `comparison.benchmark-gap` geometry when the
  benchmark and actual amount are available. Derive a prior level from the
  current amount and reported change when necessary. Plot the underlying
  actual quantity, not the gap amount itself. `value` and `benchmark` must be
  the same quantity in the same unit, and `gapDisplayValue` must state the
  arithmetic difference or percentage context rather than a ratio, per-unit
  equivalence, or cross-unit conversion. Use one row when one benchmark
  relationship fully carries the finding. For two category-level before/after
  price pairs, use two benchmark-gap rows rather than four independent bars.
  Do not add a row that merely restates the total or derived remainder.
- More generally, when two positive level values are naturally current/actual
  versus prior, standard, limit, target, or another reference, prefer one
  `comparison.benchmark-gap` row over two independent `comparison.change` bars.
  Reserve `comparison.change` for cases where benchmark semantics do not fit,
  such as sign-crossing levels, zero-to-nonzero movement, or native rates and
  indexes.
- When several positive values are additive components of one reported total,
  use `composition.components`. Every component is seated at zero and the total
  is a single reconciling numeric reference. With exactly two components, that
  total is not independent orientation: add a same-scale benchmark/denominator,
  recover a third component, use a relationship-specific recipe, or merge/omit.
  Do not use `flow.waterfall` for a simple component decomposition; waterfall is
  for a genuine running balance moving through exact changes.
- Three or more categories with paired before/after or benchmark/actual values
  should use `comparison.dumbbell` when the category-level movement is the
  finding. Different category magnitudes, grades, or delivery bases do not make
  the pairs incomparable when each category's before and after observations use
  the same unit and basis.
- Never flatten repeated `Category · earlier` / `Category · later` observations
  into `comparison.scenarios`. Scenarios are same-period alternatives, not a
  substitute for paired-change geometry.
- When two drivers and one outcome are all essential but use unlike quantities
  or units, use `relationship.converging-signals` instead of forcing them onto a
  shared scale. Each factor and the outcome must render as an independent local
  quantitative signal, with both driver paths meeting near the outcome rather
  than continuing as a separate output connector. The merge is connector
  geometry, not a decorative hub, node, or third quantitative path.
  Connector width is fixed and never encodes magnitude. Use identity
  mode only for arithmetically reconciling evidence; otherwise use directional
  mode and disclose incompatible periods or scopes.
- `relationship.converging-signals` requires three distinct real-world
  quantities and a source-supported mechanism stated in `relationship.formula`.
  Two prices, two volumes, or the same measure at different dates are not
  drivers and an outcome; use change, scenarios, dumbbell, or trend geometry.
- A headline built around opposing quantities, such as lower purchase volume
  and higher prices producing higher spending, cannot plot only one side and
  leave the other figures in `supportingFacts`.
- `subtitle` is optional. Omit it when it repeats the title, category labels,
  percentages, or amounts already visible in the marks.
- Two-part compositions must use one label treatment per segment. Do not repeat
  the same category, percentage, and amount inside the bar and immediately
  below it.
- Column value labels should use `options.labelMode: "auto"` by default. Auto
  placement is family-coherent rather than bar-by-bar: keep all labels outside
  when they fit; if endpoint headroom forces inside placement and every bar can
  support it, move the whole bar family inside; mix inside/outside only when a
  genuine physical-fit conflict makes one treatment impossible. Explicit
  `inside` or `outside` is an editorial override, not a routine spacing fix.
- Every additional mark must add independent information. Reject complements,
  remainders, totals, and zero-gap closure rows that the primary geometry
  already encodes.
- A prose wall, card grid, bullet grid, or one oversized number is not an
  acceptable chart.
- Omit a story when source enrichment cannot supply legitimate visual
  structure.

The production catalog and validator disable `status.grid` and
`headline.metric`, so these failures cannot proceed to rendering.

Before accepting `unavailable` or `incomparable` for actual levels or a
rate/share basis, state the exact `representationAudit.tangibleTarget` and
record at least two structured source checks. Each attempt must include a named
source, source type, concrete locator, and outcome. The attempts must cover two
source types and include an official dataset, company filing, market-data
source, or industry dataset capable of supplying tangible values. Each locator
and outcome must describe a completed source-specific check; pending language
or a generic `website`, `search`, `dataset`, or `report` locator is invalid.
Consumption or demand denominators require an official or industry dataset
check before they may be classified unavailable.

For price-like stories, `incomparable` is a within-pair judgment. If a source
reports a current price and a percentage move for a category, derive the prior
price when the basis is compatible. Do not call the whole story incomparable
merely because wheat and barley, two coal grades, or other categories have
different absolute price levels. When only some pairs are recoverable, prefer
the recoverable tangible pairs if they still support the input-anchored
conclusion and keep unmatched normalized observations secondary; otherwise
continue targeted research for the missing levels.

Synthetic 100-based indexes and fabricated 0% starting observations are not
fallbacks. If tangible values remain unavailable, show only the reported
relative observations in plain language or omit the story. Reserve
`measure.valueMode: "index"` for a named index whose point levels are actually
reported by the source, and do not use viewer-facing labels such as `100 index`
or `index points`.

## 3. Select the production tool

For each accepted story, decide whether the output should use:

- The standard chart workflow
- The regional chart workflow
- A non-chart visual or textual slide treatment when the evidence is not suited to a chart
- No slide, when the story is weak, duplicative, non-visual, or irrelevant

When a chart is appropriate, use the public Tool API:

```bash
node tool-api/chart.js orient
node tool-api/chart.js guide
node tool-api/chart.js regional-guide russia
```

Select the workflow and recipe from the enriched evidence, not directly from the abbreviated input note.

Route geography before selecting the visual form. Do not infer
`standard-chart` from a story being a status list, ranking, or comparison. Use
`regional-breakdown` whenever administrative locations are part of the finding
and spatial distribution, concentration, adjacency, regional contrast, or
location-specific callouts affect interpretation. Use `standard-chart` only
when place names are labels or categories and a map adds no explanatory value.

Three or more distinct named administrative regions in comparable evidence are
treated as a regional distribution even when the prose does not use spatial
language. Grouped labels count every named region. Such evidence must route to
`regional-breakdown`; a standard ranking is not an allowed fallback. With two
named regions, explicit border, adjacency, clustering, concentration,
distribution, or spread claims also force regional routing.

Before writing specifications, record `routingAudit` on every selected source
ledger candidate. The routing matrix may still be used as a working view, but
the ledger is the machine-enforced source of truth. `routingAudit` must classify
`geographyRole` as `none`, `categorical`, or `explanatory`, select
`standard-chart` or `regional-breakdown`, and include a short rationale. For a
regional story also set `regionSet: "russia"`.

The corresponding working matrix columns are:

```text
story | geographic evidence | does where change the finding? | workflow | rationale
```

For a story containing geographic names, a `standard-chart` rationale must
explicitly explain why geography is not explanatory. Do not let missing
coordinates, a preselected recipe, or an existing draft spec decide the route.
Three or more distinct named administrative regions in comparable evidence
require `geographyRole: "explanatory"` and `workflow: "regional-breakdown"`
even when the prose contains no spatial cue. Grouped labels count every named
region. With two regions, a claim about spread, border contrast, clustering,
adjacency, distribution, or concentration also forces regional routing. The
source verifier rejects a later ranking/bar ChartSpec that tries to bypass
either rule.
For regional candidates, use `regional-guide` and `regions` to obtain stable
region IDs before authoring the ChartSpec. Keep every materially reported
continental region in `data[]`; the regional data array is the evidence
inventory, not a callout inventory. Use `data[].callout: "none"` for regions
that should remain highlighted without a box. Do not delete reported regions
merely to make the card layout fit. At most 12 regional items may render
callout cards. Arrange visible callouts in deliberate reading order: use
the semantic data only; do not author card order. Automatic layout assigns the
geographically sensible side, reorders cards from anchor geometry to minimize
crossings and total travel, and draws one straight region-to-card leader. Any
rendered leader crossing fails delivery. `data[].calloutOrder` is legacy input
and is ignored by automatic geometry. Leaders do not render origin dots. Do not
proceed to rendering until each accepted story has exactly one recorded workflow
decision.

Do not write a ChartSpec whose output slug is absent from the source ledger.
Do not add a chart discovered during research. If a new input-supported story
was genuinely missed, return to the inventory, add its exact anchors, and rerun
source verification before authoring it.

## 4. Produce each chart

For every accepted chart story, write a semantic `ChartSpec` to
`specs/runs/<run-id>/[slug].json`. After the complete selected set is authored,
run:

```bash
npm run run:charts -- <run-id>
```

The run chart builder verifies source/spec coverage, preserves source-ledger
order, routes each specification through the standard or regional workflow,
runs responsive diagnostics, captures the approved PNG, and writes
`manifest.csv` plus `qa-report.json` to `charts/<run-id>/`. It stops on the
first validation, rendering, diagnostic, or capture failure rather than
publishing a partial successful-looking run. Successful output is published by
replacing the prior chart set only after the complete staged build passes. Any
existing presentation or chart-image archive is removed at that point because
it would contain stale images and must be rebuilt from the new PNGs.

To inspect coverage without rendering, run:

```bash
npm run run:verify-source -- <run-id> --specs
```

This requires the selected source-ledger output slugs to exactly match the JSON
files in `specs/runs/<run-id>/` and requires every ChartSpec title to exactly
match its ledger title. It also rejects selected pairs that repeat the same input
passage, publication and reporting period, recipe, and category or time-label
sequence. Consolidate these pairs before rendering. Keep one primary visual and
move the secondary measure into `supportingFacts`, or mark the secondary ledger
candidate `merged`.

Schema validation and responsive diagnostics are necessary but not sufficient.
Semantic QA must confirm that the visual grammar matches the evidence, that
reported and derived values are distinguishable, that qualifiers and bounds
are preserved, and that a reader can state the intended takeaway without
mentally reconstructing the chart.

QA must also reject context-poor charts that are technically valid but leave the
reader asking “compared with what?” or “where does this sit in the wider
distribution?” Recheck the full source family before delivery. If it contains
same-unit regional, peer, historical, benchmark, or denominator evidence that
materially orients the headline, that evidence belongs in primary geometry or
the thin candidate should be merged into the richer visual.

Run a claim-to-geometry check before delivery: state the chart title, then name
the exact plotted marks that establish it. If the geometry only shows adjacent
facts while the title asserts causation, consequence, a threshold response, or
another unsupported relationship, reject or redesign the chart even when all
numbers are individually correct. For directional converging-signal charts,
source-ledger mechanism evidence must explicitly link the outcome to at least
one driver.

Also remove visual noise that cannot defend its place on the chart. Every
reference line must have a meaningful visible label and materially improve
orientation; punctuation-only labels, duplicate lines, and unlabeled
“just-in-case” references fail QA. Within a relationship card set, do not mix
`pp`/percentage-point notation with `%` rate notation as peer display values.

Visible values must also be self-describing. A numeric `displayValue` or
`emphasis.displayValue` cannot rely solely on an axis title for its unit. Include
the unit in the label unless the title or subtitle explicitly defines it.

All standard charts must retain the shared large, centered watermark treatment
through PNG capture and any requested presentation assembly. Do not vary it by recipe or move it
to a small corner mark to make room for chart content. The regional workflow is
the sole exception: its watermark is a restrained background behind the map.
Check this visually at the delivery viewport and in the final slide render.

For `flow.waterfall`, use the recipe only for a source-supported start-to-end
bridge with same-scope, same-period values and arithmetic reconciliation. Do
not turn `more than`, `about`, or incomplete charges into an exact inferred
opening value. If the bridge is uncertain or not mutually exclusive, use a
source-supported comparison, range, or separate chart instead. A waterfall that
passes validation but is visually ambiguous fails semantic QA.

The Tool API also requires every waterfall item to declare
`valueStatus: "reported"`, `period`, and `scope`. It rejects missing, derived,
bounded, approximate, mixed-period, mixed-scope, or non-reconciling steps. In
particular, an operating-profit figure is not a pre-charge net-result figure,
and a prior-period expense cannot be used as a current-period change.

For an isolated manual recapture, use the run delivery path:

```bash
node tool-api/chart.js review charts/<run-id>/[slug].html \
  --screenshot --output charts/<run-id>/[slug].png
```

The HTML and PNG are generated artifacts. Do not edit them directly.

## 5. Optional presentation assembly

After all accepted charts have final PNG images, assemble them into one PowerPoint presentation only when the requested deliverable includes a deck.

The presentation should:

- Use the accepted story order or a clearer editorial order derived from the assignment.
- Follow `presentation-plan.json` exactly. The default deck contains one slide
  per accepted chart and no cover, title, agenda, divider, or closing slide.
  Add any non-chart slide only when the user explicitly requested it.
- Preserve one central finding per slide.
- Use the final generated chart image rather than recreating the chart manually in PowerPoint.
- Keep titles, available source attribution, dates, and explanatory text consistent with the corresponding ChartSpec.
- Omit the source line when no attribution is supplied.
- Never mention internal file-handling language, verification status, workflow decisions, diagnostics, or production notes on presentation slides.
- Exclude failed, unresolved, duplicate, or low-value stories.

PowerPoint assembly belongs to the LLM orchestration layer. It is not an implementation responsibility of the chart renderer.

## 6. Run delivery folder

The canonical delivery folder is:

```text
charts/<run-id>/
```

Use a caller-supplied run ID. It may be a date, publication identifier, client slug, issue number, or another stable label; the workflow does not infer one from chart data.

The completed chart folder should contain:

```text
charts/<run-id>/
├── [slug-1].html
├── [slug-1].png
├── [slug-2].html
├── [slug-2].png
├── manifest.csv
├── presentation-plan.json
└── qa-report.json
```

The exact number of chart files depends on the number of accepted stories. When
a PowerPoint deck is requested, add `tochnyi-charts-<run-id>.pptx` to the same
folder.

Temporary or ad hoc review output belongs in
`.work/<run-id>/review/`. Final PNGs belong in the local `charts/<run-id>/`
delivery folder beside the HTML files and any requested PowerPoint presentation.

## 7. Finalize and flush

After the retained specifications and delivery folder are complete, run:

```bash
npm run run:finalize -- <run-id>
```

Finalization first reruns source-ledger validation with ChartSpec coverage. When
a generated PowerPoint package exists, it opens that package and requires its
slide count to exactly match `presentation-plan.json`. This rejects unrequested
cover, title, agenda, divider, closing, or other extra slides before cleanup. A
chart-only delivery does not require a `.pptx`. Finalization then deletes `.work/<run-id>/` and removes the
legacy `previews/` tree. It
preserves `input/` and does not delete `specs/runs/<run-id>/` or
`charts/<run-id>/`.

Use `npm run run:flush -- <run-id>` when only the selected run workspace should
be removed. Use `npm run run:reset` before a cold-agent test to remove every
transient workspace and legacy previews while retaining the source set,
specifications, and chart folders.

## Completion condition

The batch run is complete only when:

- The complete `input/` source set has been inventoried and reviewed.
- Each included story preserves the supplied claim or documented data-derived finding and has a clear central finding.
- The source ledger records every story considered for production with an explicit
  selected, omitted, or merged disposition.
- Every selected story has source-set anchors, a supported title basis, and
  primary evidence from `input/`.
- External evidence supplements rather than originates selected stories.
- Source-ledger selections and titles exactly match the final ChartSpecs.
- Each chart has a validated ChartSpec.
- Each rendered chart passes the applicable diagnostics.
- Each accepted chart has a final PNG.
- The HTML files and final PNGs are present in `charts/<run-id>/`.
- When a PowerPoint was requested, it has been assembled from those final images
  and its slide count exactly matches `presentation-plan.json`; by default this
  is one slide per accepted chart and zero non-chart slides.
- The ChartSpecs are present in `specs/runs/<run-id>/`.
- The run has been finalized, leaving no run-specific notes, scripts, logs,
  downloads, review files, or package staging outside the retained `specs/` and
  `charts/` folders. The original `input/` source set remains available.
- Remaining omissions, direct source conflicts, source mismatches, warnings, or infrastructure defects are reported.
