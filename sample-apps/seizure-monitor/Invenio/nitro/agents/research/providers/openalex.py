import httpx
import asyncio
from typing import List
from ..models import Paper
from .base import BaseProvider

class OpenAlexProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "OpenAlex"

    def _parse_paper(self, item: dict) -> Paper:
        authors = [a.get('author', {}).get('display_name', '') for a in item.get('authorships', [])]
        affiliations = []
        for a in item.get('authorships', []):
            for inst in a.get('institutions', []):
                if inst.get('display_name'):
                    affiliations.append(inst.get('display_name'))
                    
        doi = item.get('doi', '').replace('https://doi.org/', '') if item.get('doi') else None
        
        venue = item.get('primary_location', {}).get('source', {})
        venue_name = venue.get('display_name') if venue else None
        
        pdf_url = item.get('open_access', {}).get('oa_url')
        
        return Paper(
            id=item.get('id', ''),
            title=item.get('title', 'Unknown Title') or 'Unknown Title',
            abstract=None, # Abstract is inverted dict in API, setting None to pass Pydantic string validation
            authors=authors,
            affiliations=list(set(affiliations)),
            doi=doi,
            venue=venue_name,
            publication_year=item.get('publication_year'),
            citation_count=item.get('cited_by_count', 0),
            url=item.get('id'),
            pdf_url=pdf_url,
            keywords=[],
            source_provider=self.name
        )

    async def _fetch(self, url: str, params: dict = None) -> dict:
        async with httpx.AsyncClient() as client:
            # OpenAlex polite pool
            if params is None:
                params = {}
            params['mailto'] = 'invenio.research@example.com'
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()

    async def search(self, query: str) -> List[Paper]:
        url = "https://api.openalex.org/works"
        params = {
            "search": query,
            "per-page": 10
        }
        data = await self._fetch(url, params)
        return [self._parse_paper(item) for item in data.get('results', [])]

    async def search_by_author(self, author_name: str) -> List[Paper]:
        # Simple search for author
        url = "https://api.openalex.org/works"
        params = {
            "search": author_name,
            "per-page": 10
        }
        data = await self._fetch(url, params)
        return [self._parse_paper(item) for item in data.get('results', [])]

    async def search_by_doi(self, doi: str) -> List[Paper]:
        url = f"https://api.openalex.org/works/https://doi.org/{doi}"
        try:
            data = await self._fetch(url)
            return [self._parse_paper(data)]
        except Exception:
            return []
