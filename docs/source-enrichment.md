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
4. Relative change or an index only when the underlying levels are unavailable or not meaningfully comparable.

Do not create a synthetic `0%` before-event point or an index value of `100` merely to manufacture a trend. When actual levels can be found in the supplied source, underlying dataset, or a directly linked filing, use those levels for the primary geometry. Put percentage change in `emphasis`, an annotation, the subtitle, or `supportingFacts`.

For a selected source-ledger candidate, record:

```json
"representationAudit": {
  "selectedMode": "level",
  "levelAvailability": "reported",
  "rationale": "The source reports the actual before and after prices."
}
```

The matching `ChartSpec.measure` must declare the same `valueMode` and `levelAvailability`. A `relative-change` or `index` measure also requires `normalizationNote` when levels are unavailable or incomparable.

When a share is the primary measure and the absolute component values are reported or retrievable, show both in the visible data label. A percentage-only label discards useful magnitude.

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
- Actual-level availability has been checked before choosing a percentage or index representation.
- The source-ledger `representationAudit` matches `measure.valueMode` and `measure.levelAvailability`.
- Percentage or index geometry is used only when actual levels are unavailable or incomparable.
- External research supplements rather than silently overrides the input.
- Any direct contradiction has been escalated for editorial resolution.
- Every selected fact supports magnitude, comparison, mechanism, or consequence.
- The central finding remains singular and clear.
- The selected recipe reflects the enriched evidence rather than the abbreviated input note.
