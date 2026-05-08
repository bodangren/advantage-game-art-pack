"""Tests for the credentials module."""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from asf.credentials import (
    CREDENTIALS_FILE,
    ProviderCredentials,
    CredentialsLoadError,
    CredentialError,
    load_credentials_from_file,
    resolve_credentials,
)


class TestProviderCredentials(unittest.TestCase):
    """Test ProviderCredentials dataclass."""

    def test_to_dict(self):
        creds = ProviderCredentials(api_key="test-key", provider="openai", model="gpt-4o")
        result = creds.to_dict()
        self.assertEqual(result["api_key"], "test-key")
        self.assertEqual(result["provider"], "openai")
        self.assertEqual(result["model"], "gpt-4o")

    def test_from_dict(self):
        data = {"api_key": "test-key", "provider": "anthropic", "model": "claude-sonnet"}
        creds = ProviderCredentials.from_dict(data)
        self.assertEqual(creds.api_key, "test-key")
        self.assertEqual(creds.provider, "anthropic")
        self.assertEqual(creds.model, "claude-sonnet")

    def test_from_dict_defaults(self):
        data = {"api_key": "test-key"}
        creds = ProviderCredentials.from_dict(data)
        self.assertEqual(creds.provider, "openai")
        self.assertIsNone(creds.model)


class TestLoadCredentialsFromFile(unittest.TestCase):
    """Test loading credentials from file."""

    def test_file_not_found(self):
        with patch.object(Path, "exists", return_value=False):
            result = load_credentials_from_file()
            self.assertIsNone(result)

    def test_malformed_json(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            fake_home = Path(tmpdir)
            cred_file = fake_home / ".config" / "asf" / "credentials.json"
            cred_file.parent.mkdir(parents=True, exist_ok=True)
            cred_file.write_text("not valid json", encoding="utf-8")
            with patch.object(Path, "home", return_value=fake_home):
                result = load_credentials_from_file()
                self.assertIsNone(result)


class TestResolveCredentials(unittest.TestCase):
    """Test credential resolution order."""

    def test_cli_args_take_precedence(self):
        with patch.dict(os.environ, {}, clear=True):
            creds = resolve_credentials(provider_arg="openai", api_key_arg="cli-key")
            self.assertEqual(creds.api_key, "cli-key")
            self.assertEqual(creds.provider, "openai")

    def test_provider_arg_with_env_var(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "env-key"}):
            creds = resolve_credentials(provider_arg="openai")
            self.assertEqual(creds.api_key, "env-key")
            self.assertEqual(creds.provider, "openai")

    def test_asf_env_vars(self):
        with patch.dict(os.environ, {"ASF_PROVIDER_API_KEY": "asf-key", "ASF_PROVIDER_NAME": "anthropic"}):
            creds = resolve_credentials()
            self.assertEqual(creds.api_key, "asf-key")
            self.assertEqual(creds.provider, "anthropic")

    def test_anthropic_api_key_env(self):
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "claude-key"}):
            creds = resolve_credentials()
            self.assertEqual(creds.api_key, "claude-key")
            self.assertEqual(creds.provider, "anthropic")

    def test_openai_api_key_env(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "gpt-key"}):
            creds = resolve_credentials()
            self.assertEqual(creds.api_key, "gpt-key")
            self.assertEqual(creds.provider, "openai")

    def test_no_credentials_raises(self):
        with patch.dict(os.environ, {}, clear=True):
            with patch("asf.credentials.load_credentials_from_file", return_value=None):
                with self.assertRaises(CredentialError):
                    resolve_credentials()


if __name__ == "__main__":
    unittest.main()