"""Tests for planner provider interface."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch
from dataclasses import asdict

from asf.planner.provider import (
    PlannerProvider,
    ProviderResponse,
    ProviderParseError,
    ProviderAPIError,
)


class ProviderInterfaceTest(unittest.TestCase):
    """Validates provider interface contract."""

    def test_provider_response_has_required_fields(self) -> None:
        response = ProviderResponse(
            content="{}",
            parsed={},
            trace={
                "provider": "test",
                "model": "test-model",
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30,
                "raw_response": "{}",
                "parsed": True,
                "error": None,
            },
            model="test-model",
        )
        self.assertEqual(response.content, "{}")
        self.assertEqual(response.parsed, {})
        self.assertEqual(response.model, "test-model")
        self.assertEqual(response.trace["total_tokens"], 30)

    def test_provider_submit_prompt_is_abstract(self) -> None:
        with self.assertRaises(TypeError):
            provider = PlannerProvider(model="test-model")
            provider.submit_prompt("test prompt")

    def test_provider_build_trace_format(self) -> None:
        class TestProvider(PlannerProvider):
            @property
            def provider_name(self) -> str:
                return "test"

            def submit_prompt(self, prompt, schema=None):
                return ProviderResponse(
                    content="{}",
                    parsed={},
                    trace=self._build_trace("raw", True, None, {"prompt_tokens": 5, "completion_tokens": 10, "total_tokens": 15}),
                    model=self.model,
                )

        provider = TestProvider(model="test-model")
        response = provider.submit_prompt("test prompt")
        trace = response.trace

        self.assertEqual(trace["provider"], "test")
        self.assertEqual(trace["model"], "test-model")
        self.assertEqual(trace["prompt_tokens"], 5)
        self.assertEqual(trace["completion_tokens"], 10)
        self.assertEqual(trace["total_tokens"], 15)
        self.assertEqual(trace["raw_response"], "raw")
        self.assertTrue(trace["parsed"])
        self.assertIsNone(trace["error"])

    def test_parse_json_content_strips_markdown(self) -> None:
        class TestProvider(PlannerProvider):
            @property
            def provider_name(self) -> str:
                return "test"

            def submit_prompt(self, prompt, schema=None):
                return ProviderResponse(
                    content="{}",
                    parsed={},
                    trace=self._build_trace("{}", True, None, {}),
                    model=self.model,
                )

        provider = TestProvider(model="test-model")

        result = provider._parse_json_content('```json\n{"key": "value"}\n```')
        self.assertEqual(result, {"key": "value"})

        result = provider._parse_json_content('```\n{"key": "value"}\n```')
        self.assertEqual(result, {"key": "value"})

        result = provider._parse_json_content('{"key": "value"}')
        self.assertEqual(result, {"key": "value"})

    def test_parse_json_content_raises_on_invalid_json(self) -> None:
        class TestProvider(PlannerProvider):
            @property
            def provider_name(self) -> str:
                return "test"

            def submit_prompt(self, prompt, schema=None):
                return ProviderResponse(
                    content="{}",
                    parsed={},
                    trace=self._build_trace("{}", True, None, {}),
                    model=self.model,
                )

        provider = TestProvider(model="test-model")

        with self.assertRaises(ProviderParseError):
            provider._parse_json_content("not valid json")


if __name__ == "__main__":
    unittest.main()
