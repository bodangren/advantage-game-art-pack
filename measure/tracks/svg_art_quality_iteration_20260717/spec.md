# Spec: SVG Part Art Quality Iteration

## Goal

Replace and re-author the rejected current Pixel SVG prototypes against the
valid generated references in `demo-assets/reference/`. No current source
asset or composition may be migrated, relabeled, grandfathered, or admitted to
production. The result must be acceptable as new SVG-native art under
`cute_chibi_v1` (default) or `heroic_stylized_v1` (secondary), never as a Forge
artifact.

## Product Direction

References are art-direction evidence only: they may guide general silhouette,
proportion, shading, and readability targets, but cannot bypass visual review.
This track owns Pixel-native parts and compositions. Semantic 3D requests route
to Fantasy Asset Forge through public MCP and are outside this art pass.

## Functional Requirements

- Checked-in review scratch regenerates the review page and delivery-resolution
  per-row PNGs from replacement parts and example specs.
- Knight, goblin, spectre, dragon, prisoner, prop, and FX sets are rebuilt in
  place or replaced, with stable anchors where contracts require them.
- Each candidate records style profile, provenance, review resolution, reviewer
  result, and pack-admission evidence; rejection remains the default until
  visual acceptance.
- New parts remain validator-clean and deterministic; digests are frozen only
  from accepted replacement output.

## Acceptance Criteria

- [ ] Review scratch regenerates the page and per-row PNGs at delivery
      resolution.
- [ ] All seven rows pass visual review against references without treating
      current outputs as production.
- [ ] Replacement knight parts are cataloged and examples/tests are updated.
- [ ] Accepted-output digests are frozen; typecheck, tests, and build pass.
