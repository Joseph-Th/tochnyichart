# Chart-author workflow

This document defines the public Tool API contract for agents producing charts. It does not describe infrastructure maintenance.

A chart-author agent should treat the deterministic engine as a tool. It supplies source fidelity, calculations, editorial meaning, and a semantic `ChartSpec`. It does not inspect rendering machinery.

## Weekly batch workflow

The normal assignment is one user-supplied `input.txt` containing multiple data
stories. The LLM agent owns the complete batch orchestration:

```text
input.txt
    -> parse distinct stories
    -> verify and enrich sources
    -> decide the appropriate production tool for each story
    -> create and render accepted charts
    -> capture final PNG images
    -> assemble one PowerPoint presentation
    -> save all final artifacts in charts/YYYY-week-WW/
```

The Tool API described below handles individual chart production. It does not
parse the complete weekly assignment or assemble the PowerPoint deck. Those are
agent responsibilities.

The full batch contract is in [`docs/batch-workflow.md`](batch-workflow.md).

## 1. Enter through the Tool API

```bash
node tool-api/chart.js api
node tool-api/chart.js orient
```

`api` describes the public surface and role boundary. `orient` describes the two available workflows. Select the workflow only after the source has been verified and the evidence has been extracted.

### Geography-first routing preflight

Route by the explanatory role of geography, not by the visible chart form. Use
`regional-breakdown` when administrative locations are part of the evidence and
where something happens changes the interpretation through spatial distribution,
concentration, adjacency, regional contrast, or location-specific callouts.
This includes stories that otherwise look like status lists, rankings, or
comparisons. Use `standard-chart` only when place names are labels or categories
and a map would add no explanatory value.

Before writing any ChartSpec for a batch, create a routing matrix for every
accepted story:

| Story | Geographic evidence | Does where change the finding? | Workflow | Rationale |
| --- | --- | --- | --- | --- |
| ... | regions, sites, or none | yes / no | regional-breakdown / standard-chart | one sentence |

Do not choose `standard-chart` merely because the data is a status list or
because the source does not provide coordinates. Stable region IDs are enough
for the regional workflow; the renderer supplies the map geometry and callout
routing. For every story containing geographic names, a `standard-chart`
decision must state why geography is not explanatory. Do not write or render
specifications until each story has exactly one workflow decision.

| Question | Route |
| --- | --- |
| Does the explanation depend on where administrative regions are located? | `regional-breakdown` |
| Does each highlighted region need a callout attached to the map? | `regional-breakdown` |
| Is geography only a label, rank, status, or comparison category? | `standard-chart` |
| Is the story a number, change, trend, composition, flow, or causal chain? | `standard-chart` |

Do not combine both routes in one chart.

## 2. Public authoring surface

A chart-author agent may use:

```text
input.txt
tool-api/
docs/batch-workflow.md
docs/agent-workflows.md
docs/source-enrichment.md
schemas/chart-spec.schema.json
recipes/catalog.json
specs/examples/
specs/YYYY-week-WW/
charts/
previews/
```

During normal chart production, do not inspect or modify:

```text
renderer/
lib/
tests/
tools/
```

Generated HTML and PNG files are disposable outputs and must not be edited.

Presentation copy must stay editorial. Use source attribution when available and omit it when unavailable. Never expose `input.txt`, internal provenance, verification labels, diagnostics, or workflow commentary in a chart or slide.

## 3. Source enrichment before recipe selection

An input note, headline, excerpt, or `input.txt` entry is a routing aid, not the complete dataset for a chart.

Before selecting a recipe:

1. Verify that every supplied URL matches the entity, event, period, and finding in the input note.
2. Read the full primary source.
3. Extract the main result, comparator, components, cause, consequence, forecast, scale, denominator, and underlying dataset when they are relevant to the same claim.
4. Calculate only safe derivations that are directly supported by the sourced values, such as an absolute change, percentage-point change, ratio, share, coverage rate, implied shortfall, or combined amount.
5. Identify whether a material evidence gap remains.
6. Search beyond the source only to fill that named gap.
7. Select one central finding, its evidence spine, the workflow, and the recipe.

Use this research order:

```text
full linked source
-> underlying official dataset, company filing, or named report
-> sources directly linked or cited by the article
-> another article from the same publisher about the same event
-> broader high-quality external research
```

Do not search for additional data merely to make a chart more complex. Additional context must concern the same entity, market, or causal event; use a compatible period and scope; fill a defined evidence role; materially clarify interpretation; and have a traceable source.

The evidence spine has one central finding and may use supporting facts for magnitude, comparison, mechanism, or consequence. Not every chart needs all four roles. A simple two-value chart is correct when the contrast itself is the complete story.

The complete policy is in [`docs/source-enrichment.md`](source-enrichment.md).

## 4. Shared stages

Every route follows the same semantic stages:

1. Verify the source and read it in full.
2. Extract the relevant evidence and safe derivations.
3. Fill only material evidence gaps with conditional research.
4. Choose one central finding, the workflow, and the story recipe.
5. Write the smallest ChartSpec that expresses the enriched evidence spine.
6. Validate the JSON.
7. Render through the selected workflow.
8. Correct semantic errors and rerun the checks.
9. For a weekly batch, capture the final PNG into `charts/YYYY-week-WW/` after
   diagnostics pass. Use `previews/` only for temporary or ad hoc review.

Write new specifications to:

```text
specs/YYYY-week-WW/[slug].json
```

The chart author owns source fidelity, calculations, copy, statuses, region IDs, and recipe choice. The engine owns HTML, CSS, chart-library configuration, geometry, typography, colors, responsive layout, map projection, callout placement, and leader routing.

### Semantic chart QA

Schema validation, shell review, and responsive diagnostics establish that a
chart can render; they do not establish that the chart is editorially correct
or intelligible. After rendering, inspect the chart at the delivery viewport
and state the intended reader takeaway in one sentence. Accept the chart only
if a reader can recover that takeaway without mentally reconstructing the
argument.

Check that:

- The visual grammar matches the evidence and the selected recipe.
- Every displayed value is reported or transparently derived from compatible,
  same-scope inputs.
- Qualifiers such as `more than`, `about`, and ranges remain visible; a bound is
  not presented as an exact value.
- The title, labels, annotations, and axis describe what the marks actually
  encode.
- A simpler recipe would not communicate the finding more honestly.

For `flow.waterfall`, require a real source-supported start-to-end bridge. The
start, each change, and the ending value must share scope and period, reconcile
arithmetically, and be visually readable as cumulative steps. Do not infer an
exact opening value from charges described as `more than`, `about`, or otherwise
incomplete. If the bridge is inferred or not mutually exclusive, mark it as a
bound and prefer `comparison.change`, `headline.metric`, or a chart with
supporting facts. A structurally valid waterfall that requires mental
reconstruction fails semantic QA and must be revised or rejected.

The machine contract is strict: every waterfall item must include
`valueStatus: "reported"`, `period`, and `scope`; all three fields must agree
across the bridge. The validator rejects missing or non-reported values,
approximation language, mixed periods or scopes, and arithmetic mismatches. Do
not treat operating profit as a pre-charge net result or move a prior-period
expense into the current-period bridge.

### Branding and watermark QA

Every standard chart uses the shared watermark in its large, centered treatment:
it is centered inside the chart container, remains large enough to survive PNG
and slide export, and uses the shared standard opacity. Do not select a small or
corner watermark because a recipe contains labels, cards, or a dense layout;
solve those layout problems with the recipe's spacing, chart height, and label
placement. The only intentional exception is `map.regional`, whose watermark is
repositioned as a restrained background behind the geography. Inspect the
watermark at the delivery viewport and at the responsive diagnostic widths; it
must be loaded, visible, and not reduced to a corner icon.

## 5. Standard chart workflow

Start with:

```bash
node tool-api/chart.js guide
```

The guide returns recipe selection rules and a validated example path for each recipe. Use it after source enrichment, not directly from an abbreviated input note.

| Finding shape | Recipe |
| --- | --- |
| One decisive number | `headline.metric` |
| Two values showing change | `comparison.change` |
| Actual, expected, prior, target, or alternatives | `comparison.scenarios` |
| Directional changes around zero | `comparison.diverging` |
| Min-max interval, limit, or threshold | `comparison.range` |
| Ordered time points | `trend.line` |
| Exact parts of one total | `composition.stacked` |
| Multi-part composition where shape matters | `composition.donut` |
| Starting value, additions or losses, ending value | `flow.waterfall` |
| Ranked categories with long labels | `ranking.horizontal` |
| Categorical conditions by place or operation | `status.grid` |
| Trigger, transmission, consequence | `story.sequence` |

Composable semantic features include:

- `references` for targets, averages, legal limits, or benchmarks.
- `data[].annotation` for a concise explanation tied to a point.
- `measure.scale = "logarithmic"` for positive values spanning orders of magnitude.
- `supportingFacts` for context in a different unit.

Run:

```bash
node tool-api/chart.js validate <spec.json>
node tool-api/chart.js render <spec.json> [output.html]
node tool-api/chart.js diagnose <output.html>
```

Inspect the rendered chart for semantic QA before delivery. Use the review
command to capture the inspected artifact:

```bash
node tool-api/chart.js review <output.html> \
  --screenshot --output <preview.png>
```

If the standard render command identifies a regional specification, stop and use the regional workflow. Do not remove `map.regional` merely to pass the command.

## 6. Regional breakdown workflow

Start with:

```bash
node tool-api/chart.js regional-guide russia
node tool-api/chart.js regions russia
```

A minimal regional specification contains:

- `recipe: "map.regional"`
- `title`, `date`, `source`, `data`, and `metadata.slug`
- `map.regionSet`
- `label` and `regionId` or `regionIds` for every item
- At least one of `status`, `displayValue`, `detail`, or `value` for every item

For a status map, `status`, `displayValue`, and `detail` are the clearest combination. Supported statuses are `stable`, `improving`, `strained`, `critical`, `blocked`, and `unknown`.

Keep the map object minimal. Do not author coordinates, card positions, route points, manual lanes, SVG paths, HTML, CSS, JavaScript, or chart-library configuration.

Use a semantic override only when the story requires it:

- `map.viewport`
- `map.contextFit`
- `map.landmass`
- `map.excludeRegions`
- `data[].calloutSide`

Run:

```bash
node tool-api/chart.js validate <spec.json>
node tool-api/chart.js regional <spec.json> [output.html]
```

The regional command performs validation, rendering, shell review, and responsive diagnostics. Use `--no-diagnose` only when a browser is unavailable.

## 7. Failure boundary

| Failure | Chart-author response |
| --- | --- |
| Unknown or invalid field | Remove it or use the documented semantic field. |
| Incorrect data count or number | Correct the source-derived data. Do not invent padding values. |
| Supplied link does not match the input note | Do not combine them. Resolve or report the source mismatch. |
| Source has only a simple comparison | Keep the chart simple unless a material evidence gap justifies targeted research. |
| Additional context is merely adjacent or interesting | Exclude it. Context must strengthen magnitude, comparison, mechanism, or consequence. |
| Copy-length warning | Shorten the title, label, display value, or detail. |
| Regional ID error | Run `regions` and use a stable identifier. |
| Wrong workflow | Use the route returned by the Tool API. |
| Valid specification still has rendering, layout, routing, or diagnostic defects | Report an infrastructure issue with the command output and artifact path. Do not inspect implementation directories. |
| Browser unavailable | Use `--no-diagnose` only as a temporary fallback and report that browser verification remains outstanding. |

## 8. Delivery contract

For an individual chart, report:

- Selected workflow and recipe.
- ChartSpec path.
- Generated HTML path.
- Optional PNG path.
- Validation and diagnostic status.
- Remaining warnings or infrastructure defects.

Do not include generated implementation code in the response.

For a completed weekly batch, the agent must also:

- Capture one final PNG for every accepted chart.
- Assemble the accepted images into one PowerPoint presentation.
- Save the rendered HTML files, final PNGs, and
  `tochnyi-charts-YYYY-week-WW.pptx` in `charts/YYYY-week-WW/`.
- Report omitted, duplicate, unverifiable, or failed stories.

`previews/` is for temporary or ad hoc review. Final images used in the deck
belong in the weekly `charts/YYYY-week-WW/` folder.

Infrastructure architecture and maintenance are documented separately in `docs/architecture.md` and `docs/maintainer-workflows.md`.
