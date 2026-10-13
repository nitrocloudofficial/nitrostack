import os
import httpx
from typing import List
from ..models import Paper
from .base import BaseProvider

class CoreProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "CORE"

    def _parse_paper(self, item: dict) -> Paper:
        authors = [a.get('name', '') for a in item.get('authors', [])]
        
        doi = None
        identifiers = item.get('identifiers', [])
        for ident in identifiers:
            if ident.startswith('doi:'):
                doi = ident[4:]
                break

        return Paper(
            id=item.get('id', ''),
            title=item.get('title', 'Unknown Title'),
            abstract=item.get('abstract'),
            authors=authors,
            affiliations=[],
            doi=item.get('doi') or doi,
            venue=item.get('publisher'),
            journal=item.get('journals', [None])[0] if item.get('journals') else None,
            publication_year=item.get('yearPublished'),
            citation_count=item.get('citationCount', 0),
            url=item.get('downloadUrl') or item.get('sourceFulltextUrls', [None])[0] if item.get('sourceFulltextUrls') else None,
            pdf_url=item.get('downloadUrl'),
            keywords=[],
            source_provider=self.name
        )

    async def _fetch(self, query: str) -> List[Paper]:
        api_key = os.environ.get("CORE_API_KEY")
        if not api_key:
            return [] # Graceful failure if no API key

        url = "https://api.core.ac.uk/v3/search/works"
        params = {
            "q": query,
            "limit": 10
        }
        headers = {
            "Authorization": f"Bearer {api_key}"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, headers=headers, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return [self._parse_paper(item) for item in data.get('results', [])]
            except Exception:
                return []

    async def search(self, query: str) -> List[Paper]:
        return await self._fetch(query)

    async def search_by_author(self, author_name: str) -> List[Paper]:
        return await self._fetch(f"authors:\"{author_name}\"")

    async def search_by_doi(self, doi: str) -> List[Paper]:
        return await self._fetch(f"doi:\"{doi}\"")
