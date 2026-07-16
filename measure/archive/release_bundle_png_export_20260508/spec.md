# Spec: Release Bundle PNG Export

## Goal
Wire the release bundle exporter to copy actual compiled PNG files from the candidate loop output directory instead of stubbing the copy step.

## Acceptance Criteria
- [ ] Bundle exporter reads candidate loop output paths from manifest
- [ ] Copies all rendered PNGs into the release bundle directory
- [ ] Validates that every expected PNG exists before bundling
- [ ] Generates audit report listing included files and checksums
- [ ] Graceful handling of missing assets (warn and skip, don't fail)

## Out of Scope
- ZIP compression (already implemented)
- Cloud upload destinations
