"""Batch entity generation from natural-language prompts.

Provides PromptParser, PaletteVariator, and EntitySpecGenerator for
prompt-driven batch generation of themed entity families.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
import hashlib
import re
from typing import Any, Iterator

from asf.planner.schemas import AssetFamily, BatchBrief, ThemePackReference


# Re-export BatchBrief for convenience
__all__ = [
    "EntitySpecGenerator",
    "PaletteVariator",
    "ParsedPrompt",
    "PromptParser",
]


# Re-export BatchBrief at package level
from asf.planner.schemas import BatchBrief as BatchBrief


@dataclass(frozen=True)
class ParsedPrompt:
    """Structured result from parsing a natural-language prompt."""

    theme: str
    style: str
    count: int
    archetype: str
    modifiers: tuple[str, ...]


class PromptParser:
    """Parses natural-language prompts into structured ParsedPrompt."""

    _ENEMY_KEYWORDS = frozenset([
        "enemy", "enemies", "monster", "monsters", "goblin", "goblins",
        "demon", "demons", "dragon", "dragons", "skeleton", "skeletons",
        "orc", "orcs", "troll", "trolls", "spider", "spiders", "ghost",
        "ghosts", "zombie", "zombies", "vampire", "vampires", "werewolf",
        "swamp", "fiend", "fiends", "beast", "beasts", "creature", "creatures",
    ])

    _NPC_KEYWORDS = frozenset([
        "npc", "npcs", "villager", "villagers", "merchant", "merchants",
        "guard", "guards", "peasant", "peasant", "farmer", "blacksmith",
        "innkeeper", "healer", "elder", "child", "woman", "man", "girl", "boy",
        "wise", "poor", "ragged", "fearful", "merchant", "beggar", "refugee",
    ])

    _STYLE_KEYWORDS = frozenset([
        "chibi", "pixel", "pixel art", "retro", "cute", "anime", "manga",
        "realistic", "dark fantasy", "light fantasy", "minimalist", "detailed",
    ])

    _COUNT_RE = re.compile(r"(\d+)")
    _STYLE_RE = re.compile(r"(?:in|with|-)\s+(?:a\s+)?(\w+(?:\s+\w+)?(?:\s+style)?)", re.IGNORECASE)
    _ARCHETYPE_RE = re.compile(r"(village\s+NPCs?|enemies?|monsters?|NPCs?)", re.IGNORECASE)

    def parse(self, prompt: str) -> ParsedPrompt:
        """Parse a natural-language prompt into structured form."""
        prompt_lower = prompt.lower().strip()

        count = self._extract_count(prompt_lower)
        archetype = self._extract_archetype(prompt_lower)
        style = self._extract_style(prompt_lower)
        theme = self._extract_theme(prompt_lower)
        modifiers = self._extract_modifiers(prompt_lower)

        return ParsedPrompt(
            theme=theme,
            style=style,
            count=count,
            archetype=archetype,
            modifiers=modifiers,
        )

    def _extract_count(self, prompt: str) -> int:
        match = self._COUNT_RE.search(prompt)
        if match:
            return int(match.group(1))
        return 10

    def _extract_archetype(self, prompt: str) -> str:
        if any(kw in prompt for kw in self._NPC_KEYWORDS):
            return "npc"
        return "enemy"

    def _extract_style(self, prompt: str) -> str:
        match = self._STYLE_RE.search(prompt)
        if match:
            style = match.group(1).strip()
            if "pixel" in style:
                return "pixel art"
            return style
        return "pixel art"

    def _extract_theme(self, prompt: str) -> str:
        theme_parts = []
        for kw in self._ENEMY_KEYWORDS | self._NPC_KEYWORDS:
            if kw in prompt and kw not in ("enemy", "enemies", "npc", "npcs", "monster", "monsters"):
                theme_parts.append(kw)
        if theme_parts:
            return theme_parts[0]
        return "generic"

    def _extract_modifiers(self, prompt: str) -> tuple[str, ...]:
        modifiers = []
        known = {
            "poor", "ragged", "fearful", "angry", "happy", "sad",
            "fire", "ice", "poison", "dark", "light", "shadow",
            "swamp", "forest", "cave", "dungeon", "village", "castle",
        }
        for mod in known:
            if mod in prompt:
                modifiers.append(mod)
        return tuple(modifiers)


class PaletteVariator:
    """Applies deterministic palette variations within style pack limits."""

    def vary(
        self,
        base_palette: dict[str, str],
        count: int,
        style_pack_limits: dict[str, Any] | None = None,
    ) -> Iterator[dict[str, str]]:
        """Yield count distinct palettes derived from base_palette.

        Variations are deterministic (seeded hash) to ensure reproducibility.
        """
        ramp_names = list(base_palette.values())
        ramp_variants: dict[str, list[str]] = {}
        for ramp in ramp_names:
            ramp_variants[ramp] = [ramp, ramp + "_alt" if not ramp.endswith("_alt") else ramp[:-4]]

        for i in range(count):
            seed = int(hashlib.md5(f"{ramp_names}{i}".encode()).hexdigest(), 16)
            varied: dict[str, str] = {}
            for key, ramp in base_palette.items():
                variant_seed = (seed + sum(ramp.encode())) % 256
                idx = variant_seed % len(ramp_variants[ramp])
                varied[key] = ramp_variants[ramp][idx]
            yield varied


@dataclass(frozen=True)
class EntitySpec:
    """Generated entity specification (dict-based for flexibility)."""

    data: dict[str, Any]


class EntitySpecGenerator:
    """Generates entity specs from a parsed BatchBrief."""

    _ARCHETYPE_BODY = {
        "enemy": {"archetype": "humanoid", "head_scale": 1.2, "torso_scale": 1.0, "leg_length": 32},
        "npc": {"archetype": "humanoid", "head_scale": 1.0, "torso_scale": 1.0, "leg_length": 32},
    }

    _PART_PRESETS = {
        "enemy": {"head": "goblin_head", "torso": "basic_torso", "legs": "basic_legs", "arms": "basic_arms"},
        "npc": {"head": "human_head", "torso": "peasant_torso", "legs": "basic_legs", "arms": "basic_arms"},
    }

    _DEFAULT_PALETTE = {"primary": "neutral_primary", "secondary": "neutral_secondary", "accent": "neutral_accent"}

    def __init__(self) -> None:
        self._parser = PromptParser()

    def generate(self, brief: BatchBrief) -> list[dict[str, Any]]:
        """Generate count entity specs from brief."""
        parsed = self._parser.parse(brief.request)
        count = parsed.count

        style_pack = brief.style_pack or "cute_chibi_v1"
        archetype = parsed.archetype
        body_base = self._ARCHETYPE_BODY.get(archetype, self._ARCHETYPE_BODY["enemy"])
        part_presets = self._PART_PRESETS.get(archetype, self._PART_PRESETS["enemy"])

        base_palette = self._DEFAULT_PALETTE.copy()
        variator = PaletteVariator()

        specs: list[dict[str, Any]] = []
        for i, palette in enumerate(variator.vary(base_palette, count)):
            spec = self._build_spec(
                index=i,
                style_pack=style_pack,
                body_base=body_base,
                part_presets=part_presets,
                palette=palette,
                archetype=archetype,
                theme=parsed.theme,
                modifiers=parsed.modifiers,
            )
            specs.append(spec)

        return specs

    def _build_spec(
        self,
        index: int,
        style_pack: str,
        body_base: dict[str, Any],
        part_presets: dict[str, str],
        palette: dict[str, str],
        archetype: str,
        theme: str,
        modifiers: tuple[str, ...],
    ) -> dict[str, Any]:
        modifier_suffix = f"_{modifiers[index % len(modifiers)]}" if modifiers else ""

        return {
            "style_pack": style_pack,
            "entity_type": f"{archetype}_{theme}{modifier_suffix}",
            "frame": {"width": 64, "height": 64, "pivot": [32, 56]},
            "animations": {"idle": 3, "walk": 3, "action": 3},
            "body": body_base.copy(),
            "parts": part_presets.copy(),
            "equipment": {"main_hand": None, "off_hand": None},
            "palette": palette,
            "pose": {"idle": [], "walk": [], "action": []},
            "fx": {"type": None},
        }