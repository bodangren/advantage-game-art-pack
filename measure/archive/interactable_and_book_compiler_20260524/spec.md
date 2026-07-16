# Spec: Interactable and Book Compiler Families

## Goal
Add compiler support for the `interactable` and `book` asset families so they can be generated from JSON programs, compiled to PNG output, and included in the batch orchestration and critic pipelines.

## Background
`interactable` and `book` are defined in `canon.py` `FAMILY_NAMES` and have layout types (`interactable_single`, `book_multistate`) in `LAYOUT_TYPES`. The `reference_loader.py` already maps these families to layout types for critic evaluation. However, `compilers.py` `SUPPORTED_COMPILER_FAMILIES` does not include either family, so no programs can be compiled for them. Downstream consumers (advantage-games series) need interactable sprites and book/item multistate sprites as part of per-game asset bundles.

## Acceptance Criteria
- [ ] `interactable` family added to `SUPPORTED_COMPILER_FAMILIES` with `InteractableProgram` dataclass
- [ ] `book` family added to `SUPPORTED_COMPILER_FAMILIES` with `BookProgram` dataclass
- [ ] `_load_interactable_program` and `_load_book_program` parsers validate JSON and return typed dataclasses
- [ ] `_compile_interactable` and `_compile_book` render PNG output using existing renderer/primitive infrastructure
- [ ] `compile_program` dispatcher routes `interactable` and `book` to the new compilers
- [ ] Example programs added: `programs/interactable/chest_wooden.json` and `programs/book/spell_tome.json`
- [ ] Unit tests cover validation, compilation, and manifest output for both families
- [ ] `canon.py` `FAMILY_NAMES` and `LAYOUT_TYPES` remain consistent (no drift)
- [ ] `corpus_manifest.json` taxonomy updated if required by validation tests

## Out of Scope
- New primitive artwork (reuse existing primitives or procedural shapes)
- Dedicated batch generation prompt templates for interactables/books
- Review app UI changes
