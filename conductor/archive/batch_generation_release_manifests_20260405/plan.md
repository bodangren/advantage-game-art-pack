# Implementation Plan

## Phase 1: Job schema and state

- [ ] Task: Define the batch-job schema, artifact layout, and version-manifest format
  - [ ] Define the required batch-job fields and version tags
  - [ ] Define where planner manifests, candidate outputs, critic results, selected outputs, and review decisions live on disk
  - [ ] Define the release-bundle manifest format

## Phase 2: Runner and state persistence

- [ ] Task: Write tests for job planning, retry states, and resumability
  - [ ] Cover first-run planning of a new batch job
  - [ ] Cover bounded retry behavior for planner and compile failures
  - [ ] Cover resuming a partially completed batch from persisted state
- [ ] Task: Implement the batch job runner and persistent job-state storage
  - [ ] Add typed models for batch jobs and per-asset execution state
  - [ ] Persist planner outputs, candidate outputs, selected results, critic results, and review-routing decisions
  - [ ] Ensure accepted items are not regenerated on resume

## Phase 3: End-to-end orchestration

- [ ] Task: Write tests for planner-to-candidate-loop-to-review orchestration
  - [ ] Cover successful end-to-end flow for at least one asset in each major family
  - [ ] Cover planner failure, compile failure, candidate-loop failure, and review-required outcomes
  - [ ] Cover deterministic artifact paths and state transitions
- [ ] Task: Implement the orchestration pipeline with bounded retries and error capture
  - [ ] Execute planner, compiler, candidate-loop, critic-policy, and review-routing stages in sequence
  - [ ] Apply retry policy only where configured
  - [ ] Persist structured failure reasons for later inspection

## Phase 4: Bundles, seeded briefs, and runbook

- [ ] Task: Write tests for release-bundle generation and manifest integrity
  - [ ] Cover inclusion of approved assets and exclusion of rejected assets
  - [ ] Cover bundle manifests, provenance data, and critic-summary completeness
  - [ ] Cover deterministic rebuild of a bundle from the same batch state
- [ ] Task: Implement the release-bundle exporter and audit-report generator
  - [ ] Export approved assets, manifests, provenance, and decision logs into one bundle structure
  - [ ] Generate an audit report summarizing accept/review/regenerate counts
  - [ ] Include version data for planner, compiler, critic, and policy artifacts
- [ ] Task: Add seeded batch briefs for at least two mini-game themes
 - [ ] Task: Add seeded batch briefs for at least two mini-game themes
  - [ ] Create one batch brief for a library-oriented mini-game
  - [ ] Create one batch brief for a ruins- or undead-oriented mini-game
  - [ ] Ensure at least one seeded brief spans runtime asset families plus presentation surfaces
- [ ] Task: Run verification and document the operating runbook
  - [ ] Run batch runner, retry, resume, and bundle tests
  - [ ] Execute both seeded batch briefs end to end
  - [ ] Write a runbook for creating, resuming, reviewing, and exporting a batch
