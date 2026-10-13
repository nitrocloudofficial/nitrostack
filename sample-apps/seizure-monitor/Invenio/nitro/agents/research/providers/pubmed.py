import httpx
import asyncio
from typing import List
from ..models import Paper
from .base import BaseProvider

class PubMedProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "PubMed"

    def _parse_paper(self, item: dict) -> Paper:
        authors = [a.get('name', '') for a in item.get('authors', [])]
        
        doi = None
        for aid in item.get('articleids', []):
            if aid.get('idtype') == 'doi':
                doi = aid.get('value')
                break
                
        pub_date = item.get('pubdate', '')
        pub_year = int(pub_date[:4]) if pub_date and pub_date[:4].isdigit() else None
        
        return Paper(
            id=item.get('uid', ''),
            title=item.get('title', 'Unknown Title'),
            abstract=None, # eSummary does not return abstract, requires eFetch XML parsing. Keeping it None for performance.
            authors=authors,
            affiliations=[],
            doi=doi,
            venue=item.get('source'),
            journal=item.get('fulljournalname'),
            publication_year=pub_year,
            citation_count=0,
            url=f"https://pubmed.ncbi.nlm.nih.gov/{item.get('uid')}/",
            pdf_url=None,
            keywords=[],
            source_provider=self.name
        )

    async def search(self, query: str) -> List[Paper]:
        return await self._execute_search(f"{query}")

    async def search_by_author(self, author_name: str) -> List[Paper]:
        return await self._execute_search(f"{author_name}[Author]")

    async def search_by_doi(self, doi: str) -> List[Paper]:
        return await self._execute_search(f"{doi}[DOI]")

    async def _execute_search(self, term: str) -> List[Paper]:
        async with httpx.AsyncClient() as client:
            # Step 1: Search for IDs
            search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            search_params = {
                "db": "pubmed",
                "term": term,
                "retmode": "json",
                "retmax": 10
            }
            try:
                search_res = await client.get(search_url, params=search_params, timeout=10.0)
                search_res.raise_for_status()
                search_data = search_res.json()
                id_list = search_data.get('esearchresult', {}).get('idlist', [])
                
                if not id_list:
                    return []
                    
                # Step 2: Fetch summaries
                summary_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
                summary_params = {
                    "db": "pubmed",
                    "id": ",".join(id_list),
                    "retmode": "json"
                }
                summary_res = await client.get(summary_url, params=summary_params, timeout=10.0)
                summary_res.raise_for_status()
                summary_data = summary_res.json()
                
                result = summary_data.get('result', {})
                papers = []
                for uid in id_list:
                    if uid in result:
                        papers.append(self._parse_paper(result[uid]))
                return papers
            except Exception:
                return []
