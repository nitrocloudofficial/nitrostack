"""
Provider Registry

Maintains the list of active research providers and dispatches queries to them.
"""

import asyncio
import logging
from typing import List

from app.core.http_client import get_http_client
from app.research.provider import BaseProvider
from app.research.models import Paper
from app.research.providers.openalex import OpenAlexProvider
from app.research.providers.arxiv import ArxivProvider
from app.research.providers.crossref import CrossrefProvider

logger = logging.getLogger(__name__)

class ProviderRegistry:
    def __init__(self):
        self._providers: List[BaseProvider] = [
            OpenAlexProvider(),
            ArxivProvider(),
            CrossrefProvider(),
        ]
        
    def get_providers(self, source_filter: str | None = None) -> List[BaseProvider]:
        """
        Returns active providers, optionally filtered by source name.
        """
        if source_filter:
            filtered = [p for p in self._providers if p.name.lower() == source_filter.lower()]
            if not filtered:
                logger.warning(f"Requested provider '{source_filter}' not found.")
            return filtered
        return self._providers

    async def search_all(self, query: str, limit_per_provider: int, source_filter: str | None = None) -> List[Paper]:
        """
        Executes a search query concurrently across all registered (and filtered) providers.
        """
        providers = self.get_providers(source_filter)
        if not providers:
            return []
            
        client = get_http_client()
        
        # Create tasks for all providers
        tasks = [
            provider.search(query, limit_per_provider, client)
            for provider in providers
        ]
        
        # Execute concurrently; return_exceptions=True prevents one failed provider from failing all
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_papers = []
        for provider, result in zip(providers, results):
            if isinstance(result, Exception):
                logger.error(f"Provider {provider.name} failed: {result}")
            elif isinstance(result, list):
                all_papers.extend(result)
                
        return all_papers

# Singleton registry instance
registry = ProviderRegistry()
