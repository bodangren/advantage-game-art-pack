# Tech Stack

## Runtime

- Node.js 22+
- TypeScript 7 development compiler
- React 19 with vinext Pages Router

## Core Libraries and Boundaries

- Vite 8 through vinext
- Vitest 4 for unit tests
- `@resvg/resvg-wasm` for server-side PNG rasterization in the render API
- Browser Web Crypto for SHA-256 asset metadata
- Public MCP is the only Pixel-to-Fantasy Asset Forge integration boundary;
  provider SDKs and private Forge APIs are out of scope.
- No Python runtime or Python dependency is part of the project.

## Contracts

- Base interchange contract: `forge-asset-interchange-manifest/v1`.
- Education completeness contract: `education-app-pack-profile/v1`.
- Forge currently generates semantic 3D-derived individual transparent 128x128
  PNG sprites and GLBs, but Pixel ingestion remains disabled until Forge's
  interchange track is accepted. Animation atlases and complete-pack delivery
  are later external stages and must pass their owning tracks plus version
  negotiation before support is enabled.

## Project Structure

- `pages/` for the vinext browser surface
- `src/lib/` for typed composition, import, and catalog modules
- `src/assets/svg-parts/` for reusable SVG parts and metadata
- `examples/` for standalone composition and pack specifications
- Local Forge imports use an immutable registry with source, digest, profile,
  provenance, delivery dimensions, and review/admission evidence.

## Architectural Choices

- Pixel-native authoring and tile/scene/presentation assembly remain SVG-first.
- LLM semantic 3D requests route to the public MCP ingestion workflow.
- Imported artifacts are validated at the boundary and referenced by immutable
  digest; they are never silently converted into Pixel source assets.
- Phaser consumes a downstream mixed-pack export and does not own MCP discovery
  or retrieval.
- Phaser loads Pixel SVG through `this.load.svg`.
- Forge PNG/image artifacts use `this.load.image`, spritesheets use
  `this.load.spritesheet`, and atlases use `this.load.atlas`; they are not
  routed through the SVG loader.
- GLB remains an independently referenced artifact for an appropriate 3D
  consumer and is not claimed to be loaded by Phaser.
- Composition is deterministic and does not rely on stochastic image models.
- SVG viewBoxes define source geometry; output dimensions are display properties.
- Geometry and offsets use a magnitude limit of `1,000,000`, scale is limited to
  `1,000`, and Phaser output dimensions are limited to `32,768` per axis.

## Quality Gates

- Contract/version and digest validation at every external boundary
- Delivery-resolution visual review for every production asset
- Profile/provenance metadata and `education-app-pack-profile/v1` admission
  evidence for every production pack
- `npm run typecheck`
- `npm test`
- `npm run build`
