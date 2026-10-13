"""
RemitWise AI – OpenAI-Compatible LLM Provider
==============================================
Supports OpenAI, Azure OpenAI, OpenRouter, Groq, Together AI, and any
OpenAI-compatible /v1/chat/completions endpoint using standard library urllib.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Optional

from config import settings
from agents.orchestrator.providers.base_provider import BaseLLMProvider
from agents.shared.logger import AgentLogger

logger = AgentLogger("OpenAIProvider")


class OpenAIProvider(BaseLLMProvider):
    """
    LLM provider for OpenAI and OpenAI-compatible Chat Completions REST APIs.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.api_key = api_key if api_key is not None else settings.OPENAI_API_KEY
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
        self.model = model or settings.OPENAI_MODEL
        self.temperature = temperature if temperature is not None else settings.LLM_TEMPERATURE
        self.max_tokens = max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS
        self.timeout = timeout if timeout is not None else settings.LLM_TIMEOUT

    @property
    def provider_name(self) -> str:
        return "openai"

    def _get_endpoint_url(self) -> str:
        if self.base_url.endswith("/chat/completions"):
            return self.base_url
        return f"{self.base_url}/chat/completions"

    def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Send a chat completion request to the OpenAI-compatible endpoint.
        """
        endpoint_url = self._get_endpoint_url()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

        data = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "User-Agent": settings.USER_AGENT,
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        req = urllib.request.Request(endpoint_url, data=data, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                resp_bytes = resp.read()
                resp_json = json.loads(resp_bytes.decode("utf-8"))

            choices = resp_json.get("choices", [])
            if not choices:
                raise ValueError("No choices returned from OpenAI completion API")

            content = choices[0].get("message", {}).get("content", "")
            return content.strip()

        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="ignore")
            logger.error(f"OpenAI API HTTP error {exc.code}: {err_body}")
            raise RuntimeError(f"OpenAI API HTTP error {exc.code}: {err_body}") from exc
        except urllib.error.URLError as exc:
            logger.error(f"OpenAI API connection error: {exc.reason}")
            raise RuntimeError(f"OpenAI API connection error: {exc.reason}") from exc
        except Exception as exc:
            logger.error(f"OpenAI completion failed: {exc}")
            raise RuntimeError(f"OpenAI completion failed: {exc}") from exc
