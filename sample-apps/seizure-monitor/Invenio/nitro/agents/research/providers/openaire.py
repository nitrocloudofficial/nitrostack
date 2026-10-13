import httpx
from typing import List
from ..models import Paper
from .base import BaseProvider

class OpenAIREProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "OpenAIRE"

    def _parse_paper(self, item: dict) -> Paper:
        metadata = item.get('metadata', {}).get('oaf:entity', {}).get('oaf:result', {})
        
        # Handle single vs list
        def _to_list(val):
            if val is None: return []
            return val if isinstance(val, list) else [val]
            
        authors = []
        creator_entries = _to_list(metadata.get('creator', []))
        for creator in creator_entries:
            if isinstance(creator, dict) and '$' in creator:
                authors.append(creator['$'])
            elif isinstance(creator, str):
                authors.append(creator)

        titles = _to_list(metadata.get('title', []))
        title = "Unknown Title"
        for t in titles:
            if isinstance(t, dict) and t.get('@classid') == 'main title':
                title = t.get('$', title)
            elif isinstance(t, str):
                title = t
                
        descriptions = _to_list(metadata.get('description', []))
        abstract = descriptions[0] if descriptions else None
        if isinstance(abstract, dict):
            abstract = abstract.get('$')
            
        pid_entries = _to_list(metadata.get('pid', []))
        doi = None
        for pid in pid_entries:
            if isinstance(pid, dict) and pid.get('@classid') == 'doi':
                doi = pid.get('$')
                
        date_entries = _to_list(metadata.get('dateofacceptance', []))
        pub_year = None
        if date_entries:
            date_str = date_entries[0].get('$') if isinstance(date_entries[0], dict) else date_entries[0]
            if date_str and len(date_str) >= 4:
                pub_year = int(date_str[:4])
                
        return Paper(
            id=item.get('header', {}).get('dri:objIdentifier', ''),
            title=title,
            abstract=abstract,
            authors=authors,
            affiliations=[],
            doi=doi,
            venue=None,
            journal=None,
            publication_year=pub_year,
            citation_count=0,
            url=None,
            pdf_url=None,
            keywords=[],
            source_provider=self.name
        )

    async def _fetch(self, params: dict) -> List[Paper]:
        url = "http://api.openaire.eu/search/publications"
        params['format'] = 'json'
        params['size'] = 10
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                results = data.get('response', {}).get('results', {}).get('result', [])
                if isinstance(results, dict):
                    results = [results]
                return [self._parse_paper(item) for item in results]
            except Exception:
                return []

    async def search(self, query: str) -> List[Paper]:
        return await self._fetch({"title": query})

    async def search_by_author(self, author_name: str) -> List[Paper]:
        return await self._fetch({"author": author_name})

    async def search_by_doi(self, doi: str) -> List[Paper]:
        return await self._fetch({"doi": doi})
