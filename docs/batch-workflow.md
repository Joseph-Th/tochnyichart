# Batch workflow

This is the primary end-to-end workflow for producing a chart presentation from a batch of data stories.

## Input

The user provides one editorial source file at the project root:

```text
input.txt
```

`input.txt` may contain multiple data stories, notes, links, and partially
summarized evidence. It is an expert-authored editorial source and assignment
queue. Treat its claims and datapoints as correct by default. It may be
incomplete, so reputable external reporting may supplement it, but absence of
independent corroboration is not grounds to weaken or replace it.

## Agent responsibility

The LLM agent is the batch orchestrator. It owns the sequence across source research, chart production, image capture, and presentation assembly.

The deterministic chart engine is one tool used by the agent. It does not parse the entire batch assignment or build the PowerPoint deck by itself.

## Required sequence

```text
initialize .work/<run-id>/
    |
    v
input.txt
    |
    v
parse distinct data stories
    |
    v
preserve each expert claim and enrich it from reputable sources
    |
    v
apply the visual-evidence gate; enrich or omit prose-only and one-point stories
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
save the complete run delivery in charts/<run-id>/
    |
    v
finalize the run and purge transient material
```

## 0. Initialize isolated transient storage

Before reading the assignment, create the run workspace:

```bash
npm run run:init -- <run-id>
```

Store every non-retained artifact under `.work/<run-id>/`, including
research notes, downloaded sources, helper scripts, logs, diagnostic dumps,
review screenshots, and package staging. Do not create run-specific scripts or
data files at the repository root. Do not use `previews/` for new work.

Production input, generated ChartSpecs, chart output, previews, and workspaces
are local artifacts. Git ignores `input.txt`, `specs/runs/`, `charts/`,
`previews/`, and `.work/`. Run `npm run check:repo` before committing; it fails
if any production or transient artifact is tracked, including force-added files.

## 1. Parse the assignment

Read all of `input.txt` and separate it into distinct data stories.

For each candidate, identify:

- Working subject and central claim
- Supplied source links
- Reporting period
- Values already present in the note
- Whether the story duplicates or overlaps another item
- Whether the story is sufficiently material and visual to include

Do not assume every paragraph requires a chart. Merge duplicate notes when they
describe the same finding. Exclude items that are duplicative, immaterial, or do
not support a clear visual story. Do not omit a story merely because an external
search failed to repeat an expert-authored claim.

## 2. Verify and enrich each story

Follow `docs/source-enrichment.md` before selecting a chart recipe.

The agent must preserve the expert input claim, confirm and read supplied
sources, extract relevant evidence, calculate safe derivations, and fill useful
evidence gaps. It must not add unrelated context merely to make the chart more
complex. External sources may supplement or attribute the input, but may not
silently override it unless they directly contradict a material point.

Before accepting a chart candidate, apply the visual-evidence gate:

- A non-map chart must contain at least two quantitative marks.
- A lone value must gain a source-supported prior value, target, benchmark,
  denominator, remainder, peer, range, or time series.
- A categorical status list must be quantified on one common dimension or
  routed to `map.regional` when geography explains the finding.
- A prose wall, card grid, bullet grid, or one oversized number is not an
  acceptable chart.
- Omit a story when source enrichment cannot supply legitimate visual
  structure.

The production catalog and validator disable `status.grid` and
`headline.metric`, so these failures cannot proceed to rendering.

## 3. Select the production tool

For each accepted story, decide whether the output should use:

- The standard chart workflow
- The regional chart workflow
- A non-chart visual or textual slide treatment when the evidence is not suited to a chart
- No slide, when the story is weak, duplicative, non-visual, or irrelevant

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

1. Write a semantic `ChartSpec` to `specs/runs/<run-id>/[slug].json`.
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
source-supported comparison, range, or separate chart instead. A waterfall that
passes validation but is visually ambiguous fails semantic QA.

The Tool API also requires every waterfall item to declare
`valueStatus: "reported"`, `period`, and `scope`. It rejects missing, derived,
bounded, approximate, mixed-period, mixed-scope, or non-reconciling steps. In
particular, an operating-profit figure is not a pre-charge net-result figure,
and a prior-period expense cannot be used as a current-period change.

Use the run delivery path for the final image:

```bash
node tool-api/chart.js review charts/<run-id>/[slug].html \
  --screenshot --output charts/<run-id>/[slug].png
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

## 6. Run delivery folder

The canonical delivery folder is:

```text
charts/<run-id>/
```

Use a caller-supplied run ID. It may be a date, publication identifier, client slug, issue number, or another stable label; the workflow does not infer one from chart data.

The completed folder should contain:

```text
charts/<run-id>/
├── [slug-1].html
├── [slug-1].png
├── [slug-2].html
├── [slug-2].png
└── tochnyi-charts-<run-id>.pptx
```

The exact number of chart files depends on the number of accepted stories.

Temporary or ad hoc review output belongs in
`.work/<run-id>/review/`. Final PNGs used in the deck belong in the local
`charts/<run-id>/` delivery folder beside the HTML files and PowerPoint
presentation.

## 7. Finalize and flush

After the retained specifications and delivery folder are complete, run:

```bash
npm run run:finalize -- <run-id>
```

This deletes `.work/<run-id>/`, removes the legacy `previews/` tree, and
truncates the consumed `input.txt`. It does not delete
`specs/runs/<run-id>/` or `charts/<run-id>/`.

Use `npm run run:flush -- <run-id>` when transient files should be removed
but the input must remain. Use `npm run run:reset` before a cold-agent test to
remove every transient workspace, legacy previews, and input while retaining all
specification and chart folders.

## Completion condition

The batch run is complete only when:

- `input.txt` has been fully parsed.
- Each included story preserves the expert input claim and has a clear central finding.
- Each chart has a validated ChartSpec.
- Each rendered chart passes the applicable diagnostics.
- Each accepted chart has a final PNG.
- The PowerPoint deck has been assembled from those final images.
- The HTML files, final PNGs, and `.pptx` file are present in `charts/<run-id>/`.
- The ChartSpecs are present in `specs/runs/<run-id>/`.
- The run has been finalized, leaving no run-specific notes, scripts, logs,
  downloads, review files, package staging, or consumed input outside the
  retained `specs/` and `charts/` folders.
- Remaining omissions, direct source conflicts, source mismatches, warnings, or infrastructure defects are reported.
