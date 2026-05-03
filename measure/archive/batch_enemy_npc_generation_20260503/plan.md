# Plan: Batch Enemy & NPC Generation Pipeline

- [x] Write tests for prompt parser that extracts theme, style, count, and archetype from natural language
- [x] Implement `PromptParser` dataclass with `parse(prompt: str) -> BatchBrief` method
- [x] Write tests for entity spec generator that produces valid specs from a BatchBrief
- [x] Implement `EntitySpecGenerator` that selects parts, palettes, and animations from style pack
- [x] Write tests for palette variation logic (ensure each entity gets distinct but valid palette)
- [x] Implement `PaletteVariator` that shuffles palette assignments within style pack limits
- [x] Wire BatchBrief generation into BatchOrchestrator planning stage
- [x] Add `asf batch-generate` CLI subcommand with --prompt and --output-dir flags
- [x] Write integration test: prompt → 10 entity specs → compiled sprite sheets
- [x] Add example batch prompts for swamp enemies and village NPCs
- [x] Run full test suite and verify `python3 -m compileall src`
