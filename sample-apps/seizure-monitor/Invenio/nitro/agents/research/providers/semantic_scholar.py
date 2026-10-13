import httpx
import asyncio
from typing import List
from ..models import Paper
from .base import BaseProvider

class SemanticScholarProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "Semantic Scholar"

    def _parse_paper(self, item: dict) -> Paper:
        authors = [a.get('name', '') for a in item.get('authors', [])]
        externalIds = item.get('externalIds', {})
        doi = externalIds.get('DOI')
        
        pdf_url = None
        openAccessPdf = item.get('openAccessPdf')
        if openAccessPdf and isinstance(openAccessPdf, dict):
            pdf_url = openAccessPdf.get('url')

        return Paper(
            id=item.get('paperId', ''),
            title=item.get('title', 'Unknown Title'),
            abstract=item.get('abstract'),
            authors=authors,
            affiliations=[],
            doi=doi,
            venue=item.get('venue'),
            publication_year=item.get('year'),
            citation_count=item.get('citationCount', 0),
            url=item.get('url'),
            pdf_url=pdf_url,
            keywords=[],
            source_provider=self.name
        )

    async def _fetch(self, url: str, params: dict = None) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()

    async def search(self, query: str) -> List[Paper]:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": query,
            "limit": 10,
            "fields": "paperId,title,abstract,authors,year,citationCount,venue,externalIds,url,openAccessPdf"
        }
        data = await self._fetch(url, params)
        return [self._parse_paper(item) for item in data.get('data', [])]

    async def search_by_author(self, author_name: str) -> List[Paper]:
        return await self.search(author_name)

    async def search_by_doi(self, doi: str) -> List[Paper]:
        url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}"
        params = {
            "fields": "paperId,title,abstract,authors,year,citationCount,venue,externalIds,url,openAccessPdf"
        }
        try:
            data = await self._fetch(url, params)
            return [self._parse_paper(data)]
        except Exception:
            return []
