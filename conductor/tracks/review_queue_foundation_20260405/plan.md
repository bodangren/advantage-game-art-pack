# Implementation Plan

## Phase 1: Tech stack and persistence

- [ ] Task: Update the tech-stack proposal and define the review data model
  - [ ] Document the chosen implementation stack before coding (recommended: FastAPI + SQLite + server-rendered HTML)
  - [ ] Define tables or models for candidates, files, decisions, and review notes
  - [ ] Define how primitive-promotion and variant-request intents are stored
- [ ] Task: Write tests for review persistence and queue filtering
  - [ ] Cover primitive and compiled-asset candidate creation
  - [ ] Cover filtering by type, family, status, theme, and confidence
  - [ ] Cover audit-history persistence after multiple decisions
- [ ] Task: Implement the database schema, repositories, and seed fixtures
  - [ ] Add migrations or schema bootstrap code
  - [ ] Add repository helpers for queue reads and decision writes
  - [ ] Seed the database with representative primitive and compiled-asset fixtures, including critic summaries and variant lineage

## Phase 2: API and pages

- [ ] Task: Write tests for the review API endpoints
  - [ ] Cover queue-list responses and detail responses
  - [ ] Cover approve, reject, request-variant, and promote-primitive actions
  - [ ] Cover invalid candidate IDs and invalid status transitions
- [ ] Task: Implement the review API for queue, detail, and decision actions
  - [ ] Add endpoints for queue listing and candidate detail
  - [ ] Add endpoints for approve, reject, request-variant, and mark-as-gold actions
  - [ ] Return structured audit history with each detail response
- [ ] Task: Write tests for queue-page and asset-detail rendering
  - [ ] Cover queue filters and empty states
  - [ ] Cover primitive detail pages and compiled-asset detail pages
  - [ ] Cover rendering of source program JSON, critic summaries, and nearest-reference evidence
- [ ] Task: Implement the server-rendered review UI with filters and decision forms
  - [ ] Build queue pages optimized for image scanning
  - [ ] Build detail pages that show image, provenance, candidate lineage, source program, critic summary, and decision history
  - [ ] Add forms or actions for the required review operations

## Phase 3: Integrations and reviewer workflow

- [ ] Task: Implement primitive-promotion and variant-request actions in the UI
  - [ ] Link primitive promotion to the future promotion pipeline instead of duplicating logic
  - [ ] Store variant-request reasons so the candidate loop or planner can consume them later
  - [ ] Distinguish `approved`, `rejected`, `needs_variant`, and `promoted` states cleanly
- [ ] Task: Run verification and document the reviewer workflow
  - [ ] Run persistence, API, and UI tests
  - [ ] Verify the seeded fixtures cover both primitive and compiled-asset review paths
  - [ ] Write a reviewer runbook that explains exactly when to approve, reject, request a variant, or promote
