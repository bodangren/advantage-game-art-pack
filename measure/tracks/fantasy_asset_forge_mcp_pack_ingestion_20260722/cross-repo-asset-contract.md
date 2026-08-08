# Cross-Repository Asset Contract

## Purpose and Status

This document binds Fantasy Asset Forge production to Pixel Art Generator
ingestion for the two-pack program. It defines responsibilities, public MCP
traffic, identities, artifacts, evidence, failure behavior, and validation. The
Reading Advantage monorepo is the read-only downstream acceptance target.

The legacy static eight-view PNG/GLB compatibility boundary is implemented and
may be staged pending Pixel visual admission; it is not an animation
requirement. The earlier four-frame
`forge-temporal-render-artifacts/v1` diagnostic remains historical mechanical
evidence. Its exact-five successor now passes the real public manifest/chunk
boundary: Pixel reconstructs all 26 frames, five pose sheets, atlas, source GLB,
and phase-bearing bundle, and browser playback advances all five clips. This is
a qualification baseline rather than the final pose/animation library. The
result remains `validated_unadmitted` because its placeholder model fails the
approved-reference visual gate. It does not accept complete Forge packs or
downstream themes.

## Ownership Boundary

| Concern | Forge owner | Pixel owner |
| --- | --- | --- |
| Semantic 3D asset | Kit capability, asset document, parts, materials, rigid pose, immutable revision | Consumer brief and required semantic pack role |
| Legacy static model-view render | Eight transparent 128x128 compatibility views | Retrieval, native-size review, staging, admission; never temporal animation evidence |
| 3D export | Source GLB and producer validation | Digest verification and retained member binding |
| Static contact sheet | Derived labeled review surface | Review use only; never a temporal or source substitute |
| Temporal delivery | Emits ordered source frames from pose/keyframe/clip authoring; the exact 26-frame five-clip set is the current qualification baseline and still owes a reference-converged model and production-quality motion | Public retrieval, strict reconstruction, and live five-clip playback pass as `validated_unadmitted`; broader accepted action coverage, visual admission, packaging, and downstream acceptance remain open |
| 2D-native families | No ownership unless separately routed as a supported semantic 3D asset | SVG-native tiles, environments, props, VFX, UI, and presentation |
| Pack contract | Exact Forge artifact identities and provenance | Ordered members, role cardinality, completeness, budgets, parity, pack digest |
| Downstream acceptance | Supplies producer evidence | Validates consumer contract and browser-visible result; does not edit downstream without authorization |

The family name alone does not select a producer. A 3D-derived prop may belong to
Forge while an SVG-native gameplay prop belongs to Pixel. The approved brief must
record the production method and owner before work begins.

## Request Planning Record

Before making MCP calls, Pixel records a planning item for each requested asset:

- program and theme identity;
- stable semantic pack role and family;
- human-readable brief plus must-have and optional traits;
- approved visual-reference identity and provenance;
- required viewpoints, directions, states, poses, or temporal clips;
- expected media and whether each output is source or derived;
- producer owner, consumer owner, budgets, and downstream use;
- current capability verdict: `supported`, `partial`, `unsupported`, or
  `not-assessed` with evidence.

This planning record is not an MCP request schema. It must not be sent as a
fabricated omnibus `generate_pack` or `generate_asset` call. Actual Forge calls
use only the closed public operations and response-derived fields below.

## Public MCP Operation Sequence

### Capability and baseline discovery

1. `inspect_capabilities({})`, then a filtered `inspect_capabilities` call using
   only returned capability IDs relevant to the brief.
2. `list_kits({ brief })` for a novel registered-grammar request, or
   `create_asset({ reference })` only for the advertised fixed references.
3. `inspect_template({ templateId })`, `search_accessories(...)`, and paged
   `inspect_asset({ assetId, section, offset, limit })` as required. Valid paged
   sections are `parts`, `connections`, `variants`, `poses`, and
   `renderProfiles`.

Creation is either `create_asset({ reference })` or
`create_asset({ identity: { assetId, name, kitId, family, archetypeId, seed } })`.
Novel identity fields must come from `list_kits`; callers do not invent kit,
archetype, anatomy, port, or template values.

### Revision-safe mutation

Use the smallest applicable public operation:

- `apply_operations({ assetId, expectedRevisionId, patch|composition, dryRun })`;
- `apply_accessory_operation({ assetId, expectedRevisionId, archetypeId,
  operation, dryRun })` using the complete discovery-provided operation;
- `connect_parts({ assetId, expectedRevisionId, connection, dryRun })`;
- `set_pose({ assetId, expectedRevisionId, poseId, dryRun })`.

Every supported mutation is first called with `dryRun: true`. After verifying
the unchanged revision, affected IDs, compiled change, compatibility, and
completeness, replay the identical request with only `dryRun: false` changed.
A stale revision causes re-inspection and replanning, never an overwrite.

### Comparison, validation, and delivery

1. `compare_revisions({ assetId, baseRevisionId, targetRevisionId, offset,
   limit })`; follow pagination and explain every changed ID.
2. `validate_asset({ assetId })` and record validation and budget evidence.
3. For a reference-led 3D asset, call `render_preview({ assetId, revisionId,
   referenceComparison: { profileId: "forge.authoring.reference-comparison.v1" }
   })`. Use the returned `delivery.deliveryId` as manifest input `delivery_id`, then
   reconstruct its four 512x512 views and 2048x530 contact sheet with
   `record_kind: "evidence"`. This delivery is review-only and cannot enter an
   interchange or pack manifest.
4. `render_preview({ assetId, revisionId })` and
   `export_asset({ assetId, revisionId })` against the exact same final revision.
5. `get_interchange_manifest({ asset_id, revision_id })`.
6. Repeated `get_interchange_artifact_chunk({ asset_id, revision_id,
   artifact_id, record_kind, offset, length })`, where `length` is at most 32768,
   until every manifest-allowlisted source artifact and required evidence record
   is reassembled.

Producer calls return path-free status. Pixel verifies each chunk digest and
then each reconstructed record digest before staging it. No private handler,
source import, provider SDK, absolute path, or shared mutable filesystem is part
of this contract.

## Identity and Version Binding

An admitted Forge-backed pack member is bound by the complete identity tuple:

```text
contract_id
asset_id
revision_id
manifest_sha256
artifact_id
artifact_sha256
artifact_role
semantic_pack_role
theme_id
```

Directional artifacts additionally bind their declared direction. Staged
temporal records bind the temporal contract version plus asset, revision,
morphology, rig, equipment, clip, frame-plan, frame, atlas, delivery, timing,
rectangle, source-GLB, and raw-manifest identities/digests. A future admitted
temporal pack member must retain the manifest-bound inline source GLB plus
accepted visual/playback evidence. A display name, filename, local path, or
semantic role alone is not an identity.

Pixel-native members bind their source ID and digest to the same pack/theme role
contract. Pack revisions are canonical digests of ordered membership and policy;
changing a member digest, cardinality, or required role creates a new pack
revision rather than mutating an accepted one.

## Source and Derived Artifact Rules

### Legacy static Forge model-view dossier

Required source delivery consists of exactly eight independent transparent
128x128 PNGs for `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, and `NW`, plus at least
one source GLB. Manifest and workflow evidence bind the exact asset revision.
A labeled model-view contact sheet is derived compatibility/review evidence only.
It is non-temporal and cannot replace any source PNG or satisfy a pose, frame,
clip, or animation requirement.

### Legacy pose/state sheets

Existing downstream grids may encode directions, selected poses, or gameplay
states. Their filenames, cell counts, and inferred row meanings are legacy
demand evidence, not Forge interchange semantics. Pixel may admit one only under
an explicit game-specific layout manifest; without ordered timing/loop metadata
it remains non-temporal.

### Current temporal staging boundaries

The earlier diagnostic `forge-temporal-render-artifacts/v1` delivery contains ordered
individual transparent frames, Forge's combined transparent atlas, an exact
inline source GLB, and closed versioned metadata containing:

- asset, source revision, morphology, rig, equipment, clip, frame-plan, and
  delivery identities;
- each ordered source-frame identity, sample time, byte length, and digest;
- atlas identity/digest, dimensions, grid, and per-frame rectangles;
- source-GLB identity `glb.<sha256>`, `source` classification,
  `model/gltf-binary` media type, portable `.glb` filename, byte length, and digest;
- duration, loop, interpolation, direction/action, framing, and ground evidence.

Pixel verifies all metadata-to-manifest-to-byte relationships, PNG structure,
stable camera scale/ground anchor, frame distinctness, exact atlas layout, and
GLB header/version/declared length/chunk structure, then derives content-
addressed staging references for four frames, atlas, GLB, and raw manifest. That
historical single-clip output is `validated_unadmitted`; the staging step itself
does not provide playback. Pixel must not call its SVG atlas packer, reorder frames,
redraw cells, post-process PNGs, or produce a replacement Forge atlas. Atlas-
only, metadata-only, a static contact sheet, malformed GLB, duplicate filler
frames, or an unannotated legacy pose sheet fails source completeness. The
single-clip path remains diagnostic-only. Public retrieval reconciliation is
now closed for the exact-five batch at the mechanical staging boundary below;
visual, playback, pack, and downstream admission remain separate gates.

The batch successor `forge-temporal-render-batch-artifacts/v1` binds the exact
ordered five-clip authoring request, 26 source frames, five per-clip pose sheets,
one combined atlas, the source GLB, and one canonical phase-bearing animation
bundle. Pixel strictly validates and content-addresses this complete set as
`pixel-forge-five-clip-staging-plan/v1`. The fresh public retrieval record at
`/tmp/faf-public-reference-full-body-v2-20260723-o/public-reference-five-clip-retrieval.json`
binds delivery
`delivery.1cd3d8e17ba86b33432da3756ad24080aafa6f18e0629257db47aa60d7a0ba4f`
and manifest SHA-256
`3b843972deaf555bff51af955e663152190adcb8e57e5104b09b72e5b44cea34`.
Pixel reconstructs every artifact exclusively from its 38 public bounded
chunks, verifies every manifest/chunk/full-artifact binding, and stages the 34
producer artifacts plus manifest as `validated_unadmitted`. The real
public-retrieval plus education-profile and dual-theme run passes 116/116 tests.

The required reference target remains one stable model/equipment identity with
the ordered `forge-reference-five-clip-authoring/v1` batch: `idle`,
`walk_forward`, `walk_right`, `attack`, and `receive_damage`. The current single-
clip four-frame diagnostic proves none of that product set beyond mechanical
staging. The full-body V2 exact-five batch proves deterministic mechanical
transport and distinct temporal phases, but its placeholder character is
rejected against the approved reference and cannot satisfy pack acceptance.

`education-app-pack-profile/v1` remains a legacy static dossier profile: a Forge group
can contain only eight `directional_frame` members plus a GLB. It cannot express
temporal frames, pose sheets, an atlas, animation-bundle metadata, or their clip
bindings. Legacy static-view QA must remain intact, but temporal pack
admission cannot use v1; silently treating timed frames as static directions is
forbidden. The additive `education-app-pack-profile/v2` successor is now
implemented for mechanical staging. It requires the exact ordered 26 frames,
five pose sheets, one atlas, source GLB, and animation bundle under one immutable
batch identity while preserving all v1 static rules. Its admission fields are
hard-closed to `validated_unadmitted`, model/visual/playback `pending`, pack
`not_evaluated`, and `shipping:false`; implementation is not admission.

## Output Locations and Retrieval References

- Forge owns its internal immutable revision storage. The cross-repo handoff is
  the public manifest and chunk operations, never a producer host path.
- Every manifest reference is a portable relative POSIX retrieval key with no
  absolute path, URL scheme, backslash, or dot segment.
- Pixel stages verified records under content-addressed local references of the
  form `objects/sha256/<sha256>.<extension>` inside its import/staging boundary.
  A local reference is derived from the digest and does not replace source
  identity or the original portable retrieval reference.
- Temporal v1 staging uses the more specific portable form
  `staging/forge-temporal/<asset>/<revision>/<clip>/<frame-plan>/sha256/<sha256>.<extension>`;
  the digest remains the terminal content address and every immutable source
  identity remains explicit in the staging plan.
- Five-clip batch staging uses
  `staging/forge-five-clip/<asset>/<revision>/<delivery>/sha256/<sha256>.<extension>`
  and retains the manifest, clip, frame-plan, action, sequence, and sample-time
  bindings in its staging records.
- Candidate pack outputs use logical portable references under
  `packs/<pack_id>/<pack_revision>/...` in a Pixel-owned export boundary. The
  concrete host root and downstream publication mapping remain deployment
  decisions and must not be embedded in manifests.
- Nothing is copied into Reading Advantage until downstream changes and their
  destination mapping are explicitly authorized.

## Provenance and Reference Evidence

Every production member records source kind, ownership, license label, workflow
evidence, style/render profile, and creator/source URL when applicable. Novel
character production additionally requires a provenance-bound approved multi-
view target, originality review, and side-by-side Kimi WebBridge comparison.
Generated Pixel references and legacy downstream assets remain art-direction or
demand evidence only; they cannot bypass admission.

Pack provenance is transitive: the pack manifest retains each member's producer,
contract, immutable revision/digest, reference approval, delivery-resolution
review, and admission verdict. Missing evidence fails closed.

## Determinism

- Closed schemas reject unknown fields; canonical serialization produces exact
  manifest and pack digests.
- Same accepted request, inputs, profiles, and pinned revisions must reproduce
  the same semantic identities and declared deterministic outputs.
- Chunk order is transport detail; reconstruction in signed offset order must
  reproduce the manifest digest.
- Pixel content-addressed staging is idempotent: identical bytes reuse the same
  local reference; different bytes cannot claim the same digest.
- Supported byte-level determinism and any cross-GPU limits must be stated by the
  producer. Pixel must not upgrade an unassessed claim to deterministic.
- Batch replay compares canonical membership, identities, and digests across two
  runs. A mismatch blocks pack admission until the owning repository explains it.

## Error Behavior

- Any public envelope with `ok: false` is a stop for that operation. Retain its
  issue and guidance; never manufacture response-derived IDs or evidence.
- `unsupported` blocks the requested capability. `partial` may proceed only for
  the explicitly evidenced subset. `not-assessed` cannot support a verified
  claim.
- Revision conflicts require a fresh inspection and dry-run cycle.
- Unknown fields, unsupported versions, ambiguous negotiation, identity or
  revision mismatch, duplicate IDs/references, non-portable paths, digest/chunk
  mismatch, missing evidence, or budget overrun fail before local admission.
- Unexpected extra records and missing allowlisted records both fail retrieval.
- A visual failure is not converted to a warning by green schema or pixel tests.
- Producer failures return to Forge ownership. Pixel does not repair or recompute
  Forge artifacts; consumer/pack failures remain Pixel-owned.

## Validation and Visual Gates

### Per asset

1. Capability and closed public-operation path pass.
2. Dry-run/apply locality and revision comparison pass.
3. Producer validation, bounds, triangle and byte budgets pass.
4. Manifest, chunk, record, media, dimensions, transparency, and provenance pass.
5. Interactive 3D inspection passes for 3D-derived assets.
6. The labeled contact sheet passes as an overview.
7. Every legacy static-view PNG passes at native 128x128 resolution for clipping,
   framing, ground contact, silhouette, material separation, and feature
   visibility. Enlarged views and metrics are supporting evidence only.
8. Approved-reference side-by-side review of all four deterministic 512px
   authoring views passes through Kimi WebBridge when a reference target applies.
9. Every temporal source frame, pose sheet, and live clip passes native-size and
   browser-visible Kimi review; a contact sheet or advancing counter is not a
   substitute.
10. Pixel records accepted, partial, or rejected delivery-resolution evidence.

### Batch and pack

Each theme has a versioned semantic demand matrix covering characters, supported
monsters, equipment, poses/clips, tiles/environments, props, VFX, UI, and
presentation. The roster and layouts may evolve, but a candidate batch fails when
a required role, variant, state, clip, provenance record, visual verdict, or
source artifact is missing; when duplicates or stale revisions exist; or when
count/byte budgets fail.

The two themes are mirrored by required semantic role and acceptance policy, not
by hard-coded filenames or equal raw counts. A one-theme exception requires an
explicit product decision. Complete technical ingestion does not equal visual,
pack, or downstream acceptance.

The non-character production planner expands the signed v2 demand catalog into
mirrored, non-shipping Chibi Quest and Riven Lands work orders for audio,
equipment, presentation, projectile, prop, tile/environment, UI, and VFX. It
preserves temporal signatures, provenance/evidence links, and execution
contracts, reports absent catalog families and missing/candidate/admitted
evidence, and never fabricates completed assets. Actual native-family production
and a real admitted inventory remain separate incomplete work.

## Future-Game Extension Rules

- Add a new stable semantic demand entry and owner; do not reinterpret an
  existing accepted role.
- Declare reference evidence, required media/views/states/clips, provenance,
  cardinality, and budgets before production.
- Use additive optional roles under the current contract when compatibility is
  preserved. Breaking semantics require a new version and migration plan.
- Preserve old source and pack revisions for deterministic replay and comparison.
- Re-run only affected per-asset, family, parity, export, and downstream gates,
  while retaining evidence for unchanged members.

No exact first-release roster, atlas layout, legacy sheet grid, or downstream
destination is frozen here. Those become accepted only through later demand,
implementation, visual review, and downstream validation evidence.
