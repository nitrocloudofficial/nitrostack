"""Runtime configuration for the ForgeOps agent backend."""

from __future__ import annotations

import os


DEFAULT_NITROCHAT_URL = (
    "https://nitrochat-zenops-chat-6a64-zen-net-amrita-university-coimbatore"
    ".app.nitrocloud.ai"
)
DEFAULT_MCP_URL = (
    "https://zenops-6a649dab-zen-net-amrita-university-coimbatore"
    ".app.nitrocloud.ai/mcp"
)
DEFAULT_MODEL = "google/gemini-3.5-flash-lite"


def _as_bool(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


NITROCHAT_BASE_URL = os.getenv(
    "NITROCHAT_BASE_URL",
    DEFAULT_NITROCHAT_URL,
).rstrip("/")
NITROCHAT_CHAT_URL = f"{NITROCHAT_BASE_URL}/api/chat"
FORGEOPS_MCP_URL = os.getenv("FORGEOPS_MCP_URL", DEFAULT_MCP_URL).rstrip("/")
FORGEOPS_MODEL = os.getenv("FORGEOPS_MODEL", DEFAULT_MODEL)
LIVE_AGENTS_ENABLED = _as_bool(os.getenv("FORGEOPS_LIVE_AGENTS"), default=True)
HTTP_TIMEOUT_SECONDS = float(os.getenv("FORGEOPS_HTTP_TIMEOUT_SECONDS", "45"))

