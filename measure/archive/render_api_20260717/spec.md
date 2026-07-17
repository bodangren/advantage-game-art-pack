# Spec: Composition Render API

## Goal

Expose the composition engine over HTTP so any caller — the desk, shell
scripts, future batch pipelines — can POST a composition spec and receive a
deterministic rendered image. SVG is returned directly; PNG is rasterized
server-side for pixel-art export and fast visual iteration against reference
mockups.

## Product Direction

The engine is already deterministic and typed; the missing piece is an
iteration surface. A render endpoint turns asset authoring into a tight
edit-spec → curl → look loop without booting the desk, and it is the export
path for downstream asset packs. The desk keeps working unchanged; the API is
a second consumer of the same `composeSvgAsset` contract.

## Functional Requirements

- `POST /api/render` accepts a composition spec JSON body, validates it
  through `normalizeCompositionSpec`, composes with the checked-in
  `SVG_PARTS`, and returns the composed SVG as `image/svg+xml`.
- `format=png` (query parameter or body field) returns a server-rasterized
  PNG via `@resvg/resvg-wasm`. Palette `var()` references are inlined into
  concrete hex values before rasterization — the rasterizer never sees
  `var()` or `<style>`, matching the atlas packer's constraint.
- PNG pixel dimensions come from `spec.output` when present, else the
  viewBox, so exports land at exact game resolution.
- Deterministic output: identical spec bytes yield byte-identical SVG and
  PNG across calls.
- Error contract: non-POST methods return 405; invalid spec, unknown part
  id, or missing palette value returns 400 with a JSON `{ error }` body
  carrying the validation message.
- Palette inlining and PNG rasterization live in a typed `src/lib/render.ts`
  module so the route stays thin and the whole contract tests in node
  without a server.

## Non-Functional Requirements

- Exactly one new direct runtime dependency: `@resvg/resvg-wasm` (wasm-only,
  no native bindings), pinned to the version already resolved transitively.
- No changes to the composition engine, validator, or catalog.
- The suite stays green, including the post-Green phase-1 sentinel.

## Acceptance Criteria

- [ ] `curl -X POST` of a seeded example spec returns 200 SVG containing the
  composed placement groups.
- [ ] `format=png` returns PNG magic bytes at the spec's output dimensions
  and is byte-identical on repeat calls.
- [ ] Palette values are inlined before rasterization (no `var()`/`<style>`
  in the raster input; no black-fill artifacts in the PNG).
- [ ] Invalid spec and unknown part id return 400 with the validation
  message; GET returns 405.
- [ ] `npm run typecheck`, `npm test`, and `npm run build` pass.

## Out Of Scope

- LLM-driven spec authoring (later track: llm_part_authoring_20260717).
- Scene/tile rendering endpoints.
- Authentication, rate limiting, or deployment beyond the local desk.
- Dialect changes (gradients, filters) — PNG input stays inside the current
  safe dialect.
