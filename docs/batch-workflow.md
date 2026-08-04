# Weekly batch workflow

This is the primary end-to-end workflow for producing a weekly chart presentation.

## Input

The user provides one editorial source file at the project root:

```text
input.txt
```

`input.txt` may contain multiple data stories, notes, links, and partially summarized evidence. It is an assignment queue, not a complete or fully verified dataset.

## Agent responsibility

The LLM agent is the batch orchestrator. It owns the sequence across source research, chart production, image capture, and presentation assembly.

The deterministic chart engine is one tool used by the agent. It does not parse the entire weekly assignment or build the PowerPoint deck by itself.

## Required sequence

```text
input.txt
    |
    v
parse distinct data stories
    |
    v
verify and enrich each story from its sources
    |
    v
decide whether each story needs a chart and select the appropriate workflow and recipe
    |
    v
author and validate one ChartSpec per selected story
    |
    v
render and diagnose the chart HTML
    |
    v
capture one final PNG image per accepted chart
    |
    v
assemble the accepted images into a PowerPoint presentation
    |
    v
save the complete weekly delivery in charts/YYYY-week-WW/
```

## 1. Parse the assignment

Read all of `input.txt` and separate it into distinct data stories.

For each candidate, identify:

- Working subject and central claim
- Supplied source links
- Reporting period
- Values already present in the note
- Whether the story duplicates or overlaps another item
- Whether the story is sufficiently material and visual to include

Do not assume every paragraph requires a chart. Merge duplicate notes when they describe the same finding. Exclude items that cannot be verified or do not support a clear data-led story.

## 2. Verify and enrich each story

Follow `docs/source-enrichment.md` before selecting a chart recipe.

The agent must verify the source, read the full primary source, extract relevant evidence, calculate safe derivations, and fill only named material evidence gaps. It must not add unrelated context merely to make the chart more complex.

## 3. Select the production tool

For each accepted story, decide whether the output should use:

- The standard chart workflow
- The regional chart workflow
- A non-chart visual or textual slide treatment when the evidence is not suited to a chart
- No slide, when the story is weak, duplicative, unverifiable, or irrelevant

When a chart is appropriate, use the public Tool API:

```bash
node tool-api/chart.js orient
node tool-api/chart.js guide
node tool-api/chart.js regional-guide russia
```

Select the workflow and recipe from the enriched evidence, not directly from the abbreviated input note.

Route geography before selecting the visual form. Do not infer
`standard-chart` from a story being a status list, ranking, or comparison. Use
`regional-breakdown` whenever administrative locations are part of the finding
and spatial distribution, concentration, adjacency, regional contrast, or
location-specific callouts affect interpretation. Use `standard-chart` only
when place names are labels or categories and a map adds no explanatory value.

Before writing specifications, create a routing matrix for every accepted story
with these columns:

```text
story | geographic evidence | does where change the finding? | workflow | rationale
```

For a story containing geographic names, a `standard-chart` rationale must
explicitly explain why geography is not explanatory. Do not let missing
coordinates, a preselected recipe, or an existing draft spec decide the route.
For regional candidates, use `regional-guide` and `regions` to obtain stable
region IDs before authoring the ChartSpec. Do not proceed to rendering until
each accepted story has exactly one recorded workflow decision.

## 4. Produce each chart

For every accepted chart story:

1. Write a semantic `ChartSpec` to `specs/YYYY-week-WW/[slug].json`.
2. Validate the specification.
3. Render it through the selected standard or regional workflow.
4. Run the required diagnostics.
5. Perform semantic chart QA on the rendered output.
6. Correct semantic problems or report infrastructure defects.
7. Capture a final PNG only after the chart passes its required checks.

Schema validation and responsive diagnostics are necessary but not sufficient.
Semantic QA must confirm that the visual grammar matches the evidence, that
reported and derived values are distinguishable, that qualifiers and bounds
are preserved, and that a reader can state the intended takeaway without
mentally reconstructing the chart.

All standard charts must retain the shared large, centered watermark treatment
through PNG capture and PowerPoint assembly. Do not vary it by recipe or move it
to a small corner mark to make room for chart content. The regional workflow is
the sole exception: its watermark is a restrained background behind the map.
Check this visually at the delivery viewport and in the final slide render.

For `flow.waterfall`, use the recipe only for a source-supported start-to-end
bridge with same-scope, same-period values and arithmetic reconciliation. Do
not turn `more than`, `about`, or incomplete charges into an exact inferred
opening value. If the bridge is uncertain or not mutually exclusive, use a
simpler comparison or headline with supporting facts instead. A waterfall that
passes validation but is visually ambiguous fails semantic QA.

The Tool API also requires every waterfall item to declare
`valueStatus: "reported"`, `period`, and `scope`. It rejects missing, derived,
bounded, approximate, mixed-period, mixed-scope, or non-reconciling steps. In
particular, an operating-profit figure is not a pre-charge net-result figure,
and a prior-period expense cannot be used as a current-period change.

Use the weekly delivery path for the final image:

```bash
node tool-api/chart.js review charts/YYYY-week-WW/[slug].html \
  --screenshot --output charts/YYYY-week-WW/[slug].png
```

The HTML and PNG are generated artifacts. Do not edit them directly.

## 5. Build the presentation

After all accepted charts have final PNG images, assemble them into one PowerPoint presentation.

The presentation should:

- Use the accepted story order or a clearer editorial order derived from the assignment.
- Preserve one central finding per slide.
- Use the final generated chart image rather than recreating the chart manually in PowerPoint.
- Keep titles, available source attribution, dates, and explanatory text consistent with the corresponding ChartSpec.
- Omit the source line when no attribution is supplied.
- Never mention `input.txt`, internal provenance, verification status, workflow decisions, diagnostics, or production notes on presentation slides.
- Exclude failed, unresolved, duplicate, or low-value stories.

PowerPoint assembly belongs to the LLM orchestration layer. It is not an implementation responsibility of the chart renderer.

## 6. Weekly delivery folder

The canonical delivery folder is:

```text
charts/YYYY-week-WW/
```

Use the ISO year and zero-padded ISO week already used by the chart renderer.

The completed folder should contain:

```text
charts/YYYY-week-WW/
├── [slug-1].html
├── [slug-1].png
├── [slug-2].html
├── [slug-2].png
└── tochnyi-charts-YYYY-week-WW.pptx
```

The exact number of chart files depends on the number of accepted stories.

`previews/` may still be used for temporary or ad hoc visual review. Final PNGs used in the deck belong in the weekly `charts/YYYY-week-WW/` delivery folder beside the HTML files and PowerPoint presentation.

## Completion condition

The weekly job is complete only when:

- `input.txt` has been fully parsed.
- Each included story has verified sources and a clear central finding.
- Each chart has a validated ChartSpec.
- Each rendered chart passes the applicable diagnostics.
- Each accepted chart has a final PNG.
- The PowerPoint deck has been assembled from those final images.
- The HTML files, final PNGs, and `.pptx` file are present in `charts/YYYY-week-WW/`.
- Remaining omissions, warnings, source mismatches, or infrastructure defects are reported.
