"""
arXiv API Provider.
Fetches and normalizes papers from the arXiv public API.
"""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import xml.etree.ElementTree as ET
from dateutil.parser import parse as parse_date
import logging
import urllib.parse

from app.research.provider import BaseProvider
from app.research.models import Paper, Author
from app.research.exceptions import ProviderError
from app.core.config import settings

logger = logging.getLogger(__name__)

class ArxivProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "arxiv"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=4, max=10), # Be gentler with arXiv
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=True,
    )
    async def search(self, query: str, limit: int, client: httpx.AsyncClient) -> list[Paper]:
        # arXiv uses a specific query syntax. We do a simple all-fields query.
        encoded_query = urllib.parse.quote(query)
        url = f"{settings.ARXIV_BASE_URL}/query?search_query=all:{encoded_query}&start=0&max_results={limit}"
        
        try:
            response = await client.get(url)
            response.raise_for_status()
            
            # arXiv returns Atom XML
            root = ET.fromstring(response.text)
            
            # Atom namespace
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            
            papers = []
            for entry in root.findall('atom:entry', ns):
                try:
                    papers.append(self._normalize(entry, ns))
                except Exception as e:
                    logger.warning(f"Failed to normalize arXiv entry: {e}")
                    
            return papers
            
        except httpx.HTTPStatusError as e:
            raise ProviderError(self.name, f"HTTP {e.response.status_code}", e.response.status_code)
        except httpx.RequestError as e:
            raise ProviderError(self.name, f"Request failed: {str(e)}")
        except ET.ParseError as e:
            raise ProviderError(self.name, f"XML Parse failed: {str(e)}")

    def _normalize(self, entry: ET.Element, ns: dict) -> Paper:
        id_el = entry.find('atom:id', ns)
        raw_id = id_el.text if id_el is not None else ""
        # Extract just the ID part, e.g., 'http://arxiv.org/abs/2104.12345v1' -> '2104.12345v1'
        clean_id = raw_id.split('/abs/')[-1] if '/abs/' in raw_id else raw_id
        
        title_el = entry.find('atom:title', ns)
        title = title_el.text.replace('\n', ' ').strip() if title_el is not None else "Untitled"
        
        summary_el = entry.find('atom:summary', ns)
        abstract = summary_el.text.replace('\n', ' ').strip() if summary_el is not None else ""
        
        authors = []
        for author_el in entry.findall('atom:author', ns):
            name_el = author_el.find('atom:name', ns)
            if name_el is not None and name_el.text:
                authors.append(Author(name=name_el.text.strip()))
                
        published_el = entry.find('atom:published', ns)
        published_at = parse_date(published_el.text).date() if published_el is not None and published_el.text else None
        
        updated_el = entry.find('atom:updated', ns)
        updated_at = parse_date(updated_el.text).date() if updated_el is not None and updated_el.text else None
        
        year = published_at.year if published_at else None
        
        # arXiv doesn't reliably provide DOIs, but sometimes it's in an arxiv:doi tag
        # We'll skip for now and use arxiv ID as primary identifier.
        doi = None
        
        pdf_url = None
        for link_el in entry.findall('atom:link', ns):
            if link_el.get('title') == 'pdf':
                pdf_url = link_el.get('href')
                break
                
        # Primary category as keyword
        keywords = []
        category_el = entry.find('atom:category', ns)
        if category_el is not None:
            cat = category_el.get('term')
            if cat:
                keywords.append(cat)
        
        return Paper(
            id=f"{self.name}:{clean_id}",
            provider_id=clean_id,
            title=title,
            abstract=abstract,
            authors=authors,
            journal="arXiv",  # arXiv is a preprint server
            year=year,
            doi=doi,
            url=raw_id,
            pdf_url=pdf_url,
            citation_count=0, # arXiv API doesn't provide citation counts
            keywords=keywords,
            source=self.name,
            license=None,
            language="en", # arXiv is predominantly english
            published_at=published_at,
            updated_at=updated_at,
        )
