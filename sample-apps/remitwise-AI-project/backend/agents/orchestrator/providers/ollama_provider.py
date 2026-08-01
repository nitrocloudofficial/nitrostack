"""
RemitWise AI – Ollama LLM Provider
===================================
Provider implementation for local Ollama instances (e.g. http://localhost:11434).
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Optional

from config import settings
from agents.orchestrator.providers.base_provider import BaseLLMProvider
from agents.shared.logger import AgentLogger

logger = AgentLogger("OllamaProvider")


class OllamaProvider(BaseLLMProvider):
    """
    LLM provider for local Ollama servers via /api/generate REST API.
    """

    def __init__(
        self,
        host: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.host = (host or settings.OLLAMA_HOST).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout if timeout is not None else settings.LLM_TIMEOUT

    @property
    def provider_name(self) -> str:
        return "ollama"

    def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Send a completion request to local Ollama API.
        """
        logger.info("Trying Ollama...")
        endpoint = f"{self.host}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        data = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "User-Agent": settings.USER_AGENT,
        }

        req = urllib.request.Request(endpoint, data=data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                resp_bytes = resp.read()
                resp_json = json.loads(resp_bytes.decode("utf-8"))

            response_text = resp_json.get("response", "")
            logger.info("Connected.")
            return response_text.strip()

        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="ignore")
            logger.warning(f"Ollama unavailable (HTTP {exc.code}: {err_body}).")
            raise RuntimeError(f"Ollama unavailable (HTTP {exc.code})") from exc
        except urllib.error.URLError as exc:
            logger.warning(f"Ollama unavailable ({exc.reason}).")
            raise RuntimeError(f"Ollama unavailable ({exc.reason})") from exc
        except Exception as exc:
            logger.warning(f"Ollama unavailable ({exc}).")
            raise RuntimeError(f"Ollama completion failed: {exc}") from exc
