# Track: End-to-End LLM-to-Asset Pipeline

## Overview
Wire the prompt-to-asset-program planner, compiler, critic loop, and review queue into a single `asf generate` command that accepts a natural-language brief and emits approved assets into the release manifest.

## Goals
- `asf generate --brief "ruins courtyard scene with cracked pillars"` runs the full pipeline in one invocation
- Planner provider receives real credentials and makes actual LLM API calls
- Generated programs flow directly into BatchOrchestrator without manual file staging
- Candidate loop runs automatically; survivors are scored by the calibrated critic
- Approved assets are exported to the release bundle with real compiled PNGs

## Acceptance Criteria
- [ ] `asf generate` CLI subcommand exists and accepts `--brief`, `--theme`, and `--count` flags
- [ ] OpenAI and Anthropic providers work with real API keys (no mocks in production path)
- [ ] Planner output is validated against the program schema before compilation
- [ ] BatchOrchestrator accepts an in-memory plan (no intermediate JSON file required)
- [ ] End-to-end test runs the full pipeline with a minimal brief and asserts non-empty release bundle
- [ ] Failure at any stage surfaces clear CLI error messages and partial artifacts for debugging

## Non-Goals
- Interactive chat interface
- Multi-turn planner refinement beyond the existing repair loop
- Deployment automation or CI/CD integration
