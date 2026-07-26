from fastapi import APIRouter, Depends
from app.models.schemas import SimilaritySearchRequest
from app.services.vector_memory import vector_memory_service
from app.auth import get_current_user, UserSession

router = APIRouter(prefix="/api/v1/memory", tags=["ChromaDB Vector Memory"])

@router.post("/search")
async def search_memory(req: SimilaritySearchRequest, current_user: UserSession = Depends(get_current_user)):
    """
    Computes cosine similarity search on ChromaDB vector embeddings collection.
    """
    results = await vector_memory_service.search_similar_vectors(req.query_text, req.top_k)
    return {
        "status": "success",
        "query": req.query_text,
        "results_count": len(results),
        "matches": results
    }
