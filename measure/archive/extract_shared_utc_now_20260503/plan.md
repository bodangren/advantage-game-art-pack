# Plan: Extract Shared _utc_now Utility

- [x] Write test for `_utc_now` utility function (verifies ISO format output)
- [x] Create `src/asf/utils.py` with `_utc_now` function
- [x] Update `batch_orchestrator.py` to import from `asf.utils`
- [x] Update `batch_runner.py` to import from `asf.utils`
- [x] Update `batch_exporter.py` to import from `asf.utils`
- [x] Run tests to verify everything works