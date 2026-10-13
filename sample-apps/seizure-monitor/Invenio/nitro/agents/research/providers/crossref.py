import httpx
import asyncio
from typing import List
from ..models import Paper
from .base import BaseProvider

class CrossrefProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "Crossref"

    def _parse_paper(self, item: dict) -> Paper:
        authors = []
        affiliations = []
        for author in item.get('author', []):
            name = f"{author.get('given', '')} {author.get('family', '')}".strip()
            if name:
                authors.append(name)
            for affil in author.get('affiliation', []):
                if affil.get('name'):
                    affiliations.append(affil.get('name'))
                    
        title_list = item.get('title', [])
        title = title_list[0] if title_list else 'Unknown Title'
        
        container_title = item.get('container-title', [])
        journal = container_title[0] if container_title else None
        
        pub_date = item.get('published-print', {}).get('date-parts', [[None]])[0][0]
        if not pub_date:
            pub_date = item.get('published-online', {}).get('date-parts', [[None]])[0][0]
            
        return Paper(
            id=item.get('DOI', ''),
            title=title,
            abstract=item.get('abstract'), # Often missing in Crossref unless requested
            authors=authors,
            affiliations=list(set(affiliations)),
            doi=item.get('DOI'),
            venue=journal,
            journal=journal,
            publication_year=pub_date,
            citation_count=item.get('is-referenced-by-count', 0),
            url=item.get('URL'),
            pdf_url=item.get('link', [{}])[0].get('URL') if item.get('link') else None,
            keywords=[],
            source_provider=self.name
        )

    async def _fetch(self, url: str, params: dict = None) -> dict:
        async with httpx.AsyncClient() as client:
            if params is None:
                params = {}
            params['mailto'] = 'invenio.research@example.com'
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            return response.json()

    async def search(self, query: str) -> List[Paper]:
        url = "https://api.crossref.org/works"
        params = {
            "query": query,
            "rows": 10
        }
        data = await self._fetch(url, params)
        return [self._parse_paper(item) for item in data.get('message', {}).get('items', [])]

    async def search_by_author(self, author_name: str) -> List[Paper]:
        url = "https://api.crossref.org/works"
        params = {
            "query.author": author_name,
            "rows": 10
        }
        data = await self._fetch(url, params)
        return [self._parse_paper(item) for item in data.get('message', {}).get('items', [])]

    async def search_by_doi(self, doi: str) -> List[Paper]:
        url = f"https://api.crossref.org/works/{doi}"
        try:
            data = await self._fetch(url)
            return [self._parse_paper(data.get('message', {}))]
        except Exception:
            return []
