"""Credential resolution for LLM planner providers.

Resolution order (first wins):
1. CLI argument (provider override)
2. ASF_PROVIDER_API_KEY / ASF_PROVIDER_NAME env vars
3. Provider-specific env vars (OPENAI_API_KEY, ANTHROPIC_API_KEY)
4. ~/.config/asf/credentials.json
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


CREDENTIALS_FILE = Path.home() / ".config" / "asf" / "credentials.json"


@dataclass
class ProviderCredentials:
    api_key: str
    provider: str
    model: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "api_key": self.api_key,
            "provider": self.provider,
            "model": self.model,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> ProviderCredentials:
        return cls(
            api_key=data["api_key"],
            provider=data.get("provider", "openai"),
            model=data.get("model"),
        )


class CredentialsLoadError(ValueError):
    """Raised when credentials file is malformed."""


def load_credentials_from_file() -> ProviderCredentials | None:
    """Load credentials from ~/.config/asf/credentials.json."""
    if not CREDENTIALS_FILE.exists():
        return None
    try:
        data = json.loads(CREDENTIALS_FILE.read_text(encoding="utf-8"))
        if not data.get("api_key"):
            return None
        return ProviderCredentials.from_dict(data)
    except (json.JSONDecodeError, KeyError) as exc:
        raise CredentialsLoadError(f"Malformed credentials file: {exc}") from exc


def resolve_credentials(
    provider_arg: str | None = None,
    api_key_arg: str | None = None,
) -> ProviderCredentials:
    """Resolve provider credentials from all sources.

    Resolution order:
    1. CLI arguments (provider_arg, api_key_arg)
    2. ASF_PROVIDER_API_KEY / ASF_PROVIDER_NAME env vars
    3. Provider-specific env vars (OPENAI_API_KEY, ANTHROPIC_API_KEY)
    4. ~/.config/asf/credentials.json
    """
    if api_key_arg and provider_arg:
        return ProviderCredentials(api_key=api_key_arg, provider=provider_arg)

    if api_key_arg:
        provider = provider_arg or os.environ.get("ASF_PROVIDER_NAME", "openai")
        return ProviderCredentials(api_key=api_key_arg, provider=provider)

    if provider_arg:
        api_key = os.environ.get("ASF_PROVIDER_API_KEY")
        if not api_key:
            api_key = _get_provider_env_var(provider_arg)
        if not api_key:
            creds = load_credentials_from_file()
            if creds and creds.provider == provider_arg:
                return creds
            raise CredentialError(
                f"No API key found for provider '{provider_arg}'. "
                f"Set ASF_PROVIDER_API_KEY or {provider_arg.upper()}_API_KEY."
            )
        return ProviderCredentials(api_key=api_key, provider=provider_arg)

    if os.environ.get("ASF_PROVIDER_API_KEY"):
        provider = os.environ.get("ASF_PROVIDER_NAME", "openai")
        return ProviderCredentials(
            api_key=os.environ["ASF_PROVIDER_API_KEY"],
            provider=provider,
        )

    if os.environ.get("OPENAI_API_KEY"):
        return ProviderCredentials(
            api_key=os.environ["OPENAI_API_KEY"],
            provider="openai",
        )

    if os.environ.get("ANTHROPIC_API_KEY"):
        return ProviderCredentials(
            api_key=os.environ["ANTHROPIC_API_KEY"],
            provider="anthropic",
        )

    creds = load_credentials_from_file()
    if creds:
        return creds

    raise CredentialError(
        "No API key found. Set ASF_PROVIDER_API_KEY / ASF_PROVIDER_NAME, "
        "or provider-specific env vars (OPENAI_API_KEY, ANTHROPIC_API_KEY), "
        "or ~/.config/asf/credentials.json."
    )


def _get_provider_env_var(provider: str) -> str | None:
    """Get API key env var for a given provider."""
    env_vars = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
    }
    var_name = env_vars.get(provider)
    if var_name:
        return os.environ.get(var_name)
    return None


class CredentialError(ValueError):
    """Raised when no valid credentials can be found."""