# Tech Debt Registry

> The former Python/raster project was retired on 2026-07-16. Historical debt
> remains in archived Measure tracks; this registry tracks only the TS7 product.

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-07-16 | composable_svg_assets_20260716 | Vinext development currently uses the Pages Router and defers animation timelines and atlas packing. | Medium | Open | Keep the first release focused on deterministic SVG composition and Phaser load-time textures. |
| 2026-07-16 | composable_svg_assets_20260716 | Dependency pins keep Vite/Rolldown on a known-good TS7/Linux combination. | Low | Open | Revisit after the TS7 and vinext release lines stabilize; validate native bindings on macOS and Windows before broadening support. |
