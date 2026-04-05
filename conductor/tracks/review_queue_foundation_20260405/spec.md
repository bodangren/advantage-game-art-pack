# Specification

## Overview

Build the review application that surfaces both reusable primitives and finished
compiled assets for human approval. This track is the operational control plane
that keeps humans out of the loop for most work while still giving them a clean
way to approve, reject, promote, or request variants when confidence is low.

The review system must support separate queues for:

- primitive candidates
- compiled asset candidates

## Dependencies

- Recommended prior track: `style_canon_annotation_system_20260405`
- Recommended prior track: `primitive_library_promotion_pipeline_20260405`
- Recommended prior track: `asset_family_compiler_framework_20260405`

## Functional Requirements

### FR1: Review Data Model

- Persist reviewable items with enough detail to reproduce decisions.
- The data model must record:
  - candidate type (`primitive` or `compiled_asset`)
  - family
  - source brief or source manifest
  - source program
  - rendered files
  - critic scores when present
  - nearest references when present
  - current status
  - decision history

### FR2: Queue Views

- Provide queue pages that support:
  - filtering by candidate type, family, status, theme, and confidence
  - sorting by recency, confidence, and critic failure count
  - batch selection for obvious approvals or rejections

### FR3: Asset Detail View

- Provide a detail page that shows:
  - rendered image(s)
  - source spec or asset program
  - primitive list
  - critic results
  - nearest approved references
  - version/provenance information

### FR4: Review Actions

- Support the following actions:
  - approve
  - reject
  - request variant
  - promote primitive
  - mark as gold reference
- Each action must record an audit trail entry.

### FR5: Integration Hooks

- Expose integration points so future planner, critic, and batch-generation
  tracks can create reviewable candidates without bypassing the queue.

## Non-Functional Requirements

- The review app must be lightweight enough for a junior dev to run locally.
- Actions must persist in a local database instead of memory-only state.
- The UI must prioritize fast scanning of image candidates over dense chrome.

## Deliverables

- Review database schema and migrations
- Review API
- Review UI for queue and detail views
- Seed data and fixtures for primitive and compiled-asset candidates
- Tests for persistence, API behavior, and critical UI flows

## Acceptance Criteria

- A reviewer can open a queue, inspect a candidate, and approve or reject it.
- Primitive candidates and compiled-asset candidates appear in distinct queues
  or clearly distinguishable filters.
- A reviewer can request a variant and the system stores that decision.
- A reviewer can promote a primitive candidate into the primitive library flow.
- All actions persist and are visible in the candidate audit history.

## Out of Scope

- Fully automated approval
- LLM prompt planning
- Critic implementation beyond displaying already-available results
