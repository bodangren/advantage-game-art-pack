import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Phase 2 Red: the ramp palettes and the shadow-ground part do not exist
// yet. The part file loads through fs (not a static import) so the suite
// stays importable for the post-Green phase-1 sentinel while assertions
// fail until the convention lands.
import npcPrisoner from "../../examples/npc-prisoner.json";
import bossDragon from "../../examples/boss-dragon.json";
import enemyGoblin from "../../examples/enemy-goblin.json";
import enemySpectre from "../../examples/enemy-spectre.json";
import knightCharacter from "../../examples/svg_character.json";

import {
  type SvgPart,
  type SvgPartMetadata,
  validateSvgPart,
} from "./svg-assets";

const here = dirname(fileURLToPath(import.meta.url));

const CHARACTER_SPECS = [
  ["lpc-style-character", knightCharacter],
  ["enemy-goblin", enemyGoblin],
  ["enemy-spectre", enemySpectre],
  ["boss-dragon", bossDragon],
  ["npc-prisoner", npcPrisoner],
] as const;

const RAMP_MATERIALS = ["skin", "cloth", "shroud", "scale", "hair"] as const;

const CHARACTER_BODY_IDS = [
  "body-base",
  "body-goblin",
  "body-spectre",
  "body-dragon",
  "body-prisoner",
] as const;

function loadPart(relative: string): SvgPart {
  const directory = resolve(here, "..", "assets", "svg-parts", relative);
  let rawMetadata: string;
  let source: string;
  try {
    rawMetadata = readFileSync(resolve(directory, "part.json"), "utf8");
    source = readFileSync(resolve(directory, "part.svg"), "utf8");
  } catch {
    throw new Error(`part fixture missing on disk: ${relative}`);
  }
  return validateSvgPart({
    metadata: JSON.parse(rawMetadata) as SvgPartMetadata,
    source,
  });
}

describe("shading: palette ramp convention", () => {
  it("shading: character palettes carry light and shadow ramps for every core material", () => {
    for (const [assetId, spec] of CHARACTER_SPECS) {
      const palette = spec.palette as Record<string, string>;
      for (const material of RAMP_MATERIALS) {
        if (!(material in palette)) continue;
        expect(palette, `${assetId} missing ${material}-light`).toHaveProperty(`${material}-light`);
        expect(palette, `${assetId} missing ${material}-shadow`).toHaveProperty(`${material}-shadow`);
      }
    }
  });

  it("shading: character bodies declare and use light and shadow ramp slots", () => {
    const bodyPaths: Record<string, string> = {
      "body-base": "body/body-base",
      "body-goblin": "body/body-goblin",
      "body-spectre": "body/body-spectre",
      "body-dragon": "body/body-dragon",
      "body-prisoner": "body/body-prisoner",
    };
    for (const partId of CHARACTER_BODY_IDS) {
      const part = loadPart(bodyPaths[partId]!);
      const slots = part.metadata.palette_slots;
      expect(
        slots.filter((slot) => slot.endsWith("-light")).length,
        `${partId} declares no -light ramp slot`,
      ).toBeGreaterThan(0);
      expect(
        slots.filter((slot) => slot.endsWith("-shadow")).length,
        `${partId} declares no -shadow ramp slot`,
      ).toBeGreaterThan(0);
    }
  });
});

describe("shading: ground shadow", () => {
  it("shading: shadow-ground part validates with a root anchor and a shadow slot", () => {
    const part = loadPart("fx/shadow-ground");
    expect(part.metadata.slot).toBe("fx");
    expect(part.metadata.anchors).toHaveProperty("root");
    expect(part.metadata.palette_slots).toContain("shadow");
    expect(part.metadata.z_index).toBeLessThan(10);
  });

  it("shading: every character composition places shadow-ground below the body", () => {
    for (const [assetId, spec] of CHARACTER_SPECS) {
      const shadow = spec.parts.find((placement) => placement.part_id === "shadow-ground");
      expect(shadow, `${assetId} places no shadow-ground`).toBeDefined();
      const body = spec.parts.find((placement) => placement.part_id.startsWith("body-"));
      expect(body).toBeDefined();
      const shadowZ = shadow!.z_index ?? 1;
      const bodyZ = body!.z_index ?? 10;
      expect(shadowZ, `${assetId} shadow must render below the body`).toBeLessThan(bodyZ);
    }
  });
});
