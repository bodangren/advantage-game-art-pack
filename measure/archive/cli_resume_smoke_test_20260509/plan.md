# Plan: CLI Resume Flag and LIVE_LLM Smoke Test

## Phase 1: Resume CLI Flag (TDD)
- [x] Write tests for BatchOrchestrator.resume()
- [x] Add --resume argument to CLI parser
- [x] Wire resume path to load existing job state and skip completed assets
- [x] Tests pass

## Phase 2: LIVE_LLM Smoke Test
- [x] Write smoke test that requires OPENAI_API_KEY or ANTHROPIC_API_KEY
- [x] Test validates planner produces valid program JSON
- [x] Test validates compiler produces PNG output
- [x] Test skipped when no API key available
- [x] Tests pass

## Phase 3: Integration
- [x] Verify --dry-run and --resume work together correctly
- [x] Run full test suite
- [x] Update tech-debt.md to mark open items resolved
- [x] Update lessons-learned.md
- [x] Commit and push
