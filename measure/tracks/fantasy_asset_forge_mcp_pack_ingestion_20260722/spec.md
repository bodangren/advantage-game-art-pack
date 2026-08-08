# Spec: Fantasy Asset Forge MCP Pack Ingestion

## Goal

Give Pixel Art Generator a safe public-MCP boundary for discovering and
retrieving Fantasy Asset Forge artifacts, validating the shared interchange
contract, and assembling mixed educational-app packs without making Pixel the
Forge producer or MCP owner.

## Product Direction

Current inputs include semantic 3D-derived static transparent 128x128 PNGs and
GLBs plus one mechanically verified temporal diagnostic under
`forge-temporal-render-artifacts/v1`. Pixel strictly validates its four timed
source frames, immutable identities, stable framing/ground evidence, 512x128
atlas, exact inline source GLB (header, version, declared length, and chunks),
rectangles, byte lengths, and SHA-256 values, then emits a content-addressed
`pixel-forge-temporal-staging-plan/v1` with status `validated_unadmitted`. Final
producer replays `20260723-k` and `20260723-l` yielded identical public temporal
artifact bytes. Complete-pack delivery remains external. This proof is
not production animation, pack admission, playback acceptance, or evidence that
the accepted-model five-clip set is complete.

Pixel now also defines the additive
`education-app-pack-profile/v2` mechanical staging boundary for the established
`forge-temporal-render-batch-artifacts/v1` delivery. It binds the exact
`forge-reference-five-clip-authoring/v1` action sequence and frame counts
(`idle:4`, `walk_forward:6`, `walk_right:6`, `attack:6`,
`receive_damage:4`), all 26 source frames, five pose sheets, the combined
atlas, source GLB, and animation bundle to one immutable delivery identity.
The profile is necessarily `validated_unadmitted`: model, visual, playback,
and pack acceptance remain pending/not evaluated, and `shipping` is false.
This additive contract does not loosen or reinterpret the legacy static
`education-app-pack-profile/v1` eight-view compatibility rules. Those rules are
not animation requirements.

The external prerequisite for all Forge interchange ingestion is acceptance of
Forge track `engine_interop_evidence_20260719`. Delegated FINAL authority now
accepts its digest-pinned static PNG/GLB interchange boundary, and Pixel binds
that decision in code. Fresh public-MCP replay outputs can therefore be staged
and validated as `validated_pending_review`; they cannot be admitted as final
pack art without Pixel-owned delivery-resolution acceptance. Forge's admitted
Pixel boundary remains the static PNG/GLB path. A temporal v1 output can now be
validated and staged, but production temporal admission still requires
acceptance of `rigid_animation_sprite_pipeline_20260717`, one accepted model/
equipment identity, and an exact five-clip batch under
`forge-reference-five-clip-authoring/v1` (`idle`, `walk_forward`, `walk_right`,
`attack`, and `receive_damage`), browser
playback, and visual acceptance. Complete-pack ingestion additionally requires
acceptance of `village_asset_pack_20260718`.

Pixel-native SVG authoring, tiles, scenes, UI, and presentation remain local.
LLM semantic 3D requests route here through public MCP. Imported assets may be
used by tile/scene and presentation assembly only after admission.

## Delivery Contract Boundaries

This track keeps three superficially similar artifact families separate:

1. **Legacy static eight-view dossier — current compatibility path.** One immutable
   Forge asset revision contains exactly eight independent transparent 128x128
   source PNGs for `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, and `NW`, at least one
   source GLB, and digest-pinned evidence. A static directional contact sheet is
   a derived review surface only: it has no chronology, timing, loop, or runtime
   animation meaning and cannot replace the eight source views. It does not
   satisfy any temporal pose or clip requirement.
2. **Legacy pose/state sheet — downstream compatibility evidence only.** Existing
   `3x3`, `3x4`, and similar sheets may encode directions, selected poses, or
   gameplay states. Their legacy filenames and inferred row semantics are not an
   authoritative Forge contract and do not prove temporal animation support.
   Pixel must require a game-specific manifest before treating any such layout as
   a pack member.
3. **Temporal animation staging — implemented and unadmitted.**
   `forge-temporal-render-artifacts/v1` binds asset, revision, morphology, rig,
   equipment, clip, frame-plan, frame, source-GLB, atlas, and delivery identities;
   exact frame/GLB digests and byte lengths; atlas dimensions and rectangles;
   timing, loop, direction/action, framing, and ground evidence. Pixel validates
   and content-addresses those exact bytes without recomputing the atlas. The real
   four-frame diagnostic and manifest-bound inline GLB pass this historical
   mechanical boundary. Its batch successor now validates the exact 26-frame
   five-clip set, five pose sheets, atlas, source GLB, and phase-bearing bundle
   reconstructed from public MCP chunks. Static-direction substitution,
   duplicated filler frames, malformed GLBs, and incomplete artifacts fail
   closed. The current full-body V2 result is still not pack art because its
   placeholder model fails reference convergence and visual admission.

Production temporal admission remains unavailable until Forge track
`rigid_animation_sprite_pipeline_20260717` is accepted with an approved,
reference-converged model and production-quality five-clip visual evidence.
Public retrieval reconciliation and local browser playback are closed at the
mechanical boundary; pack admission, downstream playback, and Kimi acceptance
of the final character remain open.

## Contracts and Policy

- Exact base contract: `forge-asset-interchange-manifest/v1`.
- Static education completeness contract:
  `education-app-pack-profile/v1`.
- Temporal five-clip staging completeness contract:
  `education-app-pack-profile/v2`; it is non-shipping and cannot represent
  model, visual, playback, or pack admission as accepted.
- Default profile: `cute_chibi_v1`; secondary: `heroic_stylized_v1`.
- Profiles must be original and project-owned. Project review records provenance
  and rejects copied franchise names, symbols, characters, costumes, or
  distinctive combinations; this is not a legal guarantee.
- Current Pixel source assets/compositions are rejected prototypes and cannot be
  migrated, relabeled, grandfathered, or admitted.
- Generated references under `demo-assets/reference/` and `manifest.json` are
  art-direction evidence only and cannot bypass visual acceptance.
- The boundary schema is closed: unknown fields are rejected, canonical
  serialization is used for the manifest, and the manifest carries a pinned
  SHA-256 plus per-artifact digests. Every artifact entry requires a portable
  evidence reference, media type, semantic role, source revision, profile, and
  contract version.
- The adapter rejects Forge source imports, private/internal handlers or
  undocumented endpoints, absolute paths, and shared mutable filesystem state.

## Functional Requirements

- Discover public MCP tools and retrieve manifests/artifacts without private
  provider SDKs or undocumented endpoints.
- Normalize raw MCP `tools/list` only after validating the exact selected tool
  names and closed input schemas. Pixel-owned synthetic capability fields must
  be derived explicitly and must never be represented as raw Forge output.
- Negotiate supported contract versions and reject unsupported or ambiguous
  versions before retrieval/admission.
- Validate artifact digests, dimensions, transparency claims, identity, and
  manifest-to-artifact correspondence.
- Record an immutable local import registry entry containing source, revision,
  digest, profile, provenance, dimensions, review evidence, and admission.
- Stage legacy static eight-view transparent 128x128 PNG dossiers and GLBs; treat
  their derived contact sheets as non-temporal review evidence. Strictly stage
  observed temporal v1 frames, metadata, Forge atlas, and exact inline source
  GLB as `validated_unadmitted` without recomputation or admission. Ordered
  temporal source frames and the bound source GLB remain required before packaging.
  Complete-pack ingestion remains a later capability.
- Assemble mixed packs and validate static completeness under
  `education-app-pack-profile/v1`; mechanically stage exact five-clip temporal
  membership under `education-app-pack-profile/v2` without admission claims.

## Education-App-Pack Profile

Before mixed assembly, `education-app-pack-profile/v1` is defined objectively:
the manifest contains an ordered membership list; every member pins an accepted
Forge revision, exact digest, semantic role, and media type. Each profile
declares role cardinality and completeness (including independently required
static directional frames, future temporal source frames, and GLBs as
applicable), derives its permitted export profiles, and declares artifact/count/
byte budgets. Canonical serialization produces the profile digest.
Missing roles, duplicate member identities or entries, role counts outside each
declared minimum/maximum cardinality, revision/digest mismatches, budget
overruns, and incomplete derived profiles are actionable admission failures,
not warnings or best-effort substitutions.

`education-app-pack-profile/v2` is an additive temporal staging successor. It
  retains the v1 Pixel-native/static Forge source shapes and legacy static-view
  validation, and adds closed Forge temporal source bindings for
`source_frame`, `derived_pose_sheet`, `derived_atlas`, `source_glb`, and
`animation_bundle`. Each temporal batch must contain the exact ordered
five-clip baseline and 26 globally sequenced frames, use strictly increasing
sample times within each clip, bind every frame and sheet to its declared
action/clip/frame plan/direction, share one immutable source identity, and leave
no temporal artifact unbound. Profile-level acceptance fields fail closed to
`validated_unadmitted`, pending model/visual/playback acceptance,
`pack_admission: not_evaluated`, and `shipping: false`.

## Acceptance Criteria

- [x] Public-MCP discovery/retrieval and version negotiation reject unsupported
      contracts and private/non-public paths.
- [x] Digest and boundary validation reject mismatches before local admission.
- [~] Registry imports are immutable, repeatable, and retain provenance and
      evidence.
- [~] Static PNG/GLB staging works and strict temporal v1 staging is real-run
      verified as `validated_unadmitted` with exact inline source-GLB bytes; the
      accepted model and exact five-clip batch, playback, public-contract
      reconciliation, visual/Kimi acceptance, and complete-pack delivery remain
      incomplete.
- [x] `education-app-pack-profile/v2` mechanically validates the exact
      five-clip temporal member set while preserving v1 static behavior and
      rejecting model/visual/playback/pack/shipping acceptance overclaims.
- [x] Contract documentation distinguishes legacy static-view dossiers,
      non-authoritative legacy pose/state sheets, and unadmitted temporal v1
      staging; static contact sheets remain explicitly non-temporal.
- [b] Mixed educational packs admit only reviewed imports and satisfy the exact
      education contract.
- [~] Rejected-prototype and generated-reference policies remain enforced, and
      originality/provenance review makes no legal guarantee.
- [~] Typecheck, tests, and build pass.
