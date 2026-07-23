# Plan: Continuous Integration Quality Gate Pipeline

Start from the green baseline delivered by `test_suite_repair_20260724` so CI is
green on day one. This track adds no product behavior and touches no visual
acceptance gate. Follow Contract-First TDD: define the workflow's required
behavior as tests/assertions, then implement.

## Phase 1: Contract-First Tests (Red)

- [ ] Add a test that loads `.github/workflows/ci.yml` (or equivalent), parses it
      as YAML, and asserts it triggers on `pull_request` and `push` to the
      default branch.
- [ ] Add a test asserting the workflow runs the `typecheck`, `test`, and `build`
      npm scripts exactly as defined in `package.json` (no script name drift).
- [ ] Add a test asserting the default CI `test` invocation excludes
      `*.live.test.ts` (via vitest config or explicit filter) so CI stays green
      without secrets.
- [ ] Add a test asserting a separate opt-in job or `workflow_dispatch` path
      exists for live/external tests and is gated on secrets, not run by default.

## Phase 2: Workflow Implementation

- [ ] Create `.github/workflows/ci.yml` with a pinned Node 22+ setup, dependency
      caching, and ordered `typecheck`, `test`, and `build` steps/jobs with
      individually visible pass/fail.
- [ ] Configure vitest (or the CI `test` filter) so `*.live.test.ts` is excluded
      from the default run while remaining runnable locally and on dispatch.
- [ ] Add the opt-in live-test job gated on repository secrets and/or
      `workflow_dispatch`; ensure it never runs on ordinary PRs.

## Phase 3: Local Parity and Documentation

- [ ] Verify the same gate commands pass locally: `npm run typecheck`,
      `npm test`, `npm run build`.
- [ ] Add a README section documenting how to run the gates locally and how to
      trigger the live-test opt-in job.
- [ ] Confirm `measure/doctor.sh` still passes after the vitest config change.

## Phase 4: Verify

- [ ] Run the Phase 1 contract tests against the implemented workflow; confirm
      they pass.
- [ ] Run `npm test`, `npm run typecheck`, and `npm run build`; confirm green.
- [ ] Note the new CI baseline in `measure/tech-debt.md` only if a residual
      limitation remains (e.g. macOS/Windows runner not yet covered).
