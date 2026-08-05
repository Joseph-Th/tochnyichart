---
name: chart
description: Produce a validated Tochnyi ChartSpec and chart artifact through the public Tool API
version: 4.5.0
triggers:
  - pattern: "chart"
  - pattern: "visualize"
  - pattern: "graph"
---

# Tochnyi Chart Author

Use the public Tool API to turn sourced evidence into a validated chart. Treat the deterministic engine as a tool, not as implementation context.

The chart author owns evidence, calculations, editorial meaning, copy, recipe choice, and semantic `ChartSpec` fields. The engine owns HTML, CSS, JavaScript, chart-library configuration, typography, color policy, layout, responsiveness, map projection, callout placement, and leader routing.

## Primary assignment

The normal assignment begins with `input.txt` at the project root. Treat the
file as a batch queue containing multiple possible data stories. The caller
supplies an opaque run ID; it may be a date, client slug, issue number, or any
other stable label. Never derive storage paths from chart dates.

The agent must:

1. Run `npm run run:init -- <run-id>`.
2. Read the complete `input.txt`.
3. Separate it into distinct stories and merge duplicates.
4. Preserve each expert claim and enrich it with reputable sources.
5. Decide which production tool and chart workflow each story requires.
6. Produce, validate, render, and diagnose each accepted chart.
7. Capture one final PNG for every accepted chart.
8. Assemble the final PNGs into one PowerPoint presentation.
9. Save local production specs in `specs/runs/<run-id>/` and delivery artifacts
   in `charts/<run-id>/`.
10. Run `npm run run:finalize -- <run-id>` after delivery.

The canonical deck filename is `tochnyi-charts-<run-id>.pptx`. Production
specifications and chart outputs are local artifacts ignored by Git. The chart
Tool API handles individual chart production; PowerPoint assembly is a separate
agent responsibility.

Use `docs/batch-workflow.md` as the complete batch orchestration contract.

## Boundary

Use only the public authoring surface during normal chart production:

```text
input.txt
tool-api/
docs/batch-workflow.md
docs/agent-workflows.md
docs/source-enrichment.md
schemas/chart-spec.schema.json
recipes/catalog.json
specs/examples/
specs/runs/<run-id>/
charts/<run-id>/
.work/<run-id>/
```

Do not inspect or modify these implementation directories unless the user explicitly requests infrastructure work:

```text
renderer/
lib/
tests/
tools/
```

Never edit generated HTML or PNG output.

If a valid ChartSpec still produces a rendering, layout, planner, or diagnostic failure, report it as an infrastructure issue with the command output and artifact path. Do not investigate the machinery under the chart-author role.

## Start

```bash
node tool-api/chart.js api
node tool-api/chart.js orient
```

Choose exactly one workflow before writing a specification.

Route by the explanatory role of geography, not by the chart type. Use
`regional-breakdown` when administrative locations are part of the evidence and
where something happens changes the finding through spatial distribution,
concentration, adjacency, regional contrast, or location-specific callouts.
This includes stories that look like status lists, rankings, or comparisons.
Use `standard-chart` only when place names are labels or categories and a map
adds no explanatory value.

Before authoring any ChartSpec, perform a geography-first routing preflight for
every accepted story:

1. Record the story, its geographic evidence, whether geography changes the
   finding, the selected workflow, and a one-sentence rationale in a routing
   matrix.
2. For every regional candidate, run `regional-guide` and `regions`, then use
   `recipe: "map.regional"`, `map.regionSet`, and stable `regionId` or
   `regionIds`.
3. If a story contains geographic names but is routed to `standard-chart`, the
   rationale must explicitly explain why location is not explanatory.
4. Do not use missing coordinates, a status-list shape, a ranking shape, or an
   existing draft spec as a reason to choose the standard workflow.
5. Do not write or render specs until every accepted story has exactly one
   recorded workflow decision.

## Shared authoring rules

- Extract exact values, categories, dates, units, ranges, benchmarks, and source.
- Treat `input.txt` as expert-authored editorial evidence. Assume its factual claims, values, comparisons, and interpretation are correct unless a reputable source directly contradicts a material point.
- Treat each entry as routing information as well as evidence; it may be incomplete, but external silence is not a contradiction.
- Confirm that each supplied URL used for supplementation matches the entity, event, period, and finding before using it.
- Read and exhaust the full primary source before selecting a recipe.
- Extract relevant comparators, components, causes, consequences, forecasts, scale, denominators, and underlying datasets when they strengthen the same central claim.
- Search beyond the primary source to fill a named material evidence gap or add useful attribution and context.
- Supplement the input; do not replace, downgrade, or label an expert claim uncorroborated merely because a second source was not found.
- Escalate only direct material contradictions from reputable sources. Preserve both positions instead of silently rewriting the report.
- Prefer an underlying official dataset, company filing, or named report before another article from the same publisher.
- Use only context that materially clarifies magnitude, comparison, mechanism, or consequence.
- Do not add facts or select a complex recipe merely to make the output more visually interesting.
- Keep a simple two-value chart when the contrast itself is the complete story.
- Do not invent missing dates, sources, values, endpoints, calculations, or regional statuses.
- Choose the story structure before chart geometry.
- Use the underlying publication or dataset as `source.name` when available; otherwise omit `source`.
- Keep the specification small and semantic.
- Keep presentation copy separate from production context: never mention `input.txt`, internal provenance, verification status, diagnostics, or workflow commentary in a chart or slide.
- Write new specifications to `specs/runs/<run-id>/[slug].json`.
- Correct semantic failures in the ChartSpec and rerun the Tool API commands.

Safe derivations include absolute change, percentage change, percentage-point change, ratio, share, coverage rate, implied shortfall, and combined amount when the inputs are sourced and period-compatible. Preserve qualifiers such as `about`, `almost`, `more than`, and ranges rather than introducing false precision.

The full source-enrichment and relevance policy is in `docs/source-enrichment.md`.

## Standard workflow

```bash
node tool-api/chart.js guide
```

The guide returns the standard recipes and a validated example path for each recipe.

Then:

1. Preserve the expert input claim, then confirm and read the full supplied source.
2. Extract the evidence spine and safe derivations.
3. Fill only material evidence gaps with targeted research.
4. Identify one central finding and select the recipe.
5. Author the ChartSpec.
6. Validate:

   ```bash
   node tool-api/chart.js validate specs/runs/<run-id>/[slug].json
   ```

7. Render:

   ```bash
   node tool-api/chart.js render specs/runs/<run-id>/[slug].json charts/<run-id>/[slug].html --run-id <run-id>
   ```

8. Diagnose:

   ```bash
   node tool-api/chart.js diagnose charts/<run-id>/[slug].html
   ```

9. Perform semantic QA on the rendered output. State the intended reader
   takeaway in one sentence and accept the chart only if a reader can recover
   it without mentally reconstructing the argument. Check that the visual
   grammar matches the evidence, derived values are transparent, qualifiers
   remain visible, and the title and labels describe the marks accurately.

10. Correct semantic errors or report an infrastructure defect. For the batch
   run, capture the final PNG into the run delivery folder:

   ```bash
     node tool-api/chart.js review charts/<run-id>/[slug].html \
     --screenshot --output charts/<run-id>/[slug].png
     ```

### Branding and watermark gate

Use the shared watermark in its large, centered mode for every standard chart.
Do not infer a small or corner watermark from the recipe, card layout, or label
density. The renderer's layout rules must absorb those constraints while the
watermark stays centered and export-legible. `map.regional` is the only
exception; its watermark is deliberately repositioned as a restrained
background behind the geography. Reject a standard chart whose watermark is
missing, unloaded, undersized, corner-positioned, or visually absent.

If the standard command identifies `map.regional`, stop and use the regional workflow.

### Waterfall-specific gate

Use `flow.waterfall` only when the source supports a real start-to-end bridge.
The start, each change, and the ending value must share scope and period and
must reconcile arithmetically. Do not infer an exact opening value from charges
described as `more than`, `about`, or otherwise incomplete. If the bridge is
inferred, not mutually exclusive, or visually ambiguous, reject the waterfall
and use `comparison.change`, `comparison.scenarios`, `comparison.range`, or a
separate chart. A valid JSON spec is not evidence that a waterfall is an
honest or intelligible visual.

The Tool API enforces this gate. Every waterfall item must declare
`valueStatus: "reported"`, the same `period`, and the same `scope`; the renderer
rejects missing, derived, bounded, approximate, or non-reconciling steps. A
reported operating profit is not a reported pre-charge net result, and a prior-
period expense is not a current-period bridge step. Never construct an opening
profit by adding incomplete charges to a loss. If those facts are the story,
use a source-supported comparison and keep genuinely secondary charges as
supporting facts.

### Visual-evidence gate

Do not create prose walls, status-card grids, bullet grids, or single-number
charts. Every non-map production chart needs at least two quantitative marks.
A lone value must gain a source-supported prior value, target, benchmark,
denominator, remainder, peer, range, or time series. Categorical evidence must
be quantified on a common dimension or routed to `map.regional` when geography
explains the finding. Omit the story when legitimate visual structure cannot be
found.

The production catalog, schema, and validator disable `status.grid` and
`headline.metric`. For `composition.stacked`, the proportional bar and direct
segment labels must carry the story; do not add `primaryMetric` or repeat
segment values in `supportingFacts`.

## Regional workflow

```bash
node tool-api/chart.js regional-guide russia
node tool-api/chart.js regions russia
```

A regional item needs:

- `label`
- `regionId` or `regionIds`
- At least one of `status`, `displayValue`, `detail`, or `value`

For a status map, use `status`, `displayValue`, and `detail`. The map normally
needs only `{ "regionSet": "russia" }`. Russian maps use the supported
continental mainland geometry; detached-region evidence must use a non-map
chart.

Do not author coordinates, card positions, route points, manual lanes, partial framing, region exclusions, SVG paths, layout configuration, HTML, CSS, JavaScript, or chart-library configuration.

Use these semantic overrides only when the story requires them:

- `data[].calloutSide`

Run:

```bash
node tool-api/chart.js validate specs/runs/<run-id>/[slug].json
node tool-api/chart.js regional specs/runs/<run-id>/[slug].json charts/<run-id>/[slug].html --run-id <run-id>
```

The regional command includes responsive diagnostics. Use `--no-diagnose` only when a browser is unavailable.

After the regional chart passes diagnostics, capture its final PNG with the same
run output convention:

```bash
node tool-api/chart.js review charts/<run-id>/[slug].html \
  --screenshot --output charts/<run-id>/[slug].png
```

## Delivery

For each chart, report the workflow, recipe, ChartSpec path, generated HTML path,
final PNG path, validation and diagnostic status, and remaining warnings or
infrastructure defects.

For the completed batch run, confirm that the HTML files, final PNGs, and
`tochnyi-charts-<run-id>.pptx` are present in `charts/<run-id>/`. Report
stories that were omitted because they were duplicate, weak, non-visual, directly conflicted, or
failed validation or diagnostics.

Use `.work/<run-id>/review/` only for temporary review. Final PNGs used in the deck belong in
the local run delivery folder. Do not include generated implementation code.

`input.txt`, production specs, chart output, previews, and `.work/` are ignored
by Git. Run `npm run check:repo` before committing; it must report no tracked
production or transient files.

The public contract is documented in `tool-api/README.md`,
`docs/batch-workflow.md`, and `docs/agent-workflows.md`.
