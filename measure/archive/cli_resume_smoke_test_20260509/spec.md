# Track: CLI Resume Flag and LIVE_LLM Smoke Test

## Problem
The `asf generate` CLI has no `--resume` flag, so interrupted batch jobs must restart from scratch. Additionally, there is no automated smoke test for live LLM execution.

## Goal
Implement `--resume` for `asf generate` using existing job state persistence, and add a LIVE_LLM smoke test that validates end-to-end execution with real API keys.

## Acceptance Criteria
- [ ] `asf generate --resume {job_id}` continues a previously interrupted job
- [ ] Resume skips already-completed assets and continues pending ones
- [ ] LIVE_LLM smoke test runs with `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- [ ] Smoke test validates planner → compiler → candidate loop with real API
- [ ] All existing tests pass
- [ ] Build passes
