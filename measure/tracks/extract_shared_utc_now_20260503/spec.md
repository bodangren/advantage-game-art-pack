# Spec: Extract Shared _utc_now Utility

## Problem

The `_utc_now()` utility function is duplicated across `batch_orchestrator.py`, `batch_runner.py`, and `batch_exporter.py`.

## Goals

- Extract `_utc_now()` to a shared utility module (`asf/utils.py`)
- Update all three files to import from the shared module

## Acceptance Criteria

- [ ] `asf/utils.py` contains the `_utc_now` function
- [ ] All three files import from `asf.utils`
- [ ] All tests pass