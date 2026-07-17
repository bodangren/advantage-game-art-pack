---
version: alpha
name: Sprite Foundry Design System
direction: industrial-editorial
colors:
  ink: "#13171B"
  ink-soft: "#1B2227"
  paper: "#E8E5DC"
  paper-dim: "#9A9D96"
  acid: "#D8FF4F"
  coral: "#FF6A4D"
typography:
  display: "Bodoni Moda"
  utility: "IBM Plex Mono"
---

# Design System

Sprite Foundry is a dark, technical assembly desk for game-art builders. The
interface should feel like a print-room instrument: precise labels, visible
coordinates, fluorescent status accents, and enough negative space to keep the
SVG preview dominant.

## Principles

- Make the source contract visible: slots, anchors, viewBox, z-index, and palette.
- Use acid green for live or verified state and coral for attention or action.
- Keep previews large, crisp, and pixelated without pretending SVG is a bitmap.
- Prefer editorial serif display type paired with a monospaced utility face.
- Preserve keyboard focus, readable contrast, and compact responsive layouts.

## Asset Art Direction

The shipped part library targets 16-bit pixel art for game export. The
vocabulary is deliberately flat so the safe SVG dialect can express it, and
it mirrors the curated mmx references in `demo-assets/reference/`:

- **Ramps**: every core material carries three tones named `<slot>`,
  `<slot>-light`, and `<slot>-shadow` in part metadata and composition
  palettes.
- **Light direction**: top-left. Highlight shapes sit on upper-left
  surfaces, shadow tones on lower-right surfaces.
- **Banding and dither**: shading is banded flat shapes; texture (scale,
  stone, cloth weave) is sparse small-rect dither, never noise.
- **Ground shadow**: characters place a `shadow-ground` ellipse below the
  body (z below 10) to anchor the figure.
- **No blur, filters, or CSS gradients**: softness is faked with stepped
  bands of flat color.
- **No outlines**: shapes separate by tone contrast, not strokes.
