# Regional routing and layout

This is infrastructure-maintainer documentation. Chart-author agents should use
`node tool-api/chart.js regional-guide` and treat diagnostics as structured
pass/fail output without inspecting routing internals.

Regional layout is renderer-owned. A ChartSpec supplies semantic facts and
stable region IDs; the shared map runtime resolves projection, framing, card
placement, and leaders at render time.

## Renderer-owned policy

The regional policy is centralized in `lib/tochnyi-maps.js`:

- `map.regional` defaults to the `russia` region set.
- Port routing is opt-in only. `auto` always stays on direct editorial leaders, including dense visible-callout sets.
- Highlight count and callout count are separate. `data[].callout: "none"`
  keeps a region active on the map without creating a card or leader. Layout
  density and routing mode are based on visible callout count, not the number
  of highlighted regions.
- Callout sets use simple direct leaders by default so the connection from region to card stays visually short, smooth, and legible.
- Dense card typography still begins at nine callouts, but dense card count no longer switches the map into port routing by itself.
- If five or more geographically assigned callouts land in one column, the
  runtime compacts that column's card typography and padding before planning
  leaders. This preserves the geographic side assignment instead of solving a
  vertical packing problem by sending distant regions across the map.
- Standard and dense layouts use different card widths, gaps, attachment insets,
  port spacing, minimum card stubs, and obstacle clearances.
- Automatic callout distribution preserves the author’s data order within each side column unless `calloutOrder` is supplied. Balanced packing is an explicit exception rather than the default.
- The default anchor style is no centroid dot; the filled region is already the
  geographic mark.
- Regional maps are north-up and use a deterministic static projection.
- Russian maps use the continental mainland silhouette. Kaliningrad and island
  fragments are removed before projection and cannot be active map items.
- Summary cards are disabled; callouts are the sole evidence cards.

The policy is intentionally not part of ChartSpec. This keeps the authoring
surface small and lets renderer fixes improve existing specs consistently.

## Routing modes

The semantic `map.leaderRouting` field accepts these values:

| Mode | Use |
| --- | --- |
| `auto` | Use direct editorial leaders. Cards stay on the nearest side and preserve `calloutOrder` or data order within each column. |
| `direct` | Sparse callouts with readable independent leaders. |
| `ports` | Explicit dense-map port routing for a verified special case. Never the default. |
| `indexed` | Explicit legacy/local marker routing; use only for a verified special case. |

In automatic mode, maps use one smooth direct leader per callout. The runtime resolves each region's anchor into full stage coordinates, assigns the nearest left or right card column, and preserves explicit `data[].calloutOrder` or the ChartSpec data order inside that column. This makes the layout read like a hand-arranged annotation system instead of a crossing optimizer. Fixed `data[].calloutSide` values remain fixed.

This distinction matters because the map canvas is narrower than the full
regional stage whenever callout columns are present. Never compare a
map-canvas X coordinate directly with the full-stage midpoint; doing so biases
eastern regions toward the left column and can force the optimizer into long
cross-map leaders.

Default leaders use the shortest smooth cubic to the card edge, followed by a short horizontal terminal stub. The default router does not route around highlighted region polygons and does not try to eliminate every line crossing. Region fills are evidence, not physical barriers; efficient paths to readable boxes are more important than treating the map as an obstacle course.

Explicit `ports` mode still uses one monotonic cubic from the geographic anchor to a dedicated card-edge port, followed by a short horizontal terminal stub. It is reserved for a verified special case, not normal weekly chart production.

The naturalness contract rejects self-intersection, horizontal direction reversal, control-point backtracking, and terminal box turns. Brief close passes are allowed; sustained crowding is the failure condition used by diagnostics.

## Map framing

Russian regional maps use one framing contract: the continental mainland
silhouette is always visible. Kaliningrad and island fragments are removed from
the feature collection before projection. `RU-KGD` and `RU-SAK` are rejected as
active map items, making detached geometry impossible to reintroduce through a
ChartSpec. Use a non-map recipe for detached-region evidence.

The regional page reserves more width for the map than standard charts. It uses
a compact logo, date, title, subtitle, and watermark; narrower callout columns;
and a shorter desktop map stage. These are renderer-owned regional defaults.
Desktop callout packing also reserves a bottom gutter inside the clipped map
stage. Diagnostics fail any overlay callout that reaches the stage boundary or
the note/footer area, preventing a bottom card from being visually cut off by
copy placed below the map.

## Summary and information economy

Regional summary panels are permanently disabled. `map.summaryDisplay` is
renderer-owned as `hide`, and `map.summaryPosition` is `none`. Any essential
regional fact must live in a callout. Material non-geographic context belongs in
a separate standard chart, not in a competing blue card over the map.

Automatic callout distribution uses editorial order within side columns. The explicit
`balanced` mode remains available for a verified special case, but it should not
be used merely to fill empty space because it can create unnecessary leader
motion.

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
| `routing` | Resolved direct, ports, or indexed routing. |
| `placement` | Resolved direct-editorial or explicit crossing-optimized port placement. |
| `activeItems` | Number of regional data items highlighted on the map. |
| `calloutCount` | Number of those items that render cards and leaders. |
| `geographicSideLocks` | Number of visible callouts locked to their nearer geographic side. |
| `predictedCrossings` | Crossings predicted by the planner before browser rendering. |
| `renderedCrossings` | Crossings measured after SVG leader rendering. |
| `finalCollisions` | Final leader/shape or card collision count. |
| `fallbackRoutes` | Routes that needed the fallback path strategy. |
| `sourceExitRoutes` | Routes that retained a source-exit detour. |
| `directionReversalRoutes` | Non-source-exit routes that reverse horizontal direction. |
| `controlReversalRoutes` | Routes whose Bézier control polygon backtracks even when sampled positions appear monotonic. |
| `terminalBoxTurnRoutes` | Routes with an undersized terminal approach followed by a sharp corrective turn. |
| `strictEnvelopeRoutes` | Routes solved within the endpoint vertical envelope. |
| `expandedEnvelopeRoutes` | Routes that needed an expanded envelope. |

Expected delivery state is `diagnostics.status = "pass"`, zero error-level
diagnostics, zero final collisions, and zero direction-reversal, control-
reversal, or terminal-box-turn routes. The regional workflow fails when any of
these naturalness counters is nonzero. Warnings are signals for editorial
review; they are not permission to edit generated HTML.

## Performance guidance

The dense planner evaluates a bounded set of balanced assignments. Its hot path
is intentionally deterministic so tests can compare both behavior and runtime.
Keep performance healthy by:

- Keeping visible callout-card count within the semantic limit of twelve while
  retaining additional reported regions as fill-only highlights when useful.
- Keeping callout copy concise so card heights do not inflate the search space.
- Reusing the centralized policy instead of adding recipe-specific branches.
- Measuring planner changes with `npm run test:performance`.
- Adding a focused fixture when a routing fix changes a crossing, collision, or
  fallback outcome.

The performance test warms the planner, measures repeated dense runs, confirms
candidate evaluation occurred, and enforces the repository budget. It is a
regression guard, not a substitute for browser comparison.
