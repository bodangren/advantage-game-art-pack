# Project Workflow

## Guiding Principles

1. The plan is the source of truth.
2. Specs and style packs define behavior before rendering code does.
3. Use TDD for renderer, validator, and export contracts.
4. Prefer deterministic algorithms and stable file outputs.
5. Keep automated verification runnable with local standard tooling.

## Task Workflow

1. Select the next task in `plan.md`.
2. Mark it `[~]` before implementation.
3. Write or update failing `unittest` coverage for the task.
4. Implement the minimum code required to pass.
5. Refactor only after the tests pass again.
6. Run:
   - `python3 -m unittest discover -s tests -v`
   - `python3 -m compileall src`
7. If implementation changes the design, update `tech-stack.md` first.
8. Record known shortcuts in `tech-debt.md`.
9. Mark the task `[x]` after verification.

## Development Commands

### Setup

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install Pillow
```

### Daily Development

```bash
python3 -m unittest discover -s tests -v
python3 -m compileall src
python3 -m asf.cli --spec examples/swamp_slime.json --output outputs/swamp_slime
```

## Testing Requirements

- Every public module must have corresponding test coverage.
- Validate both success and failure paths for spec parsing.
- Verify deterministic rendering using repeated renders and hashed bytes.
- Verify export dimensions, metadata mappings, and palette limits.
