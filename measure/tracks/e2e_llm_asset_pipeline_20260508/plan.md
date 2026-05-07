# Implementation Plan: End-to-End LLM-to-Asset Pipeline

## Phase 1: CLI Skeleton and Integration Tests
- [ ] Task: Scaffold `asf generate` CLI subcommand
  - [ ] Write integration test that invokes `asf generate --brief "test"` and asserts command exists
  - [ ] Add `generate` subparser with `--brief`, `--theme`, `--count`, `--provider`, `--dry-run` flags
  - [ ] Implement no-op command that prints planned pipeline stages

## Phase 2: Provider Credential Wiring
- [ ] Task: Load real API credentials for LLM providers
  - [ ] Write tests for credential resolution order (env var → config file → CLI arg)
  - [ ] Add `ASF_PROVIDER_API_KEY` and `ASF_PROVIDER_NAME` env var support
  - [ ] Implement `~/.config/asf/credentials.json` loader with validation
  - [ ] Update OpenAIProvider and AnthropicProvider to raise clear errors when credentials are missing

## Phase 3: In-Memory Plan-to-Orchestrator Bridge
- [ ] Task: Feed planner output directly into BatchOrchestrator
  - [ ] Write test for `BatchOrchestrator.run_from_plan(plan: Plan)` entry point
  - [ ] Add `run_from_plan` method that skips JSON file staging
  - [ ] Validate plan.programs against canon schema before compilation
  - [ ] Ensure state machine persists progress under `.asf/batch/{batch_id}/`

## Phase 4: End-to-End Pipeline Integration
- [ ] Task: Wire planner → compiler → critic → review → export
  - [ ] Write end-to-end test with mocked provider (deterministic program fixture)
  - [ ] Connect `_run_planning` → `_run_compiling` → `_run_candidate_loop` → `_run_critic_scoring` → `_run_review_routing` → `_run_export`
  - [ ] Ensure each stage reads previous stage artifacts from shared batch workspace
  - [ ] Add `--dry-run` flag that validates full pipeline without API calls

## Phase 5: Real LLM Smoke Test and Error Handling
- [ ] Task: Validate with live LLM calls and harden error surfacing
  - [ ] Write smoke test gated behind `LIVE_LLM=1` that runs with real credentials
  - [ ] Capture and surface structured errors for planner parse failures, compiler crashes, and critic threshold violations
  - [ ] Implement `--resume` flag that reads batch state and continues from last completed stage
  - [ ] Manual verification: run `asf generate --brief "library room with bookshelves"` and inspect release bundle
