# Week 30 Visual Audit

Scope: `charts/2026-week-30/` and `input.txt`.

## Findings

The week 30 package contains 32 charts. Its headlines are generally strong, but the visual grammar is narrow:

- 26 charts use XY column or bar geometry.
- 4 use donut charts.
- 2 use custom card layouts.
- 30 repeat a three-card supporting-fact row.
- No chart uses a line series.
- Only 2 charts use a numeric reference line.

The result is consistent, but many stories are being compressed into before-and-after bars even when their natural structure is a range, threshold, composition, bridge, regional status comparison, or causal chain.

The most important change is to choose the story structure before choosing chart geometry. A numeric source does not automatically require bars.

## Chart-by-chart recommendations

| Existing chart | Stronger visual treatment | Reason |
|---|---|---|
| `arctic-lng2-totalenergies-exit-2026.html` | `status.grid` or `composition.stacked` | The important distinction is partner status and suspended participation, not just ownership share. |
| `ozon-collateral-erosion-2026.html` | `flow.waterfall` | Show 320 billion pledged, 48 billion lost, and 272 billion remaining as a value bridge. |
| `russia-ai95-price-spike-2026.html` | `comparison.change` with annotation and reference | The two-point comparison works, but the 5% bid-step policy should be attached to the price jump. Use a line if daily prices become available. |
| `russia-armenia-dairy-ban-2026.html` | `composition.stacked` | An 80/20 exposed-versus-other split is more exact and readable than a donut. |
| `russia-central-bank-rate-july-2026.html` | `comparison.scenarios` | Previous rate, actual decision, and policy pressure are scenario values rather than a generic change. |
| `russia-coking-coal-prices-2026.html` | `comparison.range` | Domestic and export changes are reported as intervals. Showing only endpoints as independent bars loses the ranges. |
| `russia-credit-cards-june-2026.html` | `trend.line` | June 2025, May 2026, and June 2026 are ordered points showing annual growth followed by monthly decline. |
| `russia-diesel-import-subsidy-2026.html` | `comparison.scenarios` with ratio annotation | The core point is the policy asymmetry between domestic producers and importers. |
| `russia-ev-charging-surge-2026.html` | `comparison.change` | The indexed comparison is suitable. Add the H1 increase as context, not another incompatible series. |
| `russia-farm-diesel-sulfur-2026.html` | `comparison.range` with logarithmic scale | The source contains a legal or engineering limit and a 0.3% to 0.9% proposed range spanning three orders of magnitude. |
| `russia-front-fuel-rationing-2026.html` | `comparison.change` or `story.sequence` | The 20-to-15 litre comparison works, but the logistics-strike-to-rationing chain is more informative. |
| `russia-fuel-shortage-regions-july-2026.html` | `status.grid` | Regional evidence is categorical and heterogeneous. Inventing a numeric ranking would be misleading. |
| `russia-funeral-companies-h1-2026.html` | `comparison.change` with annotation | Preserve the increase, but attach the explanation that fragmentation and formalization drove registrations. |
| `russia-inflation-july-2026.html` | `comparison.scenarios` with 0.6% reference | Fuel components should be compared directly against headline inflation using a visible benchmark. |
| `russia-kamaz-h1-2026.html` | `comparison.diverging` | Revenue was nearly flat, losses improved 33.4%, and productivity rose 5.6%. Directional changes communicate the mixed result better than loss values alone. |
| `russia-minfin-floaters-q3-2026.html` | `flow.waterfall` or `comparison.scenarios` | Show the 1.5 trillion need, 1.5 trillion registered, and zero nominal gap while noting the shift to floating-rate risk. |
| `russia-moscow-coworking-vacancy-2026.html` | `story.sequence` or `comparison.diverging` | Vacancy and rent both rose, which is a market divergence rather than a simple vacancy change. |
| `russia-moscow-flight-ceiling-2026.html` | `comparison.range` | Compare the 4,900 metre ceiling with a normal cruise-altitude range instead of treating one normal altitude as exact. |
| `russia-moscow-warehouse-delays-2026.html` | `composition.stacked` | Show 2.6 million square metres delayed and 3.0 million still scheduled as parts of the 5.6 million total. |
| `russia-refinery-capacity-spimex-2026.html` | `composition.stacked` | A 40-versus-45 million ton split is an exact two-part operational composition. |
| `russia-severstal-h1-2026.html` | `comparison.diverging` | Revenue, EBITDA, and profit declines should share a zero line to reveal how much faster earnings collapsed. |
| `russia-spimex-demand-coverage-2026.html` | `composition.stacked` | Served and unmet demand are two parts of one total. A stacked composition directly shows the 18.1/81.9 split. |
| `russia-spimex-mandate-cut-2026.html` | `trend.line` or `story.sequence` | The ordered 15% to 10% to 2% policy path is the story. |
| `russia-wheat-exports-july-2026.html` | `trend.line` with average reference | Annual July exports are ordered. The five-year average should be a benchmark line rather than an extra bar. |
| `vtb-ecommerce-exposure-2026.html` | `flow.waterfall` | Show 500 billion direct Wildberries exposure plus 320 billion Ozon collateral, with a 1 trillion reference. |
| `vtb-share-issue-gap-2026.html` | `comparison.change` with target reference | The 87 ruble planned issue price is a benchmark and 57 rubles is the current state. |
| `wildberries-capacity-lost-2026.html` | `composition.stacked` | Lost and remaining capacity are exact parts of the 5.2 million square metre network. |
| `wildberries-debt-exposure-2026.html` | `composition.stacked` | Show 500 billion owed to VTB and 800 billion owed elsewhere as the 1.3 trillion total. |
| `wildberries-rebuild-cost-2026.html` | `flow.waterfall` | Construction plus equipment and automation produce a minimum total rebuild requirement. |
| `wildberries-seller-commissions-2026.html` | `composition.stacked` | Show the portion retained by the seller versus the platform commission, then annotate forced discounts separately. |
| `wildberries-seller-repayments-2026.html` | `comparison.range` | Normalize repayments to percentages and show best observed repayment versus a typical range. |
| `wildberries-service-disruption-2026.html` | `status.grid` | Belarus, Crimea, southern Russia, and the northwest experienced different categorical failure modes. |

## Cross-story opportunity from `input.txt`

The Wildberries material is a system story that the individual charts fragment:

1. Warehouses and logistics capacity are damaged.
2. Regional service degrades or disappears.
3. Sellers cannot recover inventory or cash.
4. Pick-up points and workers lose revenue and employment.
5. Debt and state-bank exposure become more consequential.

This should be published as one `story.sequence` overview, supported by separate quantitative charts for capacity, repayments, reconstruction cost, and debt. The sequence provides the big picture while the focused charts provide evidence.

The fuel material has a similar hierarchy:

1. Refinery and logistics disruption limits supply.
2. Exchange volumes cover only a fraction of solvent demand.
3. Prices and subsidies distort allocation.
4. Regional shortages affect public services and military logistics.
5. Policy responses reduce open-market access and lower fuel-quality standards.

A status overview plus two or three focused quantitative visuals would be more informative than many isolated two-bar cards.

## Tool changes implemented

The chart system now supports:

- `comparison.diverging` for mixed directional changes.
- `comparison.range` for exact values, intervals, thresholds, and logarithmic scales.
- `composition.stacked` for exact part-to-whole splits.
- `flow.waterfall` for value bridges and cost build-ups.
- `status.grid` for regional or operational conditions.
- `story.sequence` for causal and operational chains.
- Numeric `references` for averages, targets, limits, and prior norms.
- Per-item `annotation` fields.
- `measure.scale: "logarithmic"` for positive values spanning orders of magnitude.
- `data.low`, `data.high`, `data.status`, `data.detail`, and waterfall `data.role` fields.
- A compact `node tools/chart.js guide` command for recipe selection.

Validated week 30 examples are available under `specs/examples/` and rendered under `charts/v2-examples/` with corresponding PNGs in `previews/`.
