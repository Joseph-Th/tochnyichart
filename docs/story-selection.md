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

- `story.facets` when the mixed evidence jointly carries the main argument.
- `supportingFacts` when mixed-unit evidence is secondary context.
- Separate charts when each measure needs its own scale or trend.
- `status.grid` when the point is categorical operating condition rather than
  magnitude.

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

Use `story.facets` for one coherent claim supported by heterogeneous evidence.
Each facet has its own value and explanatory detail rather than a fake common
axis.

Useful fields are:

- `label`: the evidence dimension.
- `displayValue` or `value`: the tangible result.
- `detail`: why the result matters to the central claim.
- `group`: an optional story stage such as `Pressure`, `Response`, or
  `Consequence`.
- `icon`: a semantic symbol such as `shield`, `warehouse`, `pause`, `exit`,
  `money`, `ship`, or `person`.
- `direction`: `up`, `down`, or `neutral` when directional meaning is useful.
- `tone` or `status`: restrained editorial emphasis.

Icons must encode meaning. Do not add decorative illustrations that do not map
to a data role.

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

## Headline metrics

`headline.metric` supports these visual treatments:

- `number`: a plain primary value.
- `progress`: a percentage or bounded value with a meaningful 0–100 scale.
- `pictogram`: a real counted population or denominator represented by repeated
  semantic icons.
- `auto`: progress for a 0–100 percentage, otherwise number.

A pictogram requires `visual.icon` and `visual.total`. Use `visual.filled` when
the highlighted count is not derived directly from a percentage.

Use pictograms for interpretable denominators such as 1 in 10 workers, 7 of 12
regions, or 34 of 100 consumers. Do not use them for unbounded currency,
continuous prices, or arbitrary large counts where repeated icons imply false
precision.

## Regional maps

Russian regional maps use the continental mainland silhouette only. Kaliningrad
and island fragments are excluded from the geometry and rejected as active map
items. Detached-region evidence must use a non-map recipe.

Regional maps also enforce these information-economy rules:

- No competing summary card. The callouts carry the evidence.
- Compact logo, title, subtitle, date, and watermark.
- A wider canvas and narrower callout columns to protect the map’s aspect ratio.
- Direct leaders for sparse maps unless an explicit routing mode is required.
- Geographic card order by default.
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

If any answer is no, change the recipe or evidence structure before changing the
styling.
