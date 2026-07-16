# Product Definition

## Product Direction

Sprite Foundry is an LLM-friendly factory for composable SVG assets.
The primary creative artifacts are small, human-readable SVG parts and strict
JSON composition specs. The system validates both, assembles parts in a stable
layer order, and emits deterministic SVG plus machine-readable metadata.

SVG is intentionally the source format: an LLM can author a new part as text,
parts can be reused across many assets, and the same composition can be
displayed at different sizes without producing a second source asset.

## Objectives

- Let an LLM author or select reusable SVG parts through a constrained contract.
- Compose parts with named anchors, stable layer ordering, and palette slots.
- Preserve a stable viewBox while supporting variable output dimensions.
- Keep every generated asset deterministic, inspectable, and easy to review.

The first product surface is a vinext assembly desk rather than a Python CLI.
The compiler remains a typed TypeScript module so the same contract powers the
editor preview, exports, tests, and later game integrations.

## Core User Segments

- Solo developers and small studios building 2D games.
- Automated game content pipelines that need reproducible assets.
- Engineers and technical artists extending style packs and part libraries.

## Downstream Consumer Series

The immediate downstream target is the `advantage-games` mini-game series. That
series does not need only one kind of art asset. It needs coordinated packs of:

- directional character sheets
- enemy, boss, NPC, and rescue sheets
- props, FX, projectiles, and interactables
- tiles and room modules
- full background scenes
- parallax layer sets
- UI/support atlases
- loading and cover surfaces

This product should therefore be planned around per-game asset bundles, not only
individual sprite outputs.

## Core Workflows

### Part authoring

An author or LLM writes a small SVG part, declares its anchors and palette
variables, and validates it before it enters the reusable library.

### Character composition

A strict JSON spec selects a body, clothing, hair, and equipment parts, then
attaches them to named anchors and exports one deterministic SVG composition.

### Size variants

The same source composition can be emitted with its original viewBox, a 64px
preview, or a larger display size without changing the part files.

## Functional Pillars

- Strict SVG-part and composition-spec validation.
- Deterministic XML composition and stable serialization.
- Machine-readable catalogs for LLM context and tooling.
- Named anchors, transforms, layer priorities, and palette variables.
- SVG + JSON export contracts for downstream integration.
- A fast browser desk for inspecting and changing a composition without a
  separate authoring tool.

## Non-Goals

- Python runtime code or Python-based asset tooling.
- Raster PNG generation as the source-of-truth workflow.
- Freeform text-to-image diffusion workflows.
- Unrestricted SVG features such as scripts, external images, or remote URLs.
- Animation timelines and sprite-sheet packing in the first SVG phase.
