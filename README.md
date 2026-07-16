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

- `pages/`: vinext Pages Router surface (assembly desk + animation dock)
- `src/lib/svg-assets.ts`: typed validator, anchor resolver, serializer, and metadata builder
- `src/lib/timeline.ts`: timeline spec validation, per-frame overrides, deterministic frame digests
- `src/lib/atlas.ts`: row-major atlas packer, sheet safety guard, atlas JSON + Phaser load contract
- `src/lib/directional.ts`: 4/8-way directional spec expansion, declared flips, sheet manifest
- `src/lib/catalog.ts`: checked-in SVG part catalog
- `src/assets/svg-parts/`: human-readable SVG and part metadata
- `src/lib/svg-assets.test.ts`: deterministic compiler and safety tests
- `src/lib/timeline.test.ts` / `src/lib/atlas.test.ts`: timeline and atlas contract tests
- `src/lib/directional.test.ts`: directional spec, expansion, and manifest contract tests
- `src/lib/walk-cycle.test.ts`: frozen-fixture contract for the checked-in example
- `src/lib/knight-example.test.ts`: frozen-manifest contract for the knight example
- `examples/svg_character.json`: standalone composition contract example
- `examples/animation/`: walk-cycle timeline plus frozen digest, atlas, and Phaser fixtures
- `examples/directional/`: knight 4-way walk+idle spec plus frozen sheet manifest

## Contract

Parts declare a slot, local viewBox, named anchors, palette slots, tags, and
layer priority. Compositions declare a stable viewBox, optional output size,
concrete hex colors, and direct or anchor-attached placements. The accepted SVG
dialect rejects scripts, text, external references, event attributes, and
unsupported elements.

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
