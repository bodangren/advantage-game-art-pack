# Plan: Batch Enemy & NPC Generation Pipeline

- [ ] Write tests for prompt parser that extracts theme, style, count, and archetype from natural language
- [ ] Implement `PromptParser` dataclass with `parse(prompt: str) -> BatchBrief` method
- [ ] Write tests for entity spec generator that produces valid specs from a BatchBrief
- [ ] Implement `EntitySpecGenerator` that selects parts, palettes, and animations from style pack
- [ ] Write tests for palette variation logic (ensure each entity gets distinct but valid palette)
- [ ] Implement `PaletteVariator` that shuffles palette assignments within style pack limits
- [ ] Wire BatchBrief generation into BatchOrchestrator planning stage
- [ ] Add `asf batch-generate` CLI subcommand with --prompt and --output-dir flags
- [ ] Write integration test: prompt → 10 entity specs → compiled sprite sheets
- [ ] Add example batch prompts for swamp enemies and village NPCs
- [ ] Run full test suite and verify `python3 -m compileall src`
