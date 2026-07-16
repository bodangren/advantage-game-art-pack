# Project Workflow

## Guiding Principles

1. The plan is the source of truth.
2. SVG parts and composition specs define behavior before UI code does.
3. Use TDD for validator, composition, and export contracts.
4. Prefer deterministic algorithms and stable file outputs.
5. Keep automated verification runnable with Node tooling.

## Task Workflow

1. Select the next task in `plan.md`.
2. Mark it `[~]` before implementation.
3. Write or update failing Vitest coverage for the task.
4. Implement the minimum TypeScript required to pass.
5. Refactor only after the tests pass again.
6. Run `npm run typecheck`, `npm test`, and `npm run build`.
7. If implementation changes the design, update `tech-stack.md` first.
8. Record known shortcuts in `tech-debt.md`.
9. Mark the task `[x]` after verification.

## Development Commands

### Setup

```bash
npm install
```

### Daily Development

```bash
npm run typecheck
npm test
npm run build
```

## Testing Requirements

- Every public compiler module must have corresponding Vitest coverage.
- Validate both success and failure paths for spec parsing.
- Verify deterministic serialization using repeated compositions and hashes.
- Verify export dimensions, metadata mappings, and palette limits.
