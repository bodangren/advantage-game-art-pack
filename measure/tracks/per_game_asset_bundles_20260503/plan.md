# Plan: Per-Game Asset Bundle System

- [ ] Write tests for BundleManifest dataclass validation (required categories, style pack reference)
- [ ] Implement `BundleManifest` dataclass with categories: characters, enemies, npcs, props, fx, tiles, scenes, ui, loading
- [ ] Write tests for bundle directory scaffolding (creates correct subdirectories and manifest)
- [ ] Implement `asf bundle create` CLI subcommand that scaffolds bundle directory tree
- [ ] Write tests for bundle completeness validation (reports missing categories)
- [ ] Implement `BundleValidator` that checks each category has at least one compiled asset
- [ ] Write tests for bundle export (copies compiled assets, generates metadata.json)
- [ ] Implement `asf bundle export` CLI subcommand
- [ ] Create example bundle manifest for library_dungeon theme
- [ ] Write integration test: scaffold → validate → populate → export bundle
- [ ] Run full test suite and verify `python3 -m compileall src`
