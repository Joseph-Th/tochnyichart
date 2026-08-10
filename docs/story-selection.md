# Story selection and visual semantics

This document defines the editorial contracts that prevent valid-looking but
misleading charts. It applies before geometry or styling is selected.

## The shared-scale sentence test

A shared numeric axis is allowed only when this sentence can be completed
literally:

```text
Every mark encodes [measure.quantity] for [data.scope] in [data.period].
```

The bracketed phrases must mean the same thing for every mark. Comparison,
trend, and ranking recipes enforce this contract with four required fields:

- `measure.quantity`: the real-world quantity encoded by the axis.
- `data[].quantity`: the same phrase, repeated on each item.
- `data[].scope`: the population, denominator, entity system, or accounting
  bridge to which the value applies.
- `data[].period`: the reporting period represented by the value.

Trend periods may advance from point to point, but quantity and scope must stay
constant. Rankings and non-change comparisons require one common reporting
period as well as one quantity and scope.

The validator rejects generic quantity names such as `reported change`, `value`,
`metric`, `amount`, or `result`. Those labels describe a chart operation, not a
measured quantity.

## Visible units

A numeric label must be interpretable without searching the axis title or source
note. Bare values such as `330`, `2.99m`, or `85` are permitted only when the
title or subtitle explicitly states the unit. Otherwise, put the unit in every
visible `displayValue` and in `emphasis.displayValue` when present.

Valid treatments include:

```text
108.4 points on the consumer price index
2.99 million tires
$85 million
```

The validator rejects magnitude-only labels when `measure.unit` is known but the
unit is absent from both the label and the title/subtitle. An axis title alone
does not satisfy this rule because labels may be read in a slide thumbnail,
cropped image, or exported context where the axis is less prominent.

## Actual levels before normalized change

Before choosing a recipe, classify the proposed primary values with
`measure.valueMode` and record whether the underlying actual levels are
`reported`, `retrievable`, `unavailable`, `incomparable`, or `not-applicable`.

Use actual levels for primary geometry whenever they are reported or
retrievable. This applies especially to prices, market values, revenue, output,
volume, counts, workforce, and other tangible quantities. Show percentage
change as emphasis or context rather than replacing the levels.

Do not create a `0%` before-event observation or an index-100 starting point to
make a normalized trend look complete. A relative-change chart is an exception
that requires unavailable or incomparable levels plus a concise
`measure.normalizationNote`. Plot only the relative observations actually
reported by the source.

Use `valueMode: "index"` only for a named index whose point values are reported
or retrievable. Do not use generic display copy such as `100 index`, `91.5
index`, or `index points`; name the measure and display its values as points.

Native quoted rates may remain primary only when a tangible decomposition is
genuinely not applicable, such as a policy interest rate or published CPI
growth rate. For market shares, coverage rates, vacancy rates, utilization
rates, ratios, and risk estimates, audit the numerator/denominator or
population/affected count. When those amounts are reported or retrievable,
switch to level geometry and keep the normalized rate in secondary copy.
Shares of GDP, the economy, population, employment, exports, imports,
production, or capacity treat the named public total as retrievable. Recover
that total, derive the tangible numerator or range, and plot both. A 100%
reference line is not a meaningful magnitude anchor.

The least normalized representation is not automatically the best story
geometry. When the finding is that a rate is slowing, accelerating, reversing,
or persisting, three or more comparable rate observations belong in
`trend.line`. Do not plot two turnover levels and place the historical growth
rates in `supportingFacts`; the growth-rate sequence is the evidence that proves
the headline.

When a risk or share is interpreted as part of a total, the total must be
visible on the primary scale. Use a plotted population value, a reference line,
a benchmark, or a complete composition. A basis rail alone does not let the
reader see whether the affected range is small or large relative to the whole.

When an amount is interpreted as days of consumption, share of demand, or
coverage of need, visualize that orientation. If the source provides one supply
amount, convert it to coverage time or place a daily or monthly consumption
benchmark on the same unit scale. If it provides two or more contributors,
retain each contributor and the demand denominator as primary marks in one
tangible unit. The derived coverage time is then an annotation or subtitle, not
the geometry. Do not combine named contributors into one range before the
viewer can see what creates the result.

An `unavailable` or `incomparable` level or basis is not a shortcut around
research. The source ledger requires an exact `tangibleTarget` and at least two
completed, source-specific checks covering two source types, including a
data-bearing source, before a normalized representation can receive either
status. Pending or generic lookup notes do not qualify.

### Valid shared scale

```json
{
  "recipe": "comparison.diverging",
  "measure": {
    "quantity": "contribution to operating profit change",
    "unit": "billion RUB"
  },
  "data": [
    {
      "label": "Higher prices",
      "quantity": "contribution to operating profit change",
      "scope": "company-wide operating profit bridge",
      "period": "H1 2026",
      "value": 18
    },
    {
      "label": "Higher costs",
      "quantity": "contribution to operating profit change",
      "scope": "company-wide operating profit bridge",
      "period": "H1 2026",
      "value": -8
    }
  ]
}
```

Both marks are additive contributions to the same bridge. Their magnitudes and
directions are directly comparable.

### Invalid shared scale

Do not place stock-price change, insurance-price change, staffing change, and
operating profit on one percentage axis. The numbers may all be percentages,
but they measure different quantities, denominators, and systems. A common unit
symbol does not create semantic comparability.

Use one of these alternatives:

- Separate ChartSpecs when multiple measures jointly carry the main argument.
- `supportingFacts` as an unboxed inline rail when mixed-unit evidence is
  secondary context.
- `map.regional` when geography is itself the explanatory structure.
- Omit the story when the source does not provide a real visual comparison.

When mixed-unit facts are not secondary but jointly define the headline, use
`relationship.converging-signals`. A claim such as fewer purchases plus higher
prices producing higher spending is incomplete if only purchase volume is
plotted and spending and prices are placed in supporting facts.

## The visual-evidence gate

Every production chart must carry its main argument through geometry tied to
data. A wall of prose, a set of status cards, or one oversized number is not a
chart.

- A non-map chart requires at least two quantitative marks.
- A lone value must be enriched with a source-supported prior value, target,
  benchmark, denominator, remainder, peer, range, or time series.
- A rate or share with a recoverable basis must expose the underlying tangible
  amounts.
- A risk range must identify the exposed population or denominator and at least
  one mechanism or consequence, and the total population must be visible on the
  plotted scale.
- Duration comparisons must use calendar geometry rather than abstract bar
  lengths. Use exact start/end dates, or one verified `timeline.anchorDate`
  with exact `duration` and `durationUnit` values.
- Three or more ordered observations that establish slowdown, acceleration,
  reversal, or persistence must be plotted as a trend rather than reduced to a
  two-value comparison with the rest in supporting facts.
- A discount, premium, shortfall, or overage should show both the benchmark
  total and the actual amount, not only the difference.
- Categorical operating states must be quantified on one common dimension or
  mapped when place explains the finding.
- When no valid comparison exists, omit the story rather than manufacture a
  decorative output.

`status.grid` and `headline.metric` are disabled in the production catalog,
schema, and validator. Legacy generated HTML may still contain those renderers,
but the Tool API will not accept new ChartSpecs using them.

## Copy economy

`subtitle` is optional. Omit it when it repeats the title, category names,
percentages, or amounts already printed on the marks. Retain it only when it
adds a qualification, denominator, mechanism, scope distinction, or
interpretation that is not otherwise visible.

Two-part compositions use one label treatment per segment. When both segments
are large enough, the label, share, and tangible amount appear inside the bar.
When a segment is too small, both labels move outside. The same information must
not appear both inside the bar and immediately below it.

## Source coverage and title fidelity

Selection begins with a complete inventory of the supplied document, not with
web research or an early list of attractive chart ideas. Every distinct
quantitative claim must receive one disposition: `selected`, `omitted`, or
`merged`. An omitted item needs a specific editorial reason, and a merged item
must identify its destination. This prevents highly chartable input stories
from disappearing while externally discovered stories take their place.

Every selected chart must have:

- An exact `titleBasis` excerpt from `input.txt`.
- At least one primary evidence item anchored to `input.txt`.
- A chart title that does not claim a maximum, range, exposure, erosion,
  coverage, collapse, or other analytical structure absent from that excerpt.
- An output slug recorded in the source ledger before the ChartSpec is written.

External research may improve comparison or interpretation, including by
supplying actual levels that directly express the same input-anchored change.
It may not supply the story subject, central claim, or title. The final set of
ChartSpecs must exactly match the source-ledger entries marked selected.

## Consolidation gate

The inventory is a claim ledger, not a one-claim-per-slide instruction. Before
finalizing selections, compare candidate charts for duplicate visual structure.
Two selected stories must be consolidated when they share all of the following:

- The same exact input passage.
- The same publication and reporting period.
- The same chart recipe.
- The same category or time-label sequence.

Different units do not justify two near-identical slides. Select the measure that
carries the central finding and place the secondary measure in `supportingFacts`,
or mark the secondary candidate `merged` in the source ledger. Split the stories
only when the second measure requires a genuinely different visual structure or
supports a distinct editorial conclusion.

Source-and-spec verification rejects repeated selected charts that match this
duplicate skeleton. This check occurs after ChartSpecs exist because the ledger
alone cannot reliably determine recipe and series structure.

## Rich-data preservation gate

Before choosing a recipe, inventory every materially relevant observation that
shares one real-world quantity and unit in
`visualEvidenceAudit.comparableObservations`. When three or more such
observations exist, preserve every one as a primary `data[]` item. A total,
average, min-max range, or days-of-coverage conversion may be added, but it may
not replace named shipment components, categories, facilities, peers, or time
points already available in the evidence.

This gate prevents an information-rich source from becoming a one-row chart.
Single-row range and benchmark treatments remain valid only when the underlying
story genuinely consists of one interval or one actual-to-benchmark
relationship, not when several comparable observations were compressed into
that row.

## Comparison recipe contracts

| Recipe | Semantic contract |
| --- | --- |
| `comparison.change` | Two periods of one quantity for one scope only when one value cannot be read naturally as the positive actual/current level against a prior, standard, limit, target, or other benchmark. Typical uses are sign-crossing levels, zero-to-nonzero movement, and native rate/index changes. |
| `comparison.scenarios` | One quantity, one scope, one period; only the scenario or assumption changes. Three to five items are preferred. Exactly two items require a numeric reference, basis, or source-supported mechanism, consequence, denominator, or comparison fact. Repeated category/time pairs are not scenarios. |
| `comparison.diverging` | Positive and negative values of one quantity, one scope, and one period. |
| `comparison.range` | Exact values, intervals, or thresholds for one quantity, one scope, and one period. A one-row range needs a genuinely independent reference; a point or reference equal to the low/high endpoint is redundant. Forecast and target ranges should include an available same-unit actual/current value as a numeric reference. |
| `comparison.benchmark-gap` | One to six actual/current values shown against meaningful benchmarks. Prefer one row whenever two positive levels are naturally actual/current versus prior, standard, limit, target, or reference. One or two category-level earlier/current pairs also belong here, with current as `value` and prior as `benchmark`. Two meaningful policy, target, or payout shares may use separate rows against the same tangible total when that common total gives the viewer a stronger anchor than a single hypothetical split. |
| `comparison.dumbbell` | Three to ten categories with one benchmark/before value and one actual/after value each. Quantity, scope, and the named comparison interval stay fixed. Different category magnitudes are allowed; each category's own pair must share a defensible unit and basis. |
| `relationship.converging-signals` | Exactly two quantitative drivers or formula inputs and one different outcome, all measuring distinct real-world quantities. `relationship.formula` states the source-supported mechanism or identity, including material derivations such as quantity × unit price = value. Each measure is drawn as an independent local quantitative signal; the two input paths join directly into one outcome path with no decorative merge node. Repeated prices, repeated volumes, or one measure at different dates belong in change, scenario, dumbbell, or trend geometry. Connector width never encodes magnitude. Identity mode requires one reconciling scope and period; directional mode shows the supported relationship without implying a shared scale. |
| `timeline.duration` | Two to eight exact start-to-end intervals placed on one common calendar. |
| `composition.components` | Two to six positive additive components of one reported total. Every component starts at zero; one numeric reference shows the reconciled total. Use this instead of a waterfall when the point is component magnitude rather than a running balance. |
| `flow.waterfall` | One existing balance or level moves through exact reported changes into an ending value. Do not use it for a set of positive components that merely add to one total. |

A title about one broad topic is not enough. “E-commerce pressure” does not make
seller registrations, revenue growth, insurance prices, and stock prices one
measure.

Use a dumbbell instead of paired bars when the reader needs to compare the
direction and size of movement across several categories. The hollow endpoint
represents `benchmark`; the solid endpoint represents `value`. Do not use it
for unrelated category-specific measures or for a time series with more than
two observations per category.

For only one or two paired categories, prefer `comparison.benchmark-gap` rather
than flattening earlier and later values into separate bars. This is especially
important for prices: a current price plus a compatible percentage move makes
the prior price derivable, and different absolute price levels across products
do not invalidate the within-product comparison.

Do not use dot-counting or pictograms as a production treatment. Two exact count
categories are normally too thin to justify a standalone chart. Research a
third same-scale count, a tangible population or network denominator, a
meaningful benchmark, or a time series. A percentage in another unit may be
useful context, but it does not create enough quantitative structure by itself.
If targeted research cannot supply a stronger anchor, merge or omit the story.

An exact two-item `comparison.scenarios` pair is not automatically a chart.
Before selecting it, look for one of the following: a third comparable item, a
numeric reference or threshold, a tangible basis, or a source-supported numeric
mechanism, consequence, denominator, or comparison fact. Also check whether the
pair is a subset of an existing same-topic chart, especially a regional map or
larger category comparison. If the pair cannot be enriched and does not carry a
distinct editorial conclusion, mark it `merged` or `omitted` rather than giving
it a standalone slide.

For forecasts, targets, outlooks, guidance, and scenario ranges, search for the
same-unit actual/current/latest realized observation before accepting the chart.
When available, it belongs on the plotted scale as a numeric reference. An
actual value in `supportingFacts` is not enough because the viewer should be
able to see where the forecast sits relative to what has already happened.

Do not count a range endpoint twice. A floor equal to the range low, a ceiling
equal to the range high, an implied remainder, or another value already encoded
by the primary geometry is not a second observation. If mixed-unit quantitative
inputs materially explain the reported outcome, keep them in the main visual
through `relationship.converging-signals` rather than manufacturing a duplicate
same-scale anchor.

Use one `comparison.benchmark-gap` row when the benchmark marker and segmented
bar already express the complete relationship. `value` is the tangible actual
level, `benchmark` is the total reference level, and `gapDisplayValue` names the
discount, premium, shortfall, or remainder. Do not add another row that equals
the benchmark or is simply `benchmark - value`. Those rows duplicate geometry
the reader can already see. A discount chart must show the discounted price
inside the undiscounted reference price, not chart the discount amount as if it
were the price.

The benchmark renderer uses one fixed label system: the actual/current value,
gap, and benchmark labels all sit beneath the bar. When their horizontal text
boxes would collide, the renderer moves only the conflicting label to a lower
text lane. Do not solve collisions by putting one label inside the bar or
another above it. The actual segment uses the primary blue; a primary-toned gap
uses a lighter blue so adjacent segments remain visually distinct.

When several positive values simply add to one reported total, use
`composition.components`. Each component is a zero-based bar and the total is a
single numeric reference. A waterfall is reserved for a genuine running balance
with changes to an existing level; using it for a simple decomposition makes
later components float above zero and misstates their magnitude.

The same geometry is useful when a policy, target, payout, or allocation story
contains two meaningful shares of one known total. Derive the tangible amount
for each share and compare both rows against the shared total. This is usually
more informative than showing only one hypothetical part-versus-remainder split.
Do not force this conversion when the composition itself is the finding or when
the supposed comparator is merely decorative.

## Mixed-evidence stories

Do not turn heterogeneous facts into standalone metric cards. Select the one
quantity that carries the primary visual argument. Put genuinely secondary
facts in `supportingFacts`, which renders as an unboxed inline context rail.
When exactly two unlike drivers and one outcome form one coherent claim, use
`relationship.converging-signals`; it draws each measure on its own local scale,
then joins the two driver paths directly into one outcome path. The labels should name
the measures directly; generic role captions such as “Factor 1,” “Factor 2,”
and “Outcome” add no information and are not rendered. The local signal
lengths are not comparable across measures, and the connector width is fixed.
All three quantities must be distinct, and `relationship.formula` must state a
mechanism supported by the source. Two observations of the same measure are not
a causal relationship.
Use `identity` only when the quantities, scope, and period reconcile
arithmetically. Use `directional` with a note when the evidence supports the
mechanism or direction but not an exact equation. Split more diffuse mixed
evidence into separate ChartSpecs.

## Information economy

Each mark must contribute information that is not already encoded elsewhere in
the chart. A benchmark marker already communicates the total endpoint. A gap
segment already communicates the implied remainder. Direct labels already
communicate exact values. Reject derived complement rows, zero-gap closure rows,
duplicated totals, and bars whose only purpose is to repeat a label. Additional
marks are justified only when they introduce an independent period, category,
scenario, or measured value.

`story.facets` remains readable only for legacy files and is excluded from the
production recipe catalog and selection workflow.

## Ratio and population basis

`basis` is an arithmetic audit, not a substitute for geometry. When the
numerator/denominator or population/affected count is reported or retrievable,
the primary chart must use those tangible values with `measure.valueMode:
"level"`. Keep the rate or share in labels, emphasis, annotations, or the
subtitle.

```json
{
  "measure": {
    "valueMode": "level",
    "levelAvailability": "retrievable"
  },
  "basis": {
    "type": "ratio",
    "label": "Underlying amounts",
    "formula": "Online turnover ÷ economy total",
    "items": [
      {
        "role": "numerator",
        "label": "Online turnover",
        "value": 5.9,
        "displayValue": "RUB 5.9tn"
      },
      {
        "role": "denominator",
        "label": "Economy total",
        "low": 59,
        "high": 73.75,
        "displayValue": "RUB 59–73.75tn"
      }
    ]
  }
}
```

For risk estimates, use `type: "population"` with `population` and `affected`
items when the rail helps document arithmetic. The plotted marks should be the
affected count or range and the population total. Derived affected counts must
preserve the uncertainty of the reported risk range.

## Segmented benchmark gaps

Price, cost, freight, margin, discount, premium, shortfall, and overage stories
should preserve both the retained amount and the changed segment. Use
`comparison.benchmark-gap` for one to six independent rows, or `comparison.dumbbell` when
several categories need before/after endpoints.

When only a current level and percentage move are reported, derive the prior
level as `current / (1 + change rate)`. Record the derivation in evidence, put
the current level in `value`, the prior or total reference in `benchmark`, and
label the changed segment with `gapDisplayValue`. Do not chart the current price
as a standalone bar with the percentage relegated to a fact card.

## Calendar durations

Use `timeline.duration` when the evidence contains exact start and end dates.
Each row occupies its real calendar window, so readers can see overlap,
sequencing, and the months affected. Do not substitute a generic 6-versus-1 bar
chart when the dates are known.

## Benchmark gaps

Use `comparison.benchmark-gap` when the finding is a discount, premium,
shortfall, or overage and both the benchmark and actual amount can be recovered.
Each item requires `value` and `benchmark`; visible labels should also name the
actual amount, benchmark total, and gap. Use `comparison.range` only when a
benchmark is a threshold rather than a total from which the gap is measured.

## Composition charts

A composition chart already calculates percentages from the parts. When the
source supplies absolute amounts, place them in `data[].displayValue`. The
renderer shows both the calculated share and the tangible value.

```json
{
  "label": "Seller support",
  "value": 500,
  "displayValue": "500bn RUB"
}
```

This should render as both `62.5%` and `500bn RUB`, not as an abstract percentage
alone.

For `composition.stacked`, the proportional bar is always the first and dominant
visual. Two-part compositions receive direct labels for both segments. The
validator rejects `primaryMetric` and supporting facts that merely restate a
segment value or calculated share, preventing the composition from collapsing
into a single-number card with bullet points.

Before choosing `composition.stacked` for a hypothetical allocation, check
whether the source also provides a meaningful policy, target, prior, or
alternative share against the same tangible total. If that comparator is part
of the story and materially helps the viewer orient the magnitude, derive the
comparable amounts and prefer shared-total `comparison.benchmark-gap` rows.
Keep `composition.stacked` when the mix or part-versus-remainder relationship is
itself the central finding.

## Regional maps

Russian regional maps use the continental mainland silhouette only. Kaliningrad
and island fragments are excluded from the geometry and rejected as active map
items. Detached-region evidence must use a non-map recipe.

Regional maps also enforce these information-economy rules:

- No competing summary card. The callouts carry the evidence.
- Compact logo, title, subtitle, date, and watermark.
- A wider canvas and narrower callout columns to protect the map’s aspect ratio.
- Direct leaders for sparse maps unless an explicit routing mode is required.
- Card side assignment and order are optimized together for crossings, route
  length, attachment slope, and geographic coherence before leaders are drawn.
- Region polygons are not obstacles; a leader may cross geography if the route
  is clearer and does not collide with another leader.
- Dense maps use crossing-aware edge ports.

## Final acceptance test

Before accepting a chart, write the intended takeaway in one sentence. Then ask:

1. Can a reader recover that sentence without mentally recomputing the argument?
2. Do all marks on a shared scale measure the same thing?
3. Are tangible amounts shown where percentages would otherwise feel abstract?
4. Does every icon or visual treatment encode a real quantity, denominator, or
   status?
5. Is the broader story visible without mixing unrelated evidence on one axis?
6. Does a non-map visual contain at least two data-driven marks rather than a
   prose list or one headline number?
7. Is the title directly supported by an exact excerpt from `input.txt`?
8. Does the final chart set cover every ledger item marked selected and exclude
   every unselected or externally originated story?
9. Does every bare numeric label expose its unit in the label, title, or subtitle?
10. Have charts with the same source passage, reporting context, recipe, and
    series skeleton been consolidated?
11. Does every rate or share declare its basis availability and expose tangible
    amounts when they are recoverable?
12. Does every risk range include a population or denominator plus a mechanism
    or consequence?
13. Are dated intervals on a calendar and benchmark gaps shown against their
    totals?

If any answer is no, change the recipe or evidence structure before changing the
styling.
