"""Small client for the model gateway already configured in NitroCloud.

The paired NitroChat deployment keeps the gateway credential server-side. This
backend calls the deployed chat endpoint, so no provider API key is stored in
the ForgeOps repository or sent to the browser.
"""

from __future__ import annotations

import ast
from dataclasses import dataclass
import json
import re
import time
from typing import Any

import httpx

from backend.config import (
    FORGEOPS_MODEL,
    HTTP_TIMEOUT_SECONDS,
    LIVE_AGENTS_ENABLED,
    NITROCHAT_CHAT_URL,
)


@dataclass
class LLMCallResult:
    data: dict[str, Any]
    content: str
    latency_ms: int
    model: str
    live: bool
    error: str | None = None
    attempts: int = 1


def _parse_json_object(content: str) -> dict[str, Any]:
    text = content.strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fenced:
        text = fenced.group(1).strip()

    candidates = [text]
    decoder = json.JSONDecoder()
    for match in re.finditer(r"\{", text):
        try:
            parsed, _ = decoder.raw_decode(text[match.start() :])
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        candidates.append(text[start : end + 1])

    for candidate in candidates:
        repaired = re.sub(r",\s*([}\]])", r"\1", candidate)
        try:
            parsed = json.loads(repaired)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            pass

        try:
            parsed = ast.literal_eval(repaired)
            if isinstance(parsed, dict):
                return parsed
        except (SyntaxError, ValueError):
            pass

    raise ValueError("The model response did not contain a JSON object")


class NitroChatClient:
    """Runs one isolated LLM call for a named agent role."""

    def __init__(
        self,
        endpoint: str = NITROCHAT_CHAT_URL,
        model: str = FORGEOPS_MODEL,
        enabled: bool = LIVE_AGENTS_ENABLED,
        timeout: float = HTTP_TIMEOUT_SECONDS,
        max_attempts: int = 2,
    ) -> None:
        self.endpoint = endpoint
        self.model = model
        self.enabled = enabled
        self.timeout = timeout
        self.max_attempts = max(1, max_attempts)

    def complete_json(
        self,
        *,
        agent: str,
        system_prompt: str,
        payload: dict[str, Any],
    ) -> LLMCallResult:
        if not self.enabled:
            return LLMCallResult(
                data={},
                content="",
                latency_ms=0,
                model=self.model,
                live=False,
                error="Live agents are disabled by FORGEOPS_LIVE_AGENTS",
                attempts=0,
            )

        start = time.perf_counter()
        last_error: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                response = httpx.post(
                    self.endpoint,
                    json={
                        "messages": [
                            {
                                "role": "user",
                                "content": (
                                    f"For the ForgeOps manufacturing investigation, act as the "
                                    f"{agent} Agent. {system_prompt}\n"
                                    "Return exactly one valid JSON object with double-quoted keys "
                                    "and no prose outside the object. "
                                    f"Investigation input: {json.dumps(payload, ensure_ascii=False)}"
                                ),
                            },
                        ],
                        "stream": False,
                    },
                    timeout=self.timeout,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                envelope = response.json()
                content = envelope.get("message", {}).get("content", "")
                if isinstance(content, list):
                    content = "".join(
                        str(item.get("text", ""))
                        for item in content
                        if isinstance(item, dict)
                    )
                if not isinstance(content, str) or not content.strip():
                    raise ValueError("NitroChat returned an empty assistant message")

                return LLMCallResult(
                    data=_parse_json_object(content),
                    content=content,
                    latency_ms=round((time.perf_counter() - start) * 1000),
                    model=self.model,
                    live=True,
                    attempts=attempt,
                )
            except Exception as exc:
                last_error = exc
                if attempt < self.max_attempts:
                    time.sleep(0.25 * attempt)

        return LLMCallResult(
            data={},
            content="",
            latency_ms=round((time.perf_counter() - start) * 1000),
            model=self.model,
            live=False,
            error=str(last_error) if last_error else "NitroChat request failed",
            attempts=self.max_attempts,
        )
