# Plan: Release Bundle PNG Export

## Phase 1: Manifest Parsing (TDD)
- [ ] Write tests for reading candidate loop manifest JSON
- [ ] Implement manifest parser with validation
- [ ] Handle missing or malformed manifests gracefully

## Phase 2: Asset Copying (TDD)
- [ ] Write tests for copying PNGs from candidate output to bundle dir
- [ ] Implement asset copy with checksum verification
- [ ] Handle missing assets with warnings

## Phase 3: Audit Report (TDD)
- [ ] Write tests for audit report generation
- [ ] Implement audit report with file list, sizes, and checksums
- [ ] Save audit report alongside bundle

## Phase 4: Integration (TDD)
- [ ] Write integration test for full bundle export end-to-end
- [ ] Wire into `asf bundle` CLI command
- [ ] Verify backward compatibility with existing bundle workflows

## Phase 5: Finalize
- [ ] Update tech-debt.md to mark release bundle item resolved
- [ ] Update tracks.md and commit
