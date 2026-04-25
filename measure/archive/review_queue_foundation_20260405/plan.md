# Implementation Plan

## Phase 1: Tech stack and persistence

- [x] Task: Update the tech-stack proposal and define the review data model
  - [x] Document the chosen implementation stack before coding (recommended: FastAPI + SQLite + server-rendered HTML)
  - [x] Define tables or models for candidates, files, decisions, and review notes
  - [x] Define how primitive-promotion and variant-request intents are stored
- [x] Task: Write tests for review persistence and queue filtering
  - [x] Cover primitive and compiled-asset candidate creation
  - [x] Cover filtering by type, family, status, theme, and confidence
  - [x] Cover audit-history persistence after multiple decisions
- [x] Task: Implement the database schema, repositories, and seed fixtures
  - [x] Add migrations or schema bootstrap code
  - [x] Add repository helpers for queue reads and decision writes
  - [x] Seed the database with representative primitive and compiled-asset fixtures, including critic summaries and variant lineage

## Phase 2: API and pages

- [x] Task: Write tests for the review API endpoints
  - [x] Cover queue-list responses and detail responses
  - [x] Cover approve, reject, request-variant, and promote-primitive actions
  - [x] Cover invalid candidate IDs and invalid status transitions
- [x] Task: Implement the review API for queue, detail, and decision actions
  - [x] Add endpoints for queue listing and candidate detail
  - [x] Add endpoints for approve, reject, request-variant, and mark-as-gold actions
  - [x] Return structured audit history with each detail response
- [x] Task: Write tests for queue-page and asset-detail rendering
  - [x] Cover queue filters and empty states
  - [x] Cover primitive detail pages and compiled-asset detail pages
  - [x] Cover rendering of source program JSON, critic summaries, and nearest-reference evidence
- [x] Task: Implement the server-rendered review UI with filters and decision forms
  - [x] Build queue pages optimized for image scanning
  - [x] Build detail pages that show image, provenance, candidate lineage, source program, critic summary, and decision history
  - [x] Add forms or actions for the required review operations

## Phase 3: Integrations and reviewer workflow

- [x] Task: Implement primitive-promotion and variant-request actions in the UI
  - [x] Link primitive promotion to the future promotion pipeline instead of duplicating logic
  - [x] Store variant-request reasons so the candidate loop or planner can consume them later
  - [x] Distinguish `approved`, `rejected`, `needs_variant`, and `promoted` states cleanly
- [x] Task: Run verification and document the reviewer workflow
  - [x] Run persistence, API, and UI tests
  - [x] Verify the seeded fixtures cover both primitive and compiled-asset review paths
  - [x] Write a reviewer runbook that explains exactly when to approve, reject, request a variant, or promote
