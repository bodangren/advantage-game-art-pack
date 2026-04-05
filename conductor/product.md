# Product Definition

## Initial Concept

Autonomous Sprite Factory is a procedural asset compiler for grid-aligned,
production-ready 2D sprite sheets. The system uses structured specifications as
the primary creative artifact and renders deterministic sprite output from those
specifications without human cleanup.

## Objectives

- Generate aligned 64x64 multi-frame sprite sheets from strict JSON specs.
- Reuse style packs across multiple games while preserving visual consistency.
- Support players, NPCs, enemies, and effects in the same rendering pipeline.
- Scale batch generation with deterministic outputs and automatic validation.

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

### Batch enemy generation

Given a prompt like "generate 50 swamp enemies in chibi style", the product
must translate that request into schema-compliant specifications and export
ready-to-use sprite sheets plus metadata.

### NPC variation generation

Given a thematic request like "village NPCs: poor, ragged, fearful", the
product must generate varied but style-consistent sprite sets through reusable
parts and palette changes.

### Effect overlay generation

Given requests like "poison aura" or "ice pulse", the product must generate
effects that can be exported as standalone sheets or layered onto entities.

## Functional Pillars

- Strict spec generation and validation.
- Deterministic procedural rendering.
- Style packs with palette, animation, and part constraints.
- Automated quality checks and regeneration hooks.
- PNG + JSON export contracts for engine integration.

## Non-Goals

- Photorealistic rendering.
- Freeform text-to-image diffusion workflows.
- Manual art cleanup pipelines.
- Illustration-level uniqueness over consistency and scale.
