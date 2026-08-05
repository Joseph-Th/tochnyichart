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
- Port routing is selected automatically at eight or more active callouts.
- Dense layout begins at nine callouts.
- Standard and dense layouts use different card widths, gaps, attachment insets,
  port spacing, minimum card stubs, and obstacle clearances.
- Automatic callout distribution preserves geographic packing. Balanced packing
  is an explicit exception rather than the default.
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
| `auto` | Use direct routing for sparse maps and port routing for dense maps. |
| `direct` | Sparse callouts with readable independent leaders. |
| `lanes` | Orthogonal leaders with separated vertical corridors. |
| `ports` | Dense maps with ordered card-edge attachments and crossing-aware side assignment. |
| `indexed` | Explicit legacy/local marker routing; use only for a verified special case. |

In automatic mode, sparse maps use direct routing. Dense maps use port
routing, enumerate balanced side assignments, and score the candidates before
committing to card placement. Fixed `data[].calloutSide` values remain fixed;
automatic entries can move to the side that produces a clearer result.

Port leaders use a smooth curve from the geographic anchor to a dedicated
card-edge port, followed by a visible horizontal terminal stub. The planner
preserves geographic order within each card column, separates ports, and scores
crossings, attachment sharpness, route length, side displacement, and local
curve naturalness. Detour candidates fan away from a nearby leader before
turning, and routes with very short intermediate spline runs are penalized so a
collision-free result does not introduce a tight local S-curve. The naturalness
contract also rejects control-point backtracking and terminal box turns, where a
leader reaches the card edge and then makes a short corrective vertical turn.
When one obstacle can be cleared with one continuous fan spline, a multi-segment
corrective path is not eligible merely because it is collision-free. Region
polygons are evidence rather than physical barriers: leaders may cross
geography. Only leader-to-leader and card collisions trigger detours.

If leaders collide, the runtime first tries bounded in-envelope corridors. It
only expands outside the endpoint vertical envelope when no collision-free
route exists inside it. Detours may use bounded grid search, then simplify and
smooth the resulting path. A source-exit segment is kept only when removing it
would cause a collision.

## Map framing

Russian regional maps use one framing contract: the continental mainland
silhouette is always visible. Kaliningrad and island fragments are removed from
the feature collection before projection. `RU-KGD` and `RU-SAK` are rejected as
active map items, making detached geometry impossible to reintroduce through a
ChartSpec. Use a non-map recipe for detached-region evidence.

The regional page reserves more width for the map than standard charts. It uses
a compact logo, date, title, subtitle, and watermark; narrower callout columns;
and a shorter desktop map stage. These are renderer-owned regional defaults.

## Summary and information economy

Regional summary panels are permanently disabled. `map.summaryDisplay` is
renderer-owned as `hide`, and `map.summaryPosition` is `none`. Any essential
regional fact must live in a callout. Material non-geographic context belongs in
a separate standard chart, not in a competing blue card over the map.

Automatic callout distribution uses geographic packing. The explicit
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
| `routing` | Resolved direct, lanes, ports, or indexed routing. |
| `placement` | Resolved geographic or crossing-optimized placement. |
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

- Keeping callout count within the semantic limit of twelve items.
- Keeping callout copy concise so card heights do not inflate the search space.
- Reusing the centralized policy instead of adding recipe-specific branches.
- Measuring planner changes with `npm run test:performance`.
- Adding a focused fixture when a routing fix changes a crossing, collision, or
  fallback outcome.

The performance test warms the planner, measures repeated dense runs, confirms
candidate evaluation occurred, and enforces the repository budget. It is a
regression guard, not a substitute for browser comparison.
