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
  "version": "1.1",
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
  `representationAudit`, and at least one `input` evidence item with role
  `primary`.
- `omitted` requires a specific `reason`.
- `merged` requires `mergedInto` naming another candidate ID.

An omitted story cannot disappear silently. A merged story cannot point to a
subject that is absent from the input.

## Representation audit

Every selected story must record the representation chosen before recipe
selection:

- `selectedMode`: `level`, `absolute-change`, `relative-change`, `rate`,
  `share`, or `index`.
- `levelAvailability`: `reported`, `retrievable`, `unavailable`,
  `incomparable`, or `not-applicable`.
- `rationale`: a concise explanation of why that representation is the least
  normalized form that preserves the story.

When actual levels are `reported` or `retrievable`, `relative-change` and
`index` are rejected as primary geometry. Use the actual values and retain the
percentage or indexed change as secondary context. A synthetic `0%` before
point or index-100 baseline is not a substitute for researching the level.

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
- Selected ChartSpecs do not repeat the same input anchor, publication and
  reporting period, recipe, and category or time-label sequence. When they do,
  consolidate the secondary measure or mark its ledger candidate `merged`.

`npm run run:finalize -- <run-id>` performs this validation automatically before
removing transient run files.
