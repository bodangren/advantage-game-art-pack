import { describe, expect, it } from "vitest";

import {
  SVG_PARTS,
  SVG_SLOTS,
  catalogEntries,
  partsForSlot,
  selectParts,
} from "./catalog";

const SORTED_PART_IDS = [
  "armor-plate",
  "aura-magic",
  "body-base",
  "body-dragon",
  "body-goblin",
  "body-prisoner",
  "body-spectre",
  "breath-dragon",
  "cape-red",
  "chest-wood",
  "club-goblin",
  "ears-goblin",
  "eyes-spectre",
  "gate-stone",
  "hair-prisoner",
  "hair-short",
  "helmet-knight",
  "herb-green",
  "orb-spectre",
  "plate-dragon",
  "potion-red",
  "projectile-fire",
  "rags-goblin",
  "shackles-prisoner",
  "shadow-ground",
  "shirt-tunic",
  "shroud-spectre",
  "sword-basic",
  "sword-long",
  "tatters-prisoner",
  "wings-dragon",
] as const;

describe("catalog: expanded part library", () => {
  it("catalog: contains the knight set plus the 22 expansion parts", () => {
    const ids = SVG_PARTS.map((part) => part.metadata.part_id);
    expect([...ids].sort((a, b) => a.localeCompare(b))).toEqual(SORTED_PART_IDS);
    expect(SVG_PARTS).toHaveLength(31);
  });

  it("catalog: every declared slot has at least one part", () => {
    expect([...SVG_SLOTS].sort()).toEqual(
      ["body", "fx", "feature", "hair", "prop", "shirt", "weapon"].sort(),
    );
    for (const slot of SVG_SLOTS) {
      expect(partsForSlot(slot).length).toBeGreaterThan(0);
    }
  });

  it("catalog: slot coverage for the new archetype categories", () => {
    expect(
      selectParts({ slot: "feature" }).map((part) => part.metadata.part_id),
    ).toEqual(["cape-red", "ears-goblin", "eyes-spectre", "wings-dragon"]);
    expect(selectParts({ slot: "prop" })).toHaveLength(4);
    expect(selectParts({ slot: "fx" })).toHaveLength(3);
  });
});

describe("catalog: tag-based selection", () => {
  it("catalog: selects parts by archetype", () => {
    expect(selectParts({ archetype: "goblin" }).map((part) => part.metadata.part_id)).toEqual([
      "body-goblin",
      "club-goblin",
      "ears-goblin",
      "rags-goblin",
    ]);
    expect(selectParts({ archetype: "dragon" }).map((part) => part.metadata.part_id)).toEqual([
      "body-dragon",
      "breath-dragon",
      "plate-dragon",
      "wings-dragon",
    ]);
    expect(selectParts({ archetype: "prisoner" })).toHaveLength(4);
    expect(selectParts({ archetype: "spectre" })).toHaveLength(4);
  });

  it("catalog: selects parts by slot and theme", () => {
    expect(selectParts({ slot: "prop" }).map((part) => part.metadata.part_id)).toEqual([
      "chest-wood",
      "gate-stone",
      "herb-green",
      "potion-red",
    ]);
    expect(selectParts({ theme: "library" }).map((part) => part.metadata.part_id)).toEqual([
      "aura-magic",
      "body-prisoner",
      "body-spectre",
      "eyes-spectre",
      "hair-prisoner",
      "herb-green",
      "orb-spectre",
      "potion-red",
      "shackles-prisoner",
      "shroud-spectre",
      "tatters-prisoner",
    ]);
    expect(selectParts({ theme: "ruins" })).toHaveLength(11);
  });

  it("catalog: combines filters and stays stable for LLM context", () => {
    expect(
      selectParts({ archetype: "goblin", slot: "weapon" }).map((part) => part.metadata.part_id),
    ).toEqual(["club-goblin"]);
    expect(selectParts({ archetype: "dragon", theme: "library" })).toEqual([]);
    expect(selectParts({ archetype: "ghost" })).toEqual([]);
    const all = selectParts({});
    expect(all.map((part) => part.metadata.part_id)).toEqual(SORTED_PART_IDS);
  });
});

describe("catalog: stable JSON for LLM context", () => {
  it("catalog: entries expose slots, anchors, palette slots, layer priorities, and tags", () => {
    const entries = catalogEntries();
    expect(entries.map((entry) => entry.part_id)).toEqual(SORTED_PART_IDS);
    for (const entry of entries) {
      expect(Object.keys(entry).sort()).toEqual(
        ["anchors", "description", "palette_slots", "part_id", "slot", "tags", "z_index"].sort(),
      );
      expect(Object.keys(entry.anchors).length).toBeGreaterThan(0);
      expect(entry.tags.length).toBeGreaterThan(0);
      expect(Number.isInteger(entry.z_index)).toBe(true);
    }
  });

  it("catalog: JSON output is byte-identical across calls", () => {
    expect(JSON.stringify(catalogEntries())).toBe(JSON.stringify(catalogEntries()));
  });
});
