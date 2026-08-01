"""
RemitWise AI – LLM Provider Factory
====================================
"""

from __future__ import annotations

from typing import Optional

from config import settings
from agents.orchestrator.providers.base_provider import BaseLLMProvider
from agents.orchestrator.providers.openai_provider import OpenAIProvider
from agents.orchestrator.providers.ollama_provider import OllamaProvider
from agents.orchestrator.providers.mock_provider import MockProvider


def get_llm_provider(provider_name: Optional[str] = None) -> BaseLLMProvider:
    """
    Factory function to obtain an instance of BaseLLMProvider.

    Parameters
    ----------
    provider_name : str, optional
        Provider type override ('openai', 'ollama', 'mock').
        If None, reads from `settings.LLM_PROVIDER`.

    Returns
    -------
    BaseLLMProvider
    """
    p_name = (provider_name or settings.LLM_PROVIDER or "mock").lower()

    if p_name in ("openai", "azure", "groq", "openrouter", "together"):
        return OpenAIProvider()
    elif p_name == "ollama":
        return OllamaProvider()
    elif p_name == "mock":
        return MockProvider()
    else:
        # Default fallback
        if settings.OPENAI_API_KEY:
            return OpenAIProvider()
        return MockProvider()


__all__ = [
    "BaseLLMProvider",
    "OpenAIProvider",
    "OllamaProvider",
    "MockProvider",
    "get_llm_provider",
]
