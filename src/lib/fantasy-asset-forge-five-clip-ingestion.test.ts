import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  digestFantasyAssetForgeFiveClipBytes,
  FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID,
  FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID,
  stageFantasyAssetForgeFiveClipDelivery,
  stageFantasyAssetForgeFiveClipPublicRetrieval,
  type FantasyAssetForgeFiveClipDelivery,
} from "./fantasy-asset-forge-five-clip-ingestion";

const ACTIONS = ["idle", "walk_forward", "walk_right", "attack", "receive_damage"] as const;
const SAMPLES = [4, 6, 6, 6, 4] as const;
const hash = (value: number): string => value.toString(16).padStart(64, "0");

function canonical(value: unknown): string {
  const visit = (entry: unknown): unknown => {
    if (entry === null || typeof entry === "string" || typeof entry === "boolean") return entry;
    if (typeof entry === "number") return Object.is(entry, -0) ? 0 : entry;
    if (Array.isArray(entry)) return entry.map(visit);
    return Object.fromEntries(Object.entries(entry as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, child]) => [key, visit(child)]));
  };
  return `${JSON.stringify(visit(value), null, 2)}\n`;
}

async function canonicalDigest(value: unknown): Promise<string> {
  return digestFantasyAssetForgeFiveClipBytes(new TextEncoder().encode(canonical(value)));
}

function png(width: number, height: number, marker: number): Uint8Array {
  const chunk = (type: string, data: Uint8Array) => {
    const bytes = new Uint8Array(12 + data.byteLength);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, data.byteLength);
    bytes.set([...type].map((character) => character.charCodeAt(0)), 4);
    bytes.set(data, 8);
    return bytes;
  };
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array([marker])),
    chunk("IEND", new Uint8Array()),
  ];
  const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

function glb(marker = 1): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify({ asset: { version: "2.0" }, extras: { marker } }));
  const padded = Math.ceil(json.byteLength / 4) * 4;
  const bytes = new Uint8Array(12 + 8 + padded + 12);
  const view = new DataView(bytes.buffer);
  bytes.set([0x67, 0x6c, 0x54, 0x46]);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, padded, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.fill(0x20, 20, 20 + padded);
  bytes.set(json, 20);
  const binOffset = 20 + padded;
  view.setUint32(binOffset, 4, true);
  view.setUint32(binOffset + 4, 0x004e4942, true);
  bytes.set([marker, 0, 0, 0], binOffset + 8);
  return bytes;
}

function metrics(sequence: number) {
  return {
    occupiedBounds: { minX: 24, minY: 40, maxX: 100, maxY: 120, width: 77, height: 81 },
    occupiedPixelCount: 1400,
    occupiedRatio: 1400 / 16384,
    transparentPixelCount: 14984,
    clippedEdges: [],
    groundPixelY: 120,
    groundAnchorDeviationPixels: 0,
    minimumHorizontalRunPixels: 1,
    minimumVerticalRunPixels: 2,
    representativeFeaturePixels: 5,
    requiredFeatureEvidence: [{ featureId: "torso", sequence }],
    framingEvidence: {
      topMarginPixels: 40,
      centerDeviationPixels: sequence / 100,
      heightDeviationPixels: 0,
      worldUnitsPerPixel: 0.035,
    },
  };
}

interface Fixture {
  delivery: FantasyAssetForgeFiveClipDelivery;
  manifest: Record<string, any>;
  bundle: Record<string, any>;
}

async function fixture(): Promise<Fixture> {
  const revisionId = `revision.${hash(1)}`;
  const morphologyRevisionId = `morphology.${hash(2)}`;
  const rigSignature = `rig.${hash(3)}`;
  const equipmentSignature = `equipment.${hash(4)}`;
  const binding = { assetRevisionId: revisionId, morphologyRevisionId, rigSignature, equipmentSignature };
  const renderProfile = { id: "fantasy.sprite.orthographic.v1", version: "1.0.0" };
  const poseIds = [`pose.${hash(500)}`, `pose.${hash(501)}`];
  const frames: Record<string, any>[] = [];
  const frameBytes: Uint8Array[] = [];
  const clips: Record<string, any>[] = [];
  const bundleClips: Record<string, any>[] = [];
  const framePlans: Record<string, any>[] = [];
  let globalSequence = 0;
  for (const [clipIndex, action] of ACTIONS.entries()) {
    const sampleCount = SAMPLES[clipIndex]!;
    const durationMs = sampleCount === 4 ? 500 : 600;
    const clipId = `clip.${hash(10 + clipIndex)}`;
    const framePlanId = `frame-plan.${hash(20 + clipIndex)}`;
    const clipFrameIds: string[] = [];
    const plannedFrames: Record<string, any>[] = [];
    for (let sample = 0; sample < sampleCount; sample += 1) {
      const sampleTimeMs = Math.floor((sample * durationMs) / sampleCount);
      const id = `frame.${hash(100 + globalSequence)}`;
      const bytes = png(128, 128, globalSequence + 1);
      const digest = await digestFantasyAssetForgeFiveClipBytes(bytes);
      const fileName = `${String(globalSequence).padStart(4, "0")}-${action}-s-${sampleTimeMs}.png`;
      frames.push({
        id,
        sequence: globalSequence,
        clipId,
        action,
        framePlanId,
        direction: "S",
        sampleTimeMs,
        fileName,
        byteLength: bytes.byteLength,
        sha256: digest,
        metrics: metrics(globalSequence),
      });
      frameBytes.push(bytes);
      clipFrameIds.push(id);
      plannedFrames.push({
        id,
        sequence: sample,
        key: { ...binding, clipId, sampleTimeMs, renderProfile, direction: "S", seed: 77 },
        output: { mediaType: "image/png", width: 128, height: 128, transparent: true },
      });
      globalSequence += 1;
    }
    const loop = clipIndex < 3 ? { mode: "loop", startMs: 0, endMs: durationMs } : { mode: "once" };
    clips.push({
      clipId,
      action,
      framePlanId,
      durationMs,
      loop,
      interpolation: "linear",
      directions: ["S"],
      samplesPerDirection: sampleCount,
      frameIds: clipFrameIds,
      poseSheetId: "pending",
    });
    bundleClips.push({
      contractId: "forge-clip-document/v1",
      clipId,
      action,
      ...binding,
      durationMs,
      interpolation: "linear",
      rootAnchorPolicy: "locked",
      loop,
      keyframes: [
        { id: `${action}.start`, phase: "start", timeMs: 0, poseSnapshotId: poseIds[0] },
        { id: `${action}.end`, phase: "end", timeMs: durationMs, poseSnapshotId: poseIds[1] },
      ],
    });
    framePlans.push({
      contractId: "forge-frame-plan/v1",
      framePlanId,
      ...binding,
      clipId,
      durationMs,
      renderProfile,
      seed: 77,
      frames: plannedFrames,
    });
  }

  const poseSheets: Record<string, any>[] = [];
  const poseSheetBytes: Uint8Array[] = [];
  for (const [index, clip] of clips.entries()) {
    const bytes = png(clip.frameIds.length * 128, 128, 100 + index);
    const digest = await digestFantasyAssetForgeFiveClipBytes(bytes);
    const id = `sheet.${digest}`;
    clip.poseSheetId = id;
    poseSheets.push({
      id,
      classification: "derived",
      role: "pose_sheet",
      mediaType: "image/png",
      fileName: `pose-sheet-${clip.action}.png`,
      byteLength: bytes.byteLength,
      sha256: digest,
      width: clip.frameIds.length * 128,
      height: 128,
      columns: clip.frameIds.length,
      rows: 1,
      rects: clip.frameIds.map((frameId: string, rectIndex: number) => ({ frameId, x: rectIndex * 128, y: 0, width: 128, height: 128 })),
    });
    poseSheetBytes.push(bytes);
  }
  const atlasBytes = png(26 * 128, 128, 200);
  const atlasSha = await digestFantasyAssetForgeFiveClipBytes(atlasBytes);
  const atlas = {
    id: `atlas.${atlasSha}`,
    classification: "derived",
    role: "sprite_atlas",
    mediaType: "image/png",
    fileName: "atlas.png",
    byteLength: atlasBytes.byteLength,
    sha256: atlasSha,
    width: 26 * 128,
    height: 128,
    columns: 26,
    rows: 1,
    rects: frames.map((frame, index) => ({ frameId: frame.id, x: index * 128, y: 0, width: 128, height: 128 })),
  };
  const sourceGlbBytes = glb();
  const glbSha = await digestFantasyAssetForgeFiveClipBytes(sourceGlbBytes);
  const bundle = {
    contractId: "forge-rigid-animation-bundle/v1",
    rig: {
      contractId: "forge-rig-definition/v1",
      rigId: "rig.humanoid",
      ...binding,
      rootJointId: "root",
      joints: [{ id: "root", partId: "torso", axis: "y", minimumDegrees: -30, maximumDegrees: 30, restDegrees: 0 }],
    },
    poses: poseIds.map((poseSnapshotId, index) => ({
      contractId: "forge-pose-snapshot/v1",
      poseSnapshotId,
      ...binding,
      channels: [{ jointId: "root", valueDegrees: index }],
    })),
    clips: bundleClips,
    framePlans,
  };
  const bundleBytes = new TextEncoder().encode(canonical(bundle));
  const bundleSha = await digestFantasyAssetForgeFiveClipBytes(bundleBytes);
  const manifestWithoutDelivery = {
    contractId: FORGE_TEMPORAL_RENDER_BATCH_ARTIFACTS_ID,
    authoringContractId: FORGE_REFERENCE_FIVE_CLIP_AUTHORING_ID,
    assetId: "adventurer.rustic",
    revisionId,
    morphologyRevisionId,
    rigSignature,
    equipmentSignature,
    renderProfile,
    sourceGlb: {
      id: `glb.${glbSha}`,
      classification: "source",
      mediaType: "model/gltf-binary",
      fileName: "adventurer.rustic.glb",
      byteLength: sourceGlbBytes.byteLength,
      sha256: glbSha,
    },
    animationBundle: {
      id: `bundle.${bundleSha}`,
      classification: "source",
      mediaType: "application/json",
      fileName: "animation-bundle.json",
      byteLength: bundleBytes.byteLength,
      sha256: bundleSha,
    },
    clips,
    frames,
    poseSheets,
    atlas,
  };
  const manifest = { ...manifestWithoutDelivery, deliveryId: `delivery.${await canonicalDigest(manifestWithoutDelivery)}` };
  const manifestBytes = new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
  return {
    manifest,
    bundle,
    delivery: {
      manifest_bytes: manifestBytes,
      manifest_sha256: await digestFantasyAssetForgeFiveClipBytes(manifestBytes),
      files: [
        ...frames.map((frame, index) => ({ file_name: frame.fileName, bytes: frameBytes[index]! })),
        ...poseSheets.map((sheet, index) => ({ file_name: sheet.fileName, bytes: poseSheetBytes[index]! })),
        { file_name: atlas.fileName, bytes: atlasBytes },
        { file_name: "adventurer.rustic.glb", bytes: sourceGlbBytes },
        { file_name: "animation-bundle.json", bytes: bundleBytes },
      ],
    },
  };
}

async function resignManifest(
  source: FantasyAssetForgeFiveClipDelivery,
  mutate: (manifest: Record<string, any>) => void,
): Promise<FantasyAssetForgeFiveClipDelivery> {
  const manifest = JSON.parse(new TextDecoder().decode(source.manifest_bytes));
  mutate(manifest);
  delete manifest.deliveryId;
  manifest.deliveryId = `delivery.${await canonicalDigest(manifest)}`;
  const bytes = new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
  return { ...source, manifest_bytes: bytes, manifest_sha256: await digestFantasyAssetForgeFiveClipBytes(bytes) };
}

async function mutateBundle(
  source: FantasyAssetForgeFiveClipDelivery,
  mutate: (bundle: Record<string, any>) => void,
): Promise<FantasyAssetForgeFiveClipDelivery> {
  const bundleIndex = source.files.findIndex(({ file_name }) => file_name === "animation-bundle.json");
  const bundle = JSON.parse(new TextDecoder().decode(source.files[bundleIndex]!.bytes));
  mutate(bundle);
  const bundleBytes = new TextEncoder().encode(canonical(bundle));
  const digest = await digestFantasyAssetForgeFiveClipBytes(bundleBytes);
  return resignManifest(
    {
      ...source,
      files: source.files.map((file, index) => index === bundleIndex ? { ...file, bytes: bundleBytes } : file),
    },
    (manifest) => {
      manifest.animationBundle.id = `bundle.${digest}`;
      manifest.animationBundle.byteLength = bundleBytes.byteLength;
      manifest.animationBundle.sha256 = digest;
    },
  );
}

function publicRetrieval(
  delivery: FantasyAssetForgeFiveClipDelivery,
): Record<string, any> {
  const manifest = JSON.parse(new TextDecoder().decode(delivery.manifest_bytes));
  const descriptors = [
    ...manifest.frames,
    ...manifest.poseSheets,
    manifest.atlas,
    manifest.sourceGlb,
    manifest.animationBundle,
  ];
  return {
    deliveryId: manifest.deliveryId,
    manifestSha256: delivery.manifest_sha256,
    manifest,
    chunks: descriptors.map((descriptor: any) => {
      const file = delivery.files.find(
        ({ file_name }) => file_name === descriptor.fileName,
      )!;
      return {
        delivery_id: manifest.deliveryId,
        asset_id: manifest.assetId,
        revision_id: manifest.revisionId,
        artifact_id: descriptor.id,
        artifact_sha256: descriptor.sha256,
        chunk_sha256: descriptor.sha256,
        offset: 0,
        length: file.bytes.byteLength,
        total: file.bytes.byteLength,
        record_kind: "artifact",
        bytes_base64: Buffer.from(file.bytes).toString("base64"),
      };
    }),
  };
}

describe("Fantasy Asset Forge exact five-clip ingestion", () => {
  it("strictly stages the exact ordered five-clip artifact set as validated_unadmitted", async () => {
    const source = await fixture();
    const staged = await stageFantasyAssetForgeFiveClipDelivery(source.delivery);

    expect(staged.manifest.clips.map(({ action }) => action)).toEqual(ACTIONS);
    expect(staged.manifest.clips.map(({ samplesPerDirection }) => samplesPerDirection)).toEqual(SAMPLES);
    expect(staged.manifest.frames[0]!.metrics.framingEvidence).toEqual({
      topMarginPixels: 40,
      centerDeviationPixels: 0,
      worldUnitsPerPixel: 0.035,
    });
    expect(Object.keys(staged.manifest.frames[0]!.metrics.framingEvidence)).toEqual([
      "topMarginPixels",
      "centerDeviationPixels",
      "worldUnitsPerPixel",
    ]);
    expect(staged.plan.status).toBe("validated_unadmitted");
    expect(staged.plan.verification).toEqual(expect.objectContaining({
      clip_count: 5,
      source_frame_count: 26,
      pose_sheet_count: 5,
      artifact_count: 35,
      hashes_verified: true,
      source_glb_verified: true,
      animation_bundle_verified: true,
      artifact_set_verified: true,
    }));
    expect(staged.plan.blockers).toEqual([
      "accepted_model_missing",
      "motion_acceptance_missing",
      "kimi_acceptance_missing",
      "playback_acceptance_missing",
      "pack_admission_not_evaluated",
    ]);
    expect(staged.plan.records.every(({ local_reference, sha256 }) =>
      local_reference.includes(`/sha256/${sha256}.`))).toBe(true);
  });

  it("reconstructs and stages only the public manifest-plus-chunk retrieval record", async () => {
    const { delivery } = await fixture();
    const retrieval = publicRetrieval(delivery);
    const staged =
      await stageFantasyAssetForgeFiveClipPublicRetrieval(retrieval);

    expect(staged.plan.status).toBe("validated_unadmitted");
    expect(staged.plan.verification).toEqual(
      expect.objectContaining({
        clip_count: 5,
        source_frame_count: 26,
        pose_sheet_count: 5,
        artifact_count: 35,
      }),
    );

    const missing = structuredClone(retrieval);
    missing.chunks.pop();
    await expect(
      stageFantasyAssetForgeFiveClipPublicRetrieval(missing),
    ).rejects.toThrow(/missing artifact/);

    const corrupt = structuredClone(retrieval);
    corrupt.chunks[0].bytes_base64 = "AAAA";
    await expect(
      stageFantasyAssetForgeFiveClipPublicRetrieval(corrupt),
    ).rejects.toThrow(/length|chunk_sha256/);
  });

  it("rejects closed-schema drift and exact action/sample-order drift", async () => {
    const { delivery } = await fixture();
    for (const [mutate, error] of [
      [(manifest: any) => { manifest.extra = true; }, /unexpected key/],
      [(manifest: any) => { manifest.clips[0].action = "walk_forward"; }, /clips\[0\]\.action/],
      [(manifest: any) => { manifest.clips[1].samplesPerDirection = 4; }, /samplesPerDirection/],
      [(manifest: any) => { manifest.frames[0].metrics.extra = true; }, /metrics.*unexpected key/],
      [(manifest: any) => { manifest.sourceGlb.classification = "derived"; }, /classification.*source/],
    ] as const) {
      await expect(stageFantasyAssetForgeFiveClipDelivery(await resignManifest(delivery, mutate))).rejects.toThrow(error);
    }
  });

  it("rejects frame identity, timing, binding, ordering, and filler drift", async () => {
    const { delivery } = await fixture();
    for (const [mutate, error] of [
      [(manifest: any) => { manifest.frames[1].sequence = 2; }, /contiguous global sequences/],
      [(manifest: any) => { manifest.frames[1].id = manifest.frames[0].id; }, /duplicate frame identity/],
      [(manifest: any) => { manifest.frames[1].sha256 = manifest.frames[0].sha256; }, /duplicate source-frame bytes/],
      [(manifest: any) => { manifest.frames[1].sampleTimeMs = manifest.frames[0].sampleTimeMs; }, /duplicate clip\/direction\/time/],
      [(manifest: any) => { manifest.frames[0].framePlanId = manifest.clips[1].framePlanId; }, /frame bindings/],
      [(manifest: any) => { manifest.clips[0].frameIds.reverse(); }, /frameIds must exactly cover/],
    ] as const) {
      await expect(stageFantasyAssetForgeFiveClipDelivery(await resignManifest(delivery, mutate))).rejects.toThrow(error);
    }
  });

  it("allows identical neutral source bytes across different clips", async () => {
    const { delivery, manifest } = await fixture();
    const neutralBytes = delivery.files.find(({ file_name }) => file_name === manifest.frames[0].fileName)!.bytes;
    const targetSequence = 16;
    const targetName = manifest.frames[targetSequence].fileName;
    const neutralDigest = await digestFantasyAssetForgeFiveClipBytes(neutralBytes);
    const crossClipNeutral = await resignManifest(
      {
        ...delivery,
        files: delivery.files.map((file) => file.file_name === targetName ? { ...file, bytes: neutralBytes } : file),
      },
      (candidate) => {
        candidate.frames[targetSequence].byteLength = neutralBytes.byteLength;
        candidate.frames[targetSequence].sha256 = neutralDigest;
      },
    );

    const staged = await stageFantasyAssetForgeFiveClipDelivery(crossClipNeutral);
    expect(staged.plan.verification.source_frame_count).toBe(26);
    expect(staged.manifest.frames[0]!.sha256).toBe(staged.manifest.frames[targetSequence]!.sha256);
    expect(staged.manifest.frames[0]!.clipId).not.toBe(staged.manifest.frames[targetSequence]!.clipId);
  });

  it("rejects pose-sheet and combined-atlas identity or layout drift", async () => {
    const { delivery } = await fixture();
    for (const [mutate, error] of [
      [(manifest: any) => { manifest.poseSheets[0].id = `sheet.${hash(999)}`; }, /id must bind sheet sha256/],
      [(manifest: any) => { manifest.poseSheets[0].rects[1].x = 129; }, /row-major layout/],
      [(manifest: any) => { manifest.poseSheets[0].rects[1].frameId = manifest.poseSheets[1].rects[0].frameId; }, /must exactly bind idle frame order/],
      [(manifest: any) => { manifest.atlas.role = "pose_sheet"; }, /atlas\.role.*sprite_atlas/],
      [(manifest: any) => { manifest.atlas.rects.reverse(); }, /atlas.*row-major|atlas must exactly cover/],
    ] as const) {
      await expect(stageFantasyAssetForgeFiveClipDelivery(await resignManifest(delivery, mutate))).rejects.toThrow(error);
    }
  });

  it("rejects missing, extra, length-drifted, hash-drifted, and malformed PNG artifacts", async () => {
    const { delivery } = await fixture();
    await expect(stageFantasyAssetForgeFiveClipDelivery({ ...delivery, files: delivery.files.slice(1) })).rejects.toThrow(/missing five-clip artifact/);
    await expect(stageFantasyAssetForgeFiveClipDelivery({
      ...delivery,
      files: [...delivery.files, { file_name: "extra.png", bytes: png(128, 128, 250) }],
    })).rejects.toThrow(/unexpected five-clip artifact/);
    await expect(stageFantasyAssetForgeFiveClipDelivery(await resignManifest(delivery, (manifest) => {
      manifest.frames[0].byteLength += 1;
    }))).rejects.toThrow(/byteLength mismatch/);
    const changed = delivery.files.map((file, index) => index === 0 ? { ...file, bytes: png(128, 128, 250) } : file);
    await expect(stageFantasyAssetForgeFiveClipDelivery({ ...delivery, files: changed })).rejects.toThrow(/sha256 hash drift/);
    const short = png(64, 128, 1);
    const shortDigest = await digestFantasyAssetForgeFiveClipBytes(short);
    const malformed = await resignManifest(
      { ...delivery, files: delivery.files.map((file, index) => index === 0 ? { ...file, bytes: short } : file) },
      (manifest) => {
        manifest.frames[0].byteLength = short.byteLength;
        manifest.frames[0].sha256 = shortDigest;
      },
    );
    await expect(stageFantasyAssetForgeFiveClipDelivery(malformed)).rejects.toThrow(/must be 128x128/);
  });

  it("rejects source-GLB hash and structural drift", async () => {
    const { delivery } = await fixture();
    const index = delivery.files.findIndex(({ file_name }) => file_name.endsWith(".glb"));
    const drift = delivery.files.map((file, fileIndex) => fileIndex === index ? { ...file, bytes: glb(2) } : file);
    await expect(stageFantasyAssetForgeFiveClipDelivery({ ...delivery, files: drift })).rejects.toThrow(/sha256 hash drift/);
    const invalid = delivery.files[index]!.bytes.slice();
    new DataView(invalid.buffer).setUint32(4, 1, true);
    const digest = await digestFantasyAssetForgeFiveClipBytes(invalid);
    const resigned = await resignManifest(
      { ...delivery, files: delivery.files.map((file, fileIndex) => fileIndex === index ? { ...file, bytes: invalid } : file) },
      (manifest) => {
        manifest.sourceGlb.id = `glb.${digest}`;
        manifest.sourceGlb.sha256 = digest;
      },
    );
    await expect(stageFantasyAssetForgeFiveClipDelivery(resigned)).rejects.toThrow(/GLB version 2/);
  });

  it("rejects non-canonical animation bundles and stale nested identity bindings", async () => {
    const { delivery } = await fixture();
    const bundleIndex = delivery.files.findIndex(({ file_name }) => file_name === "animation-bundle.json");
    const parsed = JSON.parse(new TextDecoder().decode(delivery.files[bundleIndex]!.bytes));
    const nonCanonicalBytes = new TextEncoder().encode(`${JSON.stringify(parsed)}\n`);
    const nonCanonicalDigest = await digestFantasyAssetForgeFiveClipBytes(nonCanonicalBytes);
    const nonCanonical = await resignManifest(
      { ...delivery, files: delivery.files.map((file, index) => index === bundleIndex ? { ...file, bytes: nonCanonicalBytes } : file) },
      (manifest) => {
        manifest.animationBundle.id = `bundle.${nonCanonicalDigest}`;
        manifest.animationBundle.byteLength = nonCanonicalBytes.byteLength;
        manifest.animationBundle.sha256 = nonCanonicalDigest;
      },
    );
    await expect(stageFantasyAssetForgeFiveClipDelivery(nonCanonical)).rejects.toThrow(/canonical sorted pretty JSON/);
    await expect(stageFantasyAssetForgeFiveClipDelivery(await mutateBundle(delivery, (bundle) => {
      bundle.rig.assetRevisionId = `revision.${hash(999)}`;
    }))).rejects.toThrow(/rig\.assetRevisionId/);
    await expect(stageFantasyAssetForgeFiveClipDelivery(await mutateBundle(delivery, (bundle) => {
      bundle.clips[1].action = "idle";
    }))).rejects.toThrow(/clips\[1\]\.action/);
    await expect(stageFantasyAssetForgeFiveClipDelivery(await mutateBundle(delivery, (bundle) => {
      bundle.framePlans[2].frames[0].key.sampleTimeMs += 1;
    }))).rejects.toThrow(/sampleTimeMs/);
    await expect(stageFantasyAssetForgeFiveClipDelivery(await mutateBundle(delivery, (bundle) => {
      delete bundle.clips[0].keyframes[0].phase;
    }))).rejects.toThrow(/keyframes\[0\] missing required key\(s\): phase/);
    await expect(stageFantasyAssetForgeFiveClipDelivery(await mutateBundle(delivery, (bundle) => {
      bundle.extra = true;
    }))).rejects.toThrow(/animation bundle contains unexpected key/);
  });

  it.skipIf(!process.env.FAF_FIVE_CLIP_PUBLIC_RETRIEVAL)(
    "stages a real public MCP five-clip retrieval record",
    async () => {
      const retrieval = JSON.parse(
        await readFile(process.env.FAF_FIVE_CLIP_PUBLIC_RETRIEVAL!, "utf8"),
      );
      const staged =
        await stageFantasyAssetForgeFiveClipPublicRetrieval(retrieval);

      expect(staged.plan.status).toBe("validated_unadmitted");
      expect(staged.plan.verification).toEqual(expect.objectContaining({
        clip_count: 5,
        source_frame_count: 26,
        pose_sheet_count: 5,
        artifact_count: 35,
        source_glb_verified: true,
        animation_bundle_verified: true,
      }));
    },
  );

  it("is deterministic and does not mutate retrieved bytes", async () => {
    const { delivery } = await fixture();
    const before = delivery.files.map(({ bytes }) => [...bytes]);
    const first = await stageFantasyAssetForgeFiveClipDelivery(delivery);
    const second = await stageFantasyAssetForgeFiveClipDelivery(delivery);
    expect(second.plan).toEqual(first.plan);
    expect(delivery.files.map(({ bytes }) => [...bytes])).toEqual(before);
  });
});
