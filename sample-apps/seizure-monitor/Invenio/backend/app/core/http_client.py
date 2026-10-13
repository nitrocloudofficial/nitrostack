"""
Shared HTTP Client with connection pooling and timeouts.
Used by all providers.
"""

import httpx
from typing import AsyncGenerator
from app.core.config import settings

# Global client instance
_client: httpx.AsyncClient | None = None

def get_http_client() -> httpx.AsyncClient:
    """
    Returns a singleton httpx.AsyncClient configured for external API calls.
    Must be called inside an async context (e.g. from a FastAPI endpoint).
    """
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=settings.HTTP_TIMEOUT_SECONDS,
            headers={"User-Agent": f"InvenioResearchBot/0.1 ({settings.OPENALEX_EMAIL})"},
            follow_redirects=True,
        )
    return _client

async def close_http_client() -> None:
    """Closes the global HTTP client on application shutdown."""
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None

# Dependency for FastAPI
async def get_client_dependency() -> AsyncGenerator[httpx.AsyncClient, None]:
    yield get_http_client()
