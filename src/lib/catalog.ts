import bodyMetadata from "../assets/svg-parts/body/body-base/part.json";
import bodySource from "../assets/svg-parts/body/body-base/part.svg?raw";
import hairMetadata from "../assets/svg-parts/hair/hair-short/part.json";
import hairSource from "../assets/svg-parts/hair/hair-short/part.svg?raw";
import shirtMetadata from "../assets/svg-parts/shirt/shirt-tunic/part.json";
import shirtSource from "../assets/svg-parts/shirt/shirt-tunic/part.svg?raw";
import swordMetadata from "../assets/svg-parts/weapon/sword-basic/part.json";
import swordSource from "../assets/svg-parts/weapon/sword-basic/part.svg?raw";

import {
  type SvgPart,
  type SvgPartMetadata,
  validateSvgPart,
} from "./svg-assets";

function part(metadata: unknown, source: string): SvgPart {
  return validateSvgPart({
    metadata: metadata as SvgPartMetadata,
    source,
  });
}

export const SVG_PARTS = [
  part(bodyMetadata, bodySource),
  part(shirtMetadata, shirtSource),
  part(hairMetadata, hairSource),
  part(swordMetadata, swordSource),
] as const satisfies readonly SvgPart[];

export const SVG_PARTS_BY_ID = new Map(
  SVG_PARTS.map((asset) => [asset.metadata.part_id, asset]),
);

export const SVG_SLOTS = ["body", "shirt", "hair", "weapon"] as const;
export type SvgSlot = (typeof SVG_SLOTS)[number];

export function partsForSlot(slot: SvgSlot): readonly SvgPart[] {
  return SVG_PARTS.filter((part) => part.metadata.slot === slot);
}
