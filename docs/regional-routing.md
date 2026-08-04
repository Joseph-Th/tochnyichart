# Regional routing and layout

Regional layout is renderer-owned. A ChartSpec supplies semantic facts and
stable region IDs; the shared map runtime resolves projection, framing, card
placement, and leaders at render time.

Agents should read this document to understand diagnostic output and safe
semantic overrides, not to copy geometry into a spec.

## Renderer-owned policy

The regional policy is centralized in `lib/tochnyi-maps.js`:

- `map.regional` defaults to the `russia` region set.
- Port routing is selected automatically at eight or more active callouts.
- Dense layout begins at nine callouts.
- Standard and dense layouts use different card widths, gaps, attachment insets,
  port spacing, minimum card stubs, and obstacle clearances.
- Automatic callout distribution uses geographic packing when a summary is
  present and balanced packing when a dense map has no useful summary.
- The default anchor style is no centroid dot; the filled region is already the
  geographic mark.
- Regional maps are north-up and use a deterministic static projection.

The policy is intentionally not part of ChartSpec. This keeps the authoring
surface small and lets renderer fixes improve existing specs consistently.

## Routing modes

The semantic `map.leaderRouting` field accepts these values:

| Mode | Use |
| --- | --- |
| `auto` | Choose direct, lane, or port routing from callout count and spacing. |
| `direct` | Sparse callouts with readable independent leaders. |
| `lanes` | Orthogonal leaders with separated vertical corridors. |
| `ports` | Dense maps with ordered card-edge attachments and crossing-aware side assignment. |
| `indexed` | Explicit legacy/local marker routing; use only for a verified special case. |

In automatic mode, sparse maps use direct or lane routing. Dense maps use port
routing, enumerate balanced side assignments, and score the candidates before
committing to card placement. Fixed `data[].calloutSide` values remain fixed;
automatic entries can move to the side that produces a clearer result.

Port leaders use a smooth curve from the geographic anchor to a dedicated
card-edge port, followed by a visible horizontal terminal stub. The planner
preserves geographic order within each card column, separates ports, and scores
crossings, attachment sharpness, route length, and side displacement. It uses
the actual region shape as a collision obstacle after a projected-bounds
prefilter.

If a route intersects an active region, the runtime first tries bounded
in-envelope corridors. It only expands outside the endpoint vertical envelope
when no collision-free route exists inside it. Detours may use bounded grid
search, then simplify and smooth the resulting path. A source-exit segment is
kept only when removing it would cause a collision.

## Map framing

Framing has independent semantic controls:

- `map.viewport`: `auto`, `all`, or `data`.
- `map.viewportAlignment`: `auto`, `data`, or `context`.
- `map.contextFit`: `auto`, `all`, or `focus`.
- `map.landmass`: `auto`, `all`, or `continental`.
- `map.excludeRegions`: explicit irrelevant region IDs.

The projection fits complete GeoJSON features with explicit padding. The
runtime does not solve layout by clipping a region at the canvas edge. A broad
story normally keeps national context; a narrow story can use a local focus.
Continental mode selects the largest connected landmass from the included
features. Automatic mode restores an active detached region when a context
choice would otherwise hide it.

Use these fields only when the semantic story requires a different context.
Do not use them to compensate for callout geometry or to force a screenshot to
look acceptable.

## Summary and information economy

`primaryMetric` and `supportingFacts` form an optional summary panel. Automatic
summary logic hides a dense panel when it only repeats region counts, statuses,
or labels already visible in the map and cards. It keeps summaries that add a
different unit or material context. `map.summaryDisplay` can explicitly be
`show` or `hide` when the editorial decision is intentional.

When a dense summary is hidden, automatic callout distribution can spread cards
through the available height instead of leaving an unused lower corner. Use
`map.calloutDistribution = "geographic"` for point-aligned packing or
`"balanced"` for space-filling packing.

## Diagnostic contract

The regional command runs the same workflow viewports every time:

```json
[
  { "width": 1450, "height": 679 },
  { "width": 768, "height": 900 },
  { "width": 480, "height": 900 }
]
```

Each diagnostic run reports the resolved `data-map-*` attributes. The workflow
normalizes them to fields such as:

| Field | Meaning |
| --- | --- |
| `routing` | Resolved direct, lanes, ports, or indexed routing. |
| `placement` | Resolved geographic or crossing-optimized placement. |
| `predictedCrossings` | Crossings predicted by the planner before browser rendering. |
| `renderedCrossings` | Crossings measured after SVG leader rendering. |
| `finalCollisions` | Final leader/shape or card collision count. |
| `fallbackRoutes` | Routes that needed the fallback path strategy. |
| `sourceExitRoutes` | Routes that retained a source-exit detour. |
| `strictEnvelopeRoutes` | Routes solved within the endpoint vertical envelope. |
| `expandedEnvelopeRoutes` | Routes that needed an expanded envelope. |

Expected delivery state is `diagnostics.status = "pass"`, zero error-level
diagnostics, and zero final collisions or fallback routes unless a reviewed
special case is documented. Warnings are signals for editorial review; they are
not permission to edit generated HTML.

## Performance guidance

The dense planner evaluates a bounded set of balanced assignments. Its hot path
is intentionally deterministic so tests can compare both behavior and runtime.
Keep performance healthy by:

- Keeping callout count within the semantic limit of twelve items.
- Keeping callout copy concise so card heights do not inflate the search space.
- Reusing the centralized policy instead of adding recipe-specific branches.
- Measuring planner changes with `npm run test:performance`.
- Adding a focused fixture when a routing fix changes a crossing, collision, or
  fallback outcome.

The performance test warms the planner, measures repeated dense runs, confirms
candidate evaluation occurred, and enforces the repository budget. It is a
regression guard, not a substitute for browser comparison.
