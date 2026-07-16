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

- `pages/`: vinext Pages Router surface
- `src/lib/svg-assets.ts`: typed validator, anchor resolver, serializer, and metadata builder
- `src/lib/catalog.ts`: checked-in SVG part catalog
- `src/assets/svg-parts/`: human-readable SVG and part metadata
- `src/lib/svg-assets.test.ts`: deterministic compiler and safety tests
- `examples/svg_character.json`: standalone composition contract example

## Contract

Parts declare a slot, local viewBox, named anchors, palette slots, tags, and
layer priority. Compositions declare a stable viewBox, optional output size,
concrete hex colors, and direct or anchor-attached placements. The accepted SVG
dialect rejects scripts, text, external references, event attributes, and
unsupported elements.

Phaser receives the resolved `asset.svg` as a load-time raster texture. Runtime
SVG mutation, animation timelines, and sprite-sheet packing are intentionally
deferred until the composition contract is proven in-game.
