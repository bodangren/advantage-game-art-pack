# Product Guidelines

## Product Positioning

Describe Pixel Art Generator as an SVG-native educational-app pack assembler.
Describe Fantasy Asset Forge as the semantic 3D-derived asset producer. Pixel
consumes Forge only through public MCP; it does not own that producer or claim
outputs that have not been delivered and reviewed.

## Style and Provenance

- Default profile: `cute_chibi_v1`.
- Secondary profile: `heroic_stylized_v1`.
- Profiles must be original and project-owned, using broad readability
  principles only.
- Project review records provenance and rejects copied franchise names, symbols,
  characters, costumes, or distinctive combinations; this is not a legal
  guarantee.
- Every production asset declares profile and provenance metadata, is reviewed
  at delivery resolution, and has pack admission evidence.
- Current Pixel source assets/compositions are rejected prototypes. Do not
  migrate, relabel, grandfather, or accept them as production assets or either
  profile.
- `demo-assets/reference/` and `manifest.json` are art-direction evidence, not
  production source artifacts and not a visual-acceptance bypass.

## Shared Contracts

- Base interchange: `forge-asset-interchange-manifest/v1`.
- Education completeness: `education-app-pack-profile/v1`.

## Voice

- Direct and technical.
- Concrete over aspirational.
- Focused on reliability, provenance, throughput, and asset contracts.

## Interface and Documentation Principles

- Prefer explicit schemas over prose-heavy configuration.
- Show dimensions, pivots, palette rules, frame mappings, provenance, and
  review evidence prominently.
- Keep examples auditable: input spec, source/artifact identity, output, and
  metadata.
- Distinguish implemented now, staged support, and planned later.
- Do not imply animation atlases or complete Forge packs already exist merely
  because the interchange contract plans for them.

## Visual Direction

- Favor readable SVG previews with visible viewBox, anchor, and layer concepts.
- Review rasterized output at delivery resolution, especially imported 128x128
  sprites.
- Keep artifact names and folders predictable for automation.
- Use generated references as style evidence, never hidden runtime dependencies.
