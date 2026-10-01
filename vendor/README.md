# Vendored browser dependencies

These third-party files are inlined into every generated chart HTML by
`renderer/render.js`, so each chart is a single self-contained file that renders
offline. `manifest.json` lists every file with its SHA-256; the unit tests fail
if a file is missing or altered.

| Dependency | Version | Source | Licence |
|---|---|---|---|
| amCharts 5 core (`index.js`, `xy.js`, `percent.js`, `themes/Animated.js`) | 5.20.3 | `https://cdn.amcharts.com/lib/version/5.20.3/` | amCharts 5 free licence; amCharts branding stays visible in charts |
| amCharts 5 Russia geodata (`russiaLow.js`) | fetched 2026-10-01 | `https://cdn.amcharts.com/lib/5/geodata/russiaLow.js` | amCharts 5 geodata licence |
| Mukta webfont, weights 400–700, Latin and Latin Extended subsets | Google Fonts v17, fetched 2026-10-01 | `https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700` | SIL Open Font License 1.1 (`fonts/mukta/OFL.txt`) |

Files are kept byte-identical to upstream. The one runtime adjustment amCharts
needs when inlined (its chunk base path is derived from the script URL, which an
inline script lacks) is applied as an exact-match patch at render time in
`renderer/render.js`, and fails loudly if a future release changes that code.

## Updating

1. Download the new files to the same paths (for Mukta, rebuild `mukta.css` from
   the Google Fonts CSS for the Latin and Latin Extended blocks, pointing `url()`
   at the local `.woff2` names).
2. Update `manifest.json` checksums and versions, and the table above.
3. For an amCharts version change, update the version folder and confirm the
   inline patch in `renderer/render.js` still matches.
4. Run `npm test` and `npm run test:browser`.
