"""Smoke tests for live LLM integration.

These tests make actual API calls and are skipped if no API key is configured.
Run with: python3 -m pytest tests/test_live_llm_smoke.py -v
"""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from asf.batch_orchestrator import BatchOrchestrator
from asf.batch import JobState
from asf.planner.planner import PlannerContext, PromptBuilder, StructuredOutputParser
from asf.planner.schemas import AssetFamily, UserBrief
from asf.planner.provider import OpenAIProvider, AnthropicProvider
from asf.credentials import resolve_credentials, CredentialError


class LiveLLMSmokeTest(unittest.TestCase):
    """End-to-end smoke tests using real LLM API calls."""

    @classmethod
    def setUpClass(cls) -> None:
        cls._api_key = None
        cls._provider = None
        try:
            creds = resolve_credentials()
            cls._api_key = creds.api_key
            cls._provider = creds.provider
        except CredentialError:
            pass

    def test_skipped_without_credentials(self) -> None:
        if self._api_key is None:
            self.skipTest("No OPENAI_API_KEY or ANTHROPIC_API_KEY configured")

    def test_planner_produces_valid_program_json(self) -> None:
        if self._api_key is None:
            self.skipTest("No API key")

        if self._provider == "openai":
            provider = OpenAIProvider(api_key=self._api_key)
        else:
            provider = AnthropicProvider(api_key=self._api_key)

        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = Path(__file__).resolve().parents[1]
            context = PlannerContext(
                canon={},
                style_packs={},
                primitive_manifest={"primitives": []},
                repo_root=repo_root,
            )

            user_brief = UserBrief(
                request="A cute blue slime character",
                family=AssetFamily.CHARACTER_SHEET,
                style_pack=None,
            )
            prompt_builder = PromptBuilder(context=context)
            prompt, schema = prompt_builder.build_user_brief_prompt(user_brief)

            response = provider.submit_prompt(prompt, schema)

            self.assertIsNone(response.trace.get("error"), f"API error: {response.trace.get('error')}")
            self.assertTrue(response.parsed, "No parseable response from provider")

            parser = StructuredOutputParser(context=context)
            program = parser.parse_program(
                response.parsed,
                expected_family=AssetFamily.CHARACTER_SHEET,
            )

            self.assertIsNotNone(program)
            self.assertEqual(program.family, "character_sheet")

    def test_compiler_produces_png_output(self) -> None:
        if self._api_key is None:
            self.skipTest("No API key")

        if self._provider == "openai":
            provider = OpenAIProvider(api_key=self._api_key)
        else:
            provider = AnthropicProvider(api_key=self._api_key)

        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = Path(__file__).resolve().parents[1]
            job_root = Path(tmpdir)

            context = PlannerContext(
                canon={},
                style_packs={},
                primitive_manifest={"primitives": []},
                repo_root=repo_root,
            )

            user_brief = UserBrief(
                request="A small red potion bottle",
                family=AssetFamily.PROP_OR_FX_SHEET,
                style_pack=None,
            )
            prompt_builder = PromptBuilder(context=context)
            prompt, schema = prompt_builder.build_user_brief_prompt(user_brief)

            response = provider.submit_prompt(prompt, schema)
            if response.trace.get("error"):
                self.skipTest(f"API error: {response.trace.get('error')}")

            self.assertTrue(response.parsed, "No parseable response")

            parser = StructuredOutputParser(context=context)
            from asf.planner.schemas import serialize_program
            program = parser.parse_program(
                response.parsed,
                expected_family=AssetFamily.PROP_OR_FX_SHEET,
            )
            prog_dict = serialize_program(program)

            orchestrator = BatchOrchestrator(
                job_root=job_root,
                repo_root=repo_root,
                planner_context=context,
            )

            job = orchestrator.run_from_plan(
                brief="A small red potion bottle",
                families=(AssetFamily.PROP_OR_FX_SHEET.value,),
                counts={AssetFamily.PROP_OR_FX_SHEET.value: 1},
                programs=[prog_dict],
            )

            self.assertEqual(job.state, JobState.COMPLETED, f"Job failed: {job.asset_states[0].failure_reason}")

    def test_dry_run_and_resume_work_together(self) -> None:
        if self._api_key is None:
            self.skipTest("No API key")

        if self._provider == "openai":
            provider = OpenAIProvider(api_key=self._api_key)
        else:
            provider = AnthropicProvider(api_key=self._api_key)

        with tempfile.TemporaryDirectory() as tmpdir:
            repo_root = Path(__file__).resolve().parents[1]
            job_root = Path(tmpdir)

            context = PlannerContext(
                canon={},
                style_packs={},
                primitive_manifest={"primitives": []},
                repo_root=repo_root,
            )

            user_brief = UserBrief(
                request="A green herb plant",
                family=AssetFamily.PROP_OR_FX_SHEET,
                style_pack=None,
            )
            prompt_builder = PromptBuilder(context=context)
            prompt, schema = prompt_builder.build_user_brief_prompt(user_brief)

            response = provider.submit_prompt(prompt, schema)
            if response.trace.get("error"):
                self.skipTest(f"API error: {response.trace.get('error')}")

            self.assertTrue(response.parsed)

            parser = StructuredOutputParser(context=context)
            from asf.planner.schemas import serialize_program
            program = parser.parse_program(
                response.parsed,
                expected_family=AssetFamily.PROP_OR_FX_SHEET,
            )
            prog_dict = serialize_program(program)

            orchestrator = BatchOrchestrator(
                job_root=job_root,
                repo_root=repo_root,
                planner_context=context,
                max_compile_retries=0,
                max_candidate_loop_retries=0,
            )

            job1 = orchestrator.run_from_plan(
                brief="A green herb plant",
                families=(AssetFamily.PROP_OR_FX_SHEET.value,),
                counts={AssetFamily.PROP_OR_FX_SHEET.value: 1},
                programs=[prog_dict],
            )
            job_id = job1.job_id

            job2 = orchestrator.resume(job_id)
            self.assertEqual(job2.job_id, job_id)
            self.assertIn(job2.state, (JobState.COMPLETED, JobState.FAILED))


if __name__ == "__main__":
    unittest.main()