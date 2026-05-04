# Spec: Renderer Part Library Integration

## Problem

The renderer (`src/asf/renderer.py`) uses procedural shape drawing (ellipse, rectangle, arc, etc.) to compose sprite frames. While deterministic and testable, this approach produces generic-looking output that doesn't benefit from the hand-crafted primitives in `library/primitives/`.

## Solution

Introduce a **PartLibrary** class that can stamp approved primitives onto the rendered canvas, layered on top of the procedural base. The integration is opt-in per SpriteSpec — a `part_library_refs` field allows specifying which primitives to overlay and where.

## Technical Approach

1. **PartLibrary class** in `src/asf/part_library.py`:
   - Loads the primitive manifest from `library/primitive_manifest.json`
   - Provides `stamp_primitive(canvas, primitive_id, position, scale)` method
   - Caches loaded primitives to avoid repeated file I/O

2. **SpriteSpec extension** — add optional `part_library_refs: list[dict]` field to allow spec to reference primitives to overlay.

3. **Renderer integration** — after drawing the procedural base in `render_frame()`, call `PartLibrary` to stamp referenced primitives if specified.

4. **Backward compatibility** — procedural rendering remains the default; part library usage requires explicit opt-in per spec.

## Acceptance Criteria

- [ ] PartLibrary class loads manifest and caches primitive images
- [ ] `stamp_primitive()` correctly composites PNG onto canvas at given position
- [ ] Renderer respects `part_library_refs` in SpriteSpec
- [ ] Existing procedural renderer behavior unchanged when no part refs specified
- [ ] Tests pass for both with and without part library usage
- [ ] Manifest includes scene primitives (floor_stone_01, wall_library_01, cobble_01, bookshelf_01, ruins_pillar_01, rubble_01)