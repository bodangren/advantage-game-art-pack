# Tech Stack

## Runtime

- Node.js 22+
- TypeScript 7 development compiler
- React 19 with vinext Pages Router

## Core Libraries

- Vite 8 through vinext
- Vitest 4 for unit tests
- `@resvg/resvg-wasm` for server-side PNG rasterization in the render API
  (wasm-only, no native bindings)
- Browser Web Crypto for SHA-256 asset metadata
- No Python runtime or Python dependency is part of the project

## Project Structure

- `pages/` for the vinext browser surface
- `src/lib/` for typed composition and catalog modules
- `src/assets/svg-parts/` for reusable SVG parts and metadata
- `examples/` for standalone composition specifications

## Architectural Choices

- Part and composition files are normalized into strict TypeScript contracts
  before export.
- The accepted SVG dialect excludes scripts, external resources, and unknown
  elements or attributes.
- Composition is deterministic and does not rely on stochastic image models.
- SVG viewBoxes define source geometry; output width and height are optional
  display properties rather than baked-in raster dimensions.
- Phaser 4 consumes the exported SVG through `this.load.svg`, which rasterizes
  it into a texture at load time. The copied loader configuration is the
  deterministic integration contract; runtime SVG animation and palette
  mutation are deferred.
- Composition numbers are bounded for safe deterministic output: geometry and
  offsets use a magnitude limit of `1,000,000`, scale is limited to `1,000`, and
  Phaser output dimensions are limited to `32,768` pixels per axis.
- The previous Python/raster project was intentionally retired; only the SVG
  composition behavior was ported.

## Quality Gates

- `npm run typecheck`
- `npm test`
- `npm run build`
