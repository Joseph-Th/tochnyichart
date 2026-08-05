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
330 index points
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
volume, counts, and other tangible quantities. Show percentage or indexed
change as emphasis or context rather than replacing the levels.

Do not create a `0%` before-event observation or an index-100 starting point to
make a normalized trend look complete. A relative-change or index chart is an
exception that requires unavailable or incomparable levels plus a concise
`measure.normalizationNote`.

Native rates and shares are not downgraded by this rule. Interest rates,
inflation rates, vacancy rates, and part-to-whole shares may remain primary when
they are the real measured quantity. When absolute component amounts are also
available for a share, include them in the visible labels.

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

## The visual-evidence gate

Every production chart must carry its main argument through geometry tied to
data. A wall of prose, a set of status cards, or one oversized number is not a
chart.

- A non-map chart requires at least two quantitative marks.
- A lone value must be enriched with a source-supported prior value, target,
  benchmark, denominator, remainder, peer, range, or time series.
- Categorical operating states must be quantified on one common dimension or
  mapped when place explains the finding.
- When no valid comparison exists, omit the story rather than manufacture a
  decorative output.

`status.grid` and `headline.metric` are disabled in the production catalog,
schema, and validator. Legacy generated HTML may still contain those renderers,
but the Tool API will not accept new ChartSpecs using them.

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

## Comparison recipe contracts

| Recipe | Semantic contract |
| --- | --- |
| `comparison.change` | Two periods of one quantity for one scope. Different periods are the intended contrast. |
| `comparison.scenarios` | One quantity, one scope, one period; only the scenario or assumption changes. |
| `comparison.diverging` | Positive and negative values of one quantity, one scope, and one period. |
| `comparison.range` | Exact values, intervals, or thresholds for one quantity, one scope, and one period. |

A title about one broad topic is not enough. “E-commerce pressure” does not make
seller registrations, revenue growth, insurance prices, and stock prices one
measure.

## Mixed-evidence stories

Do not turn heterogeneous facts into standalone metric cards. Select the one
quantity that carries the primary visual argument. Put genuinely secondary
facts in `supportingFacts`, which renders as an unboxed inline context rail.
When two or more unlike measures each carry essential meaning, create separate
ChartSpecs so each measure receives an appropriate visual scale and geometry.

`story.facets` remains readable only for legacy files and is excluded from the
production recipe catalog and selection workflow.

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

If any answer is no, change the recipe or evidence structure before changing the
styling.
