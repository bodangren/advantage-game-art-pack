# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or
> below 50 lines.

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-04-05 | sprite_compiler_mvp_20260405 | Initial renderer uses procedural shapes instead of a reusable external part library. | Medium | Open | Acceptable for MVP because it proves deterministic sheet export and validation first. |
| 2026-04-05 | candidate_generation_critic_loop_20260405 | The candidate loop exists, but the current renderer still trips the palette-limit structural check and usually regenerates instead of selecting a survivor. | High | Open | Renderer-side palette refinement remains open if we want selected candidates to pass the current thresholds. |
| 2026-04-05 | primitive_library_promotion_pipeline_20260405 | Seed library still lacks finer-grained primitives such as robe hems, hats, shelf modules, tile edges, rune decals, and contact-shadow slices. | Medium | Open | Added the first approved family seeds, but later compiler tracks still need a richer reusable part inventory. |
