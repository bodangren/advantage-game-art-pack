"""Prompt builder and structured parser for LLM-based asset planning."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from asf.planner.schemas import (
    AssetFamily,
    BackgroundSceneProgram,
    BatchBrief,
    BatchPlannerManifest,
    CharacterDirection,
    CharacterSheetProgram,
    PaletteRamp,
    PresentationSurfaceType,
    PrimitiveReference,
    PropOrFxSheetProgram,
    SchemaValidationError,
    ThemePackReference,
    TilesetLayout,
    TilesetProgram,
    UserBrief,
    _require_enum,
    _require_string,
    _require_tuple_of,
)

logger = logging.getLogger(__name__)


@dataclass
class PlannerContext:
    """Context assembled from canon, style packs, and primitive availability."""

    canon: dict[str, Any]
    style_packs: dict[str, dict[str, Any]]
    primitive_manifest: dict[str, Any]
    repo_root: Path = Path(".")

    def get_family_summary(self, family: AssetFamily) -> dict[str, Any]:
        return self.canon.get("family_baselines", {}).get(family.value, {})

    def get_available_primitives(
        self,
        family: AssetFamily | None = None,
        theme_id: str | None = None,
    ) -> list[dict[str, Any]]:
        primitives = self.primitive_manifest.get("primitives", [])
        if family is not None:
            primitives = [p for p in primitives if p.get("family") == family.value]
        if theme_id is not None:
            primitives = [
                p for p in primitives if theme_id in p.get("compatible_themes", [])
            ]
        return primitives


@dataclass
class PromptBuilder:
    """Builds structured prompts for the planner from briefs and context."""

    context: PlannerContext

    SYSTEM_PROMPT = """You are a pixel-art asset planner. Your job is to convert natural-language asset briefs into precise asset programs.

OUTPUT FORMAT: You must respond ONLY with valid JSON matching the schema below. No prose, no explanations, no markdown code fences.

IMPORTANT CONSTRAINTS:
- Only reference primitives that exist in the available_primitives list
- Only reference theme packs that are listed in the themes list
- All IDs must be stable and deterministic
- The planner generates PROGRAMS, not images"""

    def build_user_brief_prompt(self, brief: UserBrief) -> tuple[str, dict[str, Any]]:
        schema = self._get_schema_for_family(brief.family)
        context_text = self._assemble_context(brief)

        user_prompt = f"""Generate an asset program for the following brief:

{brief.request}

ASSET FAMILY: {brief.family.value}

STYLE PACK: {brief.style_pack or 'default'}

{context_text}

Respond with ONLY JSON matching this schema:
{json.dumps(schema, indent=2)}
"""
        full_prompt = f"{self.SYSTEM_PROMPT}\n\n{user_prompt}"
        return full_prompt, schema

    def _assemble_context(self, brief: UserBrief) -> str:
        parts = []

        parts.append("AVAILABLE STYLE PACKS:")
        for name, sp in self.context.style_packs.items():
            parts.append(f"  - {name}: palette_limits={sp.get('palette_limits')}, ramps={list(sp.get('ramps', {}).keys())}")

        family_summary = self.context.get_family_summary(brief.family)
        if family_summary:
            themes = family_summary.get("themes", [])
            motifs = family_summary.get("motifs", [])
            if themes:
                parts.append(f"APPROVED THEMES: {', '.join(themes)}")
            if motifs:
                parts.append(f"APPROVED MOTIFS: {', '.join(motifs)}")

        primitives = self.context.get_available_primitives(family=brief.family)
        if primitives:
            parts.append("AVAILABLE PRIMITIVES:")
            for p in primitives[:20]:
                parts.append(
                    f"  - {p.get('primitive_id')}: family={p.get('family')}, subtype={p.get('subtype')}, tags={p.get('tags', [])}"
                )

        if brief.theme_pack:
            parts.append(f"THEME PACK: {brief.theme_pack.theme_id}")
            parts.append(f"MOTIFS: {', '.join(brief.theme_pack.motif_ids)}")

        if brief.constraints:
            parts.append(f"CONSTRAINTS: {json.dumps(brief.constraints)}")

        return "\n".join(parts)

    def _get_schema_for_family(self, family: AssetFamily) -> dict[str, Any]:
        if family == AssetFamily.CHARACTER_SHEET:
            return {
                "family": "character_sheet",
                "style_pack": "string (style pack name)",
                "entity_type": "string (e.g. player, enemy, NPC)",
                "archetype": "string (e.g. armored_chibi, slime, robe_mage)",
                "palette_ramp": {"primary": "string", "secondary": "string", "accent": "string"},
                "directions": ["facing_down | facing_up | facing_camera"],
                "animations": ["string (animation name)"],
                "primitive_references": [
                    {"family": "string", "subtype": "string", "primitive_id": "string"}
                ],
                "presentation_surface": "runtime_sheet | parallax_layer | loading_surface | cover",
                "metadata": {},
            }
        elif family == AssetFamily.PROP_OR_FX_SHEET:
            return {
                "family": "prop_or_fx_sheet",
                "style_pack": "string",
                "prop_type": "string (e.g. chest, torch, orb_burst)",
                "palette_ramp": {"primary": "string", "secondary": "string", "accent": "string"},
                "layout_mode": "string (e.g. strip_3x1)",
                "primitive_references": [
                    {"family": "string", "subtype": "string", "primitive_id": "string"}
                ],
                "presentation_surface": "runtime_sheet | parallax_layer | loading_surface | cover",
                "metadata": {},
            }
        elif family == AssetFamily.TILESET:
            return {
                "family": "tileset",
                "style_pack": "string",
                "tile_type": "string (e.g. floor, wall, roof)",
                "layout_mode": "tile_atlas | tile_strip",
                "tile_categories": ["string"],
                "palette_ramp": {"primary": "string", "secondary": "string", "accent": "string"},
                "primitive_references": [
                    {"family": "string", "subtype": "string", "primitive_id": "string"}
                ],
                "presentation_surface": "runtime_sheet | parallax_layer | loading_surface | cover",
                "metadata": {},
            }
        else:
            return {
                "family": "background_scene",
                "style_pack": "string",
                "scene_type": "string (e.g. library_room, ruins_courtyard)",
                "parallax_layers": ["string"],
                "palette_ramp": {"primary": "string", "secondary": "string", "accent": "string"},
                "primitive_references": [
                    {"family": "string", "subtype": "string", "primitive_id": "string"}
                ],
                "presentation_surface": "runtime_sheet | parallax_layer | loading_surface | cover",
                "metadata": {},
            }


@dataclass
class StructuredOutputParser:
    """Parses structured JSON output from the planner into typed program objects."""

    context: PlannerContext

    def parse_program(
        self,
        payload: dict[str, Any],
        expected_family: AssetFamily,
    ) -> CharacterSheetProgram | PropOrFxSheetProgram | TilesetProgram | BackgroundSceneProgram:
        family_str = _require_string(payload, "family")
        parsed_family = AssetFamily(family_str)

        if parsed_family != expected_family:
            raise SchemaValidationError(
                f"Expected family '{expected_family.value}' but got '{family_str}'"
            )

        if parsed_family == AssetFamily.CHARACTER_SHEET:
            return self._parse_character_program(payload)
        elif parsed_family == AssetFamily.PROP_OR_FX_SHEET:
            return self._parse_prop_program(payload)
        elif parsed_family == AssetFamily.TILESET:
            return self._parse_tileset_program(payload)
        else:
            return self._parse_scene_program(payload)

    def _parse_character_program(self, payload: dict[str, Any]) -> CharacterSheetProgram:
        style_pack = _require_string(payload, "style_pack")
        entity_type = _require_string(payload, "entity_type")
        archetype = _require_string(payload, "archetype")

        directions_raw = _require_tuple_of(payload, "directions", str)
        directions = tuple(CharacterDirection(d) for d in directions_raw)

        animations_raw = _require_tuple_of(payload, "animations", str)
        animations = tuple(animations_raw)

        palette_ramp = self._parse_palette_ramp(payload)
        primitive_references = self._parse_primitive_references(payload)
        presentation_surface = self._parse_presentation_surface(payload)

        return CharacterSheetProgram(
            style_pack=style_pack,
            entity_type=entity_type,
            archetype=archetype,
            directions=directions,
            animations=animations,
            palette_ramp=palette_ramp,
            primitive_references=primitive_references,
            presentation_surface=presentation_surface,
            metadata=payload.get("metadata", {}),
        )

    def _parse_prop_program(self, payload: dict[str, Any]) -> PropOrFxSheetProgram:
        style_pack = _require_string(payload, "style_pack")
        prop_type = _require_string(payload, "prop_type")
        layout_mode = payload.get("layout_mode", "strip_3x1")

        palette_ramp = self._parse_palette_ramp(payload)
        primitive_references = self._parse_primitive_references(payload)
        presentation_surface = self._parse_presentation_surface(payload)

        return PropOrFxSheetProgram(
            style_pack=style_pack,
            prop_type=prop_type,
            layout_mode=layout_mode,
            palette_ramp=palette_ramp,
            primitive_references=primitive_references,
            presentation_surface=presentation_surface,
            metadata=payload.get("metadata", {}),
        )

    def _parse_tileset_program(self, payload: dict[str, Any]) -> TilesetProgram:
        style_pack = _require_string(payload, "style_pack")
        tile_type = _require_string(payload, "tile_type")
        layout_mode_str = payload.get("layout_mode", "tile_atlas")
        layout_mode = TilesetLayout(layout_mode_str)

        tile_categories_raw = _require_tuple_of(payload, "tile_categories", str)
        tile_categories = tuple(tile_categories_raw)

        palette_ramp = self._parse_palette_ramp(payload)
        primitive_references = self._parse_primitive_references(payload)
        presentation_surface = self._parse_presentation_surface(payload)

        return TilesetProgram(
            style_pack=style_pack,
            tile_type=tile_type,
            layout_mode=layout_mode,
            tile_categories=tile_categories,
            palette_ramp=palette_ramp,
            primitive_references=primitive_references,
            presentation_surface=presentation_surface,
            metadata=payload.get("metadata", {}),
        )

    def _parse_scene_program(self, payload: dict[str, Any]) -> BackgroundSceneProgram:
        style_pack = _require_string(payload, "style_pack")
        scene_type = _require_string(payload, "scene_type")

        parallax_layers_raw = _require_tuple_of(payload, "parallax_layers", str)
        parallax_layers = tuple(parallax_layers_raw)

        palette_ramp = self._parse_palette_ramp(payload)
        primitive_references = self._parse_primitive_references(payload)
        presentation_surface = self._parse_presentation_surface(payload)

        return BackgroundSceneProgram(
            style_pack=style_pack,
            scene_type=scene_type,
            parallax_layers=parallax_layers,
            palette_ramp=palette_ramp,
            primitive_references=primitive_references,
            presentation_surface=presentation_surface,
            metadata=payload.get("metadata", {}),
        )

    def _parse_palette_ramp(self, payload: dict[str, Any]) -> PaletteRamp | None:
        ramp_data = payload.get("palette_ramp")
        if not ramp_data:
            return None
        primary = _require_string(ramp_data, "primary")
        secondary = _require_string(ramp_data, "secondary")
        accent = _require_string(ramp_data, "accent")
        return PaletteRamp(primary=primary, secondary=secondary, accent=accent)

    def _parse_primitive_references(
        self, payload: dict[str, Any]
    ) -> tuple[PrimitiveReference, ...]:
        refs = payload.get("primitive_references", [])
        if not isinstance(refs, list):
            raise SchemaValidationError("primitive_references must be a list")
        result = []
        for ref in refs:
            if not isinstance(ref, dict):
                raise SchemaValidationError("each primitive_reference must be an object")
            family = _require_string(ref, "family")
            subtype = _require_string(ref, "subtype")
            primitive_id = _require_string(ref, "primitive_id")
            result.append(PrimitiveReference(family=family, subtype=subtype, primitive_id=primitive_id))
        return tuple(result)

    def _parse_presentation_surface(self, payload: dict[str, Any]) -> PresentationSurfaceType:
        surface_str = payload.get("presentation_surface", "runtime_sheet")
        return PresentationSurfaceType(surface_str)

    def validate_program(
        self,
        program: CharacterSheetProgram | PropOrFxSheetProgram | TilesetProgram | BackgroundSceneProgram,
    ) -> list[str]:
        errors = []
        available_primitives = self.context.get_available_primitives()
        available_ids = {p.get("primitive_id") for p in available_primitives}

        for ref in program.primitive_references:
            if ref.primitive_id not in available_ids:
                errors.append(f"Unknown primitive_id: {ref.primitive_id}")

        if program.style_pack and program.style_pack not in self.context.style_packs:
            errors.append(f"Unknown style_pack: {program.style_pack}")

        return errors


@dataclass
class RepairLoop:
    """Handles validation failures and repair prompts for malformed planner output."""

    context: PlannerContext
    max_attempts: int = 3

    def repair(
        self,
        original_brief: UserBrief,
        payload: dict[str, Any],
        errors: list[str],
        attempt: int = 1,
    ) -> dict[str, Any] | None:
        if attempt >= self.max_attempts:
            return None

        error_summary = "\n".join(f"- {e}" for e in errors)
        repair_prompt = f"""The following asset program has validation errors:

{json.dumps(payload, indent=2)}

Please fix these errors:

{error_summary}

Respond with ONLY the corrected JSON:"""

        return {
            "repair_prompt": repair_prompt,
            "attempt": attempt + 1,
        }


def parse_provider_json(content: str) -> dict[str, Any]:
    text = content.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise SchemaValidationError(f"Failed to parse JSON: {exc}") from exc
