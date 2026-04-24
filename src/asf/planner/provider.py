"""Planner provider interface and built-in implementations."""

from __future__ import annotations

import json
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, TypedDict

logger = logging.getLogger(__name__)


class PlannerTrace(TypedDict):
    """Structured trace for a planner provider call."""

    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    raw_response: str
    parsed: bool
    error: str | None


class ProviderConfig(TypedDict, total=False):
    """Base configuration for a planner provider."""

    api_key: str
    model: str
    base_url: str | None
    max_retries: int
    timeout: int


@dataclass
class ProviderResponse:
    """Response from a planner provider."""

    content: str
    parsed: dict[str, Any] | None
    trace: PlannerTrace
    model: str


class PlannerProvider(ABC):
    """Abstract base class for LLM-based planner providers."""

    def __init__(
        self,
        model: str,
        max_retries: int = 3,
        timeout: int = 60,
    ) -> None:
        self.model = model
        self.max_retries = max_retries
        self.timeout = timeout

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider identifier (e.g., 'openai', 'anthropic')."""

    @abstractmethod
    def submit_prompt(
        self,
        prompt: str,
        schema: dict[str, Any] | None = None,
    ) -> ProviderResponse:
        """Submit a prompt and return the structured response."""

    def _build_trace(
        self,
        raw_response: str,
        parsed: bool,
        error: str | None,
        usage: dict[str, int],
    ) -> PlannerTrace:
        """Build a standard trace dictionary."""
        return PlannerTrace(
            provider=self.provider_name,
            model=self.model,
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            raw_response=raw_response,
            parsed=parsed,
            error=error,
        )

    def _parse_json_content(self, content: str) -> dict[str, Any]:
        """Extract and parse JSON from provider response content."""
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
            raise ProviderParseError(f"Failed to parse JSON: {exc}") from exc


class ProviderParseError(ValueError):
    """Raised when provider output cannot be parsed."""


class ProviderAPIError(RuntimeError):
    """Raised when provider API call fails after retries."""


class OpenAIProvider(PlannerProvider):
    """OpenAI GPT-based planner provider."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "gpt-4o",
        max_retries: int = 3,
        timeout: int = 60,
        base_url: str | None = None,
    ) -> None:
        super().__init__(model=model, max_retries=max_retries, timeout=timeout)
        self.api_key = api_key
        self.base_url = base_url

    @property
    def provider_name(self) -> str:
        return "openai"

    def submit_prompt(
        self,
        prompt: str,
        schema: dict[str, Any] | None = None,
    ) -> ProviderResponse:
        import os
        import time
        import urllib.request
        import urllib.error

        if not self.api_key:
            self.api_key = os.environ.get("OPENAI_API_KEY")

        if not self.api_key:
            return ProviderResponse(
                content="",
                parsed=None,
                trace=self._build_trace("", False, "No API key configured", {}),
                model=self.model,
            )

        url = (self.base_url or "https://api.openai.com/v1/chat/completions")
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
        }
        if schema:
            payload["response_format"] = {"type": "json_object"}

        last_error: str | None = None
        for attempt in range(self.max_retries):
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    data = json.loads(response.read().decode("utf-8"))

                content = data["choices"][0]["message"]["content"]
                parsed = self._parse_json_content(content)
                usage = data.get("usage", {})
                return ProviderResponse(
                    content=content,
                    parsed=parsed,
                    trace=self._build_trace(content, True, None, usage),
                    model=self.model,
                )
            except urllib.error.HTTPError as exc:
                last_error = f"HTTP {exc.code}: {exc.reason}"
                if exc.code == 429:
                    time.sleep(2 ** attempt)
                else:
                    break
            except urllib.error.URLError as exc:
                last_error = f"URL error: {exc.reason}"
                time.sleep(2 ** attempt)
            except Exception as exc:
                last_error = str(exc)
                break

        return ProviderResponse(
            content="",
            parsed=None,
            trace=self._build_trace("", False, last_error, {}),
            model=self.model,
        )


class AnthropicProvider(PlannerProvider):
    """Anthropic Claude-based planner provider."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "claude-sonnet-4-20250514",
        max_retries: int = 3,
        timeout: int = 60,
        base_url: str | None = None,
    ) -> None:
        super().__init__(model=model, max_retries=max_retries, timeout=timeout)
        self.api_key = api_key
        self.base_url = base_url

    @property
    def provider_name(self) -> str:
        return "anthropic"

    def submit_prompt(
        self,
        prompt: str,
        schema: dict[str, Any] | None = None,
    ) -> ProviderResponse:
        import os
        import time
        import urllib.request
        import urllib.error

        if not self.api_key:
            self.api_key = os.environ.get("ANTHROPIC_API_KEY")

        if not self.api_key:
            return ProviderResponse(
                content="",
                parsed=None,
                trace=self._build_trace("", False, "No API key configured", {}),
                model=self.model,
            )

        url = (self.base_url or "https://api.anthropic.com/v1/messages")
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
        }

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1024,
        }
        if schema:
            payload["cache_control"] = {"type": "ephemeral"}

        last_error: str | None = None
        for attempt in range(self.max_retries):
            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as response:
                    data = json.loads(response.read().decode("utf-8"))

                content = data["content"][0]["text"]
                parsed = self._parse_json_content(content)
                usage = {
                    "prompt_tokens": data.get("usage", {}).get("input_tokens", 0),
                    "completion_tokens": data.get("usage", {}).get("output_tokens", 0),
                    "total_tokens": data.get("usage", {}).get("input_tokens", 0)
                    + data.get("usage", {}).get("output_tokens", 0),
                }
                return ProviderResponse(
                    content=content,
                    parsed=parsed,
                    trace=self._build_trace(content, True, None, usage),
                    model=self.model,
                )
            except urllib.error.HTTPError as exc:
                last_error = f"HTTP {exc.code}: {exc.reason}"
                if exc.code == 429:
                    time.sleep(2 ** attempt)
                else:
                    break
            except urllib.error.URLError as exc:
                last_error = f"URL error: {exc.reason}"
                time.sleep(2 ** attempt)
            except Exception as exc:
                last_error = str(exc)
                break

        return ProviderResponse(
            content="",
            parsed=None,
            trace=self._build_trace("", False, last_error, {}),
            model=self.model,
        )


def create_provider(provider_type: str | None = None) -> PlannerProvider | None:
    """Factory function to create a planner provider with fallback."""
    if provider_type is None:
        provider_type = os.environ.get("PLANNER_PROVIDER", "openai")

    if provider_type == "openai":
        return OpenAIProvider()
    elif provider_type == "anthropic":
        return AnthropicProvider()
    else:
        return None