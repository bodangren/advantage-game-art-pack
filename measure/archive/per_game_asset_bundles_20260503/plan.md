# Plan: Per-Game Asset Bundle System

- [x] Write tests for BundleManifest dataclass validation (required categories, style pack reference)
- [x] Implement `BundleManifest` dataclass with categories: characters, enemies, npcs, props, fx, tiles, scenes, ui, loading
- [x] Write tests for bundle directory scaffolding (creates correct subdirectories and manifest)
- [x] Implement `asf bundle create` CLI subcommand that scaffolds bundle directory tree
- [x] Write tests for bundle completeness validation (reports missing categories)
- [x] Implement `BundleValidator` that checks each category has at least one compiled asset
- [x] Write tests for bundle export (copies compiled assets, generates metadata.json)
- [x] Implement `asf bundle export` CLI subcommand
- [x] Create example bundle manifest for library_dungeon theme
- [x] Write integration test: scaffold → validate → populate → export bundle
- [x] Run full test suite and verify `python3 -m compileall src`
