# Tech Debt Registry

> The former Python/raster project was retired on 2026-07-16. Historical debt
> remains in archived Measure tracks; this registry tracks only the TS7 product.

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-07-16 | composable_svg_assets_20260716 | Vinext development currently uses the Pages Router. | Low | Open | Keep the first release focused on deterministic SVG composition and Phaser load-time textures; revisit the router choice when vinext stabilizes. |
| 2026-07-16 | animation_timeline_atlas_packing_20260716 | Animation timelines and atlas packing deferred from the pivot release. | Medium | Resolved | Delivered by the animation/atlas track: `npm test -- -t "atlas|timeline|examples"` exits 0 (41/41 matched tests green, no matched skips) alongside `npm run typecheck` and `npm run build`. |
| 2026-07-16 | composable_svg_assets_20260716 | Dependency pins keep Vite/Rolldown on a known-good TS7/Linux combination. | Low | Open | Revisit after the TS7 and vinext release lines stabilize; validate native bindings on macOS and Windows before broadening support. |
| 2026-07-22 | fantasy_asset_forge_mcp_pack_ingestion_20260722 | The accepted Forge static interchange evidence remains placeholder-quality and cannot enter an admitted Pixel registry or a theme pack without accepted delivery-resolution review. | High | Blocked | Public-MCP replay staging, exact digest binding, and immutable pending-admission validation are green; the thin/dark E/W views remain explicit quality debt, not final art. |
| 2026-07-22 | svg_art_quality_iteration_20260717 | The repository-wide test suite has one frozen composition digest mismatch and one palette-declaration mismatch for unused `cloth-light` / `cloth-shadow` slots. | Medium | Open | These failures predate and are outside the Forge ingestion slice. The final ingestion suite passes 135/135, typecheck passes, and the production build passes; do not mask the two asset-quality failures when reporting the full suite. |
