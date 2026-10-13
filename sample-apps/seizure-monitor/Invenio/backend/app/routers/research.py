"""
Research Router — /api/v1/research

Handles all scientific literature discovery and retrieval endpoints.

Phase 1: Module stub. No endpoints implemented.

Phase 2 Endpoints:
  GET  /api/v1/research/papers          — Paginated paper list with filters
  GET  /api/v1/research/papers/{id}     — Paper detail with related entities
  GET  /api/v1/research/search          — Semantic search across paper corpus
  POST /api/v1/research/papers/import   — Import paper from DOI or ArXiv ID

Dependencies (Phase 2):
  - ResearchService (app.services.research)
  - OpenAlex API client (app.core.external.openalex)
  - Semantic Scholar API client (app.core.external.semantic_scholar)
  - Redis cache (app.core.cache)

Authentication: Required (Phase 3)
Rate Limiting: 100 requests/minute (Phase 2)
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.schemas.research import SearchResponse
from app.services.research import ResearchService
from app.core.config import settings

router = APIRouter()

def get_research_service() -> ResearchService:
    return ResearchService()

@router.get("/search", response_model=SearchResponse)
async def search_papers(
    query: str = Query(..., description="Search query string"),
    limit: int = Query(settings.PROVIDER_MAX_RESULTS, ge=1, le=100),
    source: Optional[str] = Query(None, description="Filter by specific source (e.g., 'openalex', 'arxiv')"),
    service: ResearchService = Depends(get_research_service)
) -> SearchResponse:
    """
    Semantic search across multiple scientific paper sources.
    Fetches, normalizes, deduplicates, and ranks results.
    """
    return await service.search_papers(query=query, limit=limit, source_filter=source)
