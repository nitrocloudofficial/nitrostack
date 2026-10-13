import httpx
from typing import List
from ..models import Paper
from .base import BaseProvider

class EuropePMCProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "Europe PMC"

    def _parse_paper(self, item: dict) -> Paper:
        authors = item.get('authorString', '').split(', ') if item.get('authorString') else []
        
        affiliations = []
        author_list = item.get('authorList', {}).get('author', [])
        for author in author_list:
            affil = author.get('affiliation')
            if affil:
                affiliations.append(affil)
                
        pub_year = item.get('pubYear')
        if pub_year:
            pub_year = int(pub_year)
            
        pdf_url = None
        for link in item.get('fullTextUrlList', {}).get('fullTextUrl', []):
            if link.get('documentStyle') == 'pdf':
                pdf_url = link.get('url')
                break
                
        return Paper(
            id=item.get('id', ''),
            title=item.get('title', 'Unknown Title'),
            abstract=item.get('abstractText'),
            authors=authors,
            affiliations=list(set(affiliations)),
            doi=item.get('doi'),
            venue=item.get('journalTitle'),
            journal=item.get('journalTitle'),
            publication_year=pub_year,
            citation_count=item.get('citedByCount', 0),
            url=f"https://europepmc.org/article/MED/{item.get('id')}",
            pdf_url=pdf_url,
            keywords=item.get('keywordList', {}).get('keyword', []),
            source_provider=self.name
        )

    async def _fetch(self, query: str) -> List[Paper]:
        url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
        params = {
            "query": query,
            "format": "json",
            "resultType": "core",
            "pageSize": 10
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=10.0)
                response.raise_for_status()
                data = response.json()
                return [self._parse_paper(item) for item in data.get('resultList', {}).get('result', [])]
            except Exception:
                return []

    async def search(self, query: str) -> List[Paper]:
        return await self._fetch(query)

    async def search_by_author(self, author_name: str) -> List[Paper]:
        return await self._fetch(f"AUTHOR:\"{author_name}\"")

    async def search_by_doi(self, doi: str) -> List[Paper]:
        return await self._fetch(f"DOI:{doi}")
