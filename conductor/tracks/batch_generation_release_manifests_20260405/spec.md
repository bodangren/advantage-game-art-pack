# Specification

## Overview

Build the batch-generation and release pipeline that ties the planner,
compilers, critics, review policy, and export bundles together. This is the
track that turns the earlier subsystems into a practical asset factory for the
mini-game series.

## Dependencies

- Recommended prior track: `review_queue_foundation_20260405`
- Recommended prior track: `prompt_to_asset_program_planner_20260405`
- Recommended prior track: `critic_stack_auto_approval_20260405`
- Recommended prior track: `scene_layout_background_assembler_20260405`

## Functional Requirements

### FR1: Batch Job Schema

- Define a strict schema for batch-generation jobs.
- A job must record:
  - source brief
  - requested families and counts
  - theme pack
  - planner version
  - compiler versions
  - critic policy version
  - output root
  - retry policy

### FR2: Orchestration Pipeline

- Orchestrate the following stages in order:
  - brief intake
  - planning
  - compilation
  - criticism
  - review routing
  - final export bundling

### FR3: Retries and Resumability

- Support bounded retries for planner and compile failures.
- Support resuming an interrupted batch without regenerating already-accepted
  assets.

### FR4: Release Bundle and Audit Report

- Export a release bundle containing:
 - Export a release bundle containing:
  - approved assets
  - approved presentation surfaces when requested
  - manifests
  - provenance
  - critic outcomes
  - review decisions
- Export an audit report summarizing:
  - counts per family
  - acceptance rate
  - review-required rate
  - regeneration rate

### FR5: Seed Batch Briefs

- Add sample batch briefs for at least two mini-game themes so the system can be
  demonstrated without writing briefs from scratch every time. At least one
  seeded brief must request a full per-game pack including runtime assets and
  presentation surfaces.

## Non-Functional Requirements

- Batch state must survive process restarts.
- Release bundles must be reproducible from their manifests and version tags.
- Failures must preserve enough context for a later rerun or reviewer audit.

## Deliverables

- Batch job schema
- Batch runner and persistent job-state store
- Orchestration pipeline
- Retry and resume support
- Release bundle exporter
- Audit-report generator
- Seed batch briefs for at least two themes
- Tests for job flow, retry, resume, and bundle integrity

## Acceptance Criteria

- A seeded batch brief can run end to end and produce a release bundle.
- Interrupted batches can resume without duplicating already-approved outputs.
- The audit report lists accepted, review-required, and regenerated items.
- Release bundles include enough metadata to trace outputs back to their brief,
  planner manifest, compiler version, and critic policy version.

## Out of Scope

- Multi-machine scaling
- External deployment infrastructure
- Human review UI redesign
