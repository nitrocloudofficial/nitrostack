import httpx
import xml.etree.ElementTree as ET
from typing import List
from ..models import Paper
from .base import BaseProvider

class ArxivProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "arXiv"

    def _parse_feed(self, xml_string: str) -> List[Paper]:
        papers = []
        root = ET.fromstring(xml_string)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        for entry in root.findall('atom:entry', ns):
            paper_id = entry.find('atom:id', ns).text if entry.find('atom:id', ns) is not None else ''
            title = entry.find('atom:title', ns).text.replace('\n', ' ') if entry.find('atom:title', ns) is not None else 'Unknown Title'
            abstract = entry.find('atom:summary', ns).text.replace('\n', ' ') if entry.find('atom:summary', ns) is not None else None
            
            authors = [author.find('atom:name', ns).text for author in entry.findall('atom:author', ns) if author.find('atom:name', ns) is not None]
            
            pub_date = entry.find('atom:published', ns).text if entry.find('atom:published', ns) is not None else None
            pub_year = int(pub_date[:4]) if pub_date else None
            
            pdf_url = paper_id.replace('abs', 'pdf') + '.pdf' if paper_id else None
            
            papers.append(Paper(
                id=paper_id.split('/')[-1] if paper_id else '',
                title=title.strip(),
                abstract=abstract.strip() if abstract else None,
                authors=authors,
                affiliations=[],
                doi=None,
                venue="arXiv",
                journal="arXiv preprint",
                publication_year=pub_year,
                citation_count=0,
                url=paper_id,
                pdf_url=pdf_url,
                keywords=[],
                source_provider=self.name
            ))
        return papers

    async def _fetch(self, url: str, params: dict = None) -> str:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0, follow_redirects=True)
            response.raise_for_status()
            return response.text

    async def search(self, query: str) -> List[Paper]:
        url = "https://export.arxiv.org/api/query"
        params = {
            "search_query": f"all:{query}",
            "start": 0,
            "max_results": 10
        }
        xml_data = await self._fetch(url, params)
        return self._parse_feed(xml_data)

    async def search_by_author(self, author_name: str) -> List[Paper]:
        url = "https://export.arxiv.org/api/query"
        params = {
            "search_query": f"au:{author_name}",
            "start": 0,
            "max_results": 10
        }
        xml_data = await self._fetch(url, params)
        return self._parse_feed(xml_data)

    async def search_by_doi(self, doi: str) -> List[Paper]:
        return [] # arXiv is not primarily DOI searchable via their standard API query
