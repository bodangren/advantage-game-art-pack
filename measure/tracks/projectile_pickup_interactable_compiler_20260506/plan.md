# Implementation Plan: Projectile, Pickup, and Interactable Compiler

## Phase 1: Family Registration
- [ ] Task: Register new families in canon.py
  - [ ] Write tests for family name validation
  - [ ] Add projectile, pickup, interactable, book to FAMILY_NAMES
  - [ ] Define default palettes and size constraints per family

## Phase 2: Projectile Compiler
- [ ] Task: Build directional projectile renderer
  - [ ] Write tests for 8-way frame generation
  - [ ] Render base projectile at 0°, rotate for other directions
  - [ ] Output strip or grid based on spec

## Phase 3: Pickup & Interactable Compiler
- [ ] Task: Build pickup renderer
  - [ ] Write tests for pickup rendering
  - [ ] Single image with optional glow pass
  - [ ] Support herb, mineral, potion variants
- [ ] Task: Fix effect_sheet registration
  - [ ] Verify effect_sheet is in canon.py FAMILY_NAMES
  - [ ] Add missing tests if needed

## Phase 4: Verification
- [ ] Task: Compile sample assets
  - [ ] Generate projectile-fireball.png
  - [ ] Generate herb.png and potion.png
  - [ ] Manual visual inspection
