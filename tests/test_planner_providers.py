"""Tests for OpenAI and Anthropic provider implementations."""

from __future__ import annotations

import json
import unittest
from unittest.mock import MagicMock, patch

from asf.planner.provider import (
    OpenAIProvider,
    AnthropicProvider,
    ProviderResponse,
    create_provider,
)


class OpenAIProviderTest(unittest.TestCase):
    """Validates OpenAI provider adapter."""

    def test_returns_null_when_no_api_key(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            provider = OpenAIProvider(api_key=None)
            response = provider.submit_prompt("test prompt")

        self.assertIsNone(response.parsed)
        self.assertEqual(response.content, "")
        self.assertEqual(response.trace["error"], "No API key configured")

    def test_returns_null_when_api_key_env_not_set(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            provider = OpenAIProvider()
            response = provider.submit_prompt("test prompt")

        self.assertIsNone(response.parsed)
        self.assertEqual(response.trace["error"], "No API key configured")

    @patch("urllib.request.urlopen")
    def test_successful_response_parses_json(self, mock_urlopen: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "choices": [{"message": {"content": '{"key": "value"}'}}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)

        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}, clear=True):
            provider = OpenAIProvider()
            response = provider.submit_prompt("test prompt")

        self.assertEqual(response.parsed, {"key": "value"})
        self.assertEqual(response.trace["provider"], "openai")
        self.assertEqual(response.trace["prompt_tokens"], 10)
        self.assertEqual(response.trace["completion_tokens"], 20)
        self.assertTrue(response.trace["parsed"])

    @patch("urllib.request.urlopen")
    def test_http_error_returns_error_trace(self, mock_urlopen: MagicMock) -> None:
        import urllib.error

        mock_urlopen.side_effect = urllib.error.HTTPError(
            "url", 500, "Server Error", {}, None
        )

        with patch.dict("os.environ", {"OPENAI_API_KEY": "test-key"}, clear=True):
            provider = OpenAIProvider()
            response = provider.submit_prompt("test prompt")

        self.assertIsNone(response.parsed)
        self.assertIsNotNone(response.trace["error"])


class AnthropicProviderTest(unittest.TestCase):
    """Validates Anthropic provider adapter."""

    def test_returns_null_when_no_api_key(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            provider = AnthropicProvider(api_key=None)
            response = provider.submit_prompt("test prompt")

        self.assertIsNone(response.parsed)
        self.assertEqual(response.content, "")
        self.assertEqual(response.trace["error"], "No API key configured")

    def test_returns_null_when_api_key_env_not_set(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            provider = AnthropicProvider()
            response = provider.submit_prompt("test prompt")

        self.assertIsNone(response.parsed)
        self.assertEqual(response.trace["error"], "No API key configured")

    @patch("urllib.request.urlopen")
    def test_successful_response_parses_json(self, mock_urlopen: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.read.return_value = json.dumps({
            "content": [{"text": '{"key": "value"}'}],
            "usage": {"input_tokens": 15, "output_tokens": 25},
        }).encode("utf-8")
        mock_urlopen.return_value.__enter__ = MagicMock(return_value=mock_response)
        mock_urlopen.return_value.__exit__ = MagicMock(return_value=False)

        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}, clear=True):
            provider = AnthropicProvider()
            response = provider.submit_prompt("test prompt")

        self.assertEqual(response.parsed, {"key": "value"})
        self.assertEqual(response.trace["provider"], "anthropic")
        self.assertEqual(response.trace["prompt_tokens"], 15)
        self.assertEqual(response.trace["completion_tokens"], 25)
        self.assertTrue(response.trace["parsed"])


class ProviderFactoryTest(unittest.TestCase):
    """Validates provider selection via env var."""

    def test_create_openai_provider(self) -> None:
        with patch.dict("os.environ", {"PLANNER_PROVIDER": "openai"}, clear=True):
            provider = create_provider()
        self.assertIsInstance(provider, OpenAIProvider)
        self.assertEqual(provider.provider_name, "openai")

    def test_create_anthropic_provider(self) -> None:
        with patch.dict("os.environ", {"PLANNER_PROVIDER": "anthropic"}, clear=True):
            provider = create_provider()
        self.assertIsInstance(provider, AnthropicProvider)
        self.assertEqual(provider.provider_name, "anthropic")

    def test_create_with_explicit_type(self) -> None:
        provider = create_provider("openai")
        self.assertIsInstance(provider, OpenAIProvider)

    def test_create_returns_none_for_unknown_type(self) -> None:
        with patch.dict("os.environ", {"PLANNER_PROVIDER": "unknown"}, clear=True):
            provider = create_provider()
        self.assertIsNone(provider)

    def test_defaults_to_openai(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            provider = create_provider()
        self.assertIsInstance(provider, OpenAIProvider)


if __name__ == "__main__":
    unittest.main()
