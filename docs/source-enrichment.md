# Source enrichment policy

This is chart-author documentation. It defines how an agent turns an editorial note or data-story summary into the evidence used by a `ChartSpec`.

The objective is not to maximize the number of data points or make every chart visually complex. The objective is to build the richest evidence set that remains inside one clear editorial claim.

## Core rule

Always inspect and exhaust the full primary source before selecting the recipe.

An input note, headline, excerpt, or `input.txt` entry is routing information. It identifies a possible story and often points to the relevant source. It is not assumed to contain the complete dataset available for the chart.

Do not create a two-value chart merely because the input note mentions two values. First determine whether the source provides a useful comparator, component, cause, consequence, forecast, denominator, or historical reference that strengthens the same finding.

Do not add context merely to avoid a simple chart. A clean two-value comparison is correct when the contrast itself is the complete story.

## Authoring order

Use this order before recipe selection:

```text
input note or assignment
    |
    v
verify source identity and relevance
    |
    v
read the full primary source
    |
    v
extract evidence and safe derivations
    |
    v
identify any material evidence gap
    |
    v
conditionally research additional context
    |
    v
select the evidence spine and recipe
```

## 1. Verify the source

When a URL is provided, confirm that the page matches the input note before extracting data.

Verify:

- Entity or market
- Event or finding
- Reporting period
- Publication date
- Source title
- Whether the link is the underlying source or only a related article

If the source does not match the note, do not silently combine them. Resolve the mismatch or report it.

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

For `flow.waterfall`, this is a hard constraint rather than a review preference.
Every item must be an exact reported value and declare the same `period` and
`scope` as the other items. Use `valueStatus: "bound"`, `"approximate"`, or
`"derived"` to preserve the evidence state when authoring another recipe, but
do not put those values in a waterfall. A net loss plus incomplete charges does
not establish a pre-charge net result, and an operating-profit figure is not a
substitute for one.

## 4. Build an evidence spine

A chart has one central finding. Supporting evidence may fill up to three of these roles:

1. **Magnitude:** How large is the event or change?
2. **Comparison:** Relative to what prior value, benchmark, target, or peer?
3. **Mechanism:** What caused or transmitted the result?
4. **Consequence:** What changed or is expected to change because of it?

Not every chart needs every role. Select only the facts required to make the finding understandable.

Supporting evidence may appear as primary data, references, annotations, supporting facts, a subtitle, or a note. It does not need to share an axis with the main measure.

## 5. Search beyond the primary source conditionally

Additional research is allowed only when the primary source leaves a material evidence gap. Examples include:

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

Searching for another article from the same publisher is not the default. It is a gap-filling step after the linked source and its underlying evidence have been exhausted.

## 6. Apply the relevance test

Include secondary context only when all of the following are true:

- It concerns the same entity, market, or causal event.
- Its period and scope are compatible with the central finding.
- It fills a defined evidence role.
- It materially changes or clarifies interpretation.
- It has a traceable source.
- It does not require changing the chart's central editorial sentence.

Reject context that is merely adjacent, interesting, or visually convenient.

A useful removal test is: if deleting the fact does not weaken the title, subtitle, explanation, or interpretation, the fact is probably noise.

## 7. Select the recipe after enrichment

Recipe selection follows evidence extraction, not the abbreviated input note.

Examples:

- A note containing two profit values may become a richer earnings story when the source also provides revenue, operating drivers, and a resulting dividend decision.
- A shortage note may become a coverage-rate headline when supply and demand periods can be normalized safely.
- A profit-to-loss reversal may remain a simple two-value diverging comparison when the sign change is the complete finding.
- A story with unlike units may use one primary visual plus `supportingFacts` rather than forcing every measure onto one chart.

Do not default to bars because the input contains numbers. Do not select a more complex recipe solely to make the output look more interesting.

## Completion check

Before authoring the `ChartSpec`, confirm:

- The linked source matches the story.
- The full source has been read.
- All directly relevant evidence has been extracted.
- Derived values are traceable and period-compatible.
- Any external research fills a named evidence gap.
- Every selected fact supports magnitude, comparison, mechanism, or consequence.
- The central finding remains singular and clear.
- The selected recipe reflects the enriched evidence rather than the abbreviated input note.
