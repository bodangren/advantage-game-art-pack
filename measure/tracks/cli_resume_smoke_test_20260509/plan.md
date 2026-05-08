# Plan: CLI Resume Flag and LIVE_LLM Smoke Test

## Phase 1: Resume CLI Flag (TDD)
- [ ] Write tests for BatchOrchestrator.resume()
- [ ] Add --resume argument to CLI parser
- [ ] Wire resume path to load existing job state and skip completed assets
- [ ] Tests pass

## Phase 2: LIVE_LLM Smoke Test
- [ ] Write smoke test that requires OPENAI_API_KEY or ANTHROPIC_API_KEY
- [ ] Test validates planner produces valid program JSON
- [ ] Test validates compiler produces PNG output
- [ ] Test skipped when no API key available
- [ ] Tests pass

## Phase 3: Integration
- [ ] Verify --dry-run and --resume work together correctly
- [ ] Run full test suite
- [ ] Update tech-debt.md to mark open items resolved
- [ ] Update lessons-learned.md
- [ ] Commit and push
