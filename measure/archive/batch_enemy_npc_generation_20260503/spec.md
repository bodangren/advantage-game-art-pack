# Spec: Batch Enemy & NPC Generation Pipeline

## Problem

The product vision defines two core workflows — "generate 50 swamp enemies in chibi style" and "village NPCs: poor, ragged, fearful" — but no dedicated pipeline exists for batch-generating entity families with thematic variation. The batch orchestrator handles state machines but lacks a high-level CLI for prompt-driven entity generation.

## Goals

- Accept natural-language prompts (theme, style, count) and produce schema-compliant entity specifications
- Generate varied but style-consistent sprite sets through palette swaps and part library reuse
- Export ready-to-use sprite sheets plus metadata per entity
- Support both enemy and NPC archetypes through the same pipeline

## Non-Goals

- Freeform text-to-image generation
- Real-time interactive generation (batch only)
- Custom part library creation (existing primitives)

## Acceptance Criteria

- [ ] CLI command `asf batch-generate --prompt "50 swamp enemies in chibi style" --output-dir outputs/swamp/` produces 50 entity specs
- [ ] Each generated entity has a valid JSON spec conforming to the entity schema
- [ ] Palette variations are applied per-entity using style pack palette limits
- [ ] NPC variation prompt produces entities with thematic palette/part differences
- [ ] Generated sprite sheets compile successfully through the existing compiler pipeline
- [ ] Unit tests cover prompt parsing, spec generation, and variation logic
