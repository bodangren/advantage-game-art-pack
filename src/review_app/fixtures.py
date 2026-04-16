"""Seed fixtures for review app."""

from __future__ import annotations

from review_app.db import Database, init_db


def seed_demo_candidates(db: Database) -> None:
    """Seed the database with demo candidates for testing the UI."""
    db.create_candidate(
        candidate_type="primitive",
        family="wizard_robe",
        source_brief='{"motif": "wizard robe", "colors": ["purple", "gold"]}',
        source_program="primitive_library",
        rendered_files='["outputs/primitives/wizard_robe_001.png"]',
        critic_scores='{"palette_score": 0.92, "style_score": 0.88, "novelty_score": 0.75}',
        nearest_references='["canon/wizard_robe_ref.json"]',
        confidence=0.87,
        theme="fantasy",
        status="pending",
    )

    db.create_candidate(
        candidate_type="primitive",
        family="zombie_claw",
        source_brief='{"motif": "zombie claw", "colors": ["green", "gray"]}',
        source_program="primitive_library",
        rendered_files='["outputs/primitives/zombie_claw_001.png"]',
        critic_scores='{"palette_score": 0.78, "style_score": 0.82, "novelty_score": 0.85}',
        nearest_references='["canon/zombie_ref.json"]',
        confidence=0.82,
        theme="fantasy",
        status="pending",
    )

    db.create_candidate(
        candidate_type="primitive",
        family="robot_arm",
        source_brief='{"motif": "robot arm", "colors": ["silver", "blue"]}',
        source_program="primitive_library",
        rendered_files='["outputs/primitives/robot_arm_001.png"]',
        critic_scores='{"palette_score": 0.95, "style_score": 0.70, "novelty_score": 0.90}',
        nearest_references='["canon/robot_ref.json"]',
        confidence=0.85,
        theme="scifi",
        status="pending",
    )

    db.create_candidate(
        candidate_type="compiled_asset",
        family="character_sheet",
        source_brief='{"character": "wizard", "pose": "idle", "scale": "3x3"}',
        source_manifest='{"layout": "3x3", "frames": 9, "canvas": [96, 96]}',
        source_program="scene_assembler",
        candidate_group_id="wizard_idle_v1",
        variant_id="var_001",
        attempt_count=1,
        rendered_files='["outputs/scenes/wizard_idle_sheet.png"]',
        critic_scores='{"structure_score": 0.94, "palette_score": 0.89, "proportions_score": 0.91}',
        nearest_references='["canon/wizard_idle_ref.json"]',
        confidence=0.91,
        theme="fantasy",
        status="approved",
    )

    db.create_candidate(
        candidate_type="compiled_asset",
        family="background_scene",
        source_brief='{"scene": "library", "time": "day"}',
        source_manifest='{"template": "library_room", "lighting": "ambient"}',
        source_program="scene_assembler",
        candidate_group_id="library_day_v1",
        variant_id="var_001",
        attempt_count=1,
        rendered_files='["outputs/scenes/library_day.png"]',
        critic_scores='{"composition_score": 0.88, "color_harmony": 0.92}',
        nearest_references='["canon/library_ref.json"]',
        confidence=0.90,
        theme="fantasy",
        status="approved",
    )

    db.create_candidate(
        candidate_type="primitive",
        family="skeleton_skull",
        source_brief='{"motif": "skeleton skull", "colors": ["bone", "black"]}',
        source_program="primitive_library",
        rendered_files='["outputs/primitives/skeleton_skull_001.png"]',
        critic_scores='{"palette_score": 0.65, "style_score": 0.72, "novelty_score": 0.88}',
        nearest_references='["canon/skeleton_ref.json"]',
        confidence=0.75,
        theme="fantasy",
        status="rejected",
    )


if __name__ == "__main__":
    import os

    db_path = os.environ.get("REVIEW_DB", "review_queue.db")
    init_db(db_path)
    db = Database(db_path)
    seed_demo_candidates(db)
    db.close()
    print(f"Seeded database: {db_path}")