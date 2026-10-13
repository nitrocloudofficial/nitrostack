"""
Crossref API Provider.
Fetches and normalizes papers from Crossref.
"""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import date
import logging

from app.research.provider import BaseProvider
from app.research.models import Paper, Author
from app.research.exceptions import ProviderError
from app.core.config import settings

logger = logging.getLogger(__name__)

class CrossrefProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "crossref"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=True,
    )
    async def search(self, query: str, limit: int, client: httpx.AsyncClient) -> list[Paper]:
        params = {
            "query": query,
            "rows": limit,
            "mailto": settings.CROSSREF_MAILTO,
            "select": "DOI,title,abstract,author,published-print,published-online,is-referenced-by-count,container-title,URL,subject,language"
        }
        
        url = f"{settings.CROSSREF_BASE_URL}/works"
        
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            items = data.get("message", {}).get("items", [])
            papers = []
            for item in items:
                try:
                    papers.append(self._normalize(item))
                except Exception as e:
                    logger.warning(f"Failed to normalize Crossref work {item.get('DOI')}: {e}")
            return papers
            
        except httpx.HTTPStatusError as e:
            raise ProviderError(self.name, f"HTTP {e.response.status_code}", e.response.status_code)
        except httpx.RequestError as e:
            raise ProviderError(self.name, f"Request failed: {str(e)}")

    def _normalize(self, data: dict) -> Paper:
        doi = data.get("DOI", "")
        
        titles = data.get("title", [])
        title = titles[0] if titles else "Untitled"
        
        # Crossref abstracts often include JATS XML tags, we'll do a simple cleanup if needed
        # but for Phase 2 we take it as-is or strip basic tags
        raw_abstract = data.get("abstract", "")
        abstract = raw_abstract.replace("<jats:p>", "").replace("</jats:p>", "").strip()
        
        # Authors
        authors = []
        for author_data in data.get("author", []):
            given = author_data.get("given", "")
            family = author_data.get("family", "")
            name = f"{given} {family}".strip()
            if name:
                authors.append(Author(
                    name=name,
                    orcid=author_data.get("ORCID", "").replace("http://orcid.org/", "")
                ))
                
        # Publication dates
        pub_dates = data.get("published-print", {}) or data.get("published-online", {})
        date_parts = pub_dates.get("date-parts", [[]])[0]
        
        year = date_parts[0] if len(date_parts) > 0 else None
        month = date_parts[1] if len(date_parts) > 1 else 1
        day = date_parts[2] if len(date_parts) > 2 else 1
        
        published_at = None
        if year:
            try:
                published_at = date(year, month, day)
            except ValueError:
                pass
                
        # Journal / Container
        containers = data.get("container-title", [])
        journal = containers[0] if containers else None
        
        keywords = data.get("subject", [])
        
        return Paper(
            id=f"{self.name}:{doi}",
            provider_id=doi,
            title=title,
            abstract=abstract,
            authors=authors,
            journal=journal,
            year=year,
            doi=doi,
            url=data.get("URL", f"https://doi.org/{doi}"),
            pdf_url=None, # Crossref rarely provides direct PDF links
            citation_count=data.get("is-referenced-by-count", 0),
            keywords=keywords,
            source=self.name,
            license=None,
            language=data.get("language"),
            published_at=published_at,
            updated_at=None,
        )
