from pydantic import BaseModel
from typing import List
from app.correlation.models import CorrelationResponse

class CorrelationRequest(BaseModel):
    # Depending on how it's called, we might accept a query to refetch, 
    # or accept a list of paper IDs. For Phase 3, we'll re-run a search or accept a query.
    query: str
    limit: int = 30
