# Product Definition

## Product Direction

Pixel Art Generator is the educational-app pack assembler and SVG-native
producer. It authors and assembles tiles, UI, backgrounds, presentation
layouts, and suitable native compositions for the `advantage-games` series.
Semantic 3D-derived individual sprites and 3D artifacts belong to Fantasy
Asset Forge: Pixel consumes them only through its public MCP boundary.

The primary/default style profile is `cute_chibi_v1`. The secondary profile is
`heroic_stylized_v1`. Profiles must be original and project-owned, using only
broad readability principles. Project review records provenance and rejects
copied franchise names, symbols, characters, costumes, and distinctive
combinations; this is not a legal guarantee.

The shared base contract is exactly `forge-asset-interchange-manifest/v1`.
The shared education completeness contract is exactly
`education-app-pack-profile/v1`.

SVG remains the source format for Pixel-native work: an LLM can author a new
part as text, parts can be reused, and compositions can be displayed at
different sizes without a second source asset. Imported Forge artifacts are
validated delivery inputs, not SVG source replacements.

## Objectives

- Assemble complete educational-app packs from Pixel-native SVG outputs and
  validated Forge imports.
- Let an LLM author SVG-native parts, tiles, scenes, layouts, and composition
  specs through constrained contracts.
- Route semantic 3D requests to the Fantasy Asset Forge public MCP workflow.
- Preserve provenance, delivery-resolution visual review, artifact digests, and
  pack admission evidence for every production asset.
- Keep every generated asset deterministic, inspectable, and easy to review.

## Core User Segments

- Solo developers and small studios building educational 2D games.
- Automated game content pipelines that need reproducible mixed packs.
- Engineers and technical artists extending original style profiles.

## Downstream Consumer Series

The immediate downstream target is the `advantage-games` mini-game series. It
needs coordinated packs of directional character sheets, props, FX,
interactables, tiles, scenes, parallax layers, UI/support atlases, and loading
or cover surfaces. Packs may mix Pixel SVG-native compositions with validated
Forge PNG/GLB imports. Phaser is a downstream mixed-pack harness, not the MCP
owner.

## Core Workflows

### SVG-native authoring

An author or LLM writes a constrained SVG part or composition, declares anchors
and palette variables, and validates it before staging and visual review.

### Forge MCP ingestion

After Forge's interchange track is accepted, the ingestion track will discover
and retrieve public MCP artifacts, negotiate contract versions, validate
artifact digests, record immutable local imports, and admit only reviewed
artifacts to mixed educational packs. Forge currently generates static
transparent 128x128 PNG sprites and GLBs, but Pixel cannot ingest them through
the planned interchange yet. Animation atlases and complete-pack delivery are
later external stages gated on their owning Forge tracks.

### Pack assembly

Tile/scene and presentation compilers remain SVG-native but may reference
validated imported artifacts. A pack is complete only when it satisfies
`education-app-pack-profile/v1` and has admission evidence.

## Functional Pillars

- Strict SVG-part, composition, scene, presentation, and import validation.
- Deterministic XML composition and stable serialization.
- Public-MCP-only Forge boundary with version negotiation and digest checks.
- Immutable provenance and local import registry records.
- Named anchors, transforms, layer priorities, and palette variables.
- SVG + JSON export contracts for downstream integration.
- Mixed-pack assembly with pack admission evidence.
- Review at delivery resolution for every production asset.

## Production Asset Policy

All current Pixel source assets and compositions are rejected prototypes and are
not fit for production packs. They must not be migrated, relabeled,
grandfathered, or accepted as either style profile. The generated reference
images under `demo-assets/reference/` and their `manifest.json` remain valid
art-direction evidence only. New or rebuilt assets may model their general
silhouette, proportion, shading, and readability targets, but references are
not production source artifacts and cannot bypass visual acceptance.

## Non-Goals

- Python runtime code or Python-based asset tooling.
- Treating current Pixel assets as production or as Forge imports.
- Freeform text-to-image diffusion workflows.
- Direct provider SDK or private Forge integration from Pixel.
- Unrestricted SVG features such as scripts, external images, or remote URLs.
