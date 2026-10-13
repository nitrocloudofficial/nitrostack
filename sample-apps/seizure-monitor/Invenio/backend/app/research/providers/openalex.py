"""
OpenAlex API Provider.
Fetches and normalizes papers from OpenAlex.
"""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from datetime import date
from dateutil.parser import parse as parse_date
import logging

from app.research.provider import BaseProvider
from app.research.models import Paper, Author, Institution
from app.research.exceptions import ProviderError, NormalizationError
from app.core.config import settings

logger = logging.getLogger(__name__)

class OpenAlexProvider(BaseProvider):
    @property
    def name(self) -> str:
        return "openalex"

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
        reraise=True,
    )
    async def search(self, query: str, limit: int, client: httpx.AsyncClient) -> list[Paper]:
        params = {
            "search": query,
            "per-page": limit,
            "mailto": settings.OPENALEX_EMAIL,
        }
        
        url = f"{settings.OPENALEX_BASE_URL}/works"
        
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = data.get("results", [])
            papers = []
            for item in results:
                try:
                    papers.append(self._normalize(item))
                except Exception as e:
                    logger.warning(f"Failed to normalize OpenAlex work {item.get('id')}: {e}")
            return papers
            
        except httpx.HTTPStatusError as e:
            raise ProviderError(self.name, f"HTTP {e.response.status_code}", e.response.status_code)
        except httpx.RequestError as e:
            raise ProviderError(self.name, f"Request failed: {str(e)}")

    def _normalize(self, data: dict) -> Paper:
        # Extract basic fields
        raw_id = data.get("id", "")
        # Remove 'https://openalex.org/' prefix for clean ID
        clean_id = raw_id.replace("https://openalex.org/", "")
        
        title = data.get("title") or "Untitled"
        
        # OpenAlex uses inverted abstract
        abstract = ""
        inv_abstract = data.get("abstract_inverted_index")
        if inv_abstract:
            # Reconstruct abstract
            max_index = max([max(pos) for pos in inv_abstract.values()]) if inv_abstract else -1
            words = [""] * (max_index + 1)
            for word, positions in inv_abstract.items():
                for pos in positions:
                    words[pos] = word
            abstract = " ".join(words).strip()
            
        # Parse authors
        authors = []
        for authorship in data.get("authorships", []):
            author_data = authorship.get("author", {})
            institutions = []
            for inst in authorship.get("institutions", []):
                institutions.append(Institution(
                    id=inst.get("id"),
                    name=inst.get("display_name", "Unknown Institution"),
                    country_code=inst.get("country_code"),
                    type=inst.get("type"),
                ))
            
            authors.append(Author(
                id=author_data.get("id"),
                name=author_data.get("display_name", "Unknown Author"),
                orcid=author_data.get("orcid"),
                affiliations=institutions,
            ))
            
        # Parse dates
        pub_date_str = data.get("publication_date")
        published_at = parse_date(pub_date_str).date() if pub_date_str else None
        
        up_date_str = data.get("updated_date")
        updated_at = parse_date(up_date_str).date() if up_date_str else None
        
        # Primary location details
        primary_location = data.get("primary_location") or {}
        source_info = primary_location.get("source") or {}
        journal = source_info.get("display_name")
        pdf_url = primary_location.get("pdf_url")
        
        # DOI
        doi = data.get("doi")
        if doi:
            doi = doi.replace("https://doi.org/", "")
            
        # Keywords / Concepts
        concepts = [c.get("display_name") for c in data.get("concepts", []) if c.get("display_name")]
        
        return Paper(
            id=f"{self.name}:{clean_id}",
            provider_id=clean_id,
            title=title,
            abstract=abstract,
            authors=authors,
            journal=journal,
            year=data.get("publication_year"),
            doi=doi,
            url=doi and f"https://doi.org/{doi}" or raw_id,
            pdf_url=pdf_url,
            citation_count=data.get("cited_by_count", 0),
            keywords=concepts,
            source=self.name,
            license=primary_location.get("license"),
            language=data.get("language"),
            published_at=published_at,
            updated_at=updated_at,
        )
