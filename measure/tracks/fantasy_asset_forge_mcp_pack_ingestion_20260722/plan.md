# Plan: Fantasy Asset Forge MCP Pack Ingestion

This track owns Pixel's public-MCP discovery/retrieval and local admission
boundary. It does not implement Fantasy Asset Forge, private provider clients,
or Phaser integration.

Delegated FINAL authority accepts Forge's manual static-interchange verification
as the code-binding prerequisite for transport and immutable-registry
development even though Forge's commit-gated Measure closeout remains open.
That bounded decision does not accept the retained placeholder for pack-quality
art, production temporal delivery, complete-pack delivery, or downstream theme
production. Pixel now has strict single-clip and exact-five-clip temporal
staging boundaries plus real public-MCP proofs, but both statuses remain
`validated_unadmitted`.

Contract vocabulary for this plan is fixed as follows:

- **Legacy static eight-view dossier:** the current compatibility contract:
  eight independent model-view PNGs, a source GLB, and evidence. Its derived
  contact sheet is non-temporal review evidence only and satisfies no animation
  or temporal-pose requirement.
- **Legacy pose/state sheet:** a downstream grid or pose bank retained as
  non-authoritative migration evidence. It has no temporal meaning without a
  separate versioned metadata contract.
- **Temporal animation staging:** ordered individual source frames, the Forge-
  derived atlas, the exact inline source GLB, and closed
  `forge-temporal-render-artifacts/v1` metadata can now be strictly validated and
  content-addressed without recomputation. Its batch successor
  `forge-temporal-render-batch-artifacts/v1` additionally binds the exact ordered
  five clips, per-clip pose sheets, combined atlas, source GLB, and phase-bearing
  animation bundle. Both current deliveries are unadmitted.

The existing `[b]` markers below mean dependency-blocked. They remain blocked
work, not pending work that is ready to start, and must not be advanced until the
named owner prerequisite is implemented, verified, and accepted.

## Phase 1: Contract-First Boundary Tests

- [x] Add failing tests for public MCP discovery and retrieval tool contracts.
  Discovery shape/rejection behavior is covered by focused tests, and the
  durable live pilot records exact public manifest and chunk retrieval. The
  retained dossier does not independently preserve its `tools/list` response;
  see [live-consumer-evidence.md](live-consumer-evidence.md). Phase 3 may proceed
  against the digest-pinned manual static-interchange acceptance.
- [x] Add failing tests for exact contract-ID/version negotiation and rejection.
- [x] Add failing tests for closed-schema unknown-field rejection, canonical
      serialization, manifest SHA-256 pinning, artifact digests, portable evidence
      references, media types, semantic roles, source revision/profile/version, and
      manifest correspondence.
- [x] Add failing tests that reject Forge source imports, internal handlers,
      absolute paths, and shared mutable filesystem state.
- [x] Add fail-closed tests for unsupported, ambiguous, missing, duplicate, or
      mismatched boundary data without claiming implementation already exists.

## Phase 2: Education-App-Pack Contract-First

- [x] Define executable contract tests for ordered membership, pinned Forge
      revisions, semantic roles, cardinality/completeness, derived export profiles,
      artifact/count/byte budgets, and deterministic profile serialization/digest.
- [x] Define actionable failures for missing roles, duplicates, revision/digest
      mismatches, role-cardinality violations, budget overruns, and incomplete
      derived profiles; repeated roles are valid within declared cardinality.

## Phase 3: Public MCP Adapter

This phase is active against Forge's digest-pinned manual static-interchange
acceptance. Final admission still requires a Pixel-owned delivery-resolution
review and must fail closed for transport-only placeholder evidence.

- [x] Implement a narrow public-MCP discovery/retrieval adapter with validated
      external responses and no provider SDK dependency. The package-owned raw
      `tools/list` normalizer is implemented and documented in
      [phase-3-discovery-normalizer.md](phase-3-discovery-normalizer.md); it
      derives Pixel's existing contract only after validating the actual raw
      names and input schemas. The stdlib-only live stdio caller and
      replay-admission path now retrieve and stage verified public-MCP dossiers;
      final admission remains delivery-review gated.
- [x] Implement explicit support negotiation for
      `forge-asset-interchange-manifest/v1` and clear unsupported-version errors.
- [~] Keep semantic 3D LLM requests routed through this boundary.

## Phase 4: Immutable Import Registry

This phase is active for validated pending-admission records. It may emit an
admitted static registry only when the code-owned static acceptance binding and
an accepted delivery-resolution review both match the staged source identity.

- [~] Implement immutable local registry records for source, revision, digest,
      profile, provenance, dimensions, and review/admission evidence.
- [x] Implement artifact retrieval, digest verification, and safe static PNG
      128x128 / GLB staging.
- [x] Add idempotence and tamper/revision rejection tests.

## Phase 5: Staged Capability Expansion

- [~] Strictly validate and content-address
      `forge-temporal-render-artifacts/v1` without recomputing Forge's atlas.
      Focused tests reject static-direction substitution, duplicate filler bytes,
      identity/path/hash/length drift, unstable camera/ground evidence, malformed
      atlas rectangles, malformed GLB structure, and incomplete artifacts. The
      final public-MCP outputs at `/tmp/faf-public-temporal-20260723-k` and `-l`
      reproduced identical temporal artifact bytes. Pixel staged the `k` delivery's
      four timed 128x128 frames, 512x128 atlas, 60,320-byte inline source GLB, and
      manifest as `validated_unadmitted`. Pixel also strictly validates the exact
      `forge-reference-five-clip-authoring/v1` batch under
      `forge-temporal-render-batch-artifacts/v1`. The fresh real directory at
      `/tmp/faf-public-reference-five-20260723-d` passed all 10 opt-in ingestion
      tests and staged 26 source frames, five pose sheets, the combined atlas,
      source GLB, animation bundle, and manifest as `validated_unadmitted`.
      Admission remains blocked on the accepted model/equipment identity,
      full-body motion quality, playback, pack admission, and Kimi gates.
      (blocked:temporal-product-acceptance)
- [b] Define a disabled-until-accepted complete-pack ingestion stage gated on
      Forge `village_asset_pack_20260718`; do not claim Forge packs exist.
      (blocked:forge-village-asset-pack-acceptance)

## Phase 6: Mixed Pack Assembly

- [x] Define `education-app-pack-profile/v2` so validated-unadmitted temporal
      source frames, pose sheets, atlases, source GLBs, and animation bundles
      retain exact clip/frame-plan/action/time/provenance bindings. The
      executable boundary requires the ordered five-clip baseline
      (`idle:4`, `walk_forward:6`, `walk_right:6`, `attack:6`,
      `receive_damage:4`), all 26 globally sequenced source frames, five
      clip-bound pose sheets, one atlas, one source GLB, and one animation
      bundle under one immutable source identity. It rejects missing, duplicate,
      unbound, or inconsistent members and hard-codes the honest staging gates:
      model/visual/playback pending, pack admission not evaluated, and shipping
      false. The v1 legacy static-view dossier validator remains intact;
      temporal frames are never represented as static views or directions.

- [x] Implement deterministic, non-shipping mirrored production work orders for
      catalogued audio, equipment, presentation, projectile, prop,
      tile/environment, UI, and VFX demands. Preserve temporal signatures,
      provenance/evidence links, execution contracts, and explicit
      missing/candidate/admitted status; do not fabricate catalog entries or
      completed artifacts.
- [b] Implement actual mixed Pixel SVG plus admitted Forge PNG/GLB/temporal pack
      references only after accepted source artifacts exist.
      (blocked:admitted-assets-and-native-production)
- [b] Validate profile/provenance, delivery-resolution visual review, and
      admission evidence against the applicable static v1 or temporal v2
      education profile. Temporal v2 currently rejects acceptance/shipping
      claims at its mechanical staging boundary.
      (blocked:admitted-assets-and-visual-review)
- [b] Validate ordered membership, independently required frames/GLBs, derived
      export profiles, budgets, and deterministic pack digest before export.
      (blocked:complete-candidate-pack)

## Phase 7: Verification and Documentation

- [~] Document the public-MCP boundary, exact IDs, staged support, and failure
      handling without false availability claims. The legacy static dossier,
      pose/state-sheet, and temporal-delivery vocabulary is now explicit; broader
      track documentation remains in progress.
- [~] Run typecheck, tests, and build; record limitations in `tech-debt.md`.
