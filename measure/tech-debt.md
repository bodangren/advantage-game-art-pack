# Tech Debt Registry

> The former Python/raster project was retired on 2026-07-16. Historical debt
> remains in archived Measure tracks; this registry tracks only the TS7 product.

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-07-16 | composable_svg_assets_20260716 | Vinext development currently uses the Pages Router. | Low | Open | Keep the first release focused on deterministic SVG composition and Phaser load-time textures; revisit the router choice when vinext stabilizes. |
| 2026-07-16 | animation_timeline_atlas_packing_20260716 | Animation timelines and atlas packing deferred from the pivot release. | Medium | Resolved | Delivered by the animation/atlas track: `npm test -- -t "atlas|timeline|examples"` exits 0 (41/41 matched tests green, no matched skips) alongside `npm run typecheck` and `npm run build`. |
| 2026-07-16 | composable_svg_assets_20260716 | Dependency pins keep Vite/Rolldown on a known-good TS7/Linux combination. | Low | Open | Revisit after the TS7 and vinext release lines stabilize; validate native bindings on macOS and Windows before broadening support. |
