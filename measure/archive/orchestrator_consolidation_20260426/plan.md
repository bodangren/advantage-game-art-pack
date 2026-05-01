# Orchestrator Consolidation — Implementation Plan

## Phase 1: Analysis [x]
- [x] Map state machine logic in BatchRunner
- [x] Map state machine logic in BatchOrchestrator
- [x] Identify shared and unique functionality
- [x] Design unified state machine

**Findings:**
- Both classes share identical job states: PENDING → PLANNING → COMPILING → CANDIDATE_LOOP → CRITIC_SCORING → REVIEW_ROUTING → COMPLETED/FAILED
- BatchRunner: simple per-asset transitions, no retries, no actual compile/candidate execution
- BatchOrchestrator: retry logic, actual compile_program + run_candidate_job calls, score-based routing
- Unified approach: extend BatchOrchestrator with BatchRunner's planner_context + _generate_programs/_write_programs

## Phase 2: Implementation [x]
- [x] Extend BatchOrchestrator with planner_context from BatchRunner
- [x] Add _generate_programs and _write_programs to BatchOrchestrator (from BatchRunner)
- [x] Merge review routing logic (orchestrator is more complete)
- [x] Add create_batch_job to batch_orchestrator.py (migrated from batch_runner.py)
- [x] Update batch_runner.py to import from batch_orchestrator
- [x] Update imports and references
- [x] Add _utc_now to batch_orchestrator for consistent timestamping
- [x] Fix _run_compiling to handle both PENDING and PLANNED asset states

## Phase 3: Validation [x]
- [x] Run all batch-related tests (38 tests passing)
- [x] Verify batch generation works end-to-end
- [x] Remove deprecated BatchRunner class (kept for backward compatibility)
- [x] Deprecate BatchRunner with warning, delegate to BatchOrchestrator

**Summary:**
- Consolidated duplicate state machine logic into BatchOrchestrator
- batch_runner.py now imports create_batch_job from batch_orchestrator and delegates BatchRunner to BatchOrchestrator
- All existing batch functionality preserved
- All 38 batch-related tests pass
