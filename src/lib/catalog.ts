import bodyMetadata from "../assets/svg-parts/body/body-base/part.json";
import bodySource from "../assets/svg-parts/body/body-base/part.svg?raw";
import hairMetadata from "../assets/svg-parts/hair/hair-short/part.json";
import hairSource from "../assets/svg-parts/hair/hair-short/part.svg?raw";
import shirtMetadata from "../assets/svg-parts/shirt/shirt-tunic/part.json";
import shirtSource from "../assets/svg-parts/shirt/shirt-tunic/part.svg?raw";
import swordMetadata from "../assets/svg-parts/weapon/sword-basic/part.json";
import swordSource from "../assets/svg-parts/weapon/sword-basic/part.svg?raw";

import bodyGoblinMetadata from "../assets/svg-parts/body/body-goblin/part.json";
import bodyGoblinSource from "../assets/svg-parts/body/body-goblin/part.svg?raw";
import earsGoblinMetadata from "../assets/svg-parts/feature/ears-goblin/part.json";
import earsGoblinSource from "../assets/svg-parts/feature/ears-goblin/part.svg?raw";
import ragsGoblinMetadata from "../assets/svg-parts/shirt/rags-goblin/part.json";
import ragsGoblinSource from "../assets/svg-parts/shirt/rags-goblin/part.svg?raw";
import clubGoblinMetadata from "../assets/svg-parts/weapon/club-goblin/part.json";
import clubGoblinSource from "../assets/svg-parts/weapon/club-goblin/part.svg?raw";

import bodySpectreMetadata from "../assets/svg-parts/body/body-spectre/part.json";
import bodySpectreSource from "../assets/svg-parts/body/body-spectre/part.svg?raw";
import eyesSpectreMetadata from "../assets/svg-parts/feature/eyes-spectre/part.json";
import eyesSpectreSource from "../assets/svg-parts/feature/eyes-spectre/part.svg?raw";
import shroudSpectreMetadata from "../assets/svg-parts/shirt/shroud-spectre/part.json";
import shroudSpectreSource from "../assets/svg-parts/shirt/shroud-spectre/part.svg?raw";
import orbSpectreMetadata from "../assets/svg-parts/weapon/orb-spectre/part.json";
import orbSpectreSource from "../assets/svg-parts/weapon/orb-spectre/part.svg?raw";

import bodyDragonMetadata from "../assets/svg-parts/body/body-dragon/part.json";
import bodyDragonSource from "../assets/svg-parts/body/body-dragon/part.svg?raw";
import wingsDragonMetadata from "../assets/svg-parts/feature/wings-dragon/part.json";
import wingsDragonSource from "../assets/svg-parts/feature/wings-dragon/part.svg?raw";
import plateDragonMetadata from "../assets/svg-parts/shirt/plate-dragon/part.json";
import plateDragonSource from "../assets/svg-parts/shirt/plate-dragon/part.svg?raw";
import breathDragonMetadata from "../assets/svg-parts/weapon/breath-dragon/part.json";
import breathDragonSource from "../assets/svg-parts/weapon/breath-dragon/part.svg?raw";

import bodyPrisonerMetadata from "../assets/svg-parts/body/body-prisoner/part.json";
import bodyPrisonerSource from "../assets/svg-parts/body/body-prisoner/part.svg?raw";
import hairPrisonerMetadata from "../assets/svg-parts/hair/hair-prisoner/part.json";
import hairPrisonerSource from "../assets/svg-parts/hair/hair-prisoner/part.svg?raw";
import tattersPrisonerMetadata from "../assets/svg-parts/shirt/tatters-prisoner/part.json";
import tattersPrisonerSource from "../assets/svg-parts/shirt/tatters-prisoner/part.svg?raw";
import shacklesPrisonerMetadata from "../assets/svg-parts/weapon/shackles-prisoner/part.json";
import shacklesPrisonerSource from "../assets/svg-parts/weapon/shackles-prisoner/part.svg?raw";

import chestWoodMetadata from "../assets/svg-parts/prop/chest-wood/part.json";
import chestWoodSource from "../assets/svg-parts/prop/chest-wood/part.svg?raw";
import gateStoneMetadata from "../assets/svg-parts/prop/gate-stone/part.json";
import gateStoneSource from "../assets/svg-parts/prop/gate-stone/part.svg?raw";
import potionRedMetadata from "../assets/svg-parts/prop/potion-red/part.json";
import potionRedSource from "../assets/svg-parts/prop/potion-red/part.svg?raw";
import herbGreenMetadata from "../assets/svg-parts/prop/herb-green/part.json";
import herbGreenSource from "../assets/svg-parts/prop/herb-green/part.svg?raw";

import projectileFireMetadata from "../assets/svg-parts/fx/projectile-fire/part.json";
import projectileFireSource from "../assets/svg-parts/fx/projectile-fire/part.svg?raw";
import auraMagicMetadata from "../assets/svg-parts/fx/aura-magic/part.json";
import auraMagicSource from "../assets/svg-parts/fx/aura-magic/part.svg?raw";

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
  part(bodyGoblinMetadata, bodyGoblinSource),
  part(ragsGoblinMetadata, ragsGoblinSource),
  part(earsGoblinMetadata, earsGoblinSource),
  part(clubGoblinMetadata, clubGoblinSource),
  part(bodySpectreMetadata, bodySpectreSource),
  part(shroudSpectreMetadata, shroudSpectreSource),
  part(eyesSpectreMetadata, eyesSpectreSource),
  part(orbSpectreMetadata, orbSpectreSource),
  part(bodyDragonMetadata, bodyDragonSource),
  part(plateDragonMetadata, plateDragonSource),
  part(wingsDragonMetadata, wingsDragonSource),
  part(breathDragonMetadata, breathDragonSource),
  part(bodyPrisonerMetadata, bodyPrisonerSource),
  part(tattersPrisonerMetadata, tattersPrisonerSource),
  part(hairPrisonerMetadata, hairPrisonerSource),
  part(shacklesPrisonerMetadata, shacklesPrisonerSource),
  part(chestWoodMetadata, chestWoodSource),
  part(gateStoneMetadata, gateStoneSource),
  part(potionRedMetadata, potionRedSource),
  part(herbGreenMetadata, herbGreenSource),
  part(projectileFireMetadata, projectileFireSource),
  part(auraMagicMetadata, auraMagicSource),
] as const satisfies readonly SvgPart[];

export const SVG_PARTS_BY_ID = new Map(
  SVG_PARTS.map((asset) => [asset.metadata.part_id, asset]),
);

export const SVG_SLOTS = [
  "body",
  "shirt",
  "hair",
  "feature",
  "weapon",
  "prop",
  "fx",
] as const;
export type SvgSlot = (typeof SVG_SLOTS)[number];

export function partsForSlot(slot: SvgSlot): readonly SvgPart[] {
  return SVG_PARTS.filter((part) => part.metadata.slot === slot);
}
