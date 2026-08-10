---
name: chart
description: Produce a validated Tochnyi ChartSpec and chart artifact through the public Tool API
version: 4.9.0
triggers:
  - pattern: "chart"
  - pattern: "visualize"
  - pattern: "graph"
---

# Tochnyi Chart Author

Use the public Tool API to turn sourced evidence into a validated chart. Treat the deterministic engine as a tool, not as implementation context.

The chart author owns evidence, calculations, editorial meaning, copy, recipe choice, and semantic `ChartSpec` fields. The engine owns HTML, CSS, JavaScript, chart-library configuration, typography, color policy, layout, responsiveness, map projection, callout placement, and leader routing.

## Primary assignment

The normal assignment begins with `input.txt` at the project root. Treat the
file as a batch queue containing multiple possible data stories. The caller
supplies an opaque run ID; it may be a date, client slug, issue number, or any
other stable label. Never derive storage paths from chart dates.

The agent must:

1. Run `npm run run:init -- <run-id>`.
2. Read the complete `input.txt`.
3. Separate it into distinct stories and merge duplicates.
4. Inventory every materially relevant same-scale observation in each selected
   candidate's `visualEvidenceAudit`.
5. Preserve each expert claim and enrich it with reputable sources.
6. Audit whether actual levels are reported or retrievable and record the selected value representation.
7. Decide which production tool and chart workflow each story requires.
8. Produce, validate, render, and diagnose each accepted chart.
9. Capture one final PNG for every accepted chart.
10. Assemble the final PNGs into one PowerPoint presentation by following
   `presentation-plan.json` exactly. The default deck has one chart per slide
   and no cover, title, agenda, divider, closing, or other non-chart slide unless
   the user explicitly requested one.
11. Save local production specs in `specs/runs/<run-id>/` and delivery artifacts
   in `charts/<run-id>/`.
12. Run `npm run run:finalize -- <run-id>` after delivery.

The canonical deck filename is `tochnyi-charts-<run-id>.pptx`. Production
specifications and chart outputs are local artifacts ignored by Git. The chart
Tool API handles individual chart production; PowerPoint assembly is a separate
agent responsibility.

Use `docs/batch-workflow.md` as the complete batch orchestration contract.

## Boundary

Use only the public authoring surface during normal chart production:

```text
input.txt
tool-api/
docs/batch-workflow.md
docs/agent-workflows.md
docs/source-enrichment.md
schemas/chart-spec.schema.json
recipes/catalog.json
specs/examples/
specs/runs/<run-id>/
charts/<run-id>/
.work/<run-id>/
```

Do not inspect or modify these implementation directories unless the user explicitly requests infrastructure work:

```text
renderer/
lib/
tests/
tools/
```

Never edit generated HTML or PNG output.

If a valid ChartSpec still produces a rendering, layout, planner, or diagnostic failure, report it as an infrastructure issue with the command output and artifact path. Do not investigate the machinery under the chart-author role.

## Start

```bash
node tool-api/chart.js api
node tool-api/chart.js orient
```

Choose exactly one workflow before writing a specification.

Route by the explanatory role of geography, not by the chart type. Use
`regional-breakdown` when administrative locations are part of the evidence and
where something happens changes the finding through spatial distribution,
concentration, adjacency, regional contrast, or location-specific callouts.
This includes stories that look like status lists, rankings, or comparisons.
Use `standard-chart` only when place names are labels or categories and a map
adds no explanatory value.

Before authoring any ChartSpec, perform a geography-first routing preflight for
every accepted story and write the decision into the selected source-ledger
candidate as `routingAudit`:

1. Set `routingAudit.geographyRole` to `none`, `categorical`, or `explanatory`;
   set `routingAudit.workflow` to `standard-chart` or `regional-breakdown`; and
   record a one-sentence rationale. A routing matrix may mirror these fields for
   review, but the ledger is the machine-enforced decision record.
2. For every regional candidate, run `regional-guide` and `regions`, then use
   `recipe: "map.regional"`, `map.regionSet`, and stable `regionId` or
   `regionIds`; also set `routingAudit.regionSet: "russia"`.
   Keep every materially reported continental region in `data[]`. The data
   array is the map evidence inventory, not a box inventory. Use
   `data[].callout: "none"` for fill-only highlights and reserve callout cards
   for the most informative regions; at most 12 cards may be visible.
3. If a story contains geographic names but is routed to `standard-chart`, the
   rationale must explicitly explain why location is not explanatory.
4. Do not use missing coordinates, a status-list shape, a ranking shape, or an
   existing draft spec as a reason to choose the standard workflow.
5. Multiple named administrative regions plus a claim about spread, border
   contrast, clustering, adjacency, distribution, or concentration require
   `geographyRole: "explanatory"` and `regional-breakdown`; a later ranking or
   bar ChartSpec cannot override that route.
6. Do not write or render specs until every accepted story has exactly one
   recorded workflow decision.

## Shared authoring rules

- Extract exact values, categories, dates, units, ranges, benchmarks, and source.
- Treat `input.txt` as expert-authored editorial evidence. Assume its factual claims, values, comparisons, and interpretation are correct unless a reputable source directly contradicts a material point.
- Treat each entry as routing information as well as evidence; it may be incomplete, but external silence is not a contradiction.
- Confirm that each supplied URL used for supplementation matches the entity, event, period, and finding before using it.
- Read and exhaust the full primary source before selecting a recipe.
- Extract relevant comparators, components, causes, consequences, forecasts, scale, denominators, and underlying datasets when they strengthen the same central claim.
- Search beyond the primary source to fill a named material evidence gap or add useful attribution and context.
- Supplement the input; do not replace, downgrade, or label an expert claim uncorroborated merely because a second source was not found.
- Escalate only direct material contradictions from reputable sources. Preserve both positions instead of silently rewriting the report.
- Prefer an underlying official dataset, company filing, or named report before another article from the same publisher.
- Use only context that materially clarifies magnitude, comparison, mechanism, or consequence.
- Do not add facts or select a complex recipe merely to make the output more visually interesting.
- A two-value positive level comparison should normally become one
  `comparison.benchmark-gap` row when one value is naturally current/actual and
  the other is a prior level, standard, limit, target, or reference. Reserve
  `comparison.change` for sign-crossing levels, zero-to-nonzero movement, or
  native rate/index changes where benchmark semantics do not fit. A same-period two-item `comparison.scenarios` chart is
  different: it must add a numeric reference, tangible basis, or
  source-supported numeric mechanism, consequence, denominator, or comparison
  fact. Check whether the pair belongs inside an existing same-topic chart; if
  it cannot be enriched and has no distinct conclusion, merge or omit it.
- Do not invent missing dates, sources, values, endpoints, calculations, or regional statuses.
- Audit value representation before selecting a recipe. Record `representationAudit.selectedMode`, `levelAvailability`, and a concise rationale for every selected story.
- For every rate or share, separately record `basisAvailability` and `basisRationale`. When numerator/denominator or population/affected amounts are reported or retrievable, select `level` and plot those tangible amounts; the normalized rate remains secondary copy. The total population or denominator must appear on the primary scale as a point, reference, benchmark, or complete composition. A ChartSpec `basis` rail alone is not sufficient.
- For shares of named public aggregates such as GDP, the economy, population, employment, exports, imports, production, or capacity, treat the denominator as retrievable. Record `basisTarget`, recover the compatible public total, derive the tangible numerator or range, and use level geometry. A 100% reference line is not a tangible anchor.
- Do not mark levels or a basis unavailable or incomparable after one failed lookup. Name the exact `tangibleTarget`, then record at least two completed, source-specific `researchAttempts` with `source`, `sourceType`, `locator`, and `outcome`. Pending language and generic locators such as `website`, `search`, `dataset`, or `report` are invalid. The checks must span two source types and include a data-bearing source.
- Percentage-only prices, workforce, exports, production, spending, and revenue must trigger a search for the underlying tangible amounts for the same scope and periods. Workforce research must include the company filing or official employee disclosure for the relevant reporting perimeter.
- Prefer reported or retrievable actual levels for primary geometry. Use percentage change as annotation, emphasis, subtitle, or supporting context.
- For multi-category price changes, judge comparability within each category's
  own before/after pair. Different category price levels, grades, or delivery
  bases do not make a valid pair incomparable. A current price plus a compatible
  percentage move makes the prior price derivable. If only some pairs are
  recoverable, use them when they still prove the headline and keep unmatched
  percentages secondary; otherwise research the missing headline-critical pair.
- Never manufacture a `0%` before-event point or index-100 starting point merely to create a trend.
- Use `relative-change` only when actual levels are unavailable or incomparable, and explain the limitation in `measure.normalizationNote`.
- Use `index` only for a named index whose point values are reported or retrievable. Never publish generic visible labels such as `100 index`, `91.5 index`, or `index points`.
- Declare `measure.valueMode` and `measure.levelAvailability` in every authored quantitative ChartSpec. Rate/share specs also declare `measure.basisAvailability` and `measure.basisNote` when the basis is unavailable, incomparable, or not applicable.
- Risk and exit-outlook charts require a population or denominator shown on the plotted scale plus at least one mechanism or consequence; use `narrative.emphasis: "risk"` and typed supporting-fact roles.
- Do not use dot-counting or `comparison.pictogram`. Two exact count categories
  must gain a third same-scale count, a tangible population/network denominator,
  a meaningful benchmark, or a time series before they deserve a standalone
  chart. A percentage or other numeric fact in a different unit does not satisfy
  this evidence gate.
- Use every comparable datapoint that materially proves the title. Three or more ordered observations establishing slowdown, acceleration, reversal, or persistence require `trend.line`; do not leave the historical series in `supportingFacts`.
- Record every materially relevant same-scale observation in
  `visualEvidenceAudit.comparableObservations`. When three or more exist, keep
  every one as a primary `data[]` item. Do not replace named shipment
  components, categories, facilities, peers, or time points with one aggregate,
  one range, one total, or one headline value.
- Use `timeline.duration` whenever duration or reserve runway is the comparison. Supply exact start/end dates, or a verified common `timeline.anchorDate` plus exact `duration` and `durationUnit` fields.
- When shipment, reserve, or shortage amounts are described as days of consumption, demand coverage, or share of need, show the demand denominator. If two or more physical-volume contributors appear in the input, complete `visualEvidenceAudit.coverageAudit`, disposition every volume as a component, denominator, or specifically excluded item, and keep all retained components plus total need in primary geometry in one tangible unit. The denominator may be a numeric reference rather than a redundant row. Days of coverage may remain secondary context only.
- Never use a logarithmic scale when the point is that the plotted amounts are small relative to a baseline. The chart must preserve the true proportional gap. If a monthly or annual flow denominator is at least about 8× the largest retained component, period-normalize that same denominator to a shorter familiar interval, usually a week or day, keep every component in the original physical unit, and use the derived denominator as a visible linear reference. Record the rate-preserving derivation in `coverageAudit.rationale`, basis, subtitle, or source evidence.
- Use segmented `comparison.benchmark-gap` geometry for prices, costs, freight, margins, discounts, premiums, shortfalls, overages, and meaningful policy or payout shares against one known total when the benchmark can be recovered. Derive a prior level as `current / (1 + change rate)` when supported by the reported current value and change. Plot the underlying actual level inside the total benchmark, not the gap amount itself. Prefer one row when one relationship fully carries the story; use two rows for two category-level earlier/current pairs. When two meaningful policy, target, or allocation shares use the same tangible total, compare their derived amounts against that shared total rather than showing only one hypothetical split as a composition. Never add a row that only repeats the benchmark or implied remainder.
- Benchmark actual, gap, and benchmark labels use the renderer's fixed below-bar
  lanes. Do not manually move one label inside the bar or above it; collision
  handling vertically staggers only conflicting labels. The actual segment is
  primary blue and a primary-toned gap uses a lighter blue for separation.
- Use `composition.components` when positive values are additive components of
  one reported total. Every component begins at zero and the total is a single
  numeric reference. Use `flow.waterfall` only for a genuine existing balance
  moving through exact changes; do not use it for simple component decomposition.
- Never flatten repeated `Category · earlier` / `Category · later` observations
  into `comparison.scenarios`. Scenarios are same-period alternatives. Use
  `comparison.benchmark-gap` for one or two paired categories and
  `comparison.dumbbell` for three or more.
- Use `relationship.converging-signals` only when exactly two source-supported
  causal drivers and one different outcome measure three distinct real-world
  quantities. `relationship.formula` must state the mechanism. Repeated prices,
  repeated volumes, or one measure at different dates require change,
  scenarios, dumbbell, or trend geometry. Each measure renders as an independent
  local quantitative signal, with both driver paths joining directly into one
  outcome path and no decorative merge hub. The renderer names the measures directly and does not add generic
  Factor 1, Factor 2, or Outcome captions. Connector width is fixed and never
  represents magnitude. Use `identity` only for a same-scope, same-period
  equation; use `directional` with a note when the evidence supports the
  direction but does not reconcile exactly.
- A headline built around opposing quantities, such as falling purchases and rising prices producing higher spending, cannot plot one side while placing the other figures in `supportingFacts`.
- `subtitle` is optional. Omit it when it repeats the title, category labels, percentages, or amounts already visible in the marks.
- Two-part compositions use one label treatment per segment. Use them when the part-versus-remainder split itself is the finding. If a meaningful policy, target, prior, or alternative share exists against the same tangible total and gives the viewer a stronger anchor, derive the comparable amounts and prefer shared-total benchmark-gap geometry. Do not repeat the same category, percentage, and amount inside the bar and immediately below it.
- Leave `options.labelMode` as `auto` unless the editorial design specifically
  requires otherwise. Auto placement is family-coherent: labels stay outside
  for the whole bar family when they fit; if endpoint headroom forces labels
  inside and every bar can support that treatment, the whole family moves
  inside. Mixed inside/outside placement is reserved for a genuine fit conflict.
- Apply an information-economy test: every mark must add an independent observation. Remove complement rows, duplicated totals, zero-gap closures, and other marks that merely restate labels or geometry already present.
- Choose the story structure before chart geometry.
- Use the underlying publication or dataset as `source.name` when available; otherwise omit `source`.
- Keep the specification small and semantic.
- Keep presentation copy separate from production context: never mention `input.txt`, internal provenance, verification status, diagnostics, or workflow commentary in a chart or slide.
- Write new specifications to `specs/runs/<run-id>/[slug].json`.
- Correct semantic failures in the ChartSpec and rerun the Tool API commands.

Safe derivations include absolute change, percentage change, percentage-point change, ratio, share, coverage rate, implied shortfall, and combined amount when the inputs are sourced and period-compatible. Preserve qualifiers such as `about`, `almost`, `more than`, and ranges rather than introducing false precision.

The full source-enrichment and relevance policy is in `docs/source-enrichment.md`.

## Standard workflow

```bash
node tool-api/chart.js guide
```

The guide returns the standard recipes and a validated example path for each recipe.

Then:

1. Preserve the expert input claim, then confirm and read the full supplied source.
2. Extract the evidence spine and safe derivations. Explicitly inventory
   same-unit actual/current/latest values that can orient forecasts or targets,
   and mixed-unit quantitative inputs that materially explain a derived outcome.
3. Fill only material evidence gaps with targeted research.
4. Audit actual-level availability and any rate/share basis. Choose the least normalized valid representation and document research attempts when normalized evidence remains unavoidable.
5. Identify one central finding and select the recipe.
6. Author the ChartSpec with representation metadata.
7. Validate:

   ```bash
   node tool-api/chart.js validate specs/runs/<run-id>/[slug].json
   ```

8. Render:

   ```bash
   node tool-api/chart.js render specs/runs/<run-id>/[slug].json charts/<run-id>/[slug].html --run-id <run-id>
   ```

9. Diagnose:

   ```bash
   node tool-api/chart.js diagnose charts/<run-id>/[slug].html
   ```

10. Perform semantic QA on the rendered output. State the intended reader
   takeaway in one sentence and accept the chart only if a reader can recover
   it without mentally reconstructing the argument. Check that the visual
   grammar matches the evidence, derived values are transparent, qualifiers
   remain visible, and the title and labels describe the marks accurately.

11. Correct semantic errors or report an infrastructure defect. For the batch
   run, capture the final PNG into the run delivery folder:

   ```bash
     node tool-api/chart.js review charts/<run-id>/[slug].html \
     --screenshot --output charts/<run-id>/[slug].png
     ```

### Branding and watermark gate

Use the shared watermark in its large, centered mode for every standard chart.
Do not infer a small or corner watermark from the recipe, card layout, or label
density. The renderer's layout rules must absorb those constraints while the
watermark stays centered and export-legible. `map.regional` is the only
exception; its watermark is deliberately repositioned as a restrained
background behind the geography. Reject a standard chart whose watermark is
missing, unloaded, undersized, corner-positioned, or visually absent.

If the standard command identifies `map.regional`, stop and use the regional workflow.

### Waterfall-specific gate

Use `flow.waterfall` only when the source supports a real start-to-end bridge.
The start, each change, and the ending value must share scope and period and
must reconcile arithmetically. Do not infer an exact opening value from charges
described as `more than`, `about`, or otherwise incomplete. If the bridge is
inferred, not mutually exclusive, or visually ambiguous, reject the waterfall
and use `comparison.change`, `comparison.scenarios`, `comparison.range`, or a
separate chart. A valid JSON spec is not evidence that a waterfall is an
honest or intelligible visual.

The Tool API enforces this gate. Every waterfall item must declare
`valueStatus: "reported"`, the same `period`, and the same `scope`; the renderer
rejects missing, derived, bounded, approximate, or non-reconciling steps. A
reported operating profit is not a reported pre-charge net result, and a prior-
period expense is not a current-period bridge step. Never construct an opening
profit by adding incomplete charges to a loss. If those facts are the story,
use a source-supported comparison and keep genuinely secondary charges as
supporting facts.

### Visual-evidence gate

Do not create prose walls, status-card grids, bullet grids, or single-number
charts. Every non-map production chart needs at least two quantitative marks.
A lone value must gain a source-supported prior value, target, benchmark,
denominator, peer, range, or time series. A one-row benchmark-gap is valid
because its actual segment, gap segment, and benchmark marker are distinct
marks. Categorical evidence must be quantified on a common dimension or routed
to `map.regional` when geography explains the finding. Omit the story when
legitimate visual structure cannot be found.

For forecast, target, outlook, guidance, and scenario stories, search for a
same-unit actual/current/latest realized observation. When available, it must
appear on the plotted scale as primary geometry or a numeric reference; do not
leave it only in `supportingFacts`.

Do not count the same geometry twice. A range low/high endpoint, floor, ceiling,
total, remainder, or zero-gap endpoint already encoded by the primary mark is
not an independent anchor. If two quantitative inputs in different units
materially explain an outcome, such as quantity × unit price = value, keep the
inputs in the main argument and prefer `relationship.converging-signals` with
an explicit formula rather than manufacturing a redundant same-scale point.

The production catalog, schema, and validator disable `status.grid` and
`headline.metric`. For `composition.stacked`, the proportional bar and direct
segment labels must carry the story; do not add `primaryMetric` or repeat
segment values in `supportingFacts`.

## Regional workflow

```bash
node tool-api/chart.js regional-guide russia
node tool-api/chart.js regions russia
```

A regional item needs:

- `label`
- `regionId` or `regionIds`
- At least one of `status`, `displayValue`, `detail`, or `value`

For a status map, use `status`, `displayValue`, and `detail`. The map normally
needs only `{ "regionSet": "russia" }`. Russian maps use the supported
continental mainland geometry; detached-region evidence must use a non-map
chart.

Do not author coordinates, card positions, route points, manual lanes, partial framing, region exclusions, SVG paths, layout configuration, HTML, CSS, JavaScript, or chart-library configuration.

Use these semantic overrides only when the story requires them:

- `data[].calloutSide`

Run:

```bash
node tool-api/chart.js validate specs/runs/<run-id>/[slug].json
node tool-api/chart.js regional specs/runs/<run-id>/[slug].json charts/<run-id>/[slug].html --run-id <run-id>
```

The regional command includes responsive diagnostics. Use `--no-diagnose` only when a browser is unavailable.

After the regional chart passes diagnostics, capture its final PNG with the same
run output convention:

```bash
node tool-api/chart.js review charts/<run-id>/[slug].html \
  --screenshot --output charts/<run-id>/[slug].png
```

## Delivery

For each chart, report the workflow, recipe, ChartSpec path, generated HTML path,
final PNG path, validation and diagnostic status, and remaining warnings or
infrastructure defects.

For the completed batch run, confirm that the HTML files, final PNGs, and
`tochnyi-charts-<run-id>.pptx` are present in `charts/<run-id>/`. Report
stories that were omitted because they were duplicate, weak, non-visual, directly conflicted, or
failed validation or diagnostics.

Use `.work/<run-id>/review/` only for temporary review. Final PNGs used in the deck belong in
the local run delivery folder. Do not include generated implementation code.

`input.txt`, production specs, chart output, previews, and `.work/` are ignored
by Git. Run `npm run check:repo` before committing; it must report no tracked
production or transient files.

The public contract is documented in `tool-api/README.md`,
`docs/batch-workflow.md`, and `docs/agent-workflows.md`.
