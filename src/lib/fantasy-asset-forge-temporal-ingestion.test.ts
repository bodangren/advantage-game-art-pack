import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  digestFantasyAssetForgeTemporalBytes,
  FORGE_TEMPORAL_RENDER_ARTIFACTS_ID,
  stageFantasyAssetForgeTemporalDelivery,
  validateFantasyAssetForgeTemporalManifest,
  type FantasyAssetForgeTemporalDelivery,
} from "./fantasy-asset-forge-temporal-ingestion";

const HASHES = ["1", "2", "3", "4", "5", "6", "7", "8"].map((value) =>
  value.repeat(64),
);

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
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

function glb(marker = 1): Uint8Array {
  const jsonSource = JSON.stringify({ asset: { version: "2.0" }, extras: { marker } });
  const json = new TextEncoder().encode(jsonSource);
  const paddedJsonLength = Math.ceil(json.byteLength / 4) * 4;
  const bin = new Uint8Array([marker, 0, 0, 0]);
  const totalLength = 12 + 8 + paddedJsonLength + 8 + bin.byteLength;
  const bytes = new Uint8Array(totalLength);
  const view = new DataView(bytes.buffer);
  bytes.set([0x67, 0x6c, 0x54, 0x46], 0);
  view.setUint32(4, 2, true);
  view.setUint32(8, totalLength, true);
  view.setUint32(12, paddedJsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.fill(0x20, 20, 20 + paddedJsonLength);
  bytes.set(json, 20);
  const binOffset = 20 + paddedJsonLength;
  view.setUint32(binOffset, bin.byteLength, true);
  view.setUint32(binOffset + 4, 0x004e4942, true);
  bytes.set(bin, binOffset + 8);
  return bytes;
}

function metrics(sequence: number) {
  return {
    occupiedBounds: {
      minX: 24 + sequence,
      minY: 46,
      maxX: 102 - sequence,
      maxY: 121,
      width: 79 - sequence * 2,
      height: 76,
    },
    occupiedPixelCount: 1_400 + sequence,
    occupiedRatio: (1_400 + sequence) / 16_384,
    transparentPixelCount: 16_384 - 1_400 - sequence,
    clippedEdges: [],
    groundPixelY: 121,
    groundAnchorDeviationPixels: 0,
    minimumHorizontalRunPixels: 1,
    minimumVerticalRunPixels: 2,
    representativeFeaturePixels: 5,
    requiredFeatureEvidence: [
      {
        featureId: "torso",
        partId: "torso",
        templateId: "human.torso",
        silhouetteWidthPixels: 15,
        minimumPixels: 3,
        minimumPixelArea: 9,
        isolatedPixelArea: 280,
        visiblePixelArea: 280,
        occlusionRatio: 0,
        maximumOcclusionRatio: 1,
        materialOklabDistance: 1,
        minimumOklabDistance: 0,
        passes: true,
      },
    ],
    framingEvidence: {
      topMarginPixels: 46,
      centerDeviationPixels: sequence + 0.5,
      heightDeviationPixels: 2,
      worldUnitsPerPixel: 0.035811160897346345,
    },
  };
}

async function delivery(): Promise<FantasyAssetForgeTemporalDelivery> {
  const frameBytes = [0, 1, 2, 3].map((index) => png(128, 128, index + 1));
  const atlasBytes = png(512, 128, 9);
  const sourceGlbBytes = glb();
  const sourceGlbSha = await digestFantasyAssetForgeTemporalBytes(sourceGlbBytes);
  const frames = await Promise.all(
    frameBytes.map(async (bytes, sequence) => ({
      id: `frame.${HASHES[sequence]}`,
      sequence,
      direction: "S",
      sampleTimeMs: sequence * 125,
      fileName: `${String(sequence).padStart(4, "0")}-s-${sequence * 125}.png`,
      byteLength: bytes.byteLength,
      sha256: await digestFantasyAssetForgeTemporalBytes(bytes),
      metrics: metrics(sequence),
    })),
  );
  const manifest = {
    contractId: FORGE_TEMPORAL_RENDER_ARTIFACTS_ID,
    assetId: "adventurer.rustic",
    revisionId: `revision.${HASHES[0]}`,
    morphologyRevisionId: `morphology.${HASHES[1]}`,
    rigSignature: `rig.${HASHES[2]}`,
    equipmentSignature: `equipment.${HASHES[3]}`,
    clipId: `clip.${HASHES[4]}`,
    action: "walk",
    framePlanId: `frame-plan.${HASHES[5]}`,
    durationMs: 500,
    loop: { mode: "loop", startMs: 0, endMs: 500 },
    interpolation: "linear",
    renderProfile: { id: "fantasy.sprite.orthographic.v1", version: "1.0.0" },
    sourceGlb: {
      id: `glb.${sourceGlbSha}`,
      classification: "source",
      mediaType: "model/gltf-binary",
      fileName: "adventurer.rustic.glb",
      byteLength: sourceGlbBytes.byteLength,
      sha256: sourceGlbSha,
    },
    frames,
    atlas: {
      id: `atlas.${await digestFantasyAssetForgeTemporalBytes(atlasBytes)}`,
      fileName: "atlas.png",
      byteLength: atlasBytes.byteLength,
      sha256: await digestFantasyAssetForgeTemporalBytes(atlasBytes),
      width: 512,
      height: 128,
      columns: 4,
      rows: 1,
      rects: frames.map(({ id }, sequence) => ({
        frameId: id,
        x: sequence * 128,
        y: 0,
        width: 128,
        height: 128,
      })),
    },
    deliveryId: `delivery.${HASHES[6]}`,
  };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n");
  return {
    manifest_bytes: manifestBytes,
    manifest_sha256: await digestFantasyAssetForgeTemporalBytes(manifestBytes),
    files: [
      ...frames.map((frame, index) => ({ file_name: frame.fileName, bytes: frameBytes[index]! })),
      { file_name: "atlas.png", bytes: atlasBytes },
      { file_name: "adventurer.rustic.glb", bytes: sourceGlbBytes },
    ],
  };
}

async function mutateManifest(
  source: FantasyAssetForgeTemporalDelivery,
  mutate: (manifest: Record<string, any>) => void,
): Promise<FantasyAssetForgeTemporalDelivery> {
  const manifest = JSON.parse(new TextDecoder().decode(source.manifest_bytes));
  mutate(manifest);
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n");
  return {
    ...source,
    manifest_bytes: manifestBytes,
    manifest_sha256: await digestFantasyAssetForgeTemporalBytes(manifestBytes),
  };
}

describe("Fantasy Asset Forge temporal ingestion", () => {
  it("strictly validates and content-addresses the real temporal delivery shape", async () => {
    const source = await delivery();
    const staged = await stageFantasyAssetForgeTemporalDelivery(source);

    expect(staged.manifest.contractId).toBe(FORGE_TEMPORAL_RENDER_ARTIFACTS_ID);
    expect(staged.plan.status).toBe("validated_unadmitted");
    expect(staged.plan.blockers).toEqual([
      "five_clip_set_incomplete",
      "pack_admission_not_evaluated",
      "playback_acceptance_missing",
      "public_temporal_retrieval_contract_reconciliation_pending",
      "visual_quality_acceptance_missing",
    ]);
    expect(staged.plan.records).toHaveLength(7);
    expect(staged.plan.records).toContainEqual(expect.objectContaining({
      role: "source_glb",
      source_file_name: "adventurer.rustic.glb",
      media_type: "model/gltf-binary",
      sha256: staged.manifest.sourceGlb.sha256,
    }));
    expect(staged.plan.verification.source_glb_verified).toBe(true);
    expect(staged.plan.records.every(({ local_reference, sha256: digest }) =>
      local_reference.includes(`/sha256/${digest}.`)))
      .toBe(true);
    expect(staged.files.map(({ bytes }) => bytes.byteLength)).toEqual([
      58, 58, 58, 58, 58, glb().byteLength, source.manifest_bytes.byteLength,
    ]);
  });

  it("requires the exact closed source-GLB binding", async () => {
    const source = await delivery();
    for (const [mutate, error] of [
      [(manifest: any) => { delete manifest.sourceGlb; }, /missing required key.*sourceGlb/],
      [(manifest: any) => { manifest.sourceGlb.extra = true; }, /sourceGlb.*unexpected key/],
      [(manifest: any) => { manifest.sourceGlb.classification = "derived"; }, /classification.*source/],
      [(manifest: any) => { manifest.sourceGlb.mediaType = "application/octet-stream"; }, /mediaType.*model\/gltf-binary/],
      [(manifest: any) => { manifest.sourceGlb.fileName = "../escape.glb"; }, /portable file name/],
      [(manifest: any) => { manifest.sourceGlb.fileName = "source.bin"; }, /fileName.*\.glb/],
      [(manifest: any) => { manifest.sourceGlb.id = `glb.${HASHES[7]}`; }, /id.*sha256/],
    ] as const) {
      await expect(
        stageFantasyAssetForgeTemporalDelivery(await mutateManifest(source, mutate)),
      ).rejects.toThrow(error);
    }
  });

  it("rejects source-GLB byte drift and invalid GLB structure", async () => {
    const source = await delivery();
    const glbIndex = source.files.findIndex(({ file_name }) => file_name.endsWith(".glb"));
    await expect(
      stageFantasyAssetForgeTemporalDelivery(
        await mutateManifest(source, (manifest) => { manifest.sourceGlb.byteLength += 1; }),
      ),
    ).rejects.toThrow(/\.glb byteLength mismatch/);
    await expect(
      stageFantasyAssetForgeTemporalDelivery({
        ...source,
        files: source.files.filter(({ file_name }) => !file_name.endsWith(".glb")),
      }),
    ).rejects.toThrow(/missing temporal artifact.*\.glb/);
    const hashDrift = source.files.map((file, index) =>
      index === glbIndex
        ? { ...file, bytes: glb(99) }
        : file,
    );
    await expect(
      stageFantasyAssetForgeTemporalDelivery({ ...source, files: hashDrift }),
    ).rejects.toThrow(/\.glb sha256 hash drift/);

    for (const [mutateBytes, error] of [
      [(bytes: Uint8Array) => { bytes[0] = 0; }, /GLB magic/],
      [(bytes: Uint8Array) => { new DataView(bytes.buffer).setUint32(4, 1, true); }, /GLB version 2/],
      [(bytes: Uint8Array) => { new DataView(bytes.buffer).setUint32(8, bytes.byteLength - 4, true); }, /declared length/],
      [(bytes: Uint8Array) => { new DataView(bytes.buffer).setUint32(12, bytes.byteLength, true); }, /complete GLB chunk/],
      [(bytes: Uint8Array) => { new DataView(bytes.buffer).setUint32(16, 0, true); }, /first GLB chunk.*JSON/],
    ] as const) {
      const changed = source.files[glbIndex]!.bytes.slice();
      mutateBytes(changed);
      const digest = await digestFantasyAssetForgeTemporalBytes(changed);
      const resigned = await mutateManifest(
        {
          ...source,
          files: source.files.map((file, index) =>
            index === glbIndex ? { ...file, bytes: changed } : file,
          ),
        },
        (manifest) => {
          manifest.sourceGlb.id = `glb.${digest}`;
          manifest.sourceGlb.sha256 = digest;
          manifest.sourceGlb.byteLength = changed.byteLength;
        },
      );
      await expect(stageFantasyAssetForgeTemporalDelivery(resigned)).rejects.toThrow(error);
    }
  });

  it.each([
    ["revisionId", "revision.invalid", /revisionId.*invalid/],
    ["morphologyRevisionId", `morphology.${HASHES[0]}`, /morphologyRevisionId.*identity/],
    ["rigSignature", `rig.${HASHES[3]}`, /immutable identity/],
    ["equipmentSignature", `equipment.${HASHES[2]}`, /immutable identity/],
    ["clipId", "clip.invalid", /clipId.*invalid/],
    ["framePlanId", "frame-plan.invalid", /framePlanId.*invalid/],
  ])("rejects invalid or colliding exact identity %s", async (field, value, error) => {
    const source = await delivery();
    await expect(
      validateFantasyAssetForgeTemporalManifest(
        (await mutateManifest(source, (manifest) => {
          manifest[field] = value;
        })).manifest_bytes,
      ),
    ).rejects.toThrow(error as RegExp);
  });

  it("requires contiguous sequences, strictly increasing timing, and one stable direction", async () => {
    const source = await delivery();
    for (const mutate of [
      (manifest: any) => { manifest.frames[2].sequence = 3; },
      (manifest: any) => { manifest.frames[2].sampleTimeMs = 125; },
      (manifest: any) => { manifest.frames[2].direction = "N"; },
    ]) {
      await expect(
        stageFantasyAssetForgeTemporalDelivery(await mutateManifest(source, mutate)),
      ).rejects.toThrow(/contiguous|strictly increasing|stable direction/);
    }
  });

  it("rejects an eight-direction static dossier disguised as temporal samples", async () => {
    const source = await delivery();
    const staticDirections = ["N", "NE", "E", "SE"];
    await expect(
      stageFantasyAssetForgeTemporalDelivery(
        await mutateManifest(source, (manifest) => {
          manifest.frames.forEach((frame: any, index: number) => {
            frame.direction = staticDirections[index];
          });
        }),
      ),
    ).rejects.toThrow(/stable direction.*static directional dossier/);
  });

  it("requires stable camera scale and ground anchoring across frames", async () => {
    const source = await delivery();
    await expect(
      stageFantasyAssetForgeTemporalDelivery(
        await mutateManifest(source, (manifest) => {
          manifest.frames[3].metrics.framingEvidence.worldUnitsPerPixel = 0.04;
        }),
      ),
    ).rejects.toThrow(/stable camera scale/);
    await expect(
      stageFantasyAssetForgeTemporalDelivery(
        await mutateManifest(source, (manifest) => {
          manifest.frames[1].metrics.groundPixelY = 120;
        }),
      ),
    ).rejects.toThrow(/stable ground anchor/);
  });

  it("requires exact atlas dimensions, grid, and frame rectangles", async () => {
    const source = await delivery();
    for (const mutate of [
      (manifest: any) => { manifest.atlas.id = `atlas.${HASHES[7]}`; },
      (manifest: any) => { manifest.atlas.width = 384; },
      (manifest: any) => { manifest.atlas.columns = 3; },
      (manifest: any) => { manifest.atlas.rects[2].x = 255; },
      (manifest: any) => { manifest.atlas.rects.pop(); },
    ]) {
      await expect(
        stageFantasyAssetForgeTemporalDelivery(await mutateManifest(source, mutate)),
      ).rejects.toThrow(/atlas/);
    }
  });

  it("rejects hash drift, byte-length drift, path traversal, missing, or extra artifacts", async () => {
    const source = await delivery();
    await expect(
      stageFantasyAssetForgeTemporalDelivery({ ...source, manifest_sha256: HASHES[7] }),
    ).rejects.toThrow(/manifest_sha256 mismatch/);
    await expect(
      stageFantasyAssetForgeTemporalDelivery(
        await mutateManifest(source, (manifest) => {
          manifest.frames[0].byteLength += 1;
        }),
      ),
    ).rejects.toThrow(/byteLength mismatch/);
    await expect(
      stageFantasyAssetForgeTemporalDelivery(
        await mutateManifest(source, (manifest) => {
          manifest.frames[0].fileName = "../escape.png";
        }),
      ),
    ).rejects.toThrow(/portable file name/);
    await expect(
      stageFantasyAssetForgeTemporalDelivery({ ...source, files: source.files.slice(1) }),
    ).rejects.toThrow(/missing temporal artifact/);
    await expect(
      stageFantasyAssetForgeTemporalDelivery({
        ...source,
        files: [...source.files, { file_name: "extra.png", bytes: png(128, 128, 88) }],
      }),
    ).rejects.toThrow(/unexpected temporal artifact/);
  });

  it("rejects duplicate filler frame bytes even when the manifest is resigned", async () => {
    const source = await delivery();
    const first = source.files[0]!;
    const duplicateFiles = source.files.map((file, index) =>
      index === 1 ? { ...file, bytes: first.bytes } : file,
    );
    const resigned = await mutateManifest({ ...source, files: duplicateFiles }, async () => {});
    const duplicateHash = await digestFantasyAssetForgeTemporalBytes(first.bytes);
    const final = await mutateManifest(resigned, (manifest) => {
      manifest.frames[1].sha256 = duplicateHash;
      manifest.frames[1].byteLength = first.bytes.byteLength;
    });

    await expect(stageFantasyAssetForgeTemporalDelivery(final)).rejects.toThrow(
      /duplicate source frame bytes|filler/,
    );
  });

  it("rejects incomplete PNG dimensions and closed-schema drift", async () => {
    const source = await delivery();
    const shortFrame = png(64, 128, 1);
    const badFiles = source.files.map((file, index) =>
      index === 0 ? { ...file, bytes: shortFrame } : file,
    );
    const badHash = await digestFantasyAssetForgeTemporalBytes(shortFrame);
    const resigned = await mutateManifest({ ...source, files: badFiles }, (manifest) => {
      manifest.frames[0].sha256 = badHash;
      manifest.frames[0].byteLength = shortFrame.byteLength;
    });
    await expect(stageFantasyAssetForgeTemporalDelivery(resigned)).rejects.toThrow(/128x128/);
    const truncatedFrame = source.files[0]!.bytes.slice(0, -12);
    const truncatedHash = await digestFantasyAssetForgeTemporalBytes(truncatedFrame);
    const truncated = await mutateManifest(
      {
        ...source,
        files: source.files.map((file, index) =>
          index === 0 ? { ...file, bytes: truncatedFrame } : file,
        ),
      },
      (manifest) => {
        manifest.frames[0].sha256 = truncatedHash;
        manifest.frames[0].byteLength = truncatedFrame.byteLength;
      },
    );
    await expect(stageFantasyAssetForgeTemporalDelivery(truncated)).rejects.toThrow(/complete PNG.*IEND/);
    await expect(
      validateFantasyAssetForgeTemporalManifest(
        (await mutateManifest(source, (manifest) => {
          manifest.legacyStaticDirections = true;
        })).manifest_bytes,
      ),
    ).rejects.toThrow(/unexpected key/);
  });

  it("produces a deterministic staging digest without mutating source bytes", async () => {
    const source = await delivery();
    const before = source.files.map(({ bytes }) => [...bytes]);
    const first = await stageFantasyAssetForgeTemporalDelivery(source);
    const second = await stageFantasyAssetForgeTemporalDelivery(source);

    expect(second.plan).toEqual(first.plan);
    expect(source.files.map(({ bytes }) => [...bytes])).toEqual(before);
  });

  it.skipIf(!process.env.FAF_TEMPORAL_DELIVERY_DIR)(
    "stages a real public-MCP temporal artifact directory",
    async () => {
      const root = process.env.FAF_TEMPORAL_DELIVERY_DIR!;
      const names = (await readdir(root))
        .filter((name) => name !== "temporal-manifest.json")
        .sort();
      const manifestBytes = new Uint8Array(
        await readFile(join(root, "temporal-manifest.json")),
      );
      const files = await Promise.all(
        names.map(async (fileName) => ({
          file_name: fileName,
          bytes: new Uint8Array(await readFile(join(root, fileName))),
        })),
      );
      const staged = await stageFantasyAssetForgeTemporalDelivery({
        manifest_bytes: manifestBytes,
        manifest_sha256: await digestFantasyAssetForgeTemporalBytes(manifestBytes),
        files,
      });

      expect(staged.plan.status).toBe("validated_unadmitted");
      expect(staged.plan.verification).toEqual(expect.objectContaining({
        source_frame_count: 4,
        artifact_count: 7,
        source_glb_verified: true,
      }));
      expect(staged.manifest.sourceGlb).toEqual(expect.objectContaining({
        classification: "source",
        mediaType: "model/gltf-binary",
      }));
    },
  );
});
