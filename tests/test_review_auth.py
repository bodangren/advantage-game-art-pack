"""Tests for authentication middleware."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

from review_app.auth import (
    APIKeyAuthBackend,
    require_auth,
    get_api_key_from_request,
    _validate_api_key,
    AUTH_CONFIG,
)


class APIKeyValidationTest(unittest.TestCase):
    """Validates API key validation logic."""

    def test_validate_api_key_with_correct_key(self) -> None:
        original_keys = dict(AUTH_CONFIG["api_keys"])
        AUTH_CONFIG["api_keys"]["test-key"] = "test-user"
        try:
            result = _validate_api_key("test-key")
            self.assertEqual(result, "test-user")
        finally:
            AUTH_CONFIG["api_keys"].pop("test-key", None)

    def test_validate_api_key_with_incorrect_key(self) -> None:
        result = _validate_api_key("wrong-key")
        self.assertIsNone(result)

    def test_validate_api_key_with_empty_key(self) -> None:
        result = _validate_api_key("")
        self.assertIsNone(result)


class GetAPIKeyFromRequestTest(unittest.TestCase):
    """Validates API key extraction from requests."""

    def test_get_api_key_from_header(self) -> None:
        mock_request = MagicMock()
        mock_request.query_params = {}
        mock_request.headers = {"x-api-key": "test-key"}

        result = get_api_key_from_request(mock_request)
        self.assertEqual(result, "test-key")

    def test_get_api_key_from_query_param(self) -> None:
        mock_request = MagicMock()
        mock_request.query_params = {"api_key": "test-key"}
        mock_request.headers = {}

        result = get_api_key_from_request(mock_request)
        self.assertEqual(result, "test-key")

    def test_get_api_key_missing(self) -> None:
        mock_request = MagicMock()
        mock_request.query_params = {}
        mock_request.headers = {}

        result = get_api_key_from_request(mock_request)
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()