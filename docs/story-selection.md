# Story selection and visual semantics

This document defines the editorial contracts that prevent valid-looking but
misleading charts. It applies before geometry or styling is selected.

## The shared-scale sentence test

A shared numeric axis is allowed only when this sentence can be completed
literally:

```text
Every mark encodes [measure.quantity] for [data.scope] in [data.period].
```

The bracketed phrases must mean the same thing for every mark. The comparison
recipes enforce this contract with four required fields:

- `measure.quantity`: the real-world quantity encoded by the axis.
- `data[].quantity`: the same phrase, repeated on each item.
- `data[].scope`: the population, denominator, entity system, or accounting
  bridge to which the value applies.
- `data[].period`: the reporting period represented by the value.

The validator rejects generic quantity names such as `reported change`, `value`,
`metric`, `amount`, or `result`. Those labels describe a chart operation, not a
measured quantity.

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

External research may improve comparison or interpretation, but it may not
supply the story subject, central claim, or primary plotted measure. The final
set of ChartSpecs must exactly match the source-ledger entries marked selected.

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

If any answer is no, change the recipe or evidence structure before changing the
styling.
