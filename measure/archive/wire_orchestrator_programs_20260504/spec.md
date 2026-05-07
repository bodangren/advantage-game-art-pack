# Spec: Wire Orchestrator Programs

## Problem

`_generate_programs` and `_write_programs` methods in `BatchOrchestrator` are defined but never called. The orchestrator skips the planning stage entirely — it transitions directly from `PLANNING` to `COMPILING` without generating program files, relying on fallback programs to be found at runtime.

## Solution

Wire `_generate_programs` and `_write_programs` into the `_run_planning` stage so that:
1. Programs are generated from the job's counts (per-family per-index)
2. Program JSON files are written to `jobs/{job_id}/programs/{family}/{index}/program.json`
3. `_run_compiling` then uses these generated programs (not fallbacks) when they exist

## Acceptance Criteria

- [ ] `_run_planning` calls `_generate_programs` and `_write_programs`
- [ ] Program files are written to `asset_program_path` location
- [ ] `_run_compiling` uses generated programs when available (no fallback needed for generated assets)
- [ ] Fallback programs only used when job has no counts (backward compatibility)
- [ ] Tests pass