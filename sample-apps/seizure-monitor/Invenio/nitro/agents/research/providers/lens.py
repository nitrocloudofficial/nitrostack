import os
import httpx
from typing import List
from ..models import Paper
from .base import BaseProvider

class LensProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "Lens.org"

    def _parse_paper(self, item: dict) -> Paper:
        authors = [a.get('first_name', '') + ' ' + a.get('last_name', '') for a in item.get('authors', [])]
        authors = [a.strip() for a in authors if a.strip()]
        
        doi = None
        for ext_id in item.get('external_ids', []):
            if ext_id.get('type') == 'doi':
                doi = ext_id.get('value')
                break

        venue = item.get('source', {}).get('title')
        
        return Paper(
            id=item.get('lens_id', ''),
            title=item.get('title', 'Unknown Title'),
            abstract=item.get('abstract'),
            authors=authors,
            affiliations=[],
            doi=doi,
            venue=venue,
            journal=venue,
            publication_year=item.get('year_published'),
            citation_count=item.get('scholarly_citation_count', 0),
            url=f"https://www.lens.org/lens/scholar/article/{item.get('lens_id')}" if item.get('lens_id') else None,
            pdf_url=None,
            keywords=item.get('fields_of_study', []),
            source_provider=self.name
        )

    async def _fetch(self, query_body: dict) -> List[Paper]:
        token = os.environ.get("LENS_TOKEN")
        if not token:
            return []

        url = "https://api.lens.org/scholarly/search"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=query_body, headers=headers, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return [self._parse_paper(item) for item in data.get('data', [])]
            except Exception:
                return []

    async def search(self, query: str) -> List[Paper]:
        body = {
            "query": {
                "match": {
                    "title": query
                }
            },
            "size": 10
        }
        return await self._fetch(body)

    async def search_by_author(self, author_name: str) -> List[Paper]:
        body = {
            "query": {
                "match": {
                    "author.name": author_name
                }
            },
            "size": 10
        }
        return await self._fetch(body)

    async def search_by_doi(self, doi: str) -> List[Paper]:
        body = {
            "query": {
                "match": {
                    "external_ids.value": doi
                }
            },
            "size": 1
        }
        return await self._fetch(body)
