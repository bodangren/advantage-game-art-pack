# Live Consumer Evidence: Public MCP Discovery and Retrieval

## Scope

This record began as the Phase 1 contract-first discovery/retrieval pilot and
now also records the bounded Phase 3 replay adapter, Phase 4 pending-admission
registry, and strict temporal-v1 staging evidence. It does not admit the
placeholder artifacts as final Pixel art or claim production animation,
complete-pack, or theme-pack readiness.

## Public boundary exercised

- The retained sanitized ledger records 17 successful public calls: capability
  inspection, create, validate, exact-revision render, exact-revision export,
  manifest retrieval, and 11 bounded chunk retrievals.
- The manifest and artifact operations were the exact public operations
  `get_interchange_manifest` and `get_interchange_artifact_chunk`; no Forge
  source import, private handler, provider SDK, undocumented endpoint, or
  shared producer filesystem was used.
- The retrieval calls reconstructed eight directional PNG records, one GLB in
  two chunks, and one manifest-bound workflow-evidence record.
- Every chunk digest was checked before use, and every reconstructed record
  matched its manifest-bound digest. The retrieved total was 86,548 bytes.

## Exact identity and contract bindings

| Binding | Recorded value |
| --- | --- |
| Asset | `adventurer.rustic` |
| Revision | `revision.ee5d0a35c6d53befb6422c9df637b7a2679adf57cb8913aeec793afb0b01df67` |
| Manifest contract | `forge-asset-interchange-manifest/v1` |
| Manifest SHA-256 | `0d8c1380938e1bd5cbfb4c940b797727a01ba167884b222afcfe92485b49551d` |
| Render profile | `fantasy.sprite.orthographic.v1@1.0.0` |
| Style profile | `cute_chibi_v1@1.0.0` |
| Consumer profile contract | `education-app-pack-profile/v1` |
| Consumer profile SHA-256 | `e071abd2f121fd40c40f976b3ed09c232a1e6f132a9ef53cabe2e14328184011` |

The manifest contained nine source artifacts: eight transparent 128x128 PNG
directional frames and one 60,320-byte GLB. It also bound one 316-byte workflow
evidence record. The Pixel completeness profile named the same nine source
members and pinned every Forge member to the contract, asset, revision,
manifest digest, artifact identity, and artifact digest.

## Consumer checks

The live handoff exercised the same closed boundary represented by
`src/lib/forge-interchange.ts` and
`src/lib/education-app-pack-profile.ts`:

- exact tool names, public visibility, exact contract ID, revision-pinned
  retrieval, bounded chunk transfer, and both artifact/evidence record kinds;
- canonical manifest and profile digests;
- manifest-to-chunk identity, revision, length, per-chunk digest, and complete
  reconstructed-stream digest binding;
- eight required transparent 128x128 directional PNGs plus the independently
  required GLB; and
- deterministic ordered membership and pack-profile digest.

Two isolated fresh runtime roots produced byte-identical source artifacts,
workflow evidence, persisted interchange JSON, and persisted consumer-profile
JSON. This is fresh-runtime determinism evidence, not the stronger independent
clean-clone proof.

## Evidence retention limits

The live run observed public `tools/list` discovery, but the retained dossier
does not preserve that response or independently reconstruct its tool count.
It also does not retain an A/B pair of tools lists or sanitized call ledgers.
Those observations are therefore not used as durable determinism or completion
evidence. Discovery shape and rejection behavior are proven by the focused
source tests; the durable ledger proves the exact public manifest and chunk
operations used by the representative retrieval workflow.

## Durable producer evidence

The sister repository retains the sanitized, host-path-free evidence dossier
under
`fantasy-asset-forge/measure/tracks/engine_interop_evidence_20260719/s2-live-evidence/`:

- `workflow-report.md`
- `public-call-ledger.json`
- `interchange-manifest.json`
- `workflow-evidence.json`
- `education-app-pack-profile.json`
- `determinism.md`
- `verifier-glb-summary.md`
- `visual-review.md`

The Kimi WebBridge browser review recorded 8 of 8 Pixel images at 128x128
natural and display dimensions with no overflow. The E and W profiles remained
visibly thinner and darker than the other views, so browser-visible transport
is proven but final art acceptance is not.

## Successor rebind and live admission refresh

After Forge added atomic create-only initialization, bounded registered-grammar
composition, concrete archetype defaults/ports, style-originality evidence, and
the released animation entrypoint, the inventory-complete post-alias public-MCP
replays under `/tmp/faf-static-final4-rebind-20260722-a` and
`/tmp/faf-static-final4-rebind-20260722-b` reproduced the same public catalog,
revision, manifest, chunks, ledger, and record bytes. Pixel now pins:

- Forge delivery claim
  `dacab165e0ad370136a3ac67abca4f086c21dabb8b45dcd225372b615b416ab4`;
- Forge owner-verification digest
  `868123a2dd2981de879f28b5b5a27941ff70271f938a2766cb7ef7887efce942`;
  and
- code-owned Pixel acceptance binding
  `f11213bc7b3b55bfc4153ba6b4d0607b6876f25466a975f6e412e1c24245905f`.

Forge's hardened claim-bound gate passed over all 68 producer files. Earlier
62-file and 66-file claim/binding generations are legacy and revoked because
their inventories omitted later producer sources; they are not valid
acceptance evidence. The final fresh ledger passed the real evidence gate with
17 public calls, 11 chunks, and 10 reconstructed records totaling 86,548 bytes.

With both replay roots and the direct stdio caller explicitly enabled, the
complete eleven-file Forge-consumer matrix passed 154 tests. The caller
retrieved and staged the exact retained revision through the public MCP process,
while the two dossiers produced the same pending-review projection. Typecheck
and the production `vinext build` also passed.

Kimi WebBridge then used the user's real browser against the already-running
Pixel server at `http://127.0.0.1:3100/`. The accessibility snapshot exposed
the complete Sprite Foundry workspace and its controls. Browser evaluation
reported a complete document, no alert nodes, no horizontal overflow, and a
rendered `64x64` SVG at `256x256` with five child layers; the Reset
composition control responded successfully. The screenshot helper did not
produce a file, so this record makes no screenshot-file claim. This verifies
the current Pixel application shell, not an imported Forge registry UI or either
final theme pack.

## Direct Pixel stdio caller verification

Pixel's package-owned stdlib transport was then exercised directly against the
real Forge MCP entrypoint and the retained definitive runtime for
`adventurer.rustic@revision.ee5d0a35c6d53befb6422c9df637b7a2679adf57cb8913aeec793afb0b01df67`.
It negotiated MCP `2025-06-18`, validated raw discovery, retrieved the exact
manifest plus all bounded source/evidence chunks, and reused the existing
staging boundary. No configured command, arguments, cwd, runtime path, or
stderr diagnostics appeared in the returned dossier or registry JSON.

After adversarial review, notification correlation and stderr behavior were
hardened: valid bounded server notifications no longer corrupt response
matching, malformed/hybrid/flooded notifications still fail closed, benign
stderr is discarded up to 16 KiB, and overflow fails. The primary combined
live run passed 10 files and 111 tests with both the direct caller and replay
dossier paths enabled. Typecheck and the production build also pass.

## Temporal v1 consumer staging verification

Pixel parses and validates the closed `forge-temporal-render-artifacts/v1`
manifest and emits a deterministic `pixel-forge-temporal-staging-plan/v1`.
The validator binds asset, revision, morphology, rig, equipment, clip, frame-plan,
frame, atlas, inline source-GLB, and delivery identities. It requires contiguous
distinct timed 128x128 alpha PNG frames; checks complete PNG structure, byte
lengths, SHA-256 values, stable camera scale and ground anchor, and exact atlas
identity/dimensions/rectangles; and validates GLB magic, version 2, declared
length, four-byte-aligned JSON/BIN chunk structure, exact byte length, and digest.
Static-direction substitution, duplicate filler bytes, path traversal, identity/
hash/length drift, malformed GLBs, and incomplete or extra artifacts fail closed.

The final public-MCP outputs under `/tmp/faf-public-temporal-20260723-k` and
`/tmp/faf-public-temporal-20260723-l` reproduced byte-identical temporal artifact
directories. The `k` delivery passed Pixel's real staging path with four S-view
frames at 0, 125, 250, and 375 ms, one 512x128 atlas, the 60,320-byte
`adventurer.rustic.glb`, and the raw manifest: seven content-addressed records
and 87,798 verified bytes in total. The source GLB is
`glb.ef22ce2bad7e2c3051c4839a70a7cb568c75c4df99cf76c39a1d652e43d4099c`;
the manifest SHA-256 is
`854a0860ac237c807858b5215dd371fd79e9e0a57fcd6af631bb179be166b088`;
and the delivery ID is
`delivery.150f89aa05ef6beab82d4196fad0e58ad22183c7bb0b2484602fed6087fe7b75`.
The result remains `validated_unadmitted`.

The focused real-directory suite passed 18 tests. With the opt-in real-directory
test unset, the temporal plus v2 contract matrix passed 85 tests with that one
integration test skipped. TypeScript typecheck also passes.

This historical proof completes the single-delivery inline-GLB mechanical
contract only. It does not accept the model/equipment visual identity or pack
art. The exact-five batch and public retrieval work described below supersede
its transport and local-playback gaps; downstream playback and final-character
Kimi acceptance remain open. The four-frame motion is diagnostic evidence, not
an accepted walk cycle.

## Exact five-clip batch consumer verification

Pixel now independently validates the closed
`forge-temporal-render-batch-artifacts/v1` delivery authored under
`forge-reference-five-clip-authoring/v1`. The consumer requires the ordered
`idle`, `walk_forward`, `walk_right`, `attack`, and `receive_damage` tuple with
4/6/6/6/4 samples per direction; exact clip/frame-plan/frame binding; canonical
action-direction-time ordering; five ordered per-clip pose sheets; one combined
atlas; the exact source GLB; and one canonical rigid-animation bundle whose
keyframes retain semantic phase labels. It permits the same intentional neutral
bytes across different clips but rejects repeated filler bytes within one
clip-direction.

The original opt-in test read Forge's internal artifact directory. That proved
artifact validation but not the required public MCP boundary and is no longer
credited as cross-repository integration. Pixel now accepts the public replay
record itself, requiring top-level `manifestSha256`, reconstructing every
artifact from public bounded chunks, and rejecting malformed base64, binding,
offset, length, chunk digest, whole-artifact digest, or artifact-set drift.

The fresh real record is
`/tmp/faf-public-reference-full-body-v2-20260723-o/public-reference-five-clip-retrieval.json`.
It contains 38 chunks for 34 producer artifacts under delivery
`delivery.1cd3d8e17ba86b33432da3756ad24080aafa6f18e0629257db47aa60d7a0ba4f`
and manifest SHA-256
`3b843972deaf555bff51af955e663152190adcb8e57e5104b09b72e5b44cea34`.
The strict public-retrieval consumer, additive
`education-app-pack-profile/v2`, and dual-theme contract suites pass 116/116
with the real integration enabled; full Pixel typecheck is green. Pixel emits
`pixel-forge-five-clip-staging-plan/v1` with status
`validated_unadmitted`; it does not copy the delivery into a shipping pack.

Kimi WebBridge loaded all five full-body V2 pose sheets and exposed every one of
the 26 source frames. All five browser playback counters advanced under declared
timing while current frames remained decoded 128x128 PNGs. Side-walk facing and
equipment no longer flip, and walk, attack, and damage have distinct full-body
phases. The delivery still fails pack visual acceptance because the placeholder
character does not match the approved reference target. The exact remaining
admission blockers are an accepted model, rerendered-on-model motion review,
pack-level Kimi acceptance, runtime playback acceptance, and pack admission.

## Gate verdict

**Phase 1 discovery/retrieval and static replay-staging tasks: complete.**

This verdict covers the contract-first source tests plus the durable public
manifest/chunk retrieval evidence above. It does not claim that the original
retained dossier independently proves a `tools/list` transcript; the final
fresh replay pair separately retains and validates raw discovery.

Phase 4 final static admission remains closed on accepted delivery-resolution
review. Single-clip and exact-five-clip validation/content-addressed staging are
implemented, but production temporal admission remains closed on the accepted
model, full-body motion quality, playback, pack admission, and visual/Kimi
evidence required by
`rigid_animation_sprite_pipeline_20260717`. Complete-pack support still requires
accepted `village_asset_pack_20260718`.
