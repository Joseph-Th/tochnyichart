# Batch workflow

This is the primary end-to-end workflow for producing a chart presentation from a batch of data stories.

## Input

The user provides one editorial source file at the project root:

```text
input.txt
```

`input.txt` may contain multiple data stories, notes, links, and partially
summarized evidence. It is an expert-authored editorial source and assignment
queue. Treat its claims and datapoints as correct by default. It may be
incomplete, so reputable external reporting may supplement it, but absence of
independent corroboration is not grounds to weaken or replace it.

The exact project-root file is mandatory. A missing, blank, or changed
`input.txt` stops the run. Never substitute a sibling project file, prior batch,
alternate brief, or similarly named source.

## Agent responsibility

The LLM agent is the batch orchestrator. It owns the sequence across source research, chart production, image capture, and presentation assembly.

The deterministic chart engine is one tool used by the agent. It does not parse the entire batch assignment or build the PowerPoint deck by itself.

## Required sequence

```text
initialize .work/<run-id>/
    |
    v
input.txt
    |
    v
parse distinct data stories
    |
    v
inventory every quantitative claim with exact input excerpts
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
assemble the accepted images into a PowerPoint presentation
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
are local artifacts. Git ignores `input.txt`, `specs/runs/`, `charts/`,
`previews/`, and `.work/`. Run `npm run check:repo` before committing; it fails
if any production or transient artifact is tracked, including force-added files.

## 1. Parse the assignment

Read all of `input.txt` and separate it into distinct data stories.

`npm run run:init -- <run-id>` creates
`.work/<run-id>/source-ledger.json` with the input byte count and SHA-256 hash.
Complete this ledger before external research. Every distinct quantitative
claim must appear exactly once and receive one disposition: `selected`,
`omitted`, or `merged`. Follow `docs/source-ledger.md` for the required fields.
The source verifier also requires every numeric token in `input.txt` to be
covered by a candidate anchor or by a specifically justified ignored-evidence
anchor. This makes silent omission of quantitative stories a validation error.

For each candidate, identify:

- Working subject and central claim
- Supplied source links
- Reporting period
- Values already present in the note
- Whether the story duplicates or overlaps another item
- Whether the story is sufficiently material and visual to include
- One or more exact excerpts from `input.txt`
- The exact excerpt that supports any proposed chart title
- Which evidence is primary input evidence versus external or derived context
- Whether actual values are reported, retrievable, unavailable, incomparable,
  or not applicable, and the least normalized representation the chart should use
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
search failed to repeat an expert-authored claim.

An omission requires a specific editorial reason. A merged candidate must name
its destination. Set `inventoryComplete` to true only after the complete input
has been checked against the ledger, then run:

```bash
npm run run:verify-source -- <run-id>
```

## 2. Verify and enrich each story

Follow `docs/source-enrichment.md` before selecting a chart recipe.

The agent must preserve the expert input claim, confirm and read supplied
sources, extract relevant evidence, calculate safe derivations, and fill useful
evidence gaps. It must not add unrelated context merely to make the chart more
complex. External sources may supplement or attribute the input, but may not
silently override it unless they directly contradict a material point.

External research may not originate a selected story. Every selected item must
have primary evidence anchored in `input.txt`, and its `titleBasis` must be an
exact input excerpt that directly supports the title. External evidence may be
comparison, denominator, mechanism, consequence, or context, but never the
primary claim.

Before accepting a chart candidate, apply the visual-evidence gate:

- A non-map chart must contain at least two quantitative marks.
- Forecast, target, outlook, guidance, and scenario stories must search for a
  same-unit actual/current/latest realized observation. When one exists, put it
  on the visual scale as primary geometry or a numeric reference; leaving it in
  `supportingFacts` is not sufficient orientation.
- A lone value must gain a source-supported prior value, target, benchmark,
  denominator, peer, range, or time series. A single-row
  `comparison.benchmark-gap` is valid because the actual segment, gap segment,
  and benchmark marker are separate quantitative marks.
- An exact two-item `comparison.scenarios` chart must add a numeric reference,
  tangible basis, or source-supported numeric mechanism, consequence,
  denominator, or comparison fact. Before creating a separate slide, check
  whether the pair belongs inside an existing same-topic map, category
  comparison, or trend. If it cannot be enriched and does not support a
  distinct conclusion, mark it `merged` or `omitted`.
- A percentage-only price, workforce, export, production, spending, or revenue
  claim must trigger a search for the underlying tangible amounts for the same
  scope and periods before normalized geometry is considered. Workforce
  research must include the company filing or official employee disclosure for
  the relevant reporting perimeter.
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
- A share of a named public aggregate, including GDP, the economy, population,
  employment, exports, imports, production, or capacity, must treat that total
  as retrievable. Record `basisTarget`, recover the compatible public total,
  derive the tangible numerator, and use level geometry. A 100% reference does
  not satisfy this requirement.
- Do not use dot-counting or pictograms. A story with only two exact count
  categories must gain a third comparable count, a tangible denominator or
  population, a meaningful benchmark, or a time series before it is selected
  as a standalone chart. Different-unit percentage context does not satisfy
  this evidence gate.
- A risk estimate must include the exposed population or denominator, show that
  total on the plotted scale, and include at least one mechanism or consequence.
- Three or more ordered observations that establish slowdown, acceleration,
  reversal, or persistence must use `trend.line`. Do not plot two values and
  move the rest of the series into `supportingFacts`.
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
  actual quantity, not the gap amount itself. Use one row when one benchmark
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
  is a single numeric reference. Do not use `flow.waterfall` for a simple
  component decomposition; waterfall is for a genuine running balance moving
  through exact changes.
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
  quantitative signal, with both driver paths joining directly into one outcome
  path. The merge is connector geometry, not a decorative hub or node.
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
When multiple named administrative regions combine with a claim about spread,
border contrast, clustering, adjacency, distribution, or concentration, the
source verifier requires `geographyRole: "explanatory"` and
`workflow: "regional-breakdown"`. It also rejects a later ranking/bar ChartSpec
that tries to bypass that route.
For regional candidates, use `regional-guide` and `regions` to obtain stable
region IDs before authoring the ChartSpec. Keep every materially reported
continental region in `data[]`; the regional data array is the evidence
inventory, not a callout inventory. Use `data[].callout: "none"` for regions
that should remain highlighted without a box. Do not delete reported regions
merely to make the card layout fit. At most 12 regional items may render
callout cards. Do not proceed to rendering until each accepted story has exactly
one recorded workflow decision.

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

Visible values must also be self-describing. A numeric `displayValue` or
`emphasis.displayValue` cannot rely solely on an axis title for its unit. Include
the unit in the label unless the title or subtitle explicitly defines it.

All standard charts must retain the shared large, centered watermark treatment
through PNG capture and PowerPoint assembly. Do not vary it by recipe or move it
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

## 5. Build the presentation

After all accepted charts have final PNG images, assemble them into one PowerPoint presentation.

The presentation should:

- Use the accepted story order or a clearer editorial order derived from the assignment.
- Follow `presentation-plan.json` exactly. The default deck contains one slide
  per accepted chart and no cover, title, agenda, divider, or closing slide.
  Add any non-chart slide only when the user explicitly requested it.
- Preserve one central finding per slide.
- Use the final generated chart image rather than recreating the chart manually in PowerPoint.
- Keep titles, available source attribution, dates, and explanatory text consistent with the corresponding ChartSpec.
- Omit the source line when no attribution is supplied.
- Never mention `input.txt`, internal provenance, verification status, workflow decisions, diagnostics, or production notes on presentation slides.
- Exclude failed, unresolved, duplicate, or low-value stories.

PowerPoint assembly belongs to the LLM orchestration layer. It is not an implementation responsibility of the chart renderer.

## 6. Run delivery folder

The canonical delivery folder is:

```text
charts/<run-id>/
```

Use a caller-supplied run ID. It may be a date, publication identifier, client slug, issue number, or another stable label; the workflow does not infer one from chart data.

The completed folder should contain:

```text
charts/<run-id>/
├── [slug-1].html
├── [slug-1].png
├── [slug-2].html
├── [slug-2].png
├── manifest.csv
├── presentation-plan.json
├── qa-report.json
└── tochnyi-charts-<run-id>.pptx
```

The exact number of chart files depends on the number of accepted stories.

Temporary or ad hoc review output belongs in
`.work/<run-id>/review/`. Final PNGs used in the deck belong in the local
`charts/<run-id>/` delivery folder beside the HTML files and PowerPoint
presentation.

## 7. Finalize and flush

After the retained specifications and delivery folder are complete, run:

```bash
npm run run:finalize -- <run-id>
```

Finalization first reruns source-ledger validation with ChartSpec coverage. When
`presentation-plan.json` exists, it also opens the generated PowerPoint package,
counts the actual slide XML files, and requires that count to exactly match the
plan. This rejects unrequested cover, title, agenda, divider, closing, or other
extra slides before cleanup. It then deletes `.work/<run-id>/` and removes the
legacy `previews/` tree. It
preserves `input.txt` and does not delete `specs/runs/<run-id>/` or
`charts/<run-id>/`.

Use `npm run run:flush -- <run-id>` when only the selected run workspace should
be removed. Use `npm run run:reset` before a cold-agent test to remove every
transient workspace, legacy previews, and input while retaining all specification
and chart folders.

## Completion condition

The batch run is complete only when:

- `input.txt` has been fully parsed.
- Each included story preserves the expert input claim and has a clear central finding.
- The source ledger inventories every quantitative input story with an explicit
  selected, omitted, or merged disposition.
- Every selected story has exact input anchors, an exact title-basis excerpt,
  and primary evidence from `input.txt`.
- External evidence supplements rather than originates selected stories.
- Source-ledger selections and titles exactly match the final ChartSpecs.
- Each chart has a validated ChartSpec.
- Each rendered chart passes the applicable diagnostics.
- Each accepted chart has a final PNG.
- The PowerPoint deck has been assembled from those final images.
- The PowerPoint slide count exactly matches `presentation-plan.json`; by
  default this is one slide per accepted chart and zero non-chart slides.
- The HTML files, final PNGs, and `.pptx` file are present in `charts/<run-id>/`.
- The ChartSpecs are present in `specs/runs/<run-id>/`.
- The run has been finalized, leaving no run-specific notes, scripts, logs,
  downloads, review files, or package staging outside the retained `specs/` and
  `charts/` folders. The original `input.txt` remains available.
- Remaining omissions, direct source conflicts, source mismatches, warnings, or infrastructure defects are reported.
