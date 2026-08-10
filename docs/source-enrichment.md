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
identify orientation anchors and material formula inputs
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
- Same-unit actual/current/latest realized values that orient any forecast,
  target, outlook, guidance, or scenario range
- Every comparable historical observation needed to prove a claimed slowdown,
  acceleration, reversal, or persistence
- Relevant market or operational scale
- Denominator needed to interpret a shortage, share, or coverage rate
- Numerator and denominator behind a financial or operational ratio
- Total population and affected count behind a risk estimate
- Exact start and end dates behind a policy, outage, restriction, reserve
  runway, or contract duration; when only exact durations are supplied, locate
  the common start date
- Company filing, employee note, or official workforce disclosure behind a
  staffing percentage
- Actual benchmark and discounted, premium, shortfall, or overage value
- Quantitative formula inputs that materially explain a reported or derived
  outcome, such as area and price per square metre for a transaction value
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

When two quantitative inputs in different units materially explain the headline
outcome, do not derive the outcome and then hide the inputs in supporting text.
Keep the inputs in the main visual argument, normally with
`relationship.converging-signals` and an explicit `relationship.formula` when
the identity or mechanism is source-supported. A range endpoint, floor, ceiling,
remainder, or total that is already encoded by the primary mark is not an
independent anchor and does not make a thin chart more informative.

Do not derive values that depend on unstated assumptions, incompatible periods, or unrelated datasets.

## 4. Audit the value representation

Choose the least normalized representation that still expresses the input-supported story. Use this hierarchy:

1. Reported or retrievable actual levels, such as prices, revenue, output, volume, counts, or share values.
2. Absolute change in the same tangible unit.
3. A native rate or share when the rate or share is itself the measured quantity.
4. Relative change only when the underlying levels are unavailable or not meaningfully comparable.
5. A published index level only when the source itself reports that named index. Never create an index solely as a fallback.

This hierarchy governs the value representation, not whether all material
evidence is used. If the title is about slowing growth and the source provides
three comparable growth rates, those rates must become a `trend.line`. Two
turnover levels are not a substitute for the sequence that proves the slowdown.

Forecast, target, outlook, guidance, and scenario stories need an orientation
check before recipe selection. Search the input and source for the same-unit
actual/current/latest realized observation. If it exists, show it on the visual
scale as primary geometry or a numeric reference. Do not leave the actual value
in `supportingFacts` while plotting only forecast bands or scenarios.

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

For a rate or share, separately audit the tangible basis. When that basis is
reported or retrievable, the least-normalized primary representation is a
`level`, not a raw percentage:

```json
"representationAudit": {
  "selectedMode": "level",
  "levelAvailability": "retrievable",
  "basisAvailability": "retrievable",
  "basisTarget": "Nominal GDP and the corresponding sector-value range.",
  "rationale": "The reported share and economy total allow the sector amount to be derived and plotted in currency.",
  "basisRationale": "The source and named official dataset provide the turnover numerator and economy denominator."
}
```

Treat the denominator of a named public aggregate as retrievable. A claim such
as `8–10% of the economy`, `35% of exports`, or `12% of national production`
must trigger a lookup of the compatible GDP, export, production, population,
employment, import, or capacity total. Record that target in `basisTarget`,
derive the tangible numerator or numerator range, and use level geometry. Do
not mark the basis unavailable merely because the source uses a broad sector
label; preserve the perimeter qualification while anchoring the magnitude. A
100% line or a bar from 0% to 10% is not a denominator in tangible terms.

Use `basisAvailability: "not-applicable"` only for a native quoted rate whose
numerator and denominator would not be a meaningful tangible decomposition,
such as a policy interest rate or a price-index growth rate. A cost-to-income
ratio, market share, coverage rate, utilization rate, or risk estimate normally
has a meaningful basis and should be researched.

When the basis is reported or retrievable, derive and plot the tangible values:

- For a ratio or economic share, plot the numerator and denominator, or the
  derived numerator range against the denominator total.
- For a risk or coverage estimate, plot the affected count or range and the
  total population. The total must be visible on the plotted scale as a point,
  reference, benchmark, or complete composition.
- Keep the rate or share in `displayValue`, `emphasis`, an annotation, or the
  subtitle.

A `basis` rail may still document the arithmetic, but it does not satisfy the
primary-geometry requirement by itself. Raw 8–10%, 15%, or 60% bars are not an
acceptable fallback when the underlying economy, population, turnover, volume,
or count can be obtained.

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

Every attempt must describe a completed source-specific check. Pending language
such as `to be checked`, `will check`, `TBD`, or `follow up` is rejected by the
source-ledger validator. A locator such as `website`, `search`, `dataset`, or
`report` without a URL, table, filing section, ticker/date range, or dataset
slice is also invalid.

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

For workforce reductions, one of the structured checks must be the company
filing or official employee disclosure for the relevant reporting perimeter.
For consumption or demand coverage, include an official or industry dataset
capable of supplying the denominator.

When the same input passage reports two or more shipment, reserve, import, or
supply volumes, do not combine them before the evidence audit and do not reduce
the story to `1–3 days`. Record `visualEvidenceAudit.coverageAudit` with:

- `denominatorLabel`: the visible demand or consumption benchmark. It may be a
  plotted data row or a numeric `references[]` line.
- `sourceEvidence`: one entry for every physical-volume phrase in the input.
- `disposition`: `component`, `denominator`, or `excluded`.
- `label`: the matching `comparableObservations` and ChartSpec label for each
  component or denominator.
- `reason`: a specific scope, direction, period, or product reason for every
  excluded volume.

Every retained component and the denominator must remain in primary geometry
in one tangible physical unit. The denominator may be a reference line rather
than a redundant category row. Coverage time may appear in the title, subtitle,
or annotation only after the viewer can see why the result is small.

Apply a scale-integrity check before choosing a logarithmic axis. When the
editorial claim is that shipments, reserves, output, or another amount are
small relative to a baseline, a logarithmic scale is not acceptable: it
compresses the proportional gap that the chart is meant to communicate. Keep
the comparison linear.

If the reported denominator is a monthly or annual flow and is at least about
8× the largest retained component, period-normalize the denominator to a
shorter familiar interval before charting. Prefer a week when it places the
largest component at a readable fraction of the reference; use a day when a
week is still too large. Keep every component in its original physical unit and
change only the denominator period. For example, a monthly gasoline baseline
may become an equivalent weekly tonnage reference while the shipment values
remain tons. Record the original denominator, conversion, and resulting
reference in the evidence audit or basis. Do not use a shorter period merely to
inflate the apparent importance of the components; the conversion must be a
strict rate-preserving transformation of the same denominator.

If the normalized claim and a tangible base allow an absolute value to be
derived, the derived value is the primary geometry. For example, an 8–10%
economic share plus a reported GDP total becomes a currency range, and a
10–15% exit estimate plus a seller population becomes an affected-count range.

When a share remains the primary measure because its tangible basis is
unavailable, incomparable, or genuinely not applicable, preserve any reported
absolute component value in the visible label. When the full basis is reported
or retrievable, use level geometry instead.

For a risk or exit-outlook story, a low and high percentage alone are not a
complete visual argument. Add the exposed population or denominator and at
least one sourced mechanism or consequence. The population cannot remain only
in the basis rail; show it on the same visual scale. Use
`narrative.emphasis: "risk"` and classify the context with
`supportingFacts[].role`.

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

Supporting evidence may appear as primary data, references, annotations,
supporting facts, a subtitle, or a note. It does not need to share an axis with
the main measure. However, a datapoint that materially proves the title is not
supporting evidence. Comparable historical rates, the denominator that gives a
shortage meaning, and an opposing signal named in the headline must be encoded
as primary geometry or a visible reference.

The subtitle is optional. Omit it when it repeats values, categories, or the
title. Use it only when it adds a qualification, mechanism, denominator, scope
distinction, or interpretation not already visible in the marks.

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
- A six-month and one-month restriction should use `timeline.duration`. Use
  exact start and end dates when available; when both begin on one verified
  date, set `timeline.anchorDate` and supply exact `duration` and
  `durationUnit` values.
- A reserve story expressed in days should also use timeline geometry when the
  common observation date is known, because the calendar runway is the point.
- Shipment volumes described as one to three days of consumption must show a
  daily-consumption reference or be converted into coverage time.
- When the source provides three or more named observations of one quantity in
  one unit, inventory every one in `visualEvidenceAudit` and keep every one in
  primary geometry. Do not replace multiple shipment components, categories,
  facilities, or time points with one aggregate or one derived coverage range.
- Fewer purchases, higher prices, and higher spending jointly define one
  mixed-unit claim. Use `relationship.converging-signals` rather than plotting
  purchase declines and leaving price and spending changes in supporting facts.
- A discount, premium, shortfall, or overage should use
  `comparison.benchmark-gap` when both the benchmark and actual amount are
  available. The benchmark total, actual value, and gap must all remain visible.
  One row is enough when one benchmark relationship fully carries the story;
  do not add a second row that merely restates the total or the derived
  remainder.
- The same preference applies beyond prices: when two positive level values are
  naturally current/actual versus prior, standard, limit, target, or another
  reference, prefer one `comparison.benchmark-gap` row to two independent
  `comparison.change` bars. Reserve `comparison.change` for sign-crossing,
  zero-to-nonzero, native-rate, or index cases where benchmark semantics are not
  the clearest reading.
- A current price plus a reported percentage move should normally use tangible
  price levels: derive the prior price as `current / (1 + change rate)` when the
  rate and current price use the same basis. For one or two categories, use
  `comparison.benchmark-gap` with the later/current price as `value` and the
  earlier/prior price as `benchmark`. For three or more categories, use
  `comparison.dumbbell`. Do not flatten `Category · earlier` and
  `Category · later` into separate scenario bars. Different categories may have
  different absolute prices, grades, or delivery bases; that does not make each
  category's own earlier-versus-later pair incomparable. Only mark levels
  `incomparable` when the before and after values within the same category do
  not share a defensible basis. If only some category pairs are recoverable,
  use those tangible pairs when they still support the input-anchored finding
  and keep unmatched percentage observations as secondary context; otherwise
  research the missing levels further or reframe/omit the story. For a quoted
  discount, research the undiscounted reference price and plot the discounted
  actual price inside that total. Do not use the discount amount as `value`.
- Do not use dot-counting or pictograms. If the source offers only two exact
  count categories, research a third same-scale count, a tangible
  population/network denominator, a meaningful benchmark, or a time series.
  A percentage or market statistic in another unit is secondary evidence, not
  enough structure for a standalone two-count chart. If a stronger anchor
  cannot be found, merge or omit the story.
- When several positive values simply add to one reported total, use
  `composition.components`. Every component begins at zero and the reported
  total is a single numeric reference. Do not use `flow.waterfall` for that
  decomposition; waterfall is reserved for a genuine balance moving through
  exact changes.
- A percentage risk range should include a population basis and a mechanism or
  consequence. Without those, enrich it further or omit it.
- A story with unlike units may use one primary visual plus the unboxed
  `supportingFacts` rail for secondary context. When exactly two drivers and one
  outcome are all essential, use `relationship.converging-signals`. The three
  items must measure three distinct real-world quantities, and
  `relationship.formula` must state the source-supported mechanism. Two price
  points, two volume observations, or the same measure at different dates are
  not causal factors; use change, scenarios, dumbbell, or trend geometry. Each factor
  and the outcome must be drawn as an independent local quantitative signal,
  with the two factor paths meeting near the outcome and no separate output
  connector into the outcome signal. Do not add a decorative hub or node at the
  merge. Connector width is fixed and never
  represents magnitude. Use identity mode only for exact
  same-scope, same-period reconciliation. Use directional mode with a note when
  the measures support a mechanism or direction but use incompatible periods or
  scopes. Split more diffuse mixed evidence into separate ChartSpecs.
- Before using `composition.stacked` for a hypothetical allocation, check
  whether the source supplies a meaningful policy, target, prior, or alternative
  share against the same tangible total. If it does and the comparator improves
  orientation, derive the tangible amount for each share and compare those rows
  against the shared total with `comparison.benchmark-gap`. Keep a composition
  when the mix itself is the finding rather than treating every allocation as a
  scenario comparison.
- A same-period two-value pair should not receive its own
  `comparison.scenarios` chart merely because two values exist. Search for a
  third comparable item, numeric reference or threshold, tangible basis, or a
  numeric mechanism, consequence, denominator, or comparison fact. Also check
  whether the pair belongs inside an existing same-topic chart. If it cannot be
  enriched and has no distinct editorial conclusion, merge or omit it.
- Apply an information-economy test before authoring: remove any proposed row
  that is only a complement, remainder, duplicated total, or zero-gap endpoint
  already encoded by a segmented bar or benchmark marker.

## Geography-first enrichment

Source enrichment also determines whether geography is explanatory. Record a
`routingAudit` for every selected story before recipe selection. When multiple
named administrative regions combine with a claim about spread, border
contrast, clustering, adjacency, geographic distribution, or concentration,
classify geography as `explanatory` and use `regional-breakdown`. Do not turn
the same evidence into a ranking merely because the quantities are rankable.

Use `categorical` only when place names behave like ordinary categories and
their location does not change the conclusion. The source verifier enforces the
routing decision against the final ChartSpec.

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
- `visualEvidenceAudit` inventories every materially relevant same-scale
  observation; when three or more exist, every one appears in ChartSpec
  `data[]` under its recorded label or `specLabel`.
- Derived values are traceable and period-compatible.
- Actual-level availability has been checked before choosing a percentage representation.
- For a rate or share, basis availability has been checked and documented; a reported or retrievable basis has been converted to level geometry.
- Any `unavailable` or `incomparable` normalized representation names its `tangibleTarget` and has at least two completed, source-specific research attempts covering two source types, including a data-bearing source.
- The source-ledger `representationAudit` matches `measure.valueMode` and `measure.levelAvailability`.
- `relationship.converging-signals`, when used, contains two genuine drivers
  and a different outcome, all with distinct quantities and an explicit
  mechanism formula; it is not a disguised time series or paired-price chart.
- A raw rate/share is used only when its tangible basis is unavailable, incomparable, or genuinely not applicable; otherwise the chart uses level geometry.
- Relative-change geometry is used only when actual levels are unavailable or incomparable.
- `incomparable` is evaluated within an observation pair, not across category
  magnitudes. Wheat and barley, two coal grades, or two product classes may sit
  at different absolute price levels while each category still has a valid
  before/after pair that belongs in level geometry.
- Index geometry is used only for a named, source-reported index with actual point values; synthetic 100-based baselines and viewer-facing `index` labels are absent.
- Risk stories include a population or denominator plus a mechanism or consequence.
- An exact two-item `comparison.scenarios` chart has a numeric reference, basis,
  mechanism, consequence, denominator, or comparison fact, and is not a subset
  of a richer same-topic chart.
- Dated intervals use `timeline.duration`; price, cost, freight, margin, discount, premium, shortfall, and overage stories use segmented benchmark geometry when their defining evidence is available.
- Repeated category/time pairs are never flattened into `comparison.scenarios`.
  Use `comparison.benchmark-gap` for one or two category pairs and
  `comparison.dumbbell` for three or more.
- Benchmark-gap specs plot the underlying tangible actual and total benchmark,
  use one row when one relationship is complete, and contain no complement or
  zero-gap closure rows.
- Mixed-measure driver/outcome stories use `relationship.converging-signals` rather
  than a shared axis, with identity versus directional mode supported by the
  evidence.
- External research supplements rather than silently overrides the input.
- Any direct contradiction has been escalated for editorial resolution.
- Every selected fact supports magnitude, comparison, mechanism, or consequence.
- The central finding remains singular and clear.
- The selected recipe reflects the enriched evidence rather than the abbreviated input note.
