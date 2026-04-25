# Game Asset Demand

## Source Audit

This document summarizes the current downstream asset demand observed in
`/home/daniel-bo/Desktop/advantage-games` by reviewing:

- `measure/tracks.md`
- `public/games/**`
- game modules under `src/app/[locale]/(student)/student/games/**`
- component implementations under `src/components/games/**`

The goal is to ground the sprite-factory roadmap in the actual mini-game series
instead of a generic fantasy-asset assumption.

## Key Finding

The target system does not need to produce only sprite sheets.

It must support three classes of outputs:

1. Runtime gameplay assets used directly by games
2. Presentation surfaces such as covers and loading screens
3. Migration-ready asset packs for games that currently still render mostly with
   shapes and would benefit from later reskins

## Runtime Gameplay Asset Families

### 1. Directional and stateful pose sheets

Observed examples:

- `player_3x3_pose_sheet.png`
- `zombie_3x3_pose_sheet.png`
- `goblin_3x3_pose_sheet.png`
- `dragon_3x4_pose_sheet.png`
- `boss-3x3-sheet-facing-up.png`
- `player-3x3-sheet-facing-down.png`
- `player-3x3-sheet-facing-camera.png`

Requirements implied by the downstream games:

- support multiple grid layouts, not just `3x3`
- support directional variants such as `facing_down`, `facing_up`,
  `facing_camera`
- support row semantics beyond simple animation states, such as attack, defeat,
  correct/incorrect, or pose banks

### 2. NPC, rescue, and boss families

Observed examples:

- `prisoner-sheet.png`
- `dragon-army-3x3-sheet-facing-up.png`
- `troll_3x3_pose_sheet.png`
- `enemy_spectre_pose_sheet_3x3.png`

Implication:

- the primitive library and planner cannot assume only one player and one enemy
  archetype
- the system needs support for companion units, rescue targets, bosses, and
  variants of the same species

### 3. Props, pickups, interactables, and FX

Observed examples:

- `book_3x1_sheet.png`
- `orb_3x3_pose_sheet.png`
- `gates-3x3-sheet-facing-up.png`
- `castles_3x2_sheet.png`
- `rune_base_3x2_pose_sheet.png`
- `projectile-fireball.png`
- `projectile-boss.png`
- `herb.png`, `mineral.png`, `mushroom.png`, `potion.png`

Implication:

- prop/FX compilers must support both animated sheets and single-image outputs
- support is needed for gameplay state rows such as normal, correct, incorrect,
  charged, or destroyed

### 4. Tiles, repeating surfaces, and playfield modules

Observed examples:

- `grass_A.png`, `grass_B.png`, `grass_C.png`, `grass_D.png`
- `road_EW.png`, `road_NS.png`, `road_corner.png`
- `tile-ruins.png`
- `background-tiled.png`
- `shop-wall.png`, `shop-floor.png`, `shop-counter.png`

Implication:

- the system needs seam-safe tile and module generation
- tiles are not only floor/wall pieces; some games use modular shop or room
  parts that should be generated as placement-ready surfaces

### 5. Scene backgrounds and location plates

Observed examples:

- `library_background.png`
- `background.png`
- `background_forest_clearing.png`
- `background_magic_arena.png`
- `background_ruined_road.png`
- `background_throne_hall.png`

Implication:

- full-scene assembly is a first-class asset family
- multiple location backgrounds per game are required in some genres
- scenes must preserve gameplay-safe negative space and readable focal areas

### 6. Parallax layer sets

Observed examples:

- `parallax-top-tiling.png`
- `parallax-middle-tiling.png`
- `parallax-bottom-tiling.png`

Implication:

- side-scrolling and flying games require layer bundles, not one flat
  background image
- parallax layers should be generated as coordinated sets sharing palette,
  depth, and scroll intent

### 7. UI atlases and auxiliary sheets

Observed examples:

- `ui-sheet.png`
- `item-sheet.png`

Implication:

- UI-supporting sprite atlases are in scope
- the roadmap must include runtime-support assets beyond “character art”

## Presentation Surface Families

### 8. Cover art and selection-card surfaces

Observed examples:

- `public/games/cover/*.png`

Implication:

- each mini-game likely needs a promotional cover surface for menus and catalog
  pages
- these should be generated from approved runtime assets and scene templates,
  not treated as unrelated marketing art

### 9. Loading and start-screen backgrounds

Observed examples:

- `loading-screen-background.png`
- custom start-screen flows in multiple games

Implication:

- the asset system should generate presentation surfaces for loading/start
  states as part of a game bundle

### 10. Gameplay promo stills

Observed examples:

- `archers-revenge-gameplay.png`
- `dragon-rider-gameplay.png`
- `archers-revenge-start-screen.png`

Implication:

- these are better treated as derived assets captured from the running game or
  templated scene renders, not manually painted one-offs

## Shape-Driven Games That Still Need Asset Packs

A large share of the series is still rendered mainly with shapes or simple
Konva primitives in code. Those titles still matter for this project because
they are prime candidates for future assetization and reskinning.

Examples include:

- `abyssal-well`
- `devourer-slime`
- `griffin-riders-escape`
- `griffin-sky-joust`
- `gryphon-patrol`
- `haunted-library`
- `labyrinth-goblin-king`
- `realm-carver`
- `rune-forge-chamber`
- `shadow-gate-dungeon`
- `spellweavers-run`
- `storm-castle-tower`
- `village-guardian`
- `archers-revenge`

Implication:

- this repo should support both:
  - generating assets for games that already consume PNG assets
  - generating migration-ready asset packs for games that currently do not

## Roadmap Implications

The downstream series requires the roadmap to explicitly cover:

1. multi-layout and directional sheet support
2. props/FX and single-image outputs
3. tiles and room modules
4. full scene backgrounds
5. parallax layer bundles
6. UI atlases and support sheets
7. cover and loading surfaces
8. derived gameplay stills or preview renders
9. per-game bundle planning, not just isolated asset generation

## Planning Rule

Any future track that talks about “asset generation” must state which of these
families it covers. Avoid writing tracks that only say “generate assets” without
declaring whether that means pose sheets, tiles, scenes, parallax, UI, or
presentation surfaces.
