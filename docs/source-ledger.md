# Source ledger contract

Every production run has one transient source ledger:

```text
.work/<run-id>/source-ledger.json
```

`npm run run:init -- <run-id>` creates the file with the exact project-root
`input.txt` byte count and SHA-256 hash. Complete the ledger before external
research, set `inventoryComplete` to `true`, and run:

```bash
npm run run:verify-source -- <run-id>
```

After the ChartSpecs are written, run:

```bash
npm run run:verify-source -- <run-id> --specs
```

## Required structure

```json
{
  "version": "1.5",
  "runId": "issue-2026-08-05",
  "input": {
    "path": "input.txt",
    "bytes": 12585,
    "sha256": "64-character hash created by run:init"
  },
  "inventoryComplete": true,
  "ignoredEvidence": [
    {
      "anchor": "Exact metadata or non-story passage copied from input.txt",
      "reason": "Publication date only; not a quantitative editorial claim."
    }
  ],
  "candidates": [
    {
      "id": "ozon-insurance-price-increase",
      "claim": "Ozon insurance prices rose sharply.",
      "decision": "selected",
      "outputSlug": "ozon-insurance-price-increase",
      "title": "Ozon insurance prices rose 230%",
      "titleBasis": "Exact sentence or passage copied from input.txt",
      "representationAudit": {
        "selectedMode": "level",
        "levelAvailability": "retrievable",
        "rationale": "The underlying market data provides the actual before and after prices."
      },
      "visualEvidenceAudit": {
        "rationale": "All named same-scale observations that materially support the claim remain available for plotting.",
        "comparableObservations": [
          {
            "label": "Before",
            "specLabel": "Before",
            "quantity": "daily insurance price",
            "unit": "percent of goods value per day",
            "period": "before the increase",
            "value": 0.0035
          },
          {
            "label": "After",
            "specLabel": "After",
            "quantity": "daily insurance price",
            "unit": "percent of goods value per day",
            "period": "after the increase",
            "value": 0.0115
          }
        ]
      },
      "routingAudit": {
        "geographyRole": "none",
        "workflow": "standard-chart",
        "rationale": "The story compares one company measure over time; administrative geography does not explain the finding."
      },
      "anchors": [
        "Exact sentence or passage copied from input.txt"
      ],
      "evidence": [
        {
          "statement": "Insurance prices rose 230%.",
          "origin": "input",
          "role": "primary",
          "anchor": "Exact sentence or passage copied from input.txt"
        },
        {
          "statement": "A prior-period value provides comparison.",
          "origin": "external",
          "role": "comparison",
          "source": "Named publication, filing, or dataset"
        },
        {
          "statement": "The combined amount is 800 billion rubles.",
          "origin": "derived",
          "role": "comparison",
          "formula": "500 + 300 = 800"
        }
      ]
    },
    {
      "id": "duplicate-note",
      "claim": "A duplicate presentation of the same event.",
      "decision": "merged",
      "mergedInto": "ozon-insurance-price-increase",
      "anchors": [
        "Exact duplicate passage copied from input.txt"
      ],
      "evidence": [
        {
          "statement": "The passage describes the same event.",
          "origin": "input",
          "role": "primary",
          "anchor": "Exact duplicate passage copied from input.txt"
        }
      ]
    },
    {
      "id": "nonvisual-item",
      "claim": "The note lacks a defensible visual comparison.",
      "decision": "omitted",
      "reason": "No valid comparator, denominator, composition, series, or geographic encoding.",
      "anchors": [
        "Exact passage copied from input.txt"
      ],
      "evidence": [
        {
          "statement": "The input contains only a prose claim.",
          "origin": "input",
          "role": "primary",
          "anchor": "Exact passage copied from input.txt"
        }
      ]
    }
  ]
}
```

## Decisions

Every distinct quantitative input story must appear exactly once.

- `selected` requires `outputSlug`, `title`, `titleBasis`,
  `representationAudit`, `visualEvidenceAudit`, `routingAudit`, and at least one `input`
  evidence item with role `primary`.
- `omitted` requires a specific `reason`.
- `merged` requires `mergedInto` naming another candidate ID.

An omitted story cannot disappear silently. A merged story cannot point to a
subject that is absent from the input.

The ledger records quantitative claims, not a mandatory slide for each claim.
A same-period two-value pair should be marked `merged` when it is already
contained in a richer same-topic map, category comparison, or trend. It should
be marked `omitted` when targeted enrichment cannot supply a third comparable,
numeric reference, tangible basis, or source-supported numeric mechanism,
consequence, denominator, or comparison fact and the pair does not carry a
distinct editorial conclusion.

## Routing audit

Every selected story must classify geography before a ChartSpec recipe is
chosen. `routingAudit` is machine-checked and has this form:

```json
{
  "geographyRole": "none",
  "workflow": "standard-chart",
  "rationale": "Place names are not part of the explanatory structure."
}
```

`geographyRole` is one of `none`, `categorical`, or `explanatory`. `workflow`
is `standard-chart` or `regional-breakdown`. When the story contains multiple
named administrative regions and the claim depends on spread, border contrast,
clustering, adjacency, geographic distribution, or concentration, geography is
`explanatory`; the workflow must be `regional-breakdown`, and `regionSet` must
be `russia`. A later ranking or bar-chart choice cannot override that decision.

Use `categorical` only when places function as ordinary labels and their spatial
relationship does not change the conclusion. The source verifier rejects
calling several named regions `none`, and it rejects a standard ChartSpec when
the ledger selected explanatory regional routing.

## Exact-count quality gate

Two small exact counts are not enough structure for a standalone chart. A
selected candidate with exactly two count observations must also have a
tangible population/denominator or a meaningful numeric benchmark. Otherwise
continue targeted research for a third comparable count or a time series, then
update `visualEvidenceAudit`. If that evidence does not exist, merge or omit the
story. A percentage or market statistic in a different unit is secondary
context and does not satisfy this gate.

## Visual evidence audit

Every selected story must inventory the same-scale observations that materially
support its central claim before a recipe is chosen. Record them in
`visualEvidenceAudit.comparableObservations`. Each observation requires:

- `label`: the working evidence label.
- `specLabel`: the final ChartSpec label when it differs from `label`.
- `quantity`: the real-world quantity measured.
- `unit`: the common unit.
- `period`: the observation period or scenario.
- `value`, or `low` and `high`: the actual numeric observation or interval.

`visualEvidenceAudit.rationale` explains why these observations belong to one
visual claim. Do not list merely adjacent facts with incompatible quantities.
Conversely, do not omit named shipment components, category values, or ordered
time points merely to justify a one-row chart.

Standard-chart candidates may inventory at most 12 comparable observations.
For `regional-breakdown`, the audit may inventory up to the selected region
set's full administrative-region count. This is intentional: the regional
evidence inventory can be larger than the visible callout set. Keep all
materially reported regions in the audit and later use `data[].callout: "none"`
for fill-only highlights that do not need a card.

When three or more comparable observations are available, every one must remain
a primary `data[]` item in the ChartSpec. The source verifier rejects replacing
that richer dataset with one aggregate, one range, one total, or one headline
value. This check is about observations, not the raw count of numeric tokens.
A single benchmark relationship remains valid when the source genuinely offers
only an actual value and its benchmark.

Coverage stories need an additional audit when one input passage contains two
or more physical-volume figures. Record:

```json
"coverageAudit": {
  "rationale": "Three inbound sources stay in tons; the reported monthly demand denominator is rate-preserved as a weekly reference for linear geometry.",
  "denominatorLabel": "Weekly demand baseline",
  "sourceEvidence": [
    {
      "anchor": "60–100 thousand tons from India",
      "disposition": "component",
      "label": "India tankers"
    },
    {
      "anchor": "900 thousand tons of monthly demand",
      "disposition": "denominator",
      "label": "Weekly demand baseline"
    }
  ]
}
```

Every physical-volume phrase in the candidate anchors must receive exactly one
disposition: `component`, `denominator`, or `excluded`. Components and the
denominator must match labels in `comparableObservations` and the final
ChartSpec. The denominator may be represented by a numeric `references[]` line
instead of a redundant `data[]` row. When a monthly or annual flow denominator
would force an extreme scale, `comparableObservations` may contain a strictly
rate-preserved weekly or daily derivative under the denominator label while
`sourceEvidence` continues to point to the original reported amount. Record the
conversion in `coverageAudit.rationale` and retain the original physical unit.
An excluded volume requires a specific scope, direction, product, or period
reason. At least two named supply components must remain when the source
contains multiple contributors; one combined shipment range or one days-of-
coverage mark is not a substitute.

## Representation audit

Every selected story must record the representation chosen before recipe
selection:

- `selectedMode`: `level`, `absolute-change`, `relative-change`, `rate`,
  `share`, or `index`.
- `levelAvailability`: `reported`, `retrievable`, `unavailable`,
  `incomparable`, or `not-applicable`.
- `rationale`: a concise explanation of why that representation is the least
  normalized form that preserves the story.

`incomparable` applies to the before/after observations that would form one
pair, not to the fact that different categories sit at different absolute
levels. Two coal grades, two grain products, or several product classes may
have different prices while each category still has a valid earlier/current
pair in one unit and basis. Those pairs are level evidence. When the input
reports a current price and a percentage move, derive the prior price as
`current / (1 + change rate)` when the basis is compatible. One or two category
pairs normally route to `comparison.benchmark-gap`; three or more route to
`comparison.dumbbell`.

If only part of a normalized comparison has recoverable levels, do not mark the
entire story `incomparable` merely to preserve a percentage-only chart. Use the
recoverable level pairs when they still prove the input-anchored conclusion,
keep unmatched normalized observations secondary, and research any unmatched
category that is necessary to the headline.

Rate and share stories also require:

- `basisAvailability`: whether the tangible numerator and denominator, or the
  population and affected count, are `reported`, `retrievable`, `unavailable`,
  `incomparable`, or `not-applicable`.
- `basisRationale`: why the selected basis status is correct.

Shares of named public aggregates such as GDP, the economy, population,
employment, exports, imports, production, or capacity also require:

- `basisTarget`: the exact public total and tangible numerator to recover, such
  as nominal GDP and the derived sector-value range.

These public denominators are treated as retrievable. The ledger cannot mark
them unavailable or incomparable merely because the reported sector perimeter
is broad. Preserve the qualification, recover a compatible public total, and
select level geometry. A `100%` reference is not a tangible denominator.

When `basisAvailability` is `reported` or `retrievable`, the selected primary
representation must be `level`. Derive and plot the tangible numerator and
denominator, or the affected count and population, and retain the rate/share as
secondary copy. A raw percentage plus a basis rail is not sufficient.

When an absolute or relative change uses `unavailable` or `incomparable` levels,
or when a rate/share uses an `unavailable` or `incomparable` basis, the audit
also requires:

- `tangibleTarget`: the exact price, count, volume, amount, numerator, or
  denominator sought.
- `researchAttempts`: at least two structured source checks.

Each attempt requires `source`, `sourceType`, `locator`, and `outcome`.
`sourceType` must be one of `supplied-source`, `official-dataset`,
`company-filing`, `market-data`, `industry-dataset`, or
`authoritative-report`. The attempts must cover at least two source types and
must include an official dataset, company filing, market-data source, or
industry dataset. A failed general web search or search-result snippet is not a
source check.

Some tangible targets require a specific source type. Workforce or staffing
percentages must include a `company-filing` attempt covering the employee note,
headcount table, or defined workforce perimeter. Consumption, demand, or
coverage denominators must include an `official-dataset` or `industry-dataset`
attempt capable of supplying the relevant volume or population.

Every attempt must describe a completed source-specific check. The validator
rejects pending outcomes such as `to be checked`, `will check`, `TBD`, or
`follow up`, and generic locators such as `website`, `search`, `dataset`, or
`report` without a URL, filing section, table, ticker/date range, or dataset
slice.

```json
{
  "selectedMode": "level",
  "levelAvailability": "retrievable",
  "basisAvailability": "retrievable",
  "basisTarget": "Nominal GDP and the corresponding sector-value range.",
  "rationale": "The reported share and economy total allow a tangible sector amount to be derived.",
  "basisRationale": "Turnover and the economy total can be recovered from the named datasets."
}
```

```json
{
  "selectedMode": "relative-change",
  "levelAvailability": "unavailable",
  "tangibleTarget": "Company-specific insurance premium amounts before and after the reported increase.",
  "rationale": "The source reports the change but not the underlying price levels.",
  "researchAttempts": [
    {
      "source": "Company filing",
      "sourceType": "company-filing",
      "locator": "Annual filing, insurance-cost note",
      "outcome": "The filing reports the percentage increase but no before-and-after premium amounts."
    },
    {
      "source": "Named insurance-market dataset",
      "sourceType": "industry-dataset",
      "locator": "Company premium table for the reporting period",
      "outcome": "The dataset does not publish company-specific premium levels."
    }
  ]
}
```

When actual levels are `reported` or `retrievable`, `relative-change` is rejected
as primary geometry. Use the actual values and retain the percentage change as
secondary context. `index` is reserved for a named, source-reported index with
actual point values. A synthetic `0%` before point, index-100 baseline, or
viewer-facing label such as `100 index` is not permitted.
For a rate or share, `reported` or `retrievable` basis amounts must become the
primary ChartSpec geometry. Examples include cost and income behind a
cost-to-income ratio, turnover and economy size behind an economic share, or a
seller population and affected count behind an exit-risk estimate. A `basis`
rail may document the arithmetic, but it cannot substitute for tangible marks.

The validator scans every numeric token in `input.txt`. Each number must fall
inside a candidate `anchor` or an `ignoredEvidence.anchor`. Use
`ignoredEvidence` only for exact passages containing metadata, source IDs, URL
digits, dates that are not part of a data story, or other non-editorial numeric
material. Every ignored passage requires a specific reason.

## Exact anchors

`anchors`, `titleBasis`, and every input evidence `anchor` must be exact excerpts
from the current `input.txt`. The validator rejects paraphrases and rejects a
ledger when the input hash or byte count changes after initialization.

`titleBasis` is not presentation copy. It is an internal proof that the chart
title is supported by the supplied document. Every substantive concept in the
title must be stated in or unavoidably paraphrase this excerpt.

## Evidence origins

Allowed origins are:

- `input`: evidence directly stated in `input.txt`; requires an exact `anchor`.
- `external`: supplemental evidence from a named source; requires `source` and
  cannot use role `primary`.
- `derived`: arithmetic based on recorded evidence; requires `formula`.

Allowed roles are `primary`, `comparison`, `denominator`, `mechanism`,
`consequence`, and `context`.

External evidence cannot create a new subject, central claim, or title. It may
provide actual levels that directly express an input-anchored percentage or
indexed change, as well as comparison, denominator, mechanism, consequence,
context, or attribution. The primary editorial claim must remain anchored in
`input.txt` even when the chart uses a less normalized representation.

## ChartSpec coverage

With `--specs`, validation requires:

- Every selected `outputSlug` has exactly one JSON file in
  `specs/runs/<run-id>/`.
- No extra ChartSpec exists outside the selected ledger entries.
- Every ChartSpec title exactly matches its ledger title.
- Every ChartSpec `measure.valueMode` and `measure.levelAvailability` exactly
  match the selected candidate's `representationAudit`.
- A selected rate/share representation may use `measure.valueMode: "rate"` or
  `"share"` only when the basis is unavailable, incomparable, or genuinely not
  applicable. A reported or retrievable basis must produce a matching
  `valueMode: "level"` ChartSpec with tangible marks.
- Selected ChartSpecs do not repeat the same input anchor, publication and
  reporting period, recipe, and category or time-label sequence. When they do,
  consolidate the secondary measure or mark its ledger candidate `merged`.
- When `visualEvidenceAudit` inventories three or more comparable observations,
  every observation label, or its explicit `specLabel`, appears in ChartSpec
  `data[]`. Rich same-scale evidence cannot be collapsed into a single range,
  aggregate, total, or headline value.
- A `relationship.converging-signals` ChartSpec has at least one source-ledger
  evidence item with role `mechanism`. The mechanism evidence must support the
  relationship stated in `relationship.formula`; otherwise use comparison
  geometry.

`npm run run:finalize -- <run-id>` performs this validation automatically before
removing transient run files.
