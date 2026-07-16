# Test Strategy — Animation Timelines and Atlas Packing

> Track: `animation_timeline_atlas_packing_20260716`
> Phase scope: track setup → closeout. This file is the falsifiable contract
> every Red/Green reviewer reads against. Implementation has NOT started; this
> strategy is written against the existing `composable_svg_assets_20260716`
> foundation (`src/lib/svg-assets.ts`) and the desk surface (`pages/`).

## 0. Foundations read before writing this strategy

- `spec.md` — acceptance criteria + out-of-scope (no PNG export, no tweening,
  no skeletal, no LLM authoring).
- `plan.md` — five phases (Contract-First Tests → Timeline Compiler → Atlas
  Packer → Desk Preview and Example → Verification).
- `src/lib/svg-assets.ts` — the deterministic composition engine we extend.
  Provides `composeSvg`, `composeSvgAsset`, `sha256`, `validateSvgSource`,
  `serializeCompositionSpec`, `buildPhaserLoadConfig`. Reuse, do not replace.
- `src/lib/svg-assets.test.ts` — vitest conventions in this repo:
  `import { describe, expect, it } from "vitest"`, `it("...", () => {...})`,
  regex-thrown errors, snapshotless determinism via string-equality.
- `vitest.config.ts` — `include: ["src/**/*.test.ts"]`, `environment: "node"`.
- `package.json` — gates: `npm run typecheck`, `npm test`, `npm run build`.
- `pages/_app.tsx` / `pages/index.tsx` — desk preview surface (Phase 4).
- `measure/anti-patterns.md` — A1–A10 guard contracts.
- `measure/lessons-learned.md` — seeded-hash determinism, BFD bin packing,
  family-registry coupling. Animation/atlas parallels the existing
  composition pipeline, not the retired Python project.

## 1. Strategy header (machine-readable)

```
RED_TEST_COMMAND="npm test"
GREEN_TEST_COMMAND="npm test"
PROJECT_LINT="npm run typecheck"
PROJECT_CHECKS="npm run build"
PROJECT_TESTS="npm test"
PROJECT_DEV_URL="http://localhost:3000"
```

Every per-phase gate below invokes `RED_TEST_COMMAND` (or `GREEN_TEST_COMMAND`
on closeout) with `vitest run` (no watch). The orchestrator may pass a `-t`
filter for the phase-specific test names listed in §4–§8; the result must
still be `exit 0` and the aggregate must show the targeted assertions
described in each phase, not merely "passed".

## 2. Risk classification & test architecture

| Risk                                              | Severity   | Phase(s) covered             |
| ------------------------------------------------- | ---------- | ---------------------------- |
| Frame SVG nondeterminism (drift in digests)       | critical   | P1, P2, P5                   |
| Atlas JSON key-order / numeric drift             | critical   | P1, P3, P5                   |
| Sprite-sheet SVG injection (script/onclick/url)   | critical   | P2, P3, P5                   |
| Phaser load-time contract regression              | critical   | P3, P5                       |
| Unknown frame id ordering / duplicate frame ids   | high       | P1, P2                       |
| Per-frame override merging corrupting base spec   | high       | P2, P3                       |
| Atlas SVG malformed XML / unbalanced tags         | high       | P3, P5                       |
| Desk preview not rendering atlas / frame strip    | medium     | P4                           |
| Fixture drift (rebaseline without bake)           | medium     | P4, P5                       |
| TypeScript strict regression in new modules        | medium     | P2, P3, P5                   |
| Aggregating new tests into a vacuous PASS scaffold| medium     | P1                           |
| Registry note saying "resolved" while tests red   | low        | P5 (closeout)                |

## 3. Architecture guardrails & changed-contract risks

The new modules MUST satisfy these invariants. Every Red test below is a guard
test for one invariant; failure to satisfy the invariant is the falsification
condition.

1. **No duplicate validation surface.** Timeline and atlas modules must call
   the existing `validateSvgSource`/`composeSvg`/`composeSvgAsset` from
   `src/lib/svg-assets.ts` for every frame. A Red test asserts the
   frame-expansion output contains the base pipeline's signature substrings
   (`viewBox="..."`, `matrix(...)`, `--<slot>: #...;`). If a frame's SVG
   cannot pass `validateSvgSource`, the timeline must reject the frame —
   never silently drop it.
2. **Deterministic serialization.** Sorted object keys, finite numbers,
   integer-only where the type demands, no `Math.random` / `Date.now` /
   `process.hrtime` / `Object.keys` iteration order dependence. The
   existing `serializeCompositionSpec` is the reference shape; atlas
   metadata must mirror its key-order discipline.
3. **Bounded numerics.** Reuse the magnitude limits (`MAX_SVG_NUMBER`,
   `MAX_SCALE`, `MAX_OUTPUT_DIMENSION`) from `svg-assets.ts`. Atlas sheet
   pixel dimensions must be the sum of frame rects, never an unbounded
   accumulator.
4. **Stable frame ids.** Frame ids must match the existing slug regex
   (`PART_ID_RE` / `SLOT_RE` family). Duplicate ids across frames must throw.
   Empty frame list must throw.
5. **Digest algorithm locked to SHA-256 / `crypto.subtle`.** No third-party
   hash libs. The existing `sha256` helper is reused. Frame digest and atlas
   sheet digest use the same code path.
6. **Phaser contract.** The atlas JSON shape consumed by `this.load.svg` at
   runtime must remain compatible with the existing `PhaserLoadConfig`. The
   fixture test pins the wire format: `key`, `url`, `svgConfig: {width, height}`.
7. **No new Python runtime.** Out-of-scope by product direction; CI smoke
   must not import any `.py` path.

Changed-contract risks the strategy must defend against:

- Replacing `composeSvg` with a parallel renderer (breaks Reuse rule).
- Adding a tween/easing layer (out of scope; tests must reject new
  `easing`, `tween`, `interpolation` keys in timeline JSON).
- Atlas SVG containing a `<style>` block that re-defines palette vars
  (must use `var(--slot)` only, never inline hex).
- Atlas SVG containing any non-`ALLOWED_SVG_TAGS` element (`<script>`,
  `<foreignObject>`, `<use>`, `<image>`).

## 4. Phase 1 — Contract-First Tests

**Risk class:** high (architectural). The first Red state must encode the
acceptance criteria in `spec.md` as failing tests before any code lands.

**Targeted Red command:**
```bash
npm test -- -t "timeline|atlas"
```
Expected: vitest exits non-zero. The new `src/lib/timeline.test.ts` and
`src/lib/atlas.test.ts` files contain failing tests; existing
`src/lib/svg-assets.test.ts` still passes (regression sentinel).

**Red tests (must be present in the failing suite):**

1. `validateTimelineSpec({version:1, frames:[]})` throws
   `TimelineValidationError("timeline.frames must be a non-empty array")`.
2. `validateTimelineSpec({version:1, frames:[{...}], composition:{part_id:"x"}} )`
   throws on unknown `part_id` against a sample library — guards the
   "known part/anchor references only" criterion.
3. `validateTimelineSpec({version:1, frames:[{id:"f1", duration_ms:0, ...}]})`
   throws on non-positive duration — guards "positive frame durations".
4. `validateTimelineSpec({version:1, frames:[{id:"f1",...},{id:"f1",...}]})`
   throws on duplicate stable frame id.
5. `validateAtlasMetadata({version:1, frames:[], digest:"..."})` throws on
   empty `frames` array — labeled-integer parse for `frame_count` field
   must report the integer `0` (A3 guard).
6. Atlas metadata contract test: `expect(metadata.frame_rects[0]).toEqual({
   id, x, y, width, height })` — explicit label parse, not bare digit regex.
7. Determinism Red test: `composeTimeline(spec).then(t => t.frames[0].svg)`
   is byte-equal across two calls; `t.sheet_digest` matches across two
   calls. (Implementation will be added in P2/P3 — these tests are Red.)
8. Phaser contract Red test: `packAtlas(...)` JSON output equals a frozen
   fixture. (Failing in P1, becomes the fixture in P3.)
9. **Anti-A4 vacuity guard:** A Phase-1 sentinel test asserts at least one
   `[x]` test passes before declaring "all Phase-1 tests Green" — so the
   all-`[~]` fixture cannot be misread as PASS.

**Falsification conditions (A-class coverage):**

- A3 (digit-only labeled count): every count/digest in P1 tests must be
  asserted via a *labeled* path: `expect(meta.frame_count).toBe(4)` (integer
  parse), `expect(meta.sheet_digest).toMatch(/^[a-f0-9]{64}$/)` (anchored
  regex with hex-only charset). Bare `expect(...).toMatch(/[0-9]+/)` is
  banned — that is A3's known failure mode.
- A4 (vacuous pass on nothing-done): P1 Red command must surface ≥3
  failures. A "Green" P1 with 0 failures is a vacuous PASS and is rejected.
- A5 (false-claim text vs test reality): any plan claim of "all checks
  pass" is checked against the actual `npm test` exit code.

**Green gate (P1 → P2):**
- `npm run typecheck` exits 0 (Red tests are real TS modules).
- `npm test` exits non-zero (Red is the point) with the targeted `-t`
  filter surfacing exactly the failing tests in §4.
- All non-targeted tests (existing `svg-assets.test.ts`) still pass.

**Closeout gate (P1):**
- Aggregated `npm test` (no `-t` filter) exits non-zero with the same
  failing count. The aggregate is intentionally red; this is the only
  phase where the full suite is allowed to be red.

**Artifact vs live-behavior:** Phase-1 tests are contract specs (program
falsifiability), not yet live behavior. They define the contract that
later phases will satisfy.

## 5. Phase 2 — Timeline Compiler

**Risk class:** critical (frame determinism, override merging, SVG safety
across N frames).

**Targeted Red command:**
```bash
npm test -- -t "timeline"
```
Expected: vitest exits non-zero. The frame compiler does not yet exist.

**Red tests (must be present in the failing suite):**

1. `compileTimeline({version:1, frames:[...]}, parts)` produces a
   `TimelineCompilation` whose `frames[i].svg` is byte-equal across two
   invocations with identical input.
2. Per-frame override: `frames[i].overrides.parts[0].part_id = "shirt-alt"`
   swaps only the named placement; sibling frames retain their base spec.
   Asserts override merges do not mutate the base spec object reference.
3. Per-frame override: `frames[i].overrides.palette.skin = "#abcdef"` is
   reflected in the frame SVG's palette style block and digests differ
   from the un-overridden frame.
4. Each frame records `digest: <64-hex>` matching `sha256(frame.svg)`.
   Reuse the existing `sha256` helper; no third-party hash.
5. Frame SVG passes `validateSvgSource` for every checked-in part
   involved (regression sentinel for the SVG-injection surface).
6. Frame id ordering is stable: sorting by `frame.id` after validation
   matches the input order even if frames arrive shuffled.
7. Negative duration, missing `id`, duplicate `id` — each surfaces a typed
   `TimelineValidationError` (not a thrown `TypeError`).

**Falsification conditions (A-class coverage):**

- A5: any "deterministic" claim must be backed by the byte-equal assertion.
  A test that only checks `digest.length === 64` is not sufficient.
- A6: registry notes claiming "frame digests stable" must cite this Red
  test as evidence; otherwise the note is overstated.
- B1 (security): a frame containing `<script>alert(1)</script>` inside an
  override part source must throw — never silently drop into the atlas.

**Green gate (P2 → P3):**
- `npm run typecheck` exits 0.
- Targeted `npm test -- -t "timeline"` exits 0.
- Aggregate `npm test` exits non-zero only on Phase-3 Red tests (Phase-2
  tests are now Green).
- `npm run build` exits 0.

**Closeout gate (P2):**
- All P2 tests Green; no `[~]` tasks in P2 carry over.
- Aggregate `npm test` non-zero only on P3 Red tests.

**Artifact vs live-behavior:** P2 introduces real behavior
(`compileTimeline`). All P2 tests are live-behavior; they invoke the
compiler twice and assert byte equality of the produced SVG strings.

## 6. Phase 3 — Atlas Packer

**Risk class:** critical (atlas JSON contract, sprite-sheet SVG safety,
Phaser load-time contract).

**Targeted Red command:**
```bash
npm test -- -t "atlas"
```

**Red tests (must be present in the failing suite):**

1. `packAtlas(timeline)` returns
   `{ sheet_svg, atlas_json: {version, frame_rects[], durations_ms[],
   sheet_digest}, phaser_load }`.
2. Row-major grid math: `frame_rects[i] = {id, x: (i mod cols) * fw,
   y: floor(i / cols) * fh, width: fw, height: fh}` for fixed
   `cols × rows`. A second invocation with same input yields byte-equal
   `sheet_svg` and byte-equal `atlas_json` (sorted via
   `JSON.stringify(..., Object.keys(...).sort())` in the test).
3. Determinism: `sheet_digest` is identical across two invocations and
   equals `sha256(sheet_svg)`.
4. Atlas JSON round-trip: `JSON.parse(JSON.stringify(atlas_json))` is
   deep-equal to `atlas_json`. (Catches non-finite numbers and `undefined`
   leakage.)
5. Sprite-sheet SVG safety: `sheet_svg` passes `validateSvgSource` —
   no `<script>`, no `on*` attrs, no `javascript:`/`url(...)`, no external
   href, only `ALLOWED_SVG_TAGS`. This is the **B1 (security) guard**:
   even if one frame's source is malicious, the sheet must reject.
6. Atlas SVG palette: every `var(--slot)` in `sheet_svg` resolves to a
   declared slot in the union of frame palettes — no orphan var refs.
7. Phaser load-time fixture: `atlas_json.phaser_load` equals
   `{ key: <asset_id>, url: "asset.svg",
     svgConfig: { width: <sheet_w>, height: <sheet_h> } }`. Locked by
   snapshot-equality against a frozen `examples/animation/atlas-phaser.json`.
8. `sheet_w`, `sheet_h` are integer pixel totals = `cols * frame_w`,
   `rows * frame_h`. Labeled-integer parse (A3 guard).
9. Frame rects are sorted by `id` before being laid out; rect equality
   must hold across a shuffled input that sorts to the same ids.
10. Negative path: packer throws on timeline with zero frames
    (belt-and-suspenders; timeline validation already rejects this).

**Falsification conditions (A-class coverage):**

- A1 (substring-as-structured-signal): the supervisor must read the new
  module's test name (not a substring of prose) when computing
  incomplete-task counts. The P3 Red test list above is structured
  (e.g. `"atlas: rect math row-major"`), not free-text.
- A3 (digit-only labeled count): every count in the atlas JSON is
  asserted as an integer on a labeled key. Bare regex matches against
  digit-only substrings are banned.
- A5: any "deterministic atlas" claim in the registry must be backed by
  test #2 and #3 above.
- B1 (security): test #5 is the injection-surface guard. If a frame
  contains `<script>`, the packer must throw, not produce the sheet.

**Green gate (P3 → P4):**
- `npm run typecheck` exits 0.
- Targeted `npm test -- -t "atlas"` exits 0.
- Aggregate `npm test` exits non-zero only on Phase-4 fixture tests.
- `npm run build` exits 0.

**Closeout gate (P3):**
- All P3 tests Green. The Phaser contract fixture is checked in and
  stable; any rebaseline updates the fixture and the PR description must
  cite the determinism tests that justify the new digest.

**Artifact vs live-behavior:** P3's fixture (`examples/animation/atlas-phaser.json`)
is an artifact/documentation test (locks the wire format). Tests #1–#4, #6,
#9, #10 are live behavior.

## 7. Phase 4 — Desk Preview and Example

**Risk class:** medium (browser rendering, fixture drift, copy-vs-behavior).

**Targeted Red command:**
```bash
npm test -- -t "examples|desk"
```

**Red tests (must be present in the failing suite):**

1. `examples/animation/<name>.json` parses through `validateTimelineSpec`.
2. The example timeline has ≥ 4 frames (labeled integer parse on
   `frame_count`).
3. `compileTimeline(example).digest_per_frame` matches a frozen fixture
   array in `examples/animation/<name>.digest.json`.
4. `packAtlas(example).sheet_digest` matches a frozen fixture.
5. Desk preview page renders the frame strip and the atlas SVG without
   console errors (browser smoke; see §9 for `ux-browser-review`).

**Falsification conditions (A-class coverage):**

- A4 (vacuous pass): the example must be a real 4+ frame timeline with
  non-trivial overrides; a single-frame placeholder must not be accepted.
- A5: any "fixtures locked" claim must be backed by tests #3 and #4.
- A6: the docs/README claim "atlas JSON consumable by Phaser load-time
  texture flow" is only valid after `npm test -- -t "phaser"` exits 0.

**Green gate (P4 → P5):**
- `npm run typecheck` exits 0.
- Targeted `npm test -- -t "examples|desk"` exits 0.
- Aggregate `npm test` exits non-zero only on P5 (the verification phase
  itself is run-once and Green at the end).

**Closeout gate (P4):**
- Example checked in with deterministic per-frame digests.
- Desk preview renders the frame strip and the atlas SVG (browser
  evidence collected per §9).

**Artifact vs live-behavior:** The example JSON and digest fixture are
artifacts (documentation/snapshot tests). The desk-preview test is live
behavior (the page must actually render the SVG).

## 8. Phase 5 — Verification

**Risk class:** low (gate enforcement), but A5/A6 vigilance required.

**Targeted Red command:** none — P5 is verification, not Red.

**Verification commands (all must exit 0):**
```bash
npm run typecheck   # PROJECT_LINT
npm test            # PROJECT_TESTS, full suite
npm run build       # PROJECT_CHECKS
```

**Falsification conditions (A-class coverage):**

- A5: any "all checks pass" claim in `measure/tracks.md`,
  `measure/tech-debt.md`, or the PR description must be backed by the
  actual exit codes recorded in the verification block. The P5 review
  re-runs all three commands and records exit codes.
- A6: the tech-debt entry for animation/atlas (the deferred Medium item
  in `measure/tech-debt.md`) is marked `Resolved` only if
  `npm test -- -t "atlas|timeline|examples"` exits 0 with no skipped
  tests. Otherwise the entry keeps `Open` status.
- A9: no test references `measure/archive/animation_timeline_atlas_packing_...`
  — the track is live and tests must use `measure/tracks/...`.

**Green gate (P5 → closeout):**
- All three verification commands exit 0.
- Aggregate suite is fully Green (no `[~]` tasks).
- Tech-debt entry updates per A6 above.

**Closeout gate (P5):**
- Track moves to `measure/archive/animation_timeline_atlas_packing_20260716/`
  per `measure/workflow.md`.
- Audit agent re-runs the verification block as final proof.

## 9. Per-phase gate applicability

The strategy explicitly assigns applicability per phase. Every role still
runs and writes a result each phase; `not_applicable` roles write a
structured "not_applicable + reason" record rather than skipping the
phase. `webbridge_status` is recorded as `not_run` for any phase where
`ux-browser-review` is not_applicable.

| Gate                       | P1 Contract-First | P2 Timeline Compiler | P3 Atlas Packer      | P4 Desk Preview       | P5 Verification |
| -------------------------- | ----------------- | -------------------- | -------------------- | --------------------- | --------------- |
| review-a-correctness       | applicable        | applicable           | applicable           | applicable            | applicable      |
| review-b-security          | applicable        | applicable           | applicable           | applicable (URL only) | applicable      |
| review-c-ux-api            | applicable (API)  | applicable (API)     | applicable (API)     | applicable (UX+API)   | applicable      |
| adversarial-testing        | applicable        | applicable           | applicable           | not_applicable        | applicable      |
| ux-browser-review         | not_applicable    | not_applicable       | not_applicable       | applicable            | not_applicable  |
| webbridge_status           | not_run           | not_run              | not_run              | run (Phase 4 only)    | not_run         |

**Notes on applicability:**

- **review-b-security** is applicable in every phase. SVG validation is an
  injection surface throughout: P1 hardens the timeline schema, P2 must
  route every frame through `validateSvgSource`, P3 must reject sheets
  whose concatenated content violates `ALLOWED_SVG_TAGS` /
  `ALLOWED_SVG_ATTRIBUTES`, P4 must ensure the desk preview does not
  `dangerouslySetInnerHTML` untrusted SVG into the DOM.
- **adversarial-testing** applies to P1, P2, P3 (deterministic
  serialization, frame digests, atlas JSON key-order, Phaser contract
  fixture are all attack surfaces), and to P5 (verification of aggregate
  determinism). P4 is not_applicable — desk preview does not introduce
  new deterministic-logic risk beyond what P2/P3 already covered.
- **ux-browser-review** applies only to P4. P4 touches `pages/` and the
  desk preview must render the frame strip + atlas SVG. Browser evidence
  via webbridge is required. P1–P3 are lib-only and ship no UI surface.
  The role still runs in those phases and records `not_applicable` +
  reason ("lib-only phase, no `pages/` changes").
- **review-c-ux-api** applies in P1–P3 for the public-API surface
  (timeline spec schema, atlas JSON shape) and in P4 for the desk UX.

## 10. Fixtures, mocks, and live-behavior proof

**Fixtures (checked in, deterministic):**

- `examples/animation/walk-cycle.json` — 4+ frame example timeline with
  per-frame overrides (part swaps, placement offsets, palette values).
- `examples/animation/walk-cycle.frame-digests.json` — frozen per-frame
  SHA-256 digests. Rebaseline only via a PR that also rebaselines the
  composition-engine output and cites the determinism tests.
- `examples/animation/walk-cycle.atlas.json` — frozen atlas JSON with
  `frame_rects[]`, `durations_ms[]`, `sheet_digest`, `phaser_load`.
- `examples/animation/atlas-phaser.json` — frozen Phaser contract fixture
  consumed by test #7 in P3.

**Mocks:** None for `sha256` (real `crypto.subtle` is used in node 22).
None for `validateSvgSource` (real validator). Mocks are not appropriate
for a determinism contract — using a mock would let drift hide.

**Live-behavior proof requirements:**

- Every "deterministic" claim must be backed by two successive invocations
  producing byte-equal output. Tests assert `expect(first).toBe(second)`
  on the SVG string, not just hash equality.
- Every "validates input" claim must be backed by both a passing case
  and a failing case (per `src/lib/svg-assets.test.ts` convention).
- The Phaser contract fixture is consumed by a frozen
  `JSON.parse`/`JSON.stringify` round-trip; mutation of the fixture
  requires a separate PR.

## 11. Intentionally-red aggregate-suite handling

The aggregate suite is intentionally red during P1 (the entire design is
TDD). The orchestrator must:

1. Record `aggregate_status: intentionally_red` for P1, with the failing
   test names enumerated.
2. Not declare P1 Green until `npm test -- -t "timeline|atlas"` shows the
   expected Red failures and `npm test` (untargeted) preserves the
   pre-existing green tests in `svg-assets.test.ts`.
3. Promote aggregate to `green_only_when_targeted` for P2, P3, P4: the
   targeted `-t` filter is Green, the aggregate still shows P3/P4 Red
   tests until those phases complete.
4. Reach `aggregate_green` only at the end of P5.

A vacuous "everything green at P1" reading is rejected under A4.

## 12. Artifact vs live-behavior distinction

- **Artifact / documentation tests** (in `examples/animation/*.json` and
  the digest fixtures) lock the wire format. They are not a substitute
  for live behavior; they sit alongside live tests.
- **Live behavior tests** are the source of truth: `composeTimeline`,
  `packAtlas`, and the desk preview rendering.

The strategy labels each Red test as artifact or live in §4–§7. The
orchestrator audit must not promote a Green on artifacts alone; at least
one live test in each phase must be Green before that phase closes.

## 13. Anti-pattern coverage matrix

| Anti-pattern                                    | Defended in phases         | Defense                                                                                       |
| ----------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| A1 — substring-as-structured-signal             | P1, P2, P3                 | Test names are structured strings (`"atlas: rect math row-major"`), not prose fragments.     |
| A3 — digit-only as labeled count                | P1, P3, P4                 | Counts asserted via labeled keys (`frame_count`, `sheet_digest`), integer-parse, anchored regex. |
| A4 — vacuous pass on nothing-done               | P1, P4                     | P1 sentinel: ≥3 failing tests required to call P1 Green. P4 sentinel: ≥4 frames in example.   |
| A5 — false-claim text vs test reality           | P1, P2, P3, P4, P5         | Each "deterministic / fixture locked / all checks pass" claim must cite a specific test ID.    |
| A6 — registry-note overstatement                | P5                         | Tech-debt entry for animation/atlas only moves to `Resolved` after adversarial determinism tests are Green. |
| A9 — pre-existing test references archived paths| P5                         | All test paths point to `measure/tracks/animation_timeline_atlas_packing_20260716/...` until closeout. |
| B1 (security) — SVG injection via frame / sheet | P2, P3, P4                 | Every frame passes `validateSvgSource`; atlas sheet passes `validateSvgSource`; desk does not `dangerouslySetInnerHTML` untrusted SVG. |

## 14. Phase base SHA capture

The orchestrator must capture the immutable `phase_base_sha` for each
phase **immediately after the strategy commit lands on `main`**. Concretely:

1. The strategy-role agent (this role) commits
   `measure/tracks/animation_timeline_atlas_packing_20260716/test-strategy.md`
   as the only staged file.
2. The orchestrator reads `git rev-parse HEAD` *after* that commit and
   stores the SHA as `phase_base_sha` for Phase 1.
3. For subsequent phases, the orchestrator captures `phase_base_sha`
   immediately after the prior phase's Green commit lands, before the
   next phase's first Red commit.

This strategy file **must not** embed a SHA that predates the strategy
commit. The SHA is recorded by the orchestrator, not authored into this
file.

## 15. Open questions for downstream roles

These are intentionally not answered here; the implementation role and
the reviewer roles resolve them:

- Exact column count for the 4-frame walk-cycle (`cols: 4` is the
  obvious choice; reject `cols: 2` only if the example needs wider
  sheets).
- Whether atlas sheet SVG emits a single `<style>` block or one per frame
  (default: single, sorted, deduped).
- Whether `phaser_load` is per-frame or per-sheet (default: per-sheet,
  matching the existing `PhaserLoadConfig`).