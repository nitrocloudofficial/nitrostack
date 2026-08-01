"""
RemitWise AI – Base LLM Provider
=================================
Abstract interface for LLM provider adapters.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional


class BaseLLMProvider(ABC):
    """
    Abstract interface for LLM completion services.
    Implementations handle communications with specific LLM providers/backends
    (OpenAI, Azure OpenAI, OpenRouter, Groq, Together AI, Ollama, Mock, etc.).
    """

    @property
    def provider_name(self) -> str:
        """Return the identifier for this provider adapter ('ollama', 'mock', 'openai', etc.)."""
        return "base"

    @abstractmethod
    def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate completion text for a prompt and optional system prompt.

        Parameters
        ----------
        prompt : str
            User query / input prompt text.
        system_prompt : str, optional
            System prompt instructions.

        Returns
        -------
        str
            Raw output string returned by the provider.
        """
        pass
