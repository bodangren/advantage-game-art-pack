# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or
> below 50 lines.

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-04-05 | sprite_compiler_mvp_20260405 | Initial renderer uses procedural shapes instead of a reusable external part library. | Medium | Open | Acceptable for MVP because it proves deterministic sheet export and validation first. |
| 2026-04-05 | candidate_generation_critic_loop_20260405 | The repo has no original candidate-generation loop yet; the MVP renderer cannot score or reject near-copy outputs before review. | High | Open | Replanned into a dedicated generation-plus-critic track before further family expansion. |
