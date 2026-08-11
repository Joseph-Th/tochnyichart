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
- Port routing is opt-in only. `auto` always uses straight region-to-card leaders, including dense visible-callout sets.
- Highlight count and callout count are separate. `data[].callout: "none"`
  keeps a region active on the map without creating a card or leader. Layout
  density and routing mode are based on visible callout count, not the number
  of highlighted regions.
- Callout sets use literal straight leaders by default so the connection from region to card is visually direct and easy to trace.
- Dense card typography still begins at nine callouts, but dense card count no longer switches the map into port routing by itself.
- If five or more geographically assigned callouts land in one column, the
  runtime compacts that column's card typography and padding before planning
  leaders. This preserves the geographic side assignment instead of solving a
  vertical packing problem by sending distant regions across the map.
- Standard and dense layouts use different card widths, gaps, attachment insets,
  port spacing, minimum card stubs, and obstacle clearances.
- Automatic callout distribution is geometry-owned. Data order and `calloutOrder` do not control card placement. The planner keeps cards on their geographically sensible side, then optimizes vertical order for zero crossings and short total travel. Legacy `balanced` input normalizes to geographic packing.
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
| `auto` | Use straight leaders. Cards stay on the geographically sensible side and are vertically reordered to minimize crossings and travel. |
| `direct` | Use the same straight-leader geometry explicitly. |
| `ports` | Explicit dense-map port routing for a verified special case. Never the default. |
| `indexed` | Explicit legacy/local marker routing; use only for a verified special case. |

In automatic mode, maps use one straight leader per callout. The runtime resolves each region's anchor into full stage coordinates, assigns the geographically sensible left or right card column, then reorders cards within each column to minimize line crossings first and total travel second. `data[]` order and legacy `data[].calloutOrder` are not routing instructions. Fixed `data[].calloutSide` values remain fixed.

This distinction matters because the map canvas is narrower than the full
regional stage whenever callout columns are present. Never compare a
map-canvas X coordinate directly with the full-stage midpoint; doing so biases
eastern regions toward the left column and can force the optimizer into long
cross-map leaders.

Default leaders are single straight segments from the region anchor to the card edge. There is no spline, fan-out curve, routing corridor, or terminal stub in automatic/direct mode. Region fills are evidence, not physical barriers, so a leader may cross map geography. It may not cross another leader. Any rendered leader crossing is a delivery failure.

Explicit `ports` mode still uses one monotonic cubic from the geographic anchor to a dedicated card-edge port, followed by a short horizontal terminal stub. It is reserved for a verified special case, not normal weekly chart production.

The naturalness contract rejects any rendered leader crossing as well as self-intersection, horizontal direction reversal, control-point backtracking, and terminal box turns. Close parallel passes may still be diagnosed for crowding, but a crossing is never an acceptable aesthetic tradeoff.

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

Automatic callout distribution uses geographic anchor order plus crossing/length
optimization within side columns. Legacy `balanced` values are accepted for old
specs but normalize to geographic packing; they no longer spread boxes merely to
fill empty space.

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
| `placement` | Resolved direct-optimized or explicit crossing-optimized port placement. |
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
diagnostics, zero rendered leader crossings, zero final collisions, and zero
direction-reversal, control-reversal, or terminal-box-turn routes. The regional
workflow fails when any of these naturalness counters is nonzero. Warnings are
signals for editorial review; they are not permission to edit generated HTML.

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
