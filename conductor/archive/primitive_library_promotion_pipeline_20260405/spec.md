# Specification

## Overview

Build the reusable primitive library that future compilers will assemble into
finished assets. A primitive is any approved reusable art unit such as a hat,
robe hem, slime eye cluster, book stack, floor tile, rune decal, shelf module,
contact shadow, glow burst, or layout motif.

This track must also deliver the promotion pipeline that moves reviewed output
fragments into the approved primitive library with provenance intact.

## Dependencies

- Recommended prior track: `style_canon_annotation_system_20260405`
- Open tech debt reference: the current renderer still uses procedural shapes
  instead of reusable external parts

## Functional Requirements

### FR1: Primitive Metadata Schema

- Define a strict metadata schema for primitives.
- Metadata must include:
  - `primitive_id`
  - family and subtype
  - source asset and source region
  - anchors and attachment points
  - compatible palettes or palette families
  - compatible themes
  - tags and motifs
  - approval state
  - provenance and promotion timestamp

### FR2: Primitive Library Layout

- Create a stable on-disk library structure grouped by family.
- The layout must support at minimum:
  - character body parts
  - props
  - FX elements
  - tile modules
  - background-scene motifs

### FR3: Import and Promotion Workflow

- Implement a deterministic workflow to import candidate primitives from:
  - cropped demo assets
  - reviewed generated outputs
  - manually supplied source files
- Promotion must fail if required metadata or anchors are missing.

### FR4: Registry and Query APIs

- Provide query helpers so later tracks can request primitives by:
  - family
  - subtype
  - tag
  - theme compatibility
  - approval state
- Queries must be deterministic and stable under repeated runs.

### FR5: Provenance and Auditability

- Every primitive must preserve provenance.
- Later review pages must be able to answer:
  - where did this primitive come from
  - who approved it
  - which source asset or generated candidate produced it
  - which variant lineage or critic summary was attached when a generated
    candidate was promoted

## Non-Functional Requirements

- The library must be inspectable with plain files in git.
- The schema must support future non-image companion files such as masks or
  anchor overlays.
- Promotions must be idempotent when rerun on the same source and metadata.

## Deliverables

- `library/primitives/...`
- `library/primitive_manifest.json`
- Validation and query modules
- CLI commands for import, promotion, and registry rebuild
- Seeded primitives extracted from the approved demo corpus
- Tests for validation, promotion, and query behavior

## Acceptance Criteria

- A seed set of approved primitives exists for each current asset family.
- Importing a primitive without required metadata fails with a clear error.
- Rebuilding the primitive manifest from disk produces deterministic output.
- Query helpers can retrieve primitives by family and tag.
- Promotion preserves source file, source region, approval metadata, and
  candidate critic provenance when applicable.

## Out of Scope

- LLM planning
- Batch generation
- Review UI implementation
- Final critic thresholds
