import httpx
from typing import List
from ..models import Paper
from .base import BaseProvider

class DOAJProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "DOAJ"

    def _parse_paper(self, item: dict) -> Paper:
        bibjson = item.get('bibjson', {})
        authors = [a.get('name', '') for a in bibjson.get('author', [])]
        
        doi = None
        for ident in bibjson.get('identifier', []):
            if ident.get('type') == 'doi':
                doi = ident.get('id')
                break

        url = None
        for link in bibjson.get('link', []):
            if link.get('type') == 'fulltext':
                url = link.get('url')
                break

        return Paper(
            id=item.get('id', ''),
            title=bibjson.get('title', 'Unknown Title'),
            abstract=bibjson.get('abstract'),
            authors=authors,
            affiliations=[],
            doi=doi,
            venue=bibjson.get('journal', {}).get('title'),
            journal=bibjson.get('journal', {}).get('title'),
            publication_year=bibjson.get('year'),
            citation_count=0,
            url=url,
            pdf_url=url if url and url.endswith('.pdf') else None,
            keywords=bibjson.get('keywords', []),
            source_provider=self.name
        )

    async def _fetch(self, query: str) -> List[Paper]:
        url = f"https://doaj.org/api/search/articles/{query}"
        params = {
            "page": 1,
            "pageSize": 10
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return [self._parse_paper(item) for item in data.get('results', [])]
            except Exception:
                return []

    async def search(self, query: str) -> List[Paper]:
        return await self._fetch(query)

    async def search_by_author(self, author_name: str) -> List[Paper]:
        return await self._fetch(f"author:\"{author_name}\"")

    async def search_by_doi(self, doi: str) -> List[Paper]:
        return await self._fetch(f"doi:\"{doi}\"")
