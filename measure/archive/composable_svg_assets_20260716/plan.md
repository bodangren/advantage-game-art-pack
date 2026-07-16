# Plan: TypeScript Composable SVG Asset Desk

## Phase 1: Contract-First Tests

- [x] Add Vitest coverage for SVG part metadata parsing and exact-key validation.
- [x] Add tests rejecting unsafe SVG elements, external references, and invalid
  palette variables.
- [x] Add tests for composition-spec parsing, output sizing, placements, and
  anchor references.

## Phase 2: SVG Part Library

- [x] Implement typed part metadata and safe SVG document validation.
- [x] Implement deterministic typed catalog and validation helpers under
  `src/lib/`.
- [x] Add checked-in body, shirt, hair, and weapon SVG parts with anchors and
  palette slots.

## Phase 3: Composition Engine

- [x] Implement direct and anchor-based placement transforms.
- [x] Implement stable z-ordering and CSS custom-property palette injection.
- [x] Implement deterministic SVG serialization and composition metadata.

## Phase 4: Vinext Desk and Examples

- [x] Add a vinext Pages Router assembly desk with live composition controls.
- [x] Add a composed character spec with a 64-unit viewBox and a larger output
  size example.
- [x] Add browser-facing export actions and end-to-end compiler tests.

## Phase 5: Pivot Documentation

- [x] Rewrite product and technology docs around TypeScript and SVG-first composition.
- [x] Replace the README with the TS7/vinext workflow.
- [x] Mark the superseded Python/raster project as retired in the track registry.

## Phase 6: Verification

- [x] Run `npm run typecheck`.
- [x] Run `npm test`.
- [x] Run `npm run build`.
