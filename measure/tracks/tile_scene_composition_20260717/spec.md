# Spec: Tile and Scene Composition Engine

## Goal

Add a Pixel-owned SVG-native scene layer for seam-safe tiles, room modules,
backgrounds, and coordinated parallax exports. These outputs may reference
validated Fantasy Asset Forge imports, but never current rejected Pixel source
assets.

## Contract and Boundary

Imports must use `forge-asset-interchange-manifest/v1`, carry profile/provenance
metadata, pass delivery-resolution visual review, and have pack-admission
evidence before use. Packs target `education-app-pack-profile/v1`. Forge
discovery/retrieval belongs to the public MCP ingestion track, not this scene
compiler. Default style is `cute_chibi_v1`; secondary is
`heroic_stylized_v1`.

## Functional Requirements

- Tile parts declare edge continuation and incompatible adjoining edges reject.
- A declared continuing edge is valid only when its rendered RGBA boundary
  pixels match every compatible opposite edge. Closed (`continues:false`)
  boundaries never adjoin, even when their semantic names match.
- Every standalone SVG root declares the SVG namespace plus explicit width and
  height equal to its viewBox dimensions so browser `<img>` contexts load it.
- Strict scene specs contain versioned id, viewBox, ordered layers, explicit
  tile maps, prop placements, and one palette.
- Compiler emits deterministic SVG and manifest with layer rects, references,
  provenance, admission evidence, and SHA-256 digests.
- Parallax exports emit coordinated SVG layers with scroll metadata.
- Checked-in examples and desk previews use replacement/native or validated
  imported references only.
- Browser review uses four composed downstream layouts per theme: Castle
  Defense terrain, Potion Rush shop, Wizard vs Zombie ruins, and Rune Match
  playfield.

## Candidate Microbatch Boundary

The replacement/native microbatch covers exactly 12 downstream semantic
environment roles in both `cute_chibi_v1` and `heroic_stylized_v1` (24 SVGs):
Castle Defense grass A-D and road EW/NS/corner-NE; Potion Rush shop wall,
floor, and counter; Wizard vs Zombie ruins tile; and Rune Match tiled
playfield background. The manifests are strict
`pixel-tile-candidate-manifest/v1` records with immutable SVG and manifest
digests, profile/palette binding, seam metadata, and Pixel-native provenance.

The first visual batch rendered successfully but Kimi rejected pack admission:
grass repeated conspicuous horizontal bands, several framed/icon-like assets
claimed false all-edge continuation, and the two themes read as neon-flat and
muddy recolors. The second iteration repaired the browser, seam, and composition
scaffold, but Kimi again rejected visual pack admission after loading all 32
review images. Its composed exemplars read as repeated wallpaper rather than
authored gameplay scenes; the profiles still shared most geometry and differed
mainly by palette/darkness; and the shapes remained coarse, flat blocks with
minimal material, lighting, depth, and silhouette nuance. The browser/seam/
composition infrastructure is accepted only as a candidate scaffold. The two
rejection records are:

- `/tmp/kimi-webbridge-pdfs/Pixel tile and scene candidate QA.pdf`
- `/tmp/kimi-webbridge-pdfs/Tile scene V2 Kimi QA.pdf`

This microbatch is contract evidence, not accepted production art. Every
manifest and compiled example must remain `candidate_unadmitted`,
`shipping:false`, and `visual_review:pending` until delivery-size browser/Kimi
review admits an asset through the downstream pack workflow.

## Reference-Board Gate Before S3

No third-iteration tile or scene candidate may be authored until the primary
orchestrator provides and explicitly approves all eight reference boards below.
References are art-direction evidence only; they are not runtime inputs and do
not bypass delivery-resolution visual review or pack admission.

These briefs are also subordinate to the read-only downstream production gate.
They must not be generated or treated as a frozen production roster until
`apk_independent_acceptance_handoff_20260712` publishes the accepted ontology and
usage hashes consumed by `apk_dual_theme_asset_production_20260712`. When that
gate opens, reference generation must use the downstream-required built-in image
generator; MMX and unrelated external generators are prohibited. Until then,
RB-01 through RB-08 remain draft planning evidence and `s3_generation_allowed`
must remain false.

Each board must be assembled outside the image generator from separately
generated images so labels and scale are reliable. It must contain:

1. One coherent, authored pixel-art gameplay target at twice the downstream
   coordinate size, with a nearest-neighbor preview at delivery size.
2. The named straight-on material samples in the brief, each as an isolated
   square with no frame, emblem, prop, perspective, lighting baked across an
   edge, or decoration touching an edge.
3. A mechanically assembled 3x3 repetition proof for every material intended
   to continue on all four edges. Transition, corner, wall, counter, rail, and
   prop modules must instead show their declared open/closed edges.
4. A gameplay overlay, added after generation, marking navigable space,
   landmarks, spawn/goal or work zones, prop-safe zones, and HUD-safe negative
   space. The clean target remains available without this overlay.
5. Source identity, generation prompt, model/provider provenance, source-image
   digest, profile, family, revision, and explicit primary approval state.

Across the pair for each family, `cute_chibi_v1` and `heroic_stylized_v1` must
share only gameplay geometry. They must not share landmark silhouettes,
material shapes, motif placement, lighting design, or prop geometry with a
palette swap. Both profiles require crisp integer pixel clusters, controlled
palette ramps, readable foreground/midground/background separation, and no
blurred or vector-flat substitute for pixel-art material rendering.

### RB-01: Castle Defense - `cute_chibi_v1`

- **Gameplay target:** 1600x1200 reference for the 800x600 world, preserving
  the 16x12 grid and 50px delivery tile. Show the wave-one U path from the
  top-left spawn at `(75,75)`, down to `(75,525)`, across to `(725,525)`, and
  up to the castle goal at `(725,75)`. Show the five wave-one tower pads as
  readable build landmarks without blocking the road. The path, spawn, castle,
  and build sites must read before decorative detail.
- **Material samples:** spring meadow base; clover/flower meadow variation;
  rounded pale-pebble road body; soft dirt-and-grass road transition; curved
  pebble corner; warm timber/stone tower-pad surface.
- **Art target:** bright storybook meadow, rounded asymmetric clusters, tiny
  wildflowers and clover kept inside tile margins, soft compact shadows, an
  ivory fairytale keep with a warm red roof, and friendly wooden build pads.
  Terrain changes use small stones, tufts, and compressed color ramps, not
  horizontal bands or repeated icon stamps.
- **Reject if:** it resembles a texture swatch, hides the route, omits either
  endpoint, repeats the same decoration at grid cadence, or relies on symbols
  instead of an authored castle/path hierarchy.

### RB-02: Castle Defense - `heroic_stylized_v1`

- **Gameplay target:** the same 800x600 gameplay geometry and wave-one
  coordinates as RB-01, at 1600x1200 reference size, but with independently
  designed landmarks and material silhouettes.
- **Material samples:** wind-cut moss turf; shale/weed turf variation;
  fractured flagstone road body; packed-earth/stone road transition; chiseled
  flagstone corner; iron-rimmed basalt tower-pad surface.
- **Art target:** windswept fortress march with angular turf breaks, chipped
  road stones, directional cool light, restrained bronze accents, heavy basalt
  crenellations, and iron defensive pads. Use larger value masses, sharp cast
  shadows, and broken masonry silhouettes rather than darkening cute geometry.
- **Reject if:** the keep, pads, stones, grass motifs, or lighting shapes are
  recolored versions of RB-01, or if dark values erase road readability.

### RB-03: Potion Rush - `cute_chibi_v1`

- **Gameplay target:** a 2560x1440 reference for the 1280x720 landscape stage
  plus a 1440x2560 companion layout for the 720x1280 portrait stage. Preserve
  the wall/floor split (`480/240` landscape, `640/640` portrait), customer line
  behind the counter at `y=402`, counter front at `y=400` with 160px height,
  cauldron work zone near `y=540`/`600`, conveyor at `y=620`/`1120`, and trash
  zone at `(1230,540)`/`(360,880)`. Show a real back wall, stocked shelves,
  work stations, customer zone, foreground counter, and floor depth.
- **Material samples:** warm limewashed plaster; honey-toned plank floor;
  rounded timber shelf module; copper-edged counter front; small bottle/crate
  prop family; plaster-to-floor baseboard transition.
- **Art target:** cozy crooked apothecary with round shelves, irregular bottle
  groupings, herbs, labeled-by-shape jars, soft window light, warm copper, and
  strong depth ordering. Keep interactive station areas clear and make the
  counter one authored foreground structure rather than a repeated kiosk.
- **Reject if:** windows, shelves, counters, or tables repeat at fixed cadence;
  the work/customer/conveyor zones are ambiguous; or the portrait layout is a
  crop that loses a required station.

### RB-04: Potion Rush - `heroic_stylized_v1`

- **Gameplay target:** the same landscape and portrait coordinate constraints
  as RB-03, with independently authored room architecture and props.
- **Material samples:** ashlar workshop wall; dark worn flagstone floor;
  angular iron-and-oak rack module; reinforced alchemy counter front; leather,
  crate, and metal-vial prop family; wall-to-floor stone plinth transition.
- **Art target:** fortified war-alchemist dispensary with heavy shelving,
  riveted frames, deep alcoves, cool ambient light, controlled amber furnace
  accents, and a thick defensible counter. Use chiseled geometry and long
  directional shadows that remain subordinate to interaction zones.
- **Reject if:** it is a dark recolor of RB-03, loses item silhouettes in low
  values, or turns the floor/wall/counter into interchangeable wallpaper.

### RB-05: Wizard vs Zombie - `cute_chibi_v1`

- **Gameplay target:** 1600x1200 reference for the 800x600 arena. Keep the
  player-centered area around `(400,300)` open, preserve clear cardinal ingress
  lanes centered on the north, south, west, and east edges, and reserve clean
  orb-reading pockets in all four quadrants. Build an intentional perimeter
  ruin topology with four readable entrances and an open circulation loop; do
  not stamp one debris tile across the playfield.
- **Material samples:** moonlit courtyard ground; mossy cracked-ground
  variation; rounded academy masonry; low rubble/decal module; moss-to-stone
  transition; broken arch placement module with closed edges.
- **Art target:** overgrown magical-academy courtyard with rounded broken
  arches, soft moss, lavender/cyan residual magic, warm window remnants, and a
  faint central ritual ring below gameplay entities. Ruin mass stays at the
  perimeter; low-value floor detail supports rather than competes with orbs.
- **Reject if:** debris forms a repeating 2x2 stamp, entrances are obstructed,
  the center is visually busy, or ruin pieces fail to create a readable place.

### RB-06: Wizard vs Zombie - `heroic_stylized_v1`

- **Gameplay target:** the same 800x600 gameplay clearances and cardinal spawn
  lanes as RB-05, at 1600x1200 reference size, with independent topology shapes
  and material design.
- **Material samples:** scorched necropolis ground; fractured slab variation;
  jagged black-stone masonry; bone/ash rubble decal; slab-to-earth transition;
  collapsed buttress placement module with closed edges.
- **Art target:** blasted necropolis with angular perimeter walls, collapsed
  buttresses, scorched cracks, bone dust, cold moonlight, and sparse ember
  accents. Create strong perimeter silhouettes and a broad, low-detail combat
  floor with four unmistakable ingress cuts.
- **Reject if:** it shares RB-05's arch/rubble silhouettes, becomes uniformly
  dark, or trades arena navigation for decorative ruin density.

### RB-07: Rune Match - `cute_chibi_v1`

- **Gameplay target:** a 2560x1440 reference for a 1280x720 desktop stage with
  a 200px left combat/sidebar zone and a blank 5x5 board approximately spanning
  `x=396..1084`, `y=16..704`; include a 1440x2560 companion for the 720x1280
  mobile stage with the blank board approximately at `x=16..704`,
  `y=360..1048`. The background supports the adaptive UI; it does not contain
  finished rune symbols. Show separate surround, board frame, gutters, blank
  cell wells, corners, and restrained ambient decoration.
- **Material samples:** quiet enchanted-study surround; blank parchment/mosaic
  cell surface; rounded frame rail; corner socket; soft gutter material; small
  edge decoration module kept outside cells.
- **Art target:** charming enchanted study with warm paper, colored glass,
  rounded mosaic wells, tiny book/plant silhouettes outside the board, and soft
  magical light. Every empty cell remains calm enough for a rune, selection
  glow, hint, and vocabulary text to read immediately.
- **Reject if:** any sample or background bakes in completed rune glyphs,
  repeats a finished emblem, decorates every cell identically, or competes with
  active pieces.

### RB-08: Rune Match - `heroic_stylized_v1`

- **Gameplay target:** the same desktop/mobile 5x5 geometry and UI-safe zones
  as RB-07, with independently authored frame and surrounding architecture.
- **Material samples:** dark ritual-dais surround; blank obsidian cell surface;
  bronze/stone frame rail; angular corner clamp; recessed gutter material;
  sparse candle/chain edge module kept outside cells.
- **Art target:** severe occult strategy board on an obsidian dais, with
  chiseled empty sockets, restrained bronze inlay, cool rim light, sparse candle
  warmth, and large quiet value fields. The board silhouette is architectural
  and angular, not a recolored rounded study board.
- **Reject if:** symbols are pre-painted into cells, black-on-black values hide
  cell boundaries, or frame/corner geometry matches RB-07.

## Reference Approval Exit Criteria

The primary may approve a board only when its clean target, material samples,
repetition/edge proof, overlay, provenance, and cross-theme comparison are all
present. Approval must record the immutable board digest and revision. Only
then may S3 authoring translate the approved visual target into deterministic
Pixel-owned assets. Approval of a board is not approval of the later S3 output.

## Acceptance Criteria

- [ ] Strict scene/tile/parallax validation and determinism tests pass.
- [ ] Scene and parallax exports are byte-identical for identical input.
- [ ] All eight reference boards pass the reference approval exit criteria.
- [ ] Every Kimi-reviewed composed exemplar passes the visual-quality gate.
- [ ] Examples resolve only accepted production references and carry evidence.
- [ ] Typecheck, tests, and build pass.

## Out Of Scope

- MCP discovery/retrieval or import registry ownership.
- Auto-tiling, runtime parallax, scene-aware lighting, and LLM scene authoring.
