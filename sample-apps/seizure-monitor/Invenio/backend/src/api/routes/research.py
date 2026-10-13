from fastapi import APIRouter, Query
from typing import Optional

router = APIRouter()

@router.get("/search")
async def search_papers(
    query: str,
    limit: int = 10,
    source: Optional[str] = None
):
    """
    Mock search endpoint for the demo.
    """
    return {
        "total": limit,
        "papers": [
            {
                "id": f"paper_{i}",
                "title": f"Advancements in {query} - Study {i}",
                "year": 2024 - (i % 5),
                "authors": [{"name": f"Researcher {i}"}],
                "source": source or "OpenAlex",
                "citation_count": 100 - i * 5,
                "rank_score": 0.95 - (i * 0.01),
                "url": "https://example.com/paper",
                "abstract": f"This paper explores the fundamental challenges and breakthroughs in {query}."
            }
            for i in range(1, limit + 1)
        ]
    }
