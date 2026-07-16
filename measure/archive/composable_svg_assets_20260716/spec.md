# Spec: TypeScript Composable SVG Asset Desk

## Goal

Replace the retired Python/raster project with a TypeScript 7 and vinext
workspace for authoring and composing reusable SVG asset parts.
SVG is the source artifact. A composition keeps a stable viewBox for layout and
may optionally declare a display width and height for variable-sized output.

## Product Direction

Parts are small, text-authored SVG documents with machine-readable metadata.
Metadata describes the part's slot, local anchors, palette variables, layer
priority, and tags. A composition spec selects parts, positions them directly
or attaches them by named anchors, and supplies the concrete palette.

The first implementation uses a constrained, safe SVG subset. It must preserve
deterministic output and reject scripts, external resources, and unsupported
elements before composition.

## Acceptance Criteria

- [x] SVG part metadata and SVG source files have strict validation contracts.
- [x] The TypeScript catalog exposes part IDs, slots, anchors, palette slots, layer
  priorities, viewBoxes, and tags as JSON suitable for LLM prompt context.
- [x] A strict composition spec supports a viewBox, optional output dimensions,
  palette values, direct placement, and anchor-based attachment.
- [x] Composition produces deterministic, well-formed SVG with stable layer
  ordering and generated palette CSS variables.
- [x] Composition metadata records the source spec, resolved parts, viewBox,
  output dimensions, and SHA-256 digest of the SVG.
- [x] The vinext desk exposes checked-in parts and a composed character that demonstrate variable
  output sizing and anchor attachment.
- [x] TypeScript typecheck, unit tests, and production build pass.

## Out Of Scope

- Raster PNG export or anti-aliased SVG rasterization.
- LLM provider integration or prompt-to-spec generation.
- Animation timelines and sprite-sheet packing.
- A browser editor beyond the single assembly desk.
- Importing existing PNG primitives into the SVG library.
