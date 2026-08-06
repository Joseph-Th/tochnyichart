# Source enrichment policy

This is chart-author documentation. It defines how an agent turns an editorial note or data-story summary into the evidence used by a `ChartSpec`.

The objective is not to maximize the number of data points or make every chart visually complex. The objective is to build the richest evidence set that remains inside one clear editorial claim.

## Core rule

Treat `input.txt` as expert-authored editorial evidence. Assume its factual
claims, values, comparisons, and causal interpretation are correct unless a
reputable source directly contradicts a material point.

External research is enrichment, not an adversarial fact-check of the batch
report. Use it to add attribution, comparators, denominators, historical series,
mechanisms, consequences, or current status. Failure to find the same fact in a
second source is not a contradiction and must not cause an agent to delete,
downgrade, relabel, or replace an input claim.

External research may not originate a story. The subject, central claim, and
title must be directly supported by `input.txt`. After that story is inventoried,
a supplied source, underlying dataset, or directly relevant external source may
provide actual levels that express the same anchored change more clearly than a
percentage or index. This changes the representation, not the story. Research
may also supply a comparator, denominator, mechanism, consequence, or
attribution. Do not create a slide because an adjacent article contains an
interesting dataset.

The input is not assumed to contain the complete dataset available for the
chart. Inspect and exhaust supplied sources before selecting the recipe, then
supplement the expert material when reputable reporting strengthens the same
editorial claim.

Do not expose research-process language such as `uncorroborated`, `not
independently confirmed`, `unsupported draft`, or `verification failed` in a
chart or presentation merely because an external search did not repeat an input
claim.

Do not create a two-value chart merely because the input note mentions two values. First determine whether the source provides a useful comparator, component, cause, consequence, forecast, denominator, or historical reference that strengthens the same finding.

Do not add context merely to avoid a simple chart. A clean two-value comparison is correct when the contrast itself is the complete story.

## Authoring order

Use this order before recipe selection:

```text
exact project-root input.txt
    |
    v
inventory every distinct quantitative claim with exact input excerpts
    |
    v
record selected, omitted, or merged disposition for every candidate
    |
    v
verify the source ledger
    |
    v
confirm source identity and relevance for already-inventoried stories
    |
    v
read the full primary source
    |
    v
extract evidence and safe derivations
    |
    v
identify any useful enrichment gap
    |
    v
conditionally research additional context
    |
    v
select the evidence spine and recipe
```

## 1. Confirm and attribute sources

Do not search for or use a sibling `input.txt`, previous batch file, alternate
brief, or similarly named document. If the project-root `input.txt` is missing,
empty, or changed after initialization, stop the run.

When a URL is provided, confirm that the page matches the input note before
extracting supplemental data.

Verify:

- Entity or market
- Event or finding
- Reporting period
- Publication date
- Source title
- Whether the link is the underlying source or only a related article

If the source does not match the note, do not silently combine them. Preserve
the expert input claim, exclude the mismatched source from that claim, and seek
a better attribution or supplemental source.

Only a direct, material contradiction from a reputable source creates a source
conflict. Silence, omission, different emphasis, lack of indexing, inaccessible
archives, or failure to locate a second report do not. When a direct conflict
exists, retain both positions in working notes and report the conflict for
editorial resolution instead of silently rewriting the expert claim.

Use the underlying publication, company report, official dataset, or named research source as `source.name` when available. When no usable attribution is available, omit the `source` field. Never substitute `input.txt`, an internal compilation, a file path, verification status, or workflow commentary into chart or presentation copy.

## 2. Exhaust the primary source

Extract all facts that could clarify the central finding without changing it:

- Main result or event
- Prior-period value or benchmark
- Absolute and percentage change
- Components of the total
- Cause or operating mechanism
- Consequence or decision resulting from the change
- Forecast or expected direction
- Relevant market or operational scale
- Denominator needed to interpret a shortage, share, or coverage rate
- Numerator and denominator behind a financial or operational ratio
- Total population and affected count behind a risk estimate
- Exact start and end dates behind a policy, outage, restriction, or contract duration
- Actual benchmark and discounted, premium, shortfall, or overage value
- Underlying report, dataset, or filing named by the article

The evidence should remain attributable to the source and compatible in period, unit, and scope.

## 3. Use safe derivations

Calculate values that are directly supported by sourced inputs and materially clarify the same story. Common safe derivations include:

- Absolute change
- Percentage change
- Percentage-point change
- Ratio
- Share of a total
- Coverage rate
- Implied shortfall
- Combined amount

Retain the source inputs and formula in working notes. Do not imply more precision than the source supports. When the source uses terms such as `about`, `almost`, `more than`, or a range, preserve that uncertainty in the display value and explanatory copy.

Do not derive values that depend on unstated assumptions, incompatible periods, or unrelated datasets.

## 4. Audit the value representation

Choose the least normalized representation that still expresses the input-supported story. Use this hierarchy:

1. Reported or retrievable actual levels, such as prices, revenue, output, volume, counts, or share values.
2. Absolute change in the same tangible unit.
3. A native rate or share when the rate or share is itself the measured quantity.
4. Relative change only when the underlying levels are unavailable or not meaningfully comparable.
5. A published index level only when the source itself reports that named index. Never create an index solely as a fallback.

Do not create a synthetic `0%` before-event point or an index value of `100` merely to manufacture a trend. When actual levels can be found in the supplied source, underlying dataset, market-data history, company filing, or industry dataset, use those levels for the primary geometry. Put percentage change in `emphasis`, an annotation, the subtitle, or `supportingFacts`.

An index is valid only when it is an actual published measure, such as a named
price or production index with reported point values. A synthetic baseline is
not a published index. Do not show viewer-facing labels such as `100 index`,
`91.5 index`, or `index points`. If tangible levels remain unavailable after
research, plot only the reported relative observations with plain-language
labels, or omit the story when those observations do not form a useful visual.

For a selected source-ledger candidate, record:

```json
"representationAudit": {
  "selectedMode": "level",
  "levelAvailability": "reported",
  "rationale": "The source reports the actual before and after prices."
}
```

The matching `ChartSpec.measure` must declare the same `valueMode` and `levelAvailability`. A `relative-change` measure also requires `normalizationNote` when levels are unavailable or incomparable. A published index uses `valueMode: "index"` only with reported or retrievable point levels.

For a rate or share, separately audit the tangible basis:

```json
"representationAudit": {
  "selectedMode": "share",
  "levelAvailability": "not-applicable",
  "basisAvailability": "retrievable",
  "rationale": "The claim is natively a share.",
  "basisRationale": "The source and named official dataset provide the turnover numerator and economy denominator."
}
```

Use `basisAvailability: "not-applicable"` only for a native quoted rate whose
numerator and denominator would not be a meaningful tangible decomposition,
such as a policy interest rate or a price-index growth rate. A cost-to-income
ratio, market share, coverage rate, utilization rate, or risk estimate normally
has a meaningful basis and should be researched.

When the basis is reported or retrievable, add a ChartSpec `basis` rail:

- `type: "ratio"` with `numerator` and `denominator` items.
- `type: "population"` with `population` and `affected` items.

The primary chart may still show the rate or share, but the visible basis rail
must state the tangible amounts. This prevents a percentage from floating free
of scale.

Do not mark levels or a basis `unavailable` or `incomparable` after one failed
search. First state the exact `tangibleTarget`, such as the share prices at the
prior close, intraday low, and close; the employee headcount for a defined
reporting perimeter; or export tonnes for the reported months. Then record at
least two structured `researchAttempts` in the source ledger.

Each attempt must identify:

- `source`: the named source.
- `sourceType`: `supplied-source`, `official-dataset`, `company-filing`,
  `market-data`, `industry-dataset`, or `authoritative-report`.
- `locator`: the URL, filing, table, ticker and date range, or dataset slice
  actually checked.
- `outcome`: what values were found or why they could not be used.

The attempts must cover at least two source types, including at least one source
capable of supplying tangible data: an official dataset, company filing,
market-data source, or industry dataset. A generic web search, search-result
snippet, or statement that a value was “not found” is not a source check.

```json
"representationAudit": {
  "selectedMode": "relative-change",
  "levelAvailability": "unavailable",
  "tangibleTarget": "Monthly sunflower-oil export tonnes for June, July, and August 2026.",
  "rationale": "The percentage changes remain the only compatible observations after the required data checks.",
  "researchAttempts": [
    {
      "source": "Supplied trade article",
      "sourceType": "supplied-source",
      "locator": "Full article and linked tables",
      "outcome": "The article reports percentage changes but no monthly tonnes."
    },
    {
      "source": "Named oilseed-market dataset",
      "sourceType": "industry-dataset",
      "locator": "Russia sunflower-oil exports, monthly series, 2026",
      "outcome": "The accessible table does not expose the relevant monthly amounts."
    }
  ]
}
```

For percentage-only claims, search for the natural underlying amount before
selecting geometry:

- Share-price change: exchange prices for the exact event date and trading window.
- Workforce reduction: a consistent bank or group headcount and the implied number of positions.
- Export or production change: tonnes, barrels, units, or value for the same periods.
- Spending or revenue change: currency amounts for the same scope and periods.
- Market share or coverage: numerator, denominator, and remainder.

When a share is the primary measure and the absolute component values are reported or retrievable, show both in the visible data label. A percentage-only label discards useful magnitude.

For a risk or exit-outlook story, a low and high percentage alone are not a
complete visual argument. Add the exposed population or denominator and at
least one sourced mechanism or consequence. Use `narrative.emphasis: "risk"`
and classify the context with `supportingFacts[].role`.

For `flow.waterfall`, exact evidence is a hard constraint rather than a review preference.
Every item must be an exact reported value and declare the same `period` and
`scope` as the other items. Use `valueStatus: "bound"`, `"approximate"`, or
`"derived"` to preserve the evidence state when authoring another recipe, but
do not put those values in a waterfall. A net loss plus incomplete charges does
not establish a pre-charge net result, and an operating-profit figure is not a
substitute for one.

## 5. Build an evidence spine

A chart has one central finding. Supporting evidence may fill up to three of these roles:

1. **Magnitude:** How large is the event or change?
2. **Comparison:** Relative to what prior value, benchmark, target, or peer?
3. **Mechanism:** What caused or transmitted the result?
4. **Consequence:** What changed or is expected to change because of it?

Not every chart needs every role. Select only the facts required to make the finding understandable.

Supporting evidence may appear as primary data, references, annotations, supporting facts, a subtitle, or a note. It does not need to share an axis with the main measure.

## 6. Search beyond the supplied material conditionally

Additional research is allowed when it strengthens the expert report or fills a
material evidence gap. Examples include:

- No prior-period or benchmark comparison for a claimed change
- No historical series for a claimed record
- No denominator for interpreting a shortage, share, or coverage figure
- No scale for deciding whether an amount is material
- No tangible basis for a rate, ratio, share, or risk estimate
- No exact dates for a reported duration
- No benchmark total for a reported discount, premium, shortfall, or overage
- No explanation for a reversal that is central to the finding
- No current status for an ongoing event

Use this research order:

```text
full linked source
-> underlying official dataset, company filing, or named report
-> sources directly linked or cited by the article
-> another article from the same publisher about the same event
-> broader high-quality external research
```

Searching for another article from the same publisher is not the default. It is
an enrichment step after the linked source and its underlying evidence have
been exhausted.

Additional research must not introduce a new company, policy, market event,
ownership structure, or operating result as a chart subject unless that subject
and claim already appear in `input.txt`.

## 7. Apply the relevance test

Include secondary context only when all of the following are true:

- It concerns the same entity, market, or causal event.
- Its period and scope are compatible with the central finding.
- It fills a defined evidence role.
- It materially changes or clarifies interpretation.
- It has a traceable source.
- It does not require changing the chart's central editorial sentence.

External context must not replace an input datapoint merely because it is easier
to cite. Preserve the input evidence spine and add the external fact only when
it is compatible with that spine.

Reject context that is merely adjacent, interesting, or visually convenient.

Apply a title-fidelity test before accepting the story. Every substantive title
concept must be stated in, or be an unavoidable plain-language paraphrase of,
the exact input excerpt recorded as `titleBasis`. Structural words such as
`maximum`, `range`, `coverage`, `collapse`, `exposure`, `erosion`, or a
sector-specific form of `inflation` require the corresponding structure to be
explicitly present in the input evidence. Do not promote a nearby fact into the
headline.

A useful removal test is: if deleting the fact does not weaken the title, subtitle, explanation, or interpretation, the fact is probably noise.

## 8. Select the recipe after enrichment

Recipe selection follows evidence extraction, not the abbreviated input note.

Examples:

- A note containing two profit values may become a richer earnings story when the source also provides revenue, operating drivers, and a resulting dividend decision.
- A shortage note may become a coverage-rate headline when supply and demand periods can be normalized safely.
- A profit-to-loss reversal may remain a simple two-value diverging comparison when the sign change is the complete finding.
- A six-month and one-month restriction should use `timeline.duration` when
  exact start and end dates are available, so the occupied calendar windows are
  visible rather than reduced to abstract bar lengths.
- A discount, premium, shortfall, or overage should use
  `comparison.benchmark-gap` when both the benchmark and actual amount are
  available. The benchmark total, actual value, and gap must all remain visible.
- A percentage risk range should include a population basis and a mechanism or
  consequence. Without those, enrich it further or omit it.
- A story with unlike units may use one primary visual plus the unboxed
  `supportingFacts` rail for secondary context. When multiple unlike measures
  are essential, split them into separate ChartSpecs.

Do not default to bars because the input contains numbers. Do not select a more complex recipe solely to make the output look more interesting.

## Completion check

Before authoring the `ChartSpec`, confirm:

- The expert input claim has been preserved.
- The story exists in the complete source ledger with exact input anchors.
- The title is directly supported by its recorded `titleBasis` excerpt.
- At least one primary evidence item comes from `input.txt`.
- External evidence is supplemental and does not originate the story.
- Any linked source used for supplementation matches the story.
- The full source has been read.
- All directly relevant evidence has been extracted.
- Derived values are traceable and period-compatible.
- Actual-level availability has been checked before choosing a percentage representation.
- For a rate or share, basis availability has been checked and documented.
- Any `unavailable` or `incomparable` normalized representation names its `tangibleTarget` and has at least two structured research attempts covering two source types, including a data-bearing source.
- The source-ledger `representationAudit` matches `measure.valueMode` and `measure.levelAvailability`.
- For rate/share stories, the ledger basis audit matches `measure.basisAvailability`, and reported or retrievable amounts appear in `basis`.
- Relative-change geometry is used only when actual levels are unavailable or incomparable.
- Index geometry is used only for a named, source-reported index with actual point values; synthetic 100-based baselines and viewer-facing `index` labels are absent.
- Risk stories include a population or denominator plus a mechanism or consequence.
- Dated intervals use `timeline.duration`; benchmark gaps use `comparison.benchmark-gap` when their defining evidence is available.
- External research supplements rather than silently overrides the input.
- Any direct contradiction has been escalated for editorial resolution.
- Every selected fact supports magnitude, comparison, mechanism, or consequence.
- The central finding remains singular and clear.
- The selected recipe reflects the enriched evidence rather than the abbreviated input note.
