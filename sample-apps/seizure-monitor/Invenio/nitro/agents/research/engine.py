import time
import asyncio
import difflib
from typing import List, Dict, Any, Tuple
from .models import Paper, ResearchPackage, ProviderStatistics
from .providers import (
    SemanticScholarProvider,
    OpenAlexProvider,
    CrossrefProvider,
    ArxivProvider,
    PubMedProvider,
    EuropePMCProvider,
    CoreProvider,
    DOAJProvider,
    OpenAIREProvider,
    LensProvider
)

class ResearchEngine:
    def __init__(self):
        self.providers = [
            SemanticScholarProvider(),
            OpenAlexProvider(),
            CrossrefProvider(),
            ArxivProvider(),
            PubMedProvider(),
            EuropePMCProvider(),
            CoreProvider(),
            DOAJProvider(),
            OpenAIREProvider(),
            LensProvider()
        ]
        # In-memory simple cache: { query_key: (timestamp, result) }
        self._cache = {}
        self.CACHE_TTL = 900 # 15 minutes in seconds

    def _get_cache(self, key: str) -> Any:
        if key in self._cache:
            timestamp, data = self._cache[key]
            if time.time() - timestamp < self.CACHE_TTL:
                return data
            else:
                del self._cache[key]
        return None

    def _set_cache(self, key: str, data: Any):
        self._cache[key] = (time.time(), data)

    async def _execute_search(self, method_name: str, query: str) -> ResearchPackage:
        cache_key = f"{method_name}:{query}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        start_time = time.time()
        tasks = []
        for provider in self.providers:
            method = getattr(provider, method_name)
            tasks.append(self._safe_provider_call(provider, method, query))

        results = await asyncio.gather(*tasks)

        all_papers = []
        provider_stats = []
        for provider_name, status, error, papers in results:
            provider_stats.append(ProviderStatistics(
                provider_name=provider_name,
                status=status,
                papers_found=len(papers),
                error_message=error
            ))
            all_papers.extend(papers)

        deduplicated, removed_count = self._deduplicate(all_papers)
        ranked = self.rank_results(deduplicated)

        search_time = time.time() - start_time
        package = ResearchPackage(
            query=query,
            papers=ranked,
            provider_statistics=provider_stats,
            duplicates_removed=removed_count,
            search_time=search_time,
            metadata={"source": "Invenio Federated Research Engine"}
        )

        self._set_cache(cache_key, package)
        return package

    async def _safe_provider_call(self, provider, method, query) -> Tuple[str, str, str, List[Paper]]:
        try:
            # We timeout inside the provider usually, but enforce an overarching one here as a failsafe
            papers = await asyncio.wait_for(method(query), timeout=15.0)
            if papers is None:
                papers = []
            return (provider.name, "success", None, papers)
        except asyncio.TimeoutError:
            return (provider.name, "timeout", "Provider took too long to respond", [])
        except Exception as e:
            return (provider.name, "error", str(e), [])

    def _deduplicate(self, papers: List[Paper]) -> Tuple[List[Paper], int]:
        unique_papers = []
        removed = 0
        
        seen_dois = set()
        for p in papers:
            is_duplicate = False
            
            # Check DOI
            if p.doi:
                doi_lower = p.doi.lower().strip()
                if doi_lower in seen_dois:
                    is_duplicate = True
                else:
                    seen_dois.add(doi_lower)
            
            if is_duplicate:
                removed += 1
                continue
                
            # Check Title Similarity against already unique papers
            for up in unique_papers:
                if p.title and up.title:
                    ratio = difflib.SequenceMatcher(None, p.title.lower(), up.title.lower()).ratio()
                    if ratio > 0.85:
                        is_duplicate = True
                        break
            
            if is_duplicate:
                removed += 1
            else:
                unique_papers.append(p)
                
        return unique_papers, removed

    def rank_results(self, papers: List[Paper], criteria: str = "relevance") -> List[Paper]:
        def score(p: Paper) -> float:
            s = 0.0
            # Citation count gives a solid boost
            s += min(p.citation_count, 1000) * 0.1
            # Recency boost
            if p.publication_year:
                s += max(0, p.publication_year - 2000) * 0.5
            # Has abstract
            if p.abstract and len(p.abstract) > 50:
                s += 10.0
            # Has PDF
            if p.pdf_url:
                s += 15.0
            return s

        return sorted(papers, key=score, reverse=True)

    async def search_papers(self, query: str) -> ResearchPackage:
        return await self._execute_search("search", query)

    async def search_author(self, author_name: str) -> ResearchPackage:
        return await self._execute_search("search_by_author", author_name)

    async def search_keyword(self, keyword: str) -> ResearchPackage:
        return await self._execute_search("search", keyword)

    async def search_doi(self, doi: str) -> ResearchPackage:
        return await self._execute_search("search_by_doi", doi)
