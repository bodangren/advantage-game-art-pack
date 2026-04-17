"""Planner provider interface and built-in implementations."""

from __future__ import annotations

import json
import logging
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