# Track: Projectile, Pickup, and Interactable Compiler Family

## Overview
Create a dedicated compiler family for directional projectiles and single-image pickups/interactables that advantage-games needs.

## Goals
- Add projectile-fireball, projectile-boss, herb, mineral, potion, book families
- Register effect_sheet in canon.py FAMILY_NAMES
- Compile directional projectiles with rotation frames

## Acceptance Criteria
- [ ] New FAMILY_NAMES registered for projectile, pickup, interactable
- [ ] Projectile compiler generates directional frames (8-way or 4-way)
- [ ] Pickup compiler generates single-image with optional glow/aura
- [ ] effect_sheet properly registered in canon.py
- [ ] All families covered by unit tests

## Non-Goals
- Particle effect animation
- Physics simulation
