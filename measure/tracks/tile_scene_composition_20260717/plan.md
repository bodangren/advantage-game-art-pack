# Plan: Tile and Scene Composition Engine

Pixel-native SVG assembly remains the owner. Imported artifacts must already be
validated through public MCP ingestion and admitted with immutable provenance;
the rejected current Pixel assets cannot be used. Preserve the existing
in-flight markers.

## Phase 1: Contract-First Tests

- [x] Add failing scene-spec validation tests (ordered layers, tile grids,
  prop placements, palette, unknown reference rejection).
- [x] Add failing seam-safety tests for tile parts (edge-continuation contract,
  incompatible adjoining edges rejected).
- [x] Add failing parallax-set metadata tests (shared palette, scroll depth,
  scroll intent, per-layer digests).
- [x] Add failing determinism tests: identical scene input yields byte-
  identical SVG and manifest.

## Phase 2: Tile Parts and Seam Validation

- [x] Author replacement seam-safe SVG tiles with edge metadata and profile /
      provenance metadata.
- [x] Implement tile edge-continuation validation in the part contract.
- [x] Raster-check every declared compatible adjacency at its actual 32px RGBA
      boundary; treat every `continues:false` edge as non-adjoining.
- [x] Rebuild the rejected first batch with theme-specific material systems and
      role-honest wall/floor/counter/ruins/playfield semantics.

## Phase 2A: Reference-Board Gate Before S3

- [x] Record the second Kimi rejection and retain its run-local PDF evidence;
      preserve the browser/seam/composition work only as a candidate scaffold.
- [x] Audit the real downstream geometry and interaction zones for Castle
      Defense, Potion Rush, Wizard vs Zombie, and Rune Match without editing the
      downstream repository.
- [x] Draft eight exact reference briefs (four scene families x two profiles),
      each requiring tileable material samples, edge/repetition proof, and one
      authored gameplay target.
- [ ] Primary orchestrator generates or provides the eight immutable reference
      boards with prompts, provenance, source digests, and clean/overlay views.
- [ ] Primary explicitly approves all eight boards after side-by-side profile
      differentiation and gameplay-readability review.
- [ ] Only after approval, author S3 materials/modules and composed exemplars
      against the approved board identities. Until then, do not alter visual
      candidates or claim admission progress.

## Phase 3: Scene Compiler

- [x] Implement scene types and strict validation under `src/lib/`.
- [x] Implement ordered layers, row-major tile grids, and anchor/position prop
      placement through the existing composition engine.
- [x] Emit deterministic scene serialization and manifest with evidence/digests.

## Phase 4: Parallax Export and Examples

- [x] Implement parallax layer export with shared palette and scroll metadata.
- [x] Freeze eight candidate real-layout exemplars (four downstream layouts per
      theme) with strict set, SVG, and manifest digest chains.
- [ ] Author accepted library-room scene and freeze digests.
- [ ] Author accepted parallax example and freeze digests.

## Phase 5: Desk and Docs

- [ ] Add desk previews and document the scene/parallax contracts.

## Phase 6: Verification

- [~] Run typecheck, tests, and build; register accepted refs and record
      shortcuts in `tech-debt.md`.

## Current Verification Evidence (2026-07-23)

- `src/lib/tile-scene-composition.test.ts`: 15/15 scoped tests pass.
- Kimi browser preflight initially found all 24 candidates at
  `naturalWidth:0,naturalHeight:0`. The candidate and compiled-scene contracts
  now require/emit the SVG namespace and explicit viewBox-matched dimensions;
  all dependent SVG and manifest digests were regenerated. Restaged Kimi
  rendering succeeded at 48/48 candidate and seam-board images. Kimi rejected
  visual pack admission; the original PDF evidence is retained.
- The second Kimi gate loaded 32/32 source-tile and composed-exemplar images.
  It accepted the browser/seam/composition infrastructure only as a candidate
  scaffold and rejected pack admission: scenes read as repeated wallpaper;
  gameplay hierarchy and zones were missing; profiles reused geometry with
  palette/darkness changes; and material, lighting, depth, and silhouettes were
  too coarse. Evidence: `/tmp/kimi-webbridge-pdfs/Tile scene V2 Kimi QA.pdf`.
- S3 visual rewriting is paused. Eight draft reference briefs are now specified
  in `spec.md`, but generation cannot begin until the downstream independent
  acceptance handoff publishes the ontology/usage hashes consumed by the
  dual-theme production track. After reconciliation, boards must use the
  downstream-required built-in image generator and receive explicit primary
  approval. The current downstream image API is not yet sufficient: it returns
  raw bytes without image-generation provenance, does not forward declared size
  or seed through its OpenAI/Google providers, and has no accepted board-manifest
  writer. MMX and another unaided tile rewrite are both prohibited.
- The non-admitted `tile-scene-reference-board/v1` schema and validator are now
  executable with 21 focused tests. They bind all eight board identities,
  downstream hashes and owner approval, generator forwarding/provenance claims,
  raw and derived bytes, required board roles, and cross-theme distinction while
  keeping admission and shipping false. This is validation infrastructure, not
  permission to generate a board.
- Actual raster seam verification covers every compatible east/west and
  south/north pairing in both profiles; it caught and forced repair of one
  heroic roadside tuft that touched a declared grass boundary.
- Eight checked-in 128x96 exemplar SVGs and manifests reproduce byte-for-byte
  from the compiler and remain `candidate_unadmitted` / `shipping:false`.
- `npm run typecheck`: passes after the concurrent five-clip test owner restored
  its missing Node imports.
- `npm run build`: passes after the second-iteration redesign (2026-07-23).
- `npm test`: tile-scene tests pass, but the repository-wide suite remains red
  on the two pre-existing asset-quality failures registered in `tech-debt.md`:
  unused `cloth-light` / `cloth-shadow` declarations and the frozen
  composition digest mismatch.
- Candidate inventory: 12 required semantic roles x 2 profiles = 24 SVGs;
  both manifests and every source digest verify.
- Desk integration, accepted scene/parallax examples, bundle
  registration, and delivery-size browser/Kimi visual admission remain open.
