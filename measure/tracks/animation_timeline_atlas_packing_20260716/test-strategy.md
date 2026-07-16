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
TYPECHECK_GATE="npm run typecheck"
PRE_FLIGHT_FILTER="timeline|atlas"
PRE_FLIGHT_MIN_EXECUTABLE_FAILURES=3
PRE_FLIGHT_SHA256_GREP="sha256\\("
PRE_FLIGHT_RED_FILES_ALLOWED="\\.test\\.(ts|tsx|js|jsx)$|/(__tests__|tests)/"
```

Every per-phase gate below invokes `RED_TEST_COMMAND` (or `GREEN_TEST_COMMAND`
on closeout) with `vitest run` (no watch). The orchestrator may pass a `-t`
filter for the phase-specific test names listed in §4–§8; the result must
still be `exit 0` and the aggregate must show the targeted assertions
described in each phase, not merely "passed".

**Phase 1 adds a pre-flight layer (see §4.1) that mechanically enforces
typecheck-clean imports, no module-not-found failures, ≥3 EXECUTABLE
failing assertions, and that the atlas digest test calls the real
`sha256` helper from `./svg-assets`.** The pre-flight checks are
referenced by the gate names above (`TYPECHECK_GATE`,
`PRE_FLIGHT_FILTER`, `PRE_FLIGHT_MIN_EXECUTABLE_FAILURES`,
`PRE_FLIGHT_SHA256_GREP`, `PRE_FLIGHT_RED_FILES_ALLOWED`).

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
| Module-not-found masquerading as Red (suite-level failure)| critical | P1                       |
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
The Red state MUST be **executable** (assertion-level failures, not
suite-level module-not-found failures) and **typecheck-clean** (no
TS2307 / TS2xxx errors). A Red commit that fails these constraints is
not contract-first; it is contract-missing.

### 4.1 Pre-flight: mechanical Red state acceptance

The orchestrator MUST run all five pre-flight checks below and verify
each passes BEFORE promoting the Phase 1 commit. A Red commit that
fails any check is rejected; the Phase-1 implementer revises the
commit, not the strategy.

| # | Pre-flight check                                          | Command (gate name)                                              | Pass criterion                                            | Falsification                                        |
|---|-----------------------------------------------------------|------------------------------------------------------------------|-----------------------------------------------------------|------------------------------------------------------|
| 1 | Typecheck is clean                                         | `npm run typecheck` (`TYPECHECK_GATE`)                           | exit code 0; no `Cannot find module` / TS2307 errors      | Any TS2307 or other typecheck error                  |
| 2 | No test file fails at import time                          | `npm test` (no `-t` filter)                                      | 0 `Failed Suites` entries with `Cannot find module`       | Any suite-level `Failed Suites` failure              |
| 3 | Red commit files are all at test-only support paths        | `git diff --name-only ${baseline_sha}..HEAD \| grep -vE "$PRE_FLIGHT_RED_FILES_ALLOWED"` | every committed file matches the allowlist (test files, `__tests__/`, `tests/`, `measure/`) | Any committed production-path file (e.g. `src/lib/timeline.ts`, `src/lib/atlas.ts`) |
| 4 | Targeted run produces ≥3 EXECUTABLE failures               | `npm test -- -t "timeline\|atlas"` (`PRE_FLIGHT_FILTER`)         | exit non-zero; `Tests  N failed` with N ≥ `PRE_FLIGHT_MIN_EXECUTABLE_FAILURES` (= 3) | 0 failures; or all failures are suite-level not test-level |
| 5 | Atlas digest test invokes real `sha256` helper             | `grep -rE 'sha256\(' src/lib/__tests__/ src/lib/atlas.test.ts` (`PRE_FLIGHT_SHA256_GREP`) | ≥1 hit importing `sha256` from `./svg-assets` (Pattern B) or `../svg-assets` (Pattern A)             | Atlas test computes digest by hand, hardcodes hex, or uses `crypto.createHash` directly |

Check #1 enforces A4 (vacuous pass) at the typecheck layer: a
typecheck-clean state means test files actually resolve their
imports. Check #2 enforces the new "no module-not-found" invariant.
Check #3 enforces the canonical Mid Red ownership boundary — every
file in the Red commit must be at a test-only support path accepted
by the supervisor's `non_test_committed_changes_since` allowlist
(`*.test.ts`, `*.spec.ts`, paths under `__tests__/`, `tests/`, or
`measure/`). Production-path files like `src/lib/timeline.ts` or
`src/lib/atlas.ts` MUST NOT appear in the Phase 1 Red commit; their
creation is deferred to Phase 2/3 Green (jr role).
Check #4 enforces "≥3 EXECUTABLE failing assertions" mechanically
by counting test-level (not suite-level) failures. Check #5 enforces
the sha256-helper contract: hand-rolled digests, hardcoded hex
literals, or direct `node:crypto.createHash` usage bypass the helper
and are rejected.

### 4.2 Phase 1 Red authoring boundary (test-only support paths)

**Phase 1 Red MUST be authored entirely in test files (`*.test.ts`)
and/or test-only support paths accepted by the canonical Mid Red
ownership gate** (`non_test_committed_changes_since` in
`measure/automation-supervisor.py`). The gate's allowlist is:

- Any path ending in `*.test.ts`, `*.test.tsx`, `*.spec.ts`,
  `*.spec.tsx`, `*.test.js`, `*.test.jsx`, `*.spec.js`,
  `*.spec.jsx`, `*_test.go`, `*.bats`.
- Any path containing `/__tests__/` or `/tests/`, or any path
  starting with `tests/`.
- Any path starting with `measure/`.

**Production-path files (e.g. `src/lib/timeline.ts`,
`src/lib/atlas.ts`) are FORBIDDEN in the Phase 1 Red commit.** Their
creation is owned by the Phase 2 (timeline compiler) and Phase 3
(atlas packer) Green roles, respectively. Phase 1 Red's job is to
encode the contract as failing tests; Phase 2/3 Green's job is to
satisfy that contract by introducing the production modules and
deleting the `__tests__/` stubs.

Two patterns satisfy the test-only support boundary; the implementer
may pick either.

**Pattern A (preferred — co-located test + stub under `__tests__/`).**

Place the test file and the typed stub under the same
`src/lib/__tests__/` directory, which the checker accepts because
the path contains `/__tests__/`:

- `src/lib/__tests__/timeline.ts` — typed stub exporting
  `TimelineSpec`, `TimelineCompilation`, `TimelineValidationError`,
  `validateTimelineSpec`, `compileTimeline`. Runtime functions throw
  `new Error("Phase 1 stub — implement in Phase 2")`.
- `src/lib/__tests__/atlas.ts` — typed stub exporting
  `AtlasMetadata`, `AtlasPacked`, `AtlasPackerOptions`,
  `AtlasValidationError`, `validateAtlasMetadata`, `packAtlas`.
  Runtime functions throw `new Error("Phase 1 stub — implement in Phase 3")`.
- `src/lib/__tests__/timeline.test.ts` — imports
  `from "./timeline"` (sibling); co-located.
- `src/lib/__tests__/atlas.test.ts` — imports
  `from "./atlas"` (sibling); co-located.

When Phase 2/3 ships the production modules, the `__tests__/` stubs
are deleted and the tests move to `src/lib/timeline.test.ts` /
`src/lib/atlas.test.ts` (imports switch to the production paths).
The `__tests__/` directory is a Phase 1 scaffolding convention only;
it is not a permanent location.

**Pattern B (alternative — test at production path, stub at
`__tests__/`).**

Keep the test files at their conventional locations
(`src/lib/timeline.test.ts`, `src/lib/atlas.test.ts`) and have them
import from `./__tests__/timeline` / `./__tests__/atlas`:

- `src/lib/__tests__/timeline.ts` — typed stub (as in Pattern A).
- `src/lib/__tests__/atlas.ts` — typed stub (as in Pattern A).
- `src/lib/timeline.test.ts` — imports `from "./__tests__/timeline"`.
- `src/lib/atlas.test.ts` — imports `from "./__tests__/atlas"`.

The test files end in `.test.ts` and the stub files live under
`__tests__/`, so every committed file in the Red commit matches the
checker allowlist. When Phase 2/3 ships production, the tests
update their import paths to `./timeline` / `./atlas` and the
`__tests__/` stubs are deleted.

**Stub contract (both patterns).** Each stub exports:

```ts
// src/lib/__tests__/timeline.ts
export class TimelineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimelineValidationError";
  }
}
export interface TimelineSpec {
  readonly version: 1;
  readonly frames: readonly TimelineFrame[];
}
export interface TimelineFrame {
  readonly id: string;
  readonly duration_ms: number;
  readonly composition: unknown;
}
export interface TimelineCompilation {
  readonly frames: ReadonlyArray<{ readonly id: string; readonly svg: string; readonly digest: string }>;
}
export function validateTimelineSpec(_spec: unknown): TimelineSpec {
  throw new Error("Phase 1 stub — implement in Phase 2");
}
export async function compileTimeline(
  _spec: TimelineSpec,
  _parts: readonly unknown[],
): Promise<TimelineCompilation> {
  throw new Error("Phase 1 stub — implement in Phase 2");
}
```

```ts
// src/lib/__tests__/atlas.ts
export class AtlasValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlasValidationError";
  }
}
export interface AtlasMetadata {
  readonly version: 1;
  readonly frame_count: number;
  readonly frame_rects: ReadonlyArray<{ id: string; x: number; y: number; width: number; height: number }>;
  readonly durations_ms: readonly number[];
  readonly sheet_digest: string;
  readonly sheet_width: number;
  readonly sheet_height: number;
}
export interface AtlasPackerOptions {
  readonly cols: number;
  readonly frame_w: number;
  readonly frame_h: number;
}
export interface AtlasPacked {
  readonly sheet_svg: string;
  readonly atlas_json: AtlasMetadata;
  readonly phaser_load: { readonly key: string; readonly url: string; readonly svgConfig: { readonly width: number; readonly height: number } };
}
export function validateAtlasMetadata(_metadata: unknown): AtlasMetadata {
  throw new Error("Phase 1 stub — implement in Phase 3");
}
export async function packAtlas(
  _timeline: unknown,
  _options: AtlasPackerOptions,
): Promise<AtlasPacked> {
  throw new Error("Phase 1 stub — implement in Phase 3");
}
```

Stubs satisfy `tsc --noEmit` because they have typed signatures and
throw values for runtime calls. Phase 2 REPLACES the production
`timeline.ts` (and DELETES the `__tests__/timeline.ts` stub); Phase 3
does the same for `atlas.ts`. The error classes are kept across all
phases (validation error contract is stable).

### 4.3 Red tests (must be present in the failing suite)

Each numbered test below MUST be present in the failing suite and
MUST produce an **assertion-level** failure (not a suite-level
module-not-found failure). Every test name is a stable ID; the
non-vacuity sentinel (§4.4) parses the test output and asserts
these IDs appear by name.

The imports referenced below resolve via Pattern A or Pattern B in
§4.2 — i.e., the test files reach `validateTimelineSpec`,
`compileTimeline`, `validateAtlasMetadata`, `packAtlas`, and the
typed error classes through the `src/lib/__tests__/` stubs, never
through a production-path import. This is the only way Phase 1 Red
satisfies pre-flight check #2 (no suite-level module-not-found) and
pre-flight check #3 (no production-path files in the Red commit).

1. `timeline: rejects empty frame list` — `validateTimelineSpec({version:1, frames:[]})`
   throws `TimelineValidationError("timeline.frames must be a non-empty array")`.
   In Red, the stub throws `"Phase 1 stub — implement in Phase 2"`; the
   test asserts the typed-error class name and a message pattern that
   the Phase 2 Green must satisfy.
2. `timeline: rejects non-positive frame duration` — guards "positive frame durations"
   via `duration_ms === 0` and `duration_ms === -1` cases.
3. `timeline: rejects duplicate stable frame ids` — guards stable-id
   uniqueness; the typed error message must contain `duplicate frame id`.
4. `timeline: rejects unknown part_id against sample library` — guards
   "known part/anchor references only".
5. `atlas: rejects metadata with empty frames array` — labeled-integer
   parse for `frame_count` field must report the integer `0` (A3 guard).
6. `atlas: metadata frame_rects carry labeled id/x/y/width/height` — explicit
   label parse, not bare digit regex. Anchored regex on
   `sheet_digest: /^[a-f0-9]{64}$/`.
7. `atlas: sheet_digest matches sha256(sheet_svg) and is stable` — the
   digest test computes the expected digest via the **real `sha256`
   helper imported from `./svg-assets`**; see §4.5 for the exact
   expected pattern.
8. `atlas: phaser_load fixture matches frozen contract` — frozen
   `{key, url, svgConfig:{width, height}}` equality against a
   module-scoped constant.
9. `phase1: non-vacuity sentinel` — see §4.4; runs the targeted vitest
   invocation programmatically (via `vitest` Node API or a sidecar
   script under `scripts/` or `src/lib/__tests__/`) and asserts
   `exitCode !== 0` plus
   `failedTestNames.length >= PRE_FLIGHT_MIN_EXECUTABLE_FAILURES`.

### 4.4 Non-vacuity sentinel (mechanical)

Phase 1 MUST include at least one executable sentinel test that
verifies the failure mode is non-vacuous. The sentinel runs the
targeted vitest command as a subprocess (or via the vitest Node API)
and asserts:

- `result.exitCode !== 0` — at least one failure was reported.
- `result.failedTestNames.length >= PRE_FLIGHT_MIN_EXECUTABLE_FAILURES` —
  at least three distinct test names failed.
- `result.failedTestNames.every(name => /timeline|atlas/.test(name))` —
  the failures come from the new modules, not unrelated breakage.
- `!result.suiteLevelFailures.some(f => /Cannot find module/.test(f))` —
  no import-level failures.

Concretely, the sentinel test calls `execFileSync("npx", ["vitest",
"run", "--reporter=json", "-t", "timeline|atlas"], { encoding: "utf8" })`,
parses the JSON output, and asserts the four invariants above. A
vacuous "everything green at P1" reading is rejected under A4. A
"tests broken at import time" reading is rejected under pre-flight
check #2.

The sentinel test itself MUST be one of the failing tests (it
asserts non-vacuity, so it cannot be vacuously green). It is the
ninth Red test in §4.3.

### 4.5 sha256 digest comparison (specific contract)

The atlas digest test (test #7 in §4.3) MUST use the real `sha256`
helper from `./svg-assets`. The exact pattern (using Pattern A from
§4.2 as the canonical layout; Pattern B differs only in the import
path of `compileTimeline`/`packAtlas`):

```ts
// src/lib/__tests__/atlas.test.ts (Pattern A)
import { describe, expect, it } from "vitest";
import { sha256 } from "../svg-assets";
import { SVG_PARTS } from "../catalog";
import { compileTimeline } from "./timeline";   // stub at __tests__/timeline
import { packAtlas } from "./atlas";           // stub at __tests__/atlas
import type { TimelineSpec } from "./timeline";

const SAMPLE_TIMELINE: TimelineSpec = {
  version: 1,
  frames: [
    { id: "walk-1", duration_ms: 120, composition: {} as unknown },
    { id: "walk-2", duration_ms: 120, composition: {} as unknown },
  ],
};

it("atlas: sheet_digest matches sha256(sheet_svg) and is stable", async () => {
  const timeline = await compileTimeline(SAMPLE_TIMELINE, SVG_PARTS);
  const first = await packAtlas(timeline, { cols: 2, frame_w: 32, frame_h: 32 });
  const second = await packAtlas(timeline, { cols: 2, frame_w: 32, frame_h: 32 });

  const expectedDigest = await sha256(first.sheet_svg); // <-- real helper from ../svg-assets
  expect(first.atlas_json.sheet_digest).toBe(expectedDigest);
  expect(first.atlas_json.sheet_digest).toMatch(/^[a-f0-9]{64}$/);
  expect(first.atlas_json.sheet_digest).toBe(second.atlas_json.sheet_digest);
});
```

The contract is enforced by pre-flight check #5, which greps for
`sha256\(` in `src/lib/__tests__/` and `src/lib/atlas.test.ts` (or
whichever paths the implementer chose under §4.2). Forbidden patterns:

- `const expectedDigest = "e3b0c44298fc...";` (hardcoded hex literal)
- `import { createHash } from "node:crypto"; createHash("sha256")...` (bypass)
- `const expectedDigest = digestFromSpy;` where `digestFromSpy` is a mock

The only allowed path is `import { sha256 } from "../svg-assets"`
(Pattern A) or `import { sha256 } from "./svg-assets"` (Pattern B).
Pattern B keeps the test file at `src/lib/atlas.test.ts`, so the
import resolves to the existing `src/lib/svg-assets.ts`.

In Red, `compileTimeline` and `packAtlas` throw
`"Phase 1 stub — implement in Phase N"`, so the `await` calls reject
before reaching the `expectedDigest` comparison. The test produces an
assertion-level failure (the awaited call rejects), which satisfies
pre-flight check #4 (≥3 EXECUTABLE failures) and pre-flight check #2
(no suite-level module-not-found).

### 4.6 Falsification conditions (A-class coverage)

- A1 (substring-as-structured-signal): every test name in §4.3 is a
  stable, greppable ID (e.g., `"timeline: rejects empty frame list"`),
  not free prose.
- A3 (digit-only labeled count): every count/digest in P1 tests is
  asserted via a labeled path (`expect(meta.frame_count).toBe(N)`,
  integer parse). The `sheet_digest` regex is anchored and hex-only.
- A4 (vacuous pass on nothing-done): the non-vacuity sentinel
  (§4.4) mechanically enforces ≥3 EXECUTABLE failures. Pre-flight
  check #4 is the same invariant expressed at the gate layer.
- A5 (false-claim text vs test reality): any plan claim of
  "all checks pass" is checked against the actual `npm test` exit
  code; pre-flight check #1 catches false typecheck claims.
- A11 (module-not-found masquerading as Red — new): pre-flight
  checks #1 and #2 reject the case where `Cannot find module`
  errors inflate the failing-count while contributing zero
  assertions.

### 4.7 Green gate (P1 → P2)

- All pre-flight checks (§4.1, #1–#5) pass.
- `npm run typecheck` exits 0 (pre-flight #1).
- `npm test` exits non-zero (Red is the point) with the targeted `-t`
  filter surfacing exactly the failing tests in §4.3.
- `npm test -- -t "non-vacuity sentinel"` exits non-zero (sentinel is
  itself failing — that is the point).
- All non-targeted tests (existing `svg-assets.test.ts`) still pass
  (regression sentinel).

### 4.8 Closeout gate (P1)

- Aggregated `npm test` (no `-t` filter) exits non-zero with the same
  failing count. The aggregate is intentionally red; this is the only
  phase where the full suite is allowed to be red.
- Pre-flight check #4 (≥3 EXECUTABLE failures) holds on the aggregate.

### 4.9 Artifact vs live-behavior

Phase-1 tests are contract specs (program falsifiability), not yet
live behavior. They define the contract that later phases will
satisfy. The stubs throw `Error("Phase 1 stub — implement in Phase N")`
on runtime invocation, so every test produces an assertion-level
failure that names the future implementation phase. The non-vacuity
sentinel (§4.4) is itself a live-behavior test (it spawns a subprocess
and parses the JSON output).

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
   test names enumerated. The enumerated list MUST come from the
   non-vacuity sentinel (§4.4) JSON output, not from string-grep on
   vitest's human-readable summary.
2. Not declare P1 Green until pre-flight checks #1–#5 (§4.1) all pass
   on the current Red commit AND `npm test -- -t "timeline|atlas"`
   shows the expected Red failures AND `npm test` (untargeted) preserves
   the pre-existing green tests in `svg-assets.test.ts`.
3. Promote aggregate to `green_only_when_targeted` for P2, P3, P4: the
   targeted `-t` filter is Green, the aggregate still shows P3/P4 Red
   tests until those phases complete.
4. Reach `aggregate_green` only at the end of P5.

A vacuous "everything green at P1" reading is rejected under A4. A
"tests broken at import time" reading is rejected under pre-flight
check #2. A "tests passing but no real assertions ran" reading is
rejected by pre-flight check #4 (test-level failure count).

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
| A1 — substring-as-structured-signal             | P1, P2, P3                 | Test names are structured strings (`"atlas: rect math row-major"`, `"timeline: rejects empty frame list"`), not prose fragments. |
| A3 — digit-only as labeled count                | P1, P3, P4                 | Counts asserted via labeled keys (`frame_count`, `sheet_digest`), integer-parse, anchored regex. |
| A4 — vacuous pass on nothing-done               | P1, P4                     | P1: non-vacuity sentinel (§4.4) runs vitest programmatically and asserts `failedTestNames.length >= PRE_FLIGHT_MIN_EXECUTABLE_FAILURES` (3); pre-flight check #4 enforces the same at the gate layer. P4 sentinel: ≥4 frames in example. |
| A5 — false-claim text vs test reality           | P1, P2, P3, P4, P5         | Each "deterministic / fixture locked / all checks pass" claim must cite a specific test ID; pre-flight check #1 (TYPECHECK_GATE) catches false typecheck claims. |
| A6 — registry-note overstatement                | P5                         | Tech-debt entry for animation/atlas only moves to `Resolved` after adversarial determinism tests are Green. |
| A9 — pre-existing test references archived paths| P5                         | All test paths point to `measure/tracks/animation_timeline_atlas_packing_20260716/...` until closeout. |
| A11 — module-not-found masquerading as Red      | P1                         | Pre-flight check #1 (`TYPECHECK_GATE`): typecheck exits 0 (no TS2307). Pre-flight check #2: 0 `Failed Suites` entries with `Cannot find module`. Pre-flight check #3 (`PRE_FLIGHT_RED_FILES_ALLOWED`): every Red-commit file is at a test-only support path (`*.test.ts`, `__tests__/`, `tests/`, `measure/`); the canonical `non_test_committed_changes_since` allowlist forbids production-path files. Pre-flight check #4: failure count is test-level, not suite-level. |
| B1 (security) — SVG injection via frame / sheet | P2, P3, P4                 | Every frame passes `validateSvgSource`; atlas sheet passes `validateSvgSource`; desk does not `dangerouslySetInnerHTML` untrusted SVG. |

## 14. Phase base SHA capture

The orchestrator must capture the immutable `phase_base_sha` for each
phase **immediately after the strategy commit lands on `main`** AND
**after the Phase 1 pre-flight checks (§4.1) pass on the current
Red commit**. Concretely:

1. The strategy-role agent (this role) commits
   `measure/tracks/animation_timeline_atlas_packing_20260716/test-strategy.md`
   as the only staged file.
2. The orchestrator verifies that the Phase 1 Red commit satisfies
   pre-flight checks #1–#5 (§4.1): `TYPECHECK_GATE` exits 0,
   `npm test` reports 0 `Failed Suites` with `Cannot find module`,
   every committed file matches the `PRE_FLIGHT_RED_FILES_ALLOWED`
   allowlist (test files, `__tests__/`, `tests/`, `measure/`),
   `PRE_FLIGHT_FILTER` produces
   `>= PRE_FLIGHT_MIN_EXECUTABLE_FAILURES` test-level failures, and
   `PRE_FLIGHT_SHA256_GREP` finds the real `sha256` helper import
   in the atlas test file (located under `src/lib/__tests__/` per
   Pattern A, or `src/lib/` per Pattern B).
3. The orchestrator reads `git rev-parse HEAD` *after* that commit
   and stores the SHA as `phase_base_sha` for Phase 1.
4. For subsequent phases, the orchestrator captures `phase_base_sha`
   immediately after the prior phase's Green commit lands, before the
   next phase's first Red commit.

This strategy file **must not** embed a SHA that predates the strategy
commit. The SHA is recorded by the orchestrator, not authored into this
file. The SHA is captured only when the current Red commit has cleared
the Phase 1 pre-flight layer; a Red commit that fails pre-flight does
not produce a `phase_base_sha`, and the Phase-1 implementer is asked
to revise. **In particular, the orchestrator MUST NOT capture
`phase_base_sha` from a Red commit that introduces a production-path
file (`src/lib/timeline.ts` or `src/lib/atlas.ts`)** — those are
Phase 2/3 Green artifacts and would also be rejected by the canonical
Mid Red ownership gate.

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