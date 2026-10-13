"""
Research Schemas — Pydantic Models

API request and response schemas for the Research domain.
"""

from pydantic import BaseModel, Field
from typing import List
from datetime import date
from app.research.models import Paper, Author, Institution

# Re-export domain models as schemas for the API
# In a strict DDD architecture, these might be separate, 
# but for Phase 2, they map 1:1 and Pydantic handles serialization perfectly.

class SearchResponse(BaseModel):
    papers: List[Paper] = Field(description="List of normalized research papers")
    total: int = Field(description="Total number of results returned in this response")
    page: int = Field(description="Current page number (always 1 for Phase 2 cursor-less search)")
    hasMore: bool = Field(alias="has_more", default=False, description="Whether more results exist")
    
    class Config:
        populate_by_name = True
