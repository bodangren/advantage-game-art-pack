# Dual-Theme Asset Pack Program

## Product Goal

Deliver two high-quality, reusable pixel-art theme packs for the Reading
Advantage product family, covering every accepted character, monster, tile,
environment, prop, effect, equipment role, and temporal pose sequence required
by present games while remaining safely extensible for future games.
The established product identities are **Chibi Quest** for younger learners and
**Riven Lands** for older learners. These names and audience positions are fixed
program inputs, not placeholders.

The packs are mirrored at the semantic-contract level: both must cover the same
accepted gameplay and presentation roles, meet the same quality gates, and be
equally usable by the downstream pack consumer. Mirrored does not mean identical
art, filenames, sheet layouts, or a permanently frozen roster.

Each pack must be complete for the accepted downstream corpus and extensible
enough that a later game can request a new semantic role without breaking
existing member identities. Passing the current five-clip character baseline
qualifies the production pipeline; it does not by itself complete either pack's
character or animation coverage. The program covers these families:

- characters, companions, NPCs, and supported monsters;
- equipment, wearables, weapons, and carried items;
- static poses and temporal clips;
- tiles, terrain, buildings, rooms, and environmental layers;
- props, pickups, interactables, and effects;
- VFX, particles, projectiles, and state feedback;
- HUD, controls, icons, panels, loading, covers, and other presentation art.

This document defines the program and gates. It does not freeze the exact asset
roster, per-game sheet layout, or downstream publication paths. It does not claim
either pack has passed Reading Advantage acceptance.

## Repository Roles

### Fantasy Asset Forge

Forge owns semantic 3D-derived assets and their immutable producer history:

- supported character, creature, prop, building, equipment, and rigid-pose
  authoring through public MCP operations;
- source asset and revision identities, semantic part relationships, materials,
  render profiles, provenance, validation, and revision comparison;
- deterministic legacy eight-view transparent PNG rendering and source GLB
  export for static model-view compatibility and QA only, never as an animation
  requirement or a substitute for temporal pose sequences;
- Forge-derived five-clip temporal frames, pose sheets, atlas, phase-bearing
  bundle, and manifest-bound source GLB under the current mechanical boundary;
  production use still requires an accepted reference-converged model and
  equipment identity, playback quality, and visual admission;
- public manifest and bounded chunk retrieval without exposing host file paths.

Current support is narrower than this program target. A deterministic full-body
V2 batch now produces all 26 ordered source frames for `idle`, `walk_forward`,
`walk_right`, `attack`, and `receive_damage`, plus five pose sheets, an atlas,
the exact source GLB, and phase-bearing metadata. Pixel has reconstructed it
from public MCP retrieval and its browser playback advances correctly. This is
still unadmitted: the placeholder character fails the approved-reference gate,
so the evidence proves transport and motion plumbing rather than production art.
Arbitrary monsters and unsupported anatomy remain blocked until Forge advertises
and evidences them.

### Pixel Art Generator

Pixel owns the educational-app pack and 2D-native production boundary:

- SVG-native tiles, environments, backgrounds, parallax, props, VFX, UI, and
  presentation surfaces;
- reference-target coordination and the semantic demand manifest for both themes;
- public-MCP retrieval, digest verification, immutable local staging, delivery-
  resolution review, admission, and provenance retention for Forge artifacts;
- mixed-pack membership, role cardinality, byte/count budgets, deterministic pack
  manifests, theme parity, and export profiles;
- playback adapters for accepted Forge animation metadata without recomposing or
  repacking the Forge atlas.

Pixel must not become the Forge producer, import Forge source code, call private
handlers, infer undocumented schemas, or repair Forge images after retrieval.

Pixel also owns a deterministic, non-shipping production-planning layer. It
expands signed v2 catalog demands into mirrored Chibi Quest/Riven Lands work
orders for audio, equipment, presentation, projectiles, props,
tiles/environments, UI, and VFX while preserving temporal signatures,
provenance, and execution contracts. This records missing/candidate/admitted
evidence truthfully; it is not native asset production or pack completion.

### Reading Advantage Monorepo

The monorepo is the downstream acceptance target and remains read-only for this
program unless downstream edits are separately authorized. Its current game and
theme requirements inform semantic roles, budgets, and browser-visible review;
they do not authorize copying assets into the monorepo or declaring acceptance.

The authoritative downstream production track is
`apk_dual_theme_asset_production_20260712`. It is currently blocked until
`apk_independent_acceptance_handoff_20260712` publishes product-owner-accepted
ontology and usage hashes. Until that predecessor closes, work in these source
repositories may harden deterministic authoring, public-MCP transport, review,
validation, and non-admitted reference prototypes, but it must not freeze the
production roster, production batches, or claim ontology coverage. Current
source-repository demand records and RB-01 through RB-08 are draft planning
evidence only and must be reconciled to the accepted downstream hashes before
production generation.

The downstream built-in image API is also not yet a production reference-board
contract. Its canonical `generateImage` result currently returns raw bytes
without image-generation provenance, and the OpenAI/Google adapters do not
forward the declared size or seed. No purpose-built reference-board command or
versioned manifest writer exists. Pixel may design validators and manifests
against this gap, but it must not claim provider-controlled dimensions,
seed-deterministic generation, or provenance-bound production boards until the
owning downstream package supplies and accepts that contract.

## Reference-Led Design Workflow

1. Build a living semantic demand matrix from downstream evidence. Record role,
   family, gameplay purpose, required viewpoints/states, size constraints, and
   whether the need is static, pose/state based, or temporal. Legacy filenames
   are discovery evidence, not authoritative producer contracts.
2. Create provenance-bound reference boards or turnarounds for each visual family.
   A novel character target covers front, three-quarter, side, and back views
   unless the owner explicitly accepts a reduced set. Record provider, prompt or
   inputs, output identity, provenance, and originality review.
3. Obtain explicit visual-direction approval before producing final assets. A
   missing approved image provider or missing owner approval blocks novel
   character production; the workflow must not silently select a provider.
   For this program, downstream Story S3 additionally requires the built-in
   image generator and explicitly disallows MMX or unrelated external generation
   services. No external provider may be substituted without a separately
   authorized downstream specification change.

The downstream Story S3 wording currently applies that generator rule to all
new art, while the product owner has separately directed character production
through reference-first Forge 3D modeling and deterministic pixel snapshots.
Continue hardening and visually evaluating that explicitly authorized Forge path,
but keep its outputs non-admitted until the downstream accepted handoff or an
authorized downstream revision resolves the physical-production policy. Do not
silently reinterpret either contract or replace the 3D workflow with generated
2D animation sheets.
4. Route each approved brief to its owning repository. Forge work begins with
   runtime `inspect_capabilities`; Pixel-native work begins with its own source
   and export contracts. Unsupported requirements remain visible rather than
   being approximated with unrelated assets.
5. Produce the smallest reviewable family slice, retain immutable identities,
   and run mechanical validation before visual judgment.
6. Review Forge assets in deterministic eye-level authoring comparisons against
   the approved front, three-quarter, side, and back reference views, then in the
   interactive 3D inspector, static model-view contact sheet, every native
   128x128 PNG, every temporal pose sheet, and live clip playback. Use Kimi
   WebBridge for browser-visible comparison. A contact sheet or mechanically
   advancing animation alone is not delivery-resolution approval.
7. Admit individual assets only after reference fidelity, native-size clarity,
   provenance, digest, and contract gates pass. Then evaluate family completeness
   and mirrored theme coverage; isolated attractive assets do not complete a pack.

## Delivery Contracts

The program distinguishes three contracts. Only the temporal contract describes
animation:

- A **legacy static eight-view dossier** is the current Forge compatibility
  delivery: exactly eight independent transparent 128x128 model-view PNGs, at
  least one source GLB, immutable revision identity, manifest, and evidence. Its
  views and derived contact sheet are non-temporal review evidence, not poses,
  frames, or an animation requirement.
- A **legacy pose/state sheet** is a downstream grid whose cells may encode
  directions, poses, or game states. It is non-authoritative and non-temporal
  unless a separate manifest declares its cell semantics.
- A **temporal animation staging delivery** uses the versioned five-clip baseline
  contract for 26 ordered individual source frames, five pose sheets, Forge's
  combined atlas, the exact source GLB, and phase-bearing metadata for immutable
  identities, digests, rectangles, timing, loops, labels, framing, and ground
  anchors. Pixel strictly validates and content-addresses this output without
  recomputing producer surfaces. The current public-retrieval run is
  `validated_unadmitted`: deterministic reconstruction and live playback pass,
  while the model and its visual quality fail admission. Atlas-only delivery is
  not complete. This baseline proves the authoring and transport path; accepted
  downstream roles may require additional actions, equipment variants, frame
  counts, timings, transitions, and state-specific pose sequences.

The detailed transport and evidence contract is maintained in
`measure/tracks/fantasy_asset_forge_mcp_pack_ingestion_20260722/cross-repo-asset-contract.md`.

## Quality and Acceptance Gates

### Per-asset gates

Every candidate must pass before pack admission:

- a supported runtime capability and public operation path;
- exact immutable source/revision identity and manifest/artifact digests;
- provenance, ownership or license label, and originality evidence;
- closed-schema, media-type, dimension, transparency, and byte-budget checks;
- producer validation and explained revision locality;
- native-resolution visual clarity, silhouette, framing, ground contact, material
  separation, requested-feature visibility, and direction consistency;
- side-by-side reference fidelity where an approved target exists;
- an explicit accepted, partial, or rejected visual verdict with evidence.

A mechanically valid asset can still fail visual review. A rejected or partial
asset cannot silently satisfy a required production role.

Visual verification is exhaustive rather than sampled: inspect every temporal
source frame, every pose sheet and live clip, every admitted static model view,
every tile/material member and repetition proof, and every composed scene or
presentation surface at its actual delivery size. Contact sheets and overview
pages aid comparison but never replace native-size inspection of their members.

### Family and batch gates

Each theme maintains a versioned demand/completeness matrix rather than a fixed
hard-coded roster. A batch passes only when:

- every required semantic role has an admitted member or an explicit accepted
  exception owned by the product decision-maker;
- role cardinalities, variants, direction/state/clip requirements, and export
  profiles are satisfied;
- references point to exact immutable source identities and no member is replaced
  by a derived preview, contact sheet, or atlas-only substitute;
- total artifact count, total bytes, and single-artifact budgets pass;
- every member has visual-review and provenance evidence;
- deterministic replay produces the same canonical manifest and identities;
- missing, duplicate, stale, rejected, or unsupported members fail the batch.

### Mirrored-pack gate

The two packs pass program parity when their accepted semantic-role matrices are
equivalent, even when their visual treatment and concrete asset counts differ.
Any role intentionally present in only one theme requires a recorded product
exception; otherwise it is a completeness gap. Parity does not waive each pack's
independent visual-quality review.

### Downstream gate

After Pixel passes individual, family, batch, and parity checks, validate the
candidate pack against the downstream consumer's actual contract and browser-
visible surfaces. This gate is evidence for a later acceptance decision, not
permission to edit the monorepo or a claim that theme-pack acceptance has passed.

## Failure and Blocker Policy

- Any MCP envelope with `ok: false` stops that asset path; preserve its issue and
  guidance and do not manufacture a success record.
- Unsupported or not-assessed capabilities block the dependent role. A supported
  independent subset may proceed only when the reduced scope is explicit.
- Revision conflicts require re-inspection and replanning; never overwrite a
  concurrent revision.
- Schema, identity, digest, chunk, path, provenance, budget, or visual mismatch
  fails closed before admission.
- A producer defect is repaired only by the owning repository and then replayed
  through the public boundary. Pixel must not post-process the received bytes.
- Temporal requests may use the evidenced five-clip mechanical path for further
  authoring and testing, but production admission remains blocked until the
  underlying model converges on its approved reference and every clip passes
  native-frame, pose-sheet, live-playback, and Kimi visual review.

## Future-Game Extension

New games extend the program by adding semantic demand entries, not by rewriting
accepted identities. Each addition declares its owner, family, visual reference,
required states or clips, budgets, and downstream consumer contract. New optional
roles use additive versioned contracts; breaking role semantics require a new
contract version and migration plan. Existing pack revisions remain immutable,
reproducible, and available for comparison.

The program is complete only when both packs have passed the real public-MCP
workflow where applicable, Pixel admission and pack validation, native and
browser-visible visual review, downstream contract validation, and Measure
closeout. Until then, status reporting must name completed evidence, blockers,
and the next owner action without collapsing planned capability into delivery.
