# Spec: Continuous Integration Quality Gate Pipeline

## Goal

Add a GitHub Actions continuous integration pipeline that runs the project's
existing quality gates (`npm run typecheck`, `npm test`, `npm run build`) on
every pull request and push to the default branch, so regressions are caught
before merge instead of during manual review. The remote is
`github.com/bodangren/advantage-game-art-pack`.

## Product Direction

The tech-stack quality gates are today run manually. With the repository-wide
suite repaired to green by `test_suite_repair_20260724`, CI can enforce that
baseline continuously. This track is pure developer experience and quality
hardening: it adds no product behavior, admits no assets, and touches no visual
acceptance gate. Live and external tests (the `*.live.test.ts` files and Forge
MCP replay scripts) require secrets or external services and must be isolated so
the default CI run stays green without them.

## Functional Requirements

- A GitHub Actions workflow file under `.github/workflows/` that:
  - Triggers on `pull_request` and `push` to the default branch.
  - Uses a pinned Node 22+ setup with dependency caching.
  - Runs `npm ci` (or `npm install` with the committed lockfile), then
    `npm run typecheck`, `npm test`, and `npm run build` as separate, ordered
    jobs or steps whose individual pass/fail is visible.
- Isolation of live/external tests: the default `npm test` invocation must
  exclude `*.live.test.ts` (or they must self-skip without credentials), and a
  separate opt-in job (gated on repository secrets / `workflow_dispatch`) may
  run them when configured.
- A vitest configuration or filter that keeps the default suite green without
  external dependencies, while leaving live tests runnable locally and on
  dispatch.
- A README section documenting how to run gates locally and how the live-test
  opt-in job is triggered.
- No modification to `measure/automation-supervisor.py`; the supervisor remains
  centrally managed.

## Acceptance Criteria

- [ ] A workflow file exists, parses as valid YAML, and references exactly the
      `typecheck`, `test`, and `build` scripts defined in `package.json`.
- [ ] On a clean checkout the workflow's default job runs the three gates and
      they pass (assuming the suite is green).
- [ ] `*.live.test.ts` files do not run in (and do not fail) the default CI job;
      they are reachable via a separate opt-in job or local invocation.
- [ ] Dependency caching is configured so repeated runs are fast.
- [ ] README documents local gate commands and the live-test opt-in path.
- [ ] `npm test`, `npm run typecheck`, and `npm run build` remain green locally.

## Out of Scope

- New product features, asset authoring, visual acceptance, deploying the vinext
  app, modifying `automation-supervisor.py`, and any change to the Forge
  ingestion contracts.
