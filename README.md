# Sprite Foundry

Sprite Foundry is a TypeScript 7 and vinext workspace for composing reusable
SVG game-art parts. The source of truth is text-authored SVG plus strict JSON
metadata. The browser desk assembles parts by named anchors, resolves palette
tokens, and exposes a deterministic Phaser texture configuration.

## Stack

- TypeScript 7 development compiler
- React 19 and vinext on Vite 8
- Vitest for the pure SVG compiler contract
- SVG source assets with CSS palette variables
- Phaser 4 `this.load.svg` output configuration

## Run

```bash
npm install
npm run dev
```

Open the local vinext URL to use the assembly desk. Choose parts or palette
slots, then export the resolved SVG or copy the Phaser loader configuration.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

The dependency overrides pin the TS7-era Vite/Rolldown toolchain to published
artifacts that build consistently on the supported Node 22 Linux environment.

## Structure

- `pages/`: vinext Pages Router surface (assembly desk, animation + directional docks, archetype library)
- `pages/api/render.ts`: composition render endpoint (SVG or PNG over HTTP)
- `src/lib/svg-assets.ts`: typed validator, anchor resolver, serializer, and metadata builder
- `src/lib/render.ts`: palette inlining and server-side PNG rasterization
- `src/lib/timeline.ts`: timeline spec validation, per-frame overrides, deterministic frame digests
- `src/lib/atlas.ts`: row-major atlas packer, sheet safety guard, atlas JSON + Phaser load contract
- `src/lib/directional.ts`: 4/8-way directional spec expansion, declared flips, sheet manifest
- `src/lib/bundles.ts`: per-game bundle manifest validation, spec registry, deterministic exporter
- `src/lib/catalog.ts`: checked-in SVG part catalog with tag-based selection
- `src/assets/svg-parts/`: human-readable SVG and part metadata
- `src/lib/svg-assets.test.ts`: deterministic compiler and safety tests
- `src/lib/timeline.test.ts` / `src/lib/atlas.test.ts`: timeline and atlas contract tests
- `src/lib/directional.test.ts`: directional spec, expansion, and manifest contract tests
- `src/lib/bundles.test.ts`: bundle manifest, compile, and export contract tests
- `src/lib/catalog.test.ts`: catalog contents, tag selection, and catalog JSON contract tests
- `src/lib/render.test.ts` / `src/lib/api-render.test.ts`: palette inlining, PNG rasterization, and render route contract tests
- `src/lib/archetype-parts.test.ts` / `src/lib/archetype-examples.test.ts`: archetype part fixture and seeded composition contract tests
- `src/lib/walk-cycle.test.ts`: frozen-fixture contract for the checked-in example
- `src/lib/knight-example.test.ts`: frozen-manifest contract for the knight example
- `examples/svg_character.json`: standalone composition contract example
- `examples/enemy-goblin.json` / `enemy-spectre.json` / `boss-dragon.json` / `npc-prisoner.json` / `prop-set-library.json` / `fx-set.json`: seeded archetype compositions with frozen digests (`examples/composition-digests.json`)
- `examples/animation/`: walk-cycle timeline plus frozen digest, atlas, and Phaser fixtures
- `examples/directional/`: knight 4-way walk+idle spec plus frozen sheet manifest
- `examples/bundles/`: seeded per-game bundle manifests (exports land in the
  gitignored `bundle/<game>/` tree)

## Contract

Parts declare a slot, local viewBox, named anchors, palette slots, tags, and
layer priority. Compositions declare a stable viewBox, optional output size,
concrete hex colors, and direct or anchor-attached placements. The accepted SVG
dialect rejects scripts, text, external references, event attributes, and
unsupported elements.

### Catalog selection

Part slots are `body`, `shirt`, `hair`, `feature`, `weapon`, `prop`, and `fx`.
`selectParts({ archetype?, slot?, theme? })` filters the checked-in library
with AND semantics — archetype and theme match against part tags — and returns
parts sorted by `part_id`. `catalogEntries()` emits the stable, sorted catalog
JSON (slot, anchors, palette slots, layer priority, tags, description per
part) suitable for LLM prompt context.

### Render API

`POST /api/render` renders a composition spec over HTTP. The body is a
composition spec JSON; the response is the composed SVG as `image/svg+xml`.
Append `?format=png` (or send a `"format": "png"` body field) for a
server-rasterized PNG at the spec's output dimensions — palette values are
inlined before rasterization, and scaling is nearest-neighbor for pixel-art
export. Invalid specs and unknown part ids return `400` with a JSON
`{ "error": "<validation message>" }`; non-POST methods return `405`.

```bash
curl -X POST http://localhost:3000/api/render?format=png \
  -H 'Content-Type: application/json' \
  --data-binary @examples/boss-dragon.json \
  -o boss-dragon.png
```

Identical spec bytes yield byte-identical SVG and PNG, so renders can be
pinned by the same SHA-256 contracts as the rest of the pipeline.

### Timeline JSON

A timeline spec is strict JSON: `{ version: 1, id?, frames[] }`. `id` is an
optional lowercase slug that becomes the Phaser load key when the timeline is
packed. Each frame declares `{ id, duration_ms, composition, overrides? }`:
a slug id unique within the timeline, a positive integer duration, and a full
composition spec. `overrides.parts` swaps named placements (part_id, offset,
rotate, and friends); `overrides.palette` replaces palette values for that
frame only. Overrides never mutate the base composition. `compileTimeline`
emits one deterministic SVG per frame plus a SHA-256 digest of each frame.

### Atlas JSON

`packAtlas(timeline, { cols, frame_w, frame_h })` sorts frames by id, lays
them out row-major, and inlines palette references so the sheet carries no
`<style>` and no `var()`. It returns:

- `sheet_svg`: one deterministic SVG sprite sheet (`cols * frame_w` by
  `rows * frame_h`), validated against the sheet safety allowlist.
- `atlas_json`: `{ version, frame_count, frame_rects[], durations_ms[],
  sheet_digest, sheet_width, sheet_height }` where `sheet_digest` is the
  SHA-256 of `sheet_svg`.
- `phaser_load`: `{ key: <timeline id>, url: "asset.svg", svgConfig:
  { width, height } }`, consumable by the Phaser load-time texture flow.

Phaser receives the resolved `asset.svg` as a load-time raster texture.
Runtime SVG mutation remains intentionally out of scope.

### Directional sheets

A directional spec is strict JSON: `{ version: 1, id, direction_set,
animations }`. `direction_set` is `"4-way"` (north/south/east/west) or
`"8-way"`; every animation declares exactly that direction set. Each
animation declares `{ frame_count, duration_ms, composition, directions }`.
A direction entry is either explicit — `{ frames: [{ overrides? }] }` with
exactly `frame_count` entries, reusing timeline per-frame overrides — or a
declared flip: `{ mirror_of: <explicit direction>, flip: "horizontal" }`.
No other mirroring is inferred.

`compileDirectionalSheets` expands one validated timeline per direction
(`<id>-<animation>-<direction>`), compiles each through the timeline/atlas
pipeline (mirrored frames carry a `scale(-1 1)` wrapper and a re-computed
digest), and packs one atlas per direction. It returns the sheets plus a
sheet manifest:

- `sheets[]`: `{ animation, direction, timeline_id, flip, frame_count,
  frame_rects[], frame_digests[], sheet_digest, phaser_load }`.
- `manifest_digest`: SHA-256 over the sorted-key manifest body, so
  downstream Phaser loaders can pin an entire character sheet set with one
  hash.

### Per-game bundles

A bundle manifest is strict JSON: `{ version: 1, game, slots[] }`. Each slot
declares `{ slot, refs[] }` where `slot` is one of `characters`, `enemies`,
`props`, `fx`, `tiles`, `ui`, `surfaces` and each ref is
`{ kind: "composition" | "timeline" | "sheet", id, atlas? }`. Refs resolve
against the checked-in spec registry (`SPEC_REGISTRY`): the id must exist,
its kind must match, and the spec's own declared id must equal the ref id.
Ref ids are unique across the whole manifest; slots may cover any subset of
categories.

`compileBundle` validates the manifest and compiles every reference —
compositions emit one SVG, timelines emit one packed atlas sheet, sheets
emit one atlas per direction — reporting failures with `slot <s> ref <id>`
context. `exportBundle` writes a deterministic tree:

```
bundle/<game>/<slot>/<asset>.svg
bundle/<game>/bundle.json   # version, game, per-asset {slot, id, kind, file, digest}, bundle_digest
bundle/<game>/audit.txt     # human-readable audit report
```

Every asset digest is the SHA-256 of its SVG file; `bundle_digest` pins the
sorted asset list, so re-exporting identical input reproduces the tree and
every digest byte-for-byte.
