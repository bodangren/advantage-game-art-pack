"""Tests for batch entity generation: PromptParser, EntitySpecGenerator, PaletteVariator."""

from __future__ import annotations

import unittest
from asf.planner.batch_gen import PromptParser, PaletteVariator, EntitySpecGenerator, BatchBrief, ThemePackReference


class TestPromptParser(unittest.TestCase):
    """Tests for natural-language prompt parsing."""

    def test_parses_count_and_theme(self):
        parser = PromptParser()
        brief = parser.parse("10 swamp enemies")
        self.assertEqual(brief.count, 10)
        self.assertIn("swamp", brief.theme.lower())

    def test_parses_style_chibi(self):
        parser = PromptParser()
        brief = parser.parse("50 swamp enemies in chibi style")
        self.assertEqual(brief.count, 50)
        self.assertIn("chibi", brief.style.lower())

    def test_parses_count_from_goblins(self):
        parser = PromptParser()
        brief = parser.parse("20 goblins in pixel art style")
        self.assertEqual(brief.count, 20)

    def test_parses_archetype_enemy(self):
        parser = PromptParser()
        brief = parser.parse("20 goblins")
        self.assertEqual(brief.count, 20)
        self.assertEqual(brief.archetype, "enemy")

    def test_parses_themed_enemy_with_modifier(self):
        parser = PromptParser()
        brief = parser.parse("30 fire demons")
        self.assertEqual(brief.count, 30)
        self.assertIn("demon", brief.theme.lower())

    def test_defaults_to_10_when_no_count(self):
        parser = PromptParser()
        brief = parser.parse("swamp enemies")
        self.assertEqual(brief.count, 10)

    def test_defaults_to_enemy_archetype(self):
        parser = PromptParser()
        brief = parser.parse("goblins")
        self.assertEqual(brief.archetype, "enemy")

    def test_defaults_style_to_pixel_art(self):
        parser = PromptParser()
        brief = parser.parse("swamp enemies")
        self.assertIn("pixel", brief.style.lower())


class TestPaletteVariator(unittest.TestCase):
    """Tests for palette variation logic."""

    def setUp(self):
        self.variator = PaletteVariator()
        self.base_palette = {"primary": "swamp_green", "secondary": "murky_brown", "accent": "poison_purple"}

    def test_shuffled_assignments_are_different(self):
        varied = list(self.variator.vary(self.base_palette, count=3))
        self.assertEqual(len(varied), 3)
        self.assertNotEqual(varied[0], varied[1])

    def test_respects_style_pack_limits(self):
        style_pack_limits = {"palette_limits": 8}
        varied = list(self.variator.vary(self.base_palette, count=5, style_pack_limits=style_pack_limits))
        self.assertEqual(len(varied), 5)
        for palette in varied:
            self.assertLessEqual(len(palette), style_pack_limits["palette_limits"])

    def test_variations_within_bounds(self):
        varied = list(self.variator.vary(self.base_palette, count=10))
        self.assertEqual(len(varied), 10)


class TestEntitySpecGenerator(unittest.TestCase):
    """Tests for entity spec generation from BatchBrief."""

    def setUp(self):
        self.generator = EntitySpecGenerator()
        self.brief = BatchBrief(
            request="5 test enemies in chibi style",
            families=("character_sheet",),
            style_pack="cute_chibi_v1",
            theme_pack=None,
            shared_constraints={},
            per_asset_constraints={},
        )

    def test_generates_correct_count(self):
        specs = self.generator.generate(self.brief)
        self.assertEqual(len(specs), 5)

    def test_specs_have_valid_structure(self):
        specs = self.generator.generate(self.brief)
        for spec in specs:
            self.assertIn("style_pack", spec)
            self.assertIn("entity_type", spec)
            self.assertIn("body", spec)
            self.assertIn("palette", spec)

    def test_each_spec_has_unique_palette(self):
        specs = self.generator.generate(self.brief)
        palettes = [spec.get("palette", {}) for spec in specs]
        self.assertGreater(len(set(str(p) for p in palettes)), 1)


class TestIntegrationPromptToSpecs(unittest.TestCase):
    """Integration tests for prompt → compiled specs pipeline."""

    def test_prompt_to_10_enemies_compiles_to_json(self):
        from asf.planner.batch_gen import EntitySpecGenerator, PromptParser
        from asf.planner.schemas import AssetFamily, BatchBrief
        import json

        prompt = "10 swamp enemies in chibi style"
        parser = PromptParser()
        brief = BatchBrief(
            request=prompt,
            families=(AssetFamily.CHARACTER_SHEET,),
            style_pack="cute_chibi_v1",
            theme_pack=None,
            shared_constraints={},
            per_asset_constraints={},
        )
        generator = EntitySpecGenerator()
        specs = generator.generate(brief)

        self.assertEqual(len(specs), 10)
        for i, spec in enumerate(specs):
            json_str = json.dumps(spec)
            parsed = json.loads(json_str)
            self.assertIn("style_pack", parsed)
            self.assertIn("entity_type", parsed)

    def test_village_npcs_prompt_generates_npc_archetype(self):
        from asf.planner.batch_gen import EntitySpecGenerator, PromptParser
        from asf.planner.schemas import AssetFamily, BatchBrief

        prompt = "5 village NPCs: poor, ragged, fearful"
        parsed = PromptParser().parse(prompt)
        self.assertEqual(parsed.archetype, "npc")
        self.assertEqual(parsed.count, 5)


class TestExamplePrompts(unittest.TestCase):
    """Example prompt parsing for documentation."""

    def test_swamp_enemies_example(self):
        parser = PromptParser()
        brief = parser.parse("50 swamp enemies in chibi style")
        self.assertEqual(brief.count, 50)
        self.assertEqual(brief.style, "chibi style")
        self.assertEqual(brief.archetype, "enemy")

    def test_village_npcs_example(self):
        parser = PromptParser()
        brief = parser.parse("village NPCs: poor, ragged, fearful")
        self.assertEqual(brief.archetype, "npc")
        self.assertEqual(brief.count, 10)


if __name__ == "__main__":
    unittest.main()