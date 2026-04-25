# Specification

## Overview

Build the first executable slice of Autonomous Sprite Factory: a deterministic
Python renderer that accepts strict JSON entity specifications, renders a 3x3
64x64 sprite sheet, exports metadata, and validates structural constraints
without human intervention.

## Functional Requirements

### FR1: Strict Spec Contract

- Load entity specs from JSON.
- Validate required fields and reject malformed payloads with actionable errors.
- Support exactly one initial style pack: `cute_chibi_v1`.

### FR2: Deterministic Rendering

- Render nine frames in a fixed 3x3 sheet.
- Keep frame size at 64x64 with pivot `[32, 56]`.
- Ensure identical spec input produces identical image bytes.

### FR3: Baseline Animation States

- Export frame mappings for `idle`, `walk`, and `action`.
- Apply bounded per-frame offsets to create visible state variation while
  respecting style-pack motion limits.

### FR4: Validation and Export

- Validate sheet dimensions, pivot consistency, and palette limits.
- Export `sheet.png` and `metadata.json` to an output directory.

## Non-Functional Requirements

- Remain runnable on a local Python 3.12 environment with Pillow installed.
- Keep the implementation modular enough to add style packs and parts later.
- Keep all public modules documented and covered by tests.

## Acceptance Criteria

- A schema-compliant sample spec renders into a 192x192 PNG sheet.
- Exported metadata maps `idle`, `walk`, and `action` to frame indices 0-8.
- Two renders from the same spec produce byte-identical PNG output.
- Invalid specs fail before rendering.
- Automated tests pass with `python3 -m unittest discover -s tests -v`.

## Out of Scope

- LLM prompt-to-spec generation.
- Batch orchestration across thousands of assets.
- Reusable external part masks for every anatomy/equipment type.
- Retry loops beyond deterministic validation failures.
