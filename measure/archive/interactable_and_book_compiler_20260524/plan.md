# Plan: Interactable and Book Compiler Families

## Phase 1: Dataclass & Schema Design (TDD)
- [ ] Write tests for `InteractableProgram` and `BookProgram` dataclass construction and defaults
- [ ] Define `InteractableProgram` dataclass with fields: family, program_id, program_version, style_pack, primitive_ids, variant_controls, layout, render_spec, palette
- [ ] Define `BookProgram` dataclass with fields: family, program_id, program_version, style_pack, primitive_ids, variant_controls, layout, render_spec, palette, states (list of state names)
- [ ] Add layout modes: `INTERACTABLE_LAYOUT_MODE = "interactable_single"`, `BOOK_LAYOUT_MODE = "book_multistate"`
- [ ] Verify dataclass tests pass

## Phase 2: JSON Loaders (TDD)
- [ ] Write tests for `_load_interactable_program` validation (missing keys, wrong types, unknown layout mode)
- [ ] Write tests for `_load_book_program` validation (missing keys, wrong types, missing states field)
- [ ] Implement `_load_interactable_program` with exact key validation
- [ ] Implement `_load_book_program` with exact key validation and `states` string list parsing
- [ ] Verify loader tests pass

## Phase 3: Compilation Functions (TDD)
- [ ] Write tests for `_compile_interactable` output (manifest structure, PNG dimensions, file existence)
- [ ] Write tests for `_compile_book` output (manifest structure, PNG dimensions, state frames, file existence)
- [ ] Implement `_compile_interactable` using existing renderer with `interactable_single` layout (single 64x64 frame)
- [ ] Implement `_compile_book` using existing renderer with `book_multistate` layout (multistate strip: closed, open, glowing)
- [ ] Wire both families into `compile_program` dispatcher
- [ ] Verify compiler tests pass

## Phase 4: Example Programs (TDD)
- [ ] Write tests that load and validate example programs from disk
- [ ] Create `programs/interactable/chest_wooden.json` with primitives `["chest_wooden_01"]`
- [ ] Create `programs/book/spell_tome.json` with primitives `["book_core_01"]` and states `["closed", "open", "glowing"]`
- [ ] Ensure example programs compile end-to-end via `compile_program`
- [ ] Verify example program tests pass

## Phase 5: Canon & Registry Integration (TDD)
- [ ] Write tests verifying `FAMILY_NAMES` and `SUPPORTED_COMPILER_FAMILIES` are consistent
- [ ] Update `canon.py` if any registry gaps exist
- [ ] Update `corpus_manifest.json` taxonomy if validation tests require it
- [ ] Update `reference_loader.py` `_family_to_layout_type` if mapping is incomplete
- [ ] Verify canon validation tests pass

## Phase 6: Integration & Verification
- [ ] Run full test suite: `python3 -m unittest discover -s tests -v`
- [ ] Smoke test: `python3 -m asf compile --program programs/interactable/chest_wooden.json --output outputs/interactable_test/`
- [ ] Smoke test: `python3 -m asf compile --program programs/book/spell_tome.json --output outputs/book_test/`
- [ ] Update tracks.md and commit
