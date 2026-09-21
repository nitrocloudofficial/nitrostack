"""Session-aware client for the deployed ForgeOps Streamable HTTP MCP server."""

from __future__ import annotations

import json
import time
from typing import Any

import httpx

from backend.config import FORGEOPS_MCP_URL, HTTP_TIMEOUT_SECONDS


def _decode_mcp_response(response: httpx.Response) -> dict[str, Any]:
    content_type = response.headers.get("content-type", "")
    if "text/event-stream" not in content_type:
        payload = response.json()
        return payload if isinstance(payload, dict) else {"result": payload}

    messages: list[dict[str, Any]] = []
    for line in response.text.splitlines():
        if not line.startswith("data:"):
            continue
        raw = line.removeprefix("data:").strip()
        if not raw or raw == "[DONE]":
            continue
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            messages.append(parsed)

    if not messages:
        raise ValueError("MCP server returned an empty event stream")
    return messages[-1]


def _content_value(result: dict[str, Any]) -> Any:
    blocks = result.get("content", [])
    if not isinstance(blocks, list) or not blocks:
        return result

    text_blocks = [
        block.get("text", "")
        for block in blocks
        if isinstance(block, dict) and block.get("type") == "text"
    ]
    if not text_blocks:
        return result

    text = "\n".join(str(value) for value in text_blocks).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text


class NitroMCPClient:
    def __init__(
        self,
        endpoint: str = FORGEOPS_MCP_URL,
        timeout: float = HTTP_TIMEOUT_SECONDS,
    ) -> None:
        self.endpoint = endpoint
        self.timeout = timeout
        self.session_id: str | None = None
        self._request_id = 0
        self._client = httpx.Client(timeout=timeout)

    def __enter__(self) -> "NitroMCPClient":
        self.initialize()
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    def _headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/json, text/event-stream",
            "MCP-Protocol-Version": "2025-06-18",
            "Content-Type": "application/json",
        }
        if self.session_id:
            headers["Mcp-Session-Id"] = self.session_id
        return headers

    def _post(
        self,
        method: str,
        params: dict[str, Any] | None = None,
        *,
        notification: bool = False,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params or {},
        }
        if not notification:
            self._request_id += 1
            payload["id"] = self._request_id

        response = self._client.post(
            self.endpoint,
            headers=self._headers(),
            json=payload,
        )
        response.raise_for_status()
        if notification and response.status_code == 202:
            return {}

        decoded = _decode_mcp_response(response)
        if "error" in decoded:
            message = decoded["error"].get("message", "Unknown MCP error")
            raise RuntimeError(message)
        return decoded

    def initialize(self) -> dict[str, Any]:
        if self.session_id:
            return {"session_id": self.session_id}

        self._request_id += 1
        response = self._client.post(
            self.endpoint,
            headers=self._headers(),
            json={
                "jsonrpc": "2.0",
                "id": self._request_id,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-06-18",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "forgeops-agent-backend",
                        "version": "2.0.0",
                    },
                },
            },
        )
        response.raise_for_status()
        self.session_id = response.headers.get("mcp-session-id")
        if not self.session_id:
            raise RuntimeError("MCP server did not return a session ID")

        decoded = _decode_mcp_response(response)
        self._post("notifications/initialized", {}, notification=True)
        return decoded.get("result", {})

    def list_tools(self) -> list[dict[str, Any]]:
        self.initialize()
        decoded = self._post("tools/list")
        tools = decoded.get("result", {}).get("tools", [])
        return tools if isinstance(tools, list) else []

    def call_tool(
        self,
        name: str,
        arguments: dict[str, Any] | None = None,
    ) -> tuple[Any, dict[str, Any]]:
        self.initialize()
        start = time.perf_counter()
        try:
            decoded = self._post(
                "tools/call",
                {"name": name, "arguments": arguments or {}},
            )
            result = decoded.get("result", {})
            value = _content_value(result)
            record_ids: list[str] = []
            if isinstance(value, dict):
                record_id = value.get("record_id")
                if record_id:
                    record_ids.append(str(record_id))
            return value, {
                "id": f"mcp-{self._request_id}",
                "server": "NitroCloud MCP",
                "tool": name,
                "status": "complete",
                "durationMs": round((time.perf_counter() - start) * 1000),
                "records": record_ids,
            }
        except Exception as exc:
            return {"error": str(exc)}, {
                "id": f"mcp-{self._request_id}",
                "server": "NitroCloud MCP",
                "tool": name,
                "status": "error",
                "durationMs": round((time.perf_counter() - start) * 1000),
                "records": [],
                "error": str(exc),
            }

