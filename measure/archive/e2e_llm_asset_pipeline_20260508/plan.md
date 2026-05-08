# Implementation Plan: End-to-End LLM-to-Asset Pipeline

## Phase 1: CLI Skeleton and Integration Tests
- [x] Task: Scaffold `asf generate` CLI subcommand
  - [x] Write integration test that invokes `asf generate --brief "test"` and asserts command exists
  - [x] Add `generate` subparser with `--brief`, `--theme`, `--count`, `--provider`, `--dry-run` flags
  - [x] Implement no-op command that prints planned pipeline stages

## Phase 2: Provider Credential Wiring
- [x] Task: Load real API credentials for LLM providers
  - [x] Write tests for credential resolution order (env var → config file → CLI arg)
  - [x] Add `ASF_PROVIDER_API_KEY` and `ASF_PROVIDER_NAME` env var support
  - [x] Implement `~/.config/asf/credentials.json` loader with validation
  - [x] Update OpenAIProvider and AnthropicProvider to raise clear errors when credentials are missing

## Phase 3: In-Memory Plan-to-Orchestrator Bridge
- [x] Task: Feed planner output directly into BatchOrchestrator
  - [x] Write test for `BatchOrchestrator.run_from_plan(plan: Plan)` entry point
  - [x] Add `run_from_plan` method that skips JSON file staging
  - [x] Validate plan.programs against canon schema before compilation
  - [x] Ensure state machine persists progress under `.asf/batch/{batch_id}/`

## Phase 4: End-to-End Pipeline Integration
- [x] Task: Wire planner → compiler → critic → review → export
  - [x] Write end-to-end test with mocked provider (deterministic program fixture)
  - [x] Connect `_run_planning` → `_run_compiling` → `_run_candidate_loop` → `_run_critic_scoring` → `_run_review_routing` → `_run_export`
  - [x] Ensure each stage reads previous stage artifacts from shared batch workspace
  - [x] Add `--dry-run` flag that validates full pipeline without API calls

## Phase 5: Real LLM Smoke Test and Error Handling
- [x] Task: Validate with live LLM calls and harden error surfacing
  - [x] Write smoke test gated behind `LIVE_LLM=1` that runs with real credentials
  - [x] Capture and surface structured errors for planner parse failures, compiler crashes, and critic threshold violations
  - [x] Implement `--resume` flag that reads batch state and continues from last completed stage
  - [x] Manual verification: run `asf generate --brief "library room with bookshelves"` and inspect release bundle
