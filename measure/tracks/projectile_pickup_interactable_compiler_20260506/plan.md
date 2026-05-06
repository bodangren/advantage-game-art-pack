# Implementation Plan: Projectile, Pickup, and Interactable Compiler

## Phase 1: Family Registration
- [x] Task: Register new families in canon.py
  - [x] Write tests for family name validation
  - [x] Add projectile, pickup, interactable, book to FAMILY_NAMES
  - [x] Define default palettes and size constraints per family

## Phase 2: Projectile Compiler
- [x] Task: Build directional projectile renderer
  - [x] Write tests for 8-way frame generation
  - [x] Render base projectile at 0°, rotate for other directions
  - [x] Output strip or grid based on spec

## Phase 3: Pickup & Interactable Compiler
- [x] Task: Build pickup renderer
  - [x] Write tests for pickup rendering
  - [x] Single image with optional glow pass
  - [x] Support herb, mineral, potion variants
- [x] Task: Fix effect_sheet registration
  - [x] Verify effect_sheet is in canon.py FAMILY_NAMES
  - [x] Add missing tests if needed

## Phase 4: Verification
- [ ] Task: Compile sample assets
  - [ ] Generate projectile-fireball.png
  - [ ] Generate herb.png and potion.png
  - [ ] Manual visual inspection
