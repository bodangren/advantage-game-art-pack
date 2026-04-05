# Specification

## Overview

Create the formal style canon for the mini-game asset series. The goal of this
track is to convert the current `demo-assets/` corpus into machine-readable
annotations, family-specific style rules, and derived metrics that future
generators, critics, and planners can consume.

This track does not generate new gameplay assets. It defines the reference
system that all later tracks must obey.

## Dependencies

- Completed track: `sprite_compiler_mvp_20260405`
- Input corpus: every file currently present under `demo-assets/`

## Functional Requirements

### FR1: Corpus Inventory and Asset Taxonomy

- Create a canonical inventory file for `demo-assets/`.
- Classify every demo asset into one of the approved families:
 - Classify every asset into one of the approved families:
  - `character_sheet`
  - `prop_sheet`
  - `fx_sheet`
  - `tileset`
  - `background_scene`
  - `parallax_layer`
  - `ui_sheet`
  - `presentation_surface`
- Record source path, dimensions, transparency mode, and any obvious layout
  structure (for example `3x3 pose sheet`, `3x1 prop sheet`, `1024x1024 tile
  atlas`).

### FR2: Annotation Schema

- Define a strict annotation schema for the corpus.
- The schema must support:
  - palette ramps and dominant colors
  - outline thickness and continuity
  - lighting direction and highlight style
  - shadow shape and opacity treatment
  - silhouette occupancy and bounding box usage
  - material tags such as cloth, metal, wood, stone, goo, glow, parchment
  - animation tags for sheets
  - motif tags such as books, runes, shelves, necrotic glow, wizard hat
  - reserved gameplay-space tags for background scenes

### FR3: Canon Metrics Extraction

- Implement deterministic extraction of style metrics from annotated assets.
- Metrics must include at minimum:
  - color-count distribution
  - hue/value distribution
  - non-transparent occupancy ratio
  - edge density
  - contact-shadow area
  - highlight density
  - frame-to-frame drift for pose sheets
- Store the extracted metrics in a machine-readable canon file.

### FR4: Family-Specific Style Guides

- Generate human-readable guides for each asset family.
- Each guide must describe:
  - allowed and disallowed visual traits
  - typical silhouette sizes
  - common palette families
  - composition constraints
  - examples from the demo corpus

### FR5: Gold Reference Registry

- Mark a subset of annotated assets as `gold_reference` entries.
- Gold references must be discoverable by family, theme, and motif.
- Future tracks must be able to query these references by metadata alone.

## Non-Functional Requirements

- All annotation and canon data must be stored in plain text formats tracked in
  git.
- The extraction process must be deterministic and rerunnable.
- The design must support adding more demo assets later without schema changes.
- Validation errors must point to the exact annotation file and field.

## Deliverables

- `canon/corpus_manifest.json`
- `canon/annotations/*.json`
- `canon/style_canon.json`
- `canon/family_guides/*.md`
- Python modules and/or CLI commands for validation and canon generation
- Automated tests for schema validation and metric extraction

## Acceptance Criteria

- Every asset currently in `demo-assets/` has an entry in `canon/corpus_manifest.json`.
- Every asset currently in `demo-assets/` has a matching annotation file.
- Running the canon-generation command produces the same `style_canon.json` on
  repeated runs with unchanged inputs.
- Validation fails if an annotation omits a required field or uses an invalid
  family name.
- The family guides clearly distinguish character-sheet, prop/FX, tile, and
  background-scene rules as well as parallax, UI-sheet, and
  presentation-surface rules.

## Out of Scope

- New asset rendering
- Primitive extraction and promotion
- Review UI
- LLM prompt planning
- Auto-approval decisions
