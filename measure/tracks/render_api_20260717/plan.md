# Plan: Composition Render API

## Phase 1: Contract-First Tests

- [x] Add failing tests for palette inlining: composed SVG rewritten with
  concrete hex values, no `var()` or `<style>` remaining, deterministic.
- [x] Add failing tests for `renderSpecToPng`: PNG magic bytes, output
  dimensions honored (spec.output, else viewBox), byte-identical repeat.
- [x] Add failing tests for the route handler contract: 200 SVG for a valid
  spec, 400 with `{ error }` for invalid spec and unknown part, 405 for GET.

## Phase 2: Render Module

- [~] Implement palette inlining in `src/lib/render.ts`.
- [ ] Implement `renderSpecToPng` via `@resvg/resvg-wasm`.
- [ ] Add `@resvg/resvg-wasm` as a pinned direct dependency.

## Phase 3: Route

- [ ] Implement `pages/api/render.ts` with the method and error contract.
- [ ] Smoke-verify through the dev server with curl: SVG, PNG, and 400 paths.

## Phase 4: Docs and Verification

- [ ] Document the endpoint with a curl example in the README; record the
  resvg-wasm dependency in `tech-stack.md`.
- [ ] Run `npm run typecheck`, `npm test`, and `npm run build`.
