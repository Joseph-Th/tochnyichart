# Source ledger contract

Every production run has one transient source ledger:

```text
.work/<run-id>/source-ledger.json
```

`npm run run:init -- <run-id>` creates the file from the exact project-root
`input/` source set. The ledger records every file path, byte count, SHA-256
hash, aggregate bytes, and a deterministic source-set hash. Complete the ledger
before external research, set `inventoryComplete` to `true`, and run:

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
  "version": "2.0",
  "runId": "issue-2026-08-12",
  "input": {
    "path": "input/",
    "kind": "directory",
    "bytes": 12585,
    "sha256": "source-set hash created by run:init",
    "files": [
      {
        "path": "input/data.csv",
        "bytes": 12000,
        "sha256": "per-file hash created by run:init"
      },
      {
        "path": "input/context.md",
        "bytes": 585,
        "sha256": "per-file hash created by run:init"
      }
    ]
  },
  "inventoryComplete": true,
  "ignoredEvidence": [],
  "candidates": [
    {
      "id": "category-ranking",
      "claim": "Category A has the largest number of records in the supplied dataset.",
      "decision": "selected",
      "outputSlug": "category-ranking",
      "title": "Category A leads recorded activity",
      "titleBasis": {
        "type": "derived",
        "sourcePath": "input/data.csv",
        "description": "The title follows from counting rows by the Category column and sorting descending.",
        "method": "Filter blank Category values; group by Category; count rows; sort descending."
      },
      "representationAudit": {
        "selectedMode": "level",
        "levelAvailability": "reported",
        "rationale": "Record counts are directly calculated from supplied rows."
      },
      "visualEvidenceAudit": {
        "rationale": "All ranked categories are comparable record counts from the same dataset.",
        "comparableObservations": [
          {
            "label": "Category A",
            "quantity": "record count",
            "unit": "records",
            "period": "supplied dataset",
            "value": 120
          },
          {
            "label": "Category B",
            "quantity": "record count",
            "unit": "records",
            "period": "supplied dataset",
            "value": 95
          },
          {
            "label": "Category C",
            "quantity": "record count",
            "unit": "records",
            "period": "supplied dataset",
            "value": 71
          }
        ]
      },
      "routingAudit": {
        "geographyRole": "none",
        "workflow": "standard-chart",
        "rationale": "The story compares dataset categories; administrative geography does not explain the finding."
      },
      "anchors": [
        {
          "sourcePath": "input/data.csv",
          "selector": "Group non-empty Category values and count rows by category."
        }
      ],
      "evidence": [
        {
          "statement": "Category A has the highest grouped row count.",
          "origin": "input",
          "role": "primary",
          "anchor": {
            "sourcePath": "input/data.csv",
            "selector": "Group non-empty Category values and count rows by category."
          }
        }
      ]
    }
  ]
}
```

## Decisions

Every story entered in the ledger must receive exactly one disposition. For
prose briefs, inventory distinct quantitative claims with exact excerpts. For
large structured datasets, inventory the stories selected for the assignment
and cite the file selector or derivation that produces each one.

- `selected` requires `outputSlug`, `title`, `titleBasis`,
  `representationAudit`, `visualEvidenceAudit`, `routingAudit`, and at least one `input`
  evidence item with role `primary`.
- `outputSlug` is an artifact identifier, not a path. It must be 1-128 characters
  of lowercase letters and numbers separated by single hyphens. Slashes, dots,
  whitespace, and path traversal are rejected before specification or delivery
  files are read or written.
- `omitted` requires a specific `reason`.
- `merged` requires `mergedInto` naming another candidate ID.

An omitted story cannot disappear silently. A merged story cannot point to a
subject that is absent from the input.

The ledger records quantitative claims, not a mandatory slide for each claim.
A same-period two-value pair should be marked `merged` when it is already
contained in a richer same-topic map, category comparison, or trend. Generic
two-bar `comparison.scenarios` is not a valid fallback. If targeted enrichment
cannot supply a third independent same-scale observation and the pair has no
defensible relationship-specific recipe, mark it `omitted`.

Before splitting one supplied article, dataset, or paragraph into several
selected candidates, perform a source-family sweep. Inventory related
quantitative observations first. A candidate that is only a summary,
complement, subset, or single-point restatement of a richer same-topic
comparison or regional distribution should be `merged` into the richer
candidate instead of becoming a separate thin slide.

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
is `standard-chart` or `regional-breakdown`. Three or more distinct named
administrative regions in comparable evidence are a regional distribution by
construction: geography is `explanatory`, the workflow must be
`regional-breakdown`, and `regionSet` must be `russia`, even when the prose calls
the result a ranking or comparison and contains no explicit spatial cue.
Grouped labels count every named region. With two named regions, a claim about
spread, border contrast, clustering, adjacency, geographic distribution, or
concentration also requires regional routing. A later ranking or bar-chart
choice cannot override either decision.

Use `categorical` only when places function as ordinary labels and their spatial
relationship does not change the conclusion and the comparable evidence does
not contain three or more distinct administrative regions. The source verifier
rejects calling several named regions `none`, rejects dense regional evidence
classified as categorical, and rejects a standard ChartSpec that tries to
bypass explanatory regional routing.

## Exact-count quality gate

Two small exact counts are not enough structure for a standalone chart. A
selected candidate with exactly two count observations must also have a
tangible population/denominator or a meaningful independent numeric benchmark.
Otherwise continue targeted research for a third comparable count or a richer
time series, then update `visualEvidenceAudit`. The same rule applies to three
or four count observations when the values are tiny or have little variation:
a few integers do not become informative merely because they can be connected
by a line. Recover a reviewed universe, portfolio/network total, population,
capacity, affected volume/value, or other same-unit anchor. If that evidence
does not exist, use event/calendar structure when chronology carries the story,
or merge/omit it. A percentage or market statistic in a different unit is
secondary context and does not satisfy this gate.

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

When the meaning of those observations depends on a numeric cutoff or
orientation value, record it separately in
`visualEvidenceAudit.orientationAnchors`. This is mandatory for a
title-defining breakeven, profitability floor, threshold, cap, ceiling, limit,
or similar cutoff. The anchor must survive into the final ChartSpec as a
numeric reference, benchmark, or explicit threshold mark.

```json
"orientationAnchors": [
  {
    "label": "Profitability threshold",
    "role": "threshold",
    "quantity": "wheat offer price",
    "unit": "RUB/t",
    "period": "comparison window",
    "value": 10000
  }
]
```

Supported roles are `threshold`, `benchmark`, `baseline`, `limit`, `target`,
and `denominator`. Orientation anchors do not replace comparable observations;
they explain the scale on which those observations become meaningful.

Standard-chart candidates may inventory at most 100 comparable observations,
matching the ChartSpec data ceiling. Recipe-specific limits still apply later:
large finite categorical domains belong in `ranking.horizontal`, while recipes
with smaller semantic limits must not silently truncate the evidence merely to
fit their renderer. For `regional-breakdown`, the audit may inventory up to the
selected region set's full administrative-region count. This is intentional:
the regional evidence inventory can be larger than the visible callout set.
Keep all materially reported regions in the audit and later use
`data[].callout: "none"` for fill-only highlights that do not need a card.

When an audience-facing label intentionally differs from the raw source label,
keep the raw value in `label` and record the presentation alias in `specLabel`.
This is the supported path for assignment-specific naming conventions. Do not
rewrite the underlying dataset or hard-code client-specific aliases into the
renderer.

When three or more comparable observations are available, every one must remain
a primary `data[]` item in the ChartSpec. The source verifier rejects replacing
that richer dataset with one aggregate, one range, one total, or one headline
value. This check is about observations, not the raw count of numeric tokens.
A single benchmark relationship remains valid when the source genuinely offers
only an actual value and its benchmark.

For a `rate` or `share` whose tangible basis remains `unavailable` or
`incomparable`, one independent normalized observation is not enough for a
standalone chart. `100% - reported share` is a derived complement, not a second
observation. Recover an independent same-unit peer, regional observation,
prior/current point, benchmark, or target from the full source or underlying
dataset. Once two or more normalized observations are inventoried, every one
must remain in primary geometry rather than being parked in `supportingFacts`.
Merge into a richer same-topic candidate when that evidence already exists;
otherwise omit the thin claim.

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

When a rate or share names a concrete total that is supplied or reasonably
retrievable, also record:

- `basisTarget`: the exact total and tangible numerator to recover.

Do not mark an identified, accessible denominator unavailable merely to retain
percentage-only geometry. Preserve scope qualifications, recover a compatible
total, and select level geometry when that representation is meaningful. A
`100%` reference is not a tangible denominator.

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

Some tangible targets require a domain-appropriate source type. The selected
research attempt must be capable of supplying the actual measure or denominator
for the stated scope rather than merely repeating the normalized claim.

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
  "basisTarget": "The named total and corresponding component amount.",
  "rationale": "The reported share and compatible total allow a tangible component amount to be derived.",
  "basisRationale": "Both numerator and denominator can be recovered from the named datasets."
}
```

```json
{
  "selectedMode": "relative-change",
  "levelAvailability": "unavailable",
  "tangibleTarget": "Underlying before-and-after values for the reported change.",
  "rationale": "The source reports the change but not the underlying price levels.",
  "researchAttempts": [
    {
      "source": "Primary source",
      "sourceType": "supplied-source",
      "locator": "Underlying source table for the reporting period",
      "outcome": "The source reports the normalized change but no compatible before-and-after levels."
    },
    {
      "source": "Named domain dataset",
      "sourceType": "industry-dataset",
      "locator": "Matching entity and reporting-period slice",
      "outcome": "The dataset does not publish compatible underlying levels."
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
ratio, a component and total behind a share, or a population and affected count
behind a risk estimate. A `basis`
rail may document the arithmetic, but it cannot substitute for tangible marks.

The validator uses the hashed file inventory plus explicit
source excerpts, selectors, and documented derivations. Use `ignoredEvidence`
only for material that is intentionally excluded and record a specific reason.

## Exact anchors

For prose sources, `anchors`, `titleBasis`, and input evidence anchors may be
exact excerpts. Structured or binary sources may use a source path plus an
explicit selector, and structured findings may use a documented derivation.
The validator rejects a ledger when the initialized source-set hash, file
inventory, or byte counts change.

`titleBasis` is not presentation copy. It is an internal proof that the chart
title is supported by the supplied document. Every substantive concept in the
title must be stated in or unavoidably paraphrase this excerpt.

## Evidence origins

Allowed origins are:

- `input`: evidence supported by the current `input/` source set; requires an exact prose excerpt or a structured source selector.
- `external`: supplemental evidence from a named source; requires `source` and
  cannot use role `primary`.
- `derived`: arithmetic based on recorded evidence; requires `formula`.

Allowed roles are `primary`, `comparison`, `denominator`, `mechanism`,
`consequence`, and `context`.

External evidence may also declare `conflictStatus: "material"` when a reputable
source directly contradicts the input-supported claim. A candidate containing
material-conflict evidence cannot be `selected`; keep the conflict in working
evidence and hold/omit the story until editorial resolution. Use
`conflictStatus: "none"` only when an explicit status is useful. External silence
or omission is not a conflict and needs no flag.

External evidence cannot create a new subject, central claim, or title. It may
provide actual levels that directly express an input-anchored percentage or
indexed change, as well as comparison, denominator, mechanism, consequence,
context, or attribution. The primary editorial claim must remain anchored in
`input/` even when the chart uses a less normalized representation.

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
  evidence item with role `mechanism`. For directional relationships, one
  mechanism statement must explicitly link the plotted outcome to at least one
  plotted driver. Merely tagging a sentence that lists the drivers, reports
  chronology, or supplies adjacent facts does not support connector geometry.
  If the explicit linkage is absent, use comparison geometry instead.

`npm run run:finalize -- <run-id>` performs this validation automatically before
removing transient run files.
