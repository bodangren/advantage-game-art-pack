"""Authentication middleware for review app."""

from __future__ import annotations

import os
from typing import Optional

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

AUTH_CONFIG: dict = {
    "api_keys": {},
    "enabled": True,
}


def init_auth_config() -> None:
    """Initialize auth config from environment variables."""
    api_key = os.environ.get("REVIEW_APP_API_KEY")
    if api_key:
        AUTH_CONFIG["api_keys"][api_key] = "admin"
    AUTH_CONFIG["enabled"] = os.environ.get("REVIEW_APP_AUTH_ENABLED", "true").lower() != "false"


def _validate_api_key(key: str) -> Optional[str]:
    """Validate an API key and return the username if valid."""
    if not key:
        return None
    return AUTH_CONFIG["api_keys"].get(key)


def get_api_key_from_request(request: Request) -> Optional[str]:
    """Extract API key from request header or query params."""
    api_key = request.headers.get("x-api-key")
    if api_key:
        return api_key
    api_key = request.query_params.get("api_key")
    if api_key:
        return api_key
    return None


class APIKeyAuthBackend:
    """FastAPI dependency for API key authentication."""

    async def __call__(self, request: Request) -> str:
        if not AUTH_CONFIG["enabled"]:
            return "anonymous"

        api_key = get_api_key_from_request(request)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing API key. Provide X-Api-Key header or api_key query param.",
            )

        user = _validate_api_key(api_key)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid API key.",
            )

        return user


def require_auth(request: Request) -> str:
    """FastAPI dependency that requires authentication."""
    if not AUTH_CONFIG["enabled"]:
        return "anonymous"

    api_key = get_api_key_from_request(request)
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide X-Api-Key header or api_key query param.",
        )

    user = _validate_api_key(api_key)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key.",
        )

    return user


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware that enforces authentication on all routes."""

    EXEMPT_PATHS = {"/", "/queue", "/docs", "/openapi.json", "/redoc", "/health"}

    async def dispatch(self, request: Request, call_next) -> Response:
        if not AUTH_CONFIG["enabled"]:
            return await call_next(request)

        if request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        api_key = get_api_key_from_request(request)
        if not api_key:
            return Response(
                content='{"detail":"Missing API key"}',
                status_code=status.HTTP_401_UNAUTHORIZED,
                media_type="application/json",
            )

        user = _validate_api_key(api_key)
        if not user:
            return Response(
                content='{"detail":"Invalid API key"}',
                status_code=status.HTTP_403_FORBIDDEN,
                media_type="application/json",
            )

        request.state.user = user
        return await call_next(request)
