"""
Base Provider Interface

Every external data source must implement this abstract base class.
"""

from abc import ABC, abstractmethod
import httpx
from typing import Any
from app.research.models import Paper

class BaseProvider(ABC):
    """
    Abstract interface for all research data providers (OpenAlex, arXiv, etc).
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """The canonical name of the provider (e.g. 'openalex')."""
        pass

    @abstractmethod
    async def search(self, query: str, limit: int, client: httpx.AsyncClient) -> list[Paper]:
        """
        Execute a search query against the provider's API.
        
        Args:
            query: The search string (e.g., "protein folding").
            limit: Maximum number of results to return.
            client: The shared httpx async client for making requests.
            
        Returns:
            A list of fully normalized Paper domain models.
            
        Raises:
            ProviderError: If the API fails.
        """
        pass
