"""Eval fixtures and scorer for the planner."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from asf.planner.schemas import (
    AssetFamily,
    BatchBrief,
    BatchPlannerManifest,
    UserBrief,
)


EVAL_FIXTURES: list[dict] = [
    {
        "id": "eval_001",
        "description": "Single character sheet brief",
        "brief": {
            "request": "Generate a slime character in swamp style",
            "family": "character_sheet",
            "style_pack": "cute_chibi_v1",
        },
        "expected_families": ["character_sheet"],
        "expected_constraints": ["swamp"],
    },
    {
        "id": "eval_002",
        "description": "Prop sheet brief",
        "brief": {
            "request": "A wooden treasure chest with metal bindings",
            "family": "prop_or_fx_sheet",
            "style_pack": "dungeon_v1",
        },
        "expected_families": ["prop_or_fx_sheet"],
    },
    {
        "id": "eval_003",
        "description": "Tileset brief",
        "brief": {
            "request": "Cobblestone dungeon floor tiles",
            "family": "tileset",
            "style_pack": "dungeon_v1",
        },
        "expected_families": ["tileset"],
    },
    {
        "id": "eval_004",
        "description": "Background scene brief",
        "brief": {
            "request": "A ruined courtyard with mossy stones",
            "family": "background_scene",
            "style_pack": "ruins_v1",
        },
        "expected_families": ["background_scene"],
    },
    {
        "id": "eval_005",
        "description": "Multi-asset batch brief",
        "brief": {
            "request": "Same style, different enemies: skeleton warrior, zombie, ghost",
            "families": [
                "character_sheet",
                "character_sheet",
                "character_sheet",
            ],
            "style_pack": "dungeon_v1",
            "shared_constraints": {"mood": "dark"},
        },
        "expected_families": [
            "character_sheet",
            "character_sheet",
            "character_sheet",
        ],
    },
    {
        "id": "eval_006",
        "description": "Full per-game pack brief",
        "brief": {
            "request": "Wizard vs zombie mini-game asset pack",
            "families": [
                "character_sheet",
                "tileset",
                "prop_or_fx_sheet",
                "background_scene",
            ],
            "style_pack": "cute_chibi_v1",
            "shared_constraints": {"game": "wizard_vs_zombie"},
        },
        "expected_families": [
            "character_sheet",
            "tileset",
            "prop_or_fx_sheet",
            "background_scene",
        ],
    },
]


@dataclass
class EvalResult:
    fixture_id: str
    passed: bool
    schema_adherence: bool
    invalid_reference_count: int
    repair_loop_triggered: bool
    errors: list[str]


def load_eval_fixtures() -> list[dict]:
    return EVAL_FIXTURES


def score_planner_adherence(
    fixture: dict,
    programs: tuple,
) -> EvalResult:
    errors: list[str] = []
    schema_adherence = True
    invalid_refs = 0
    repair_triggered = False

    brief_payload = fixture["brief"]
    if "family" in brief_payload:
        expected_family = brief_payload["family"]
        if programs and hasattr(programs[0], "family"):
            if programs[0].family.value != expected_family:
                errors.append(f"Expected family '{expected_family}' got '{programs[0].family.value}'")
                schema_adherence = False

    for program in programs:
        if hasattr(program, "primitive_references"):
            for ref in program.primitive_references:
                if not ref.primitive_id:
                    errors.append(f"Empty primitive_id in {fixture['id']}")
                    schema_adherence = False

    return EvalResult(
        fixture_id=fixture["id"],
        passed=schema_adherence and invalid_refs == 0,
        schema_adherence=schema_adherence,
        invalid_reference_count=invalid_refs,
        repair_loop_triggered=repair_triggered,
        errors=errors,
    )


def run_eval_suite(
    fixtures: list[dict],
    scored_results: list[EvalResult],
) -> dict:
    total = len(fixtures)
    passed = sum(1 for r in scored_results if r.passed)
    schema_rate = sum(1 for r in scored_results if r.schema_adherence) / total if total else 0
    avg_invalid_refs = sum(r.invalid_reference_count for r in scored_results) / total if total else 0
    repair_trigger_count = sum(1 for r in scored_results if r.repair_loop_triggered)

    return {
        "total_fixtures": total,
        "passed": passed,
        "schema_adherence_rate": round(schema_rate, 3),
        "avg_invalid_reference_count": round(avg_invalid_refs, 3),
        "repair_loop_trigger_count": repair_trigger_count,
    }
