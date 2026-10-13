from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional

from app.schemas.correlation import CorrelationRequest
from app.correlation.models import CorrelationResponse
from app.correlation.service import CorrelationService
from app.services.research import ResearchService

router = APIRouter()

def get_correlation_service() -> CorrelationService:
    return CorrelationService()

def get_research_service() -> ResearchService:
    return ResearchService()

@router.get("/graph", response_model=CorrelationResponse)
async def get_correlation_graph(
    query: str = Query(..., description="The research query to analyze"),
    limit: int = Query(30, ge=5, le=100),
    res_service: ResearchService = Depends(get_research_service),
    corr_service: CorrelationService = Depends(get_correlation_service)
) -> CorrelationResponse:
    """
    Executes a search, then pipes the results through the Correlation Intelligence Engine.
    Returns the Knowledge Graph, Gaps, and Opportunities.
    """
    try:
        # 1. Fetch normalized, deduplicated, ranked papers
        search_res = await res_service.search_papers(query=query, limit=limit)
        papers = search_res.papers
        
        if not papers:
            return CorrelationResponse(nodes=[], edges=[], gaps=[], opportunities=[])
            
        # 2. Run correlation engine
        return corr_service.process_papers(papers)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
