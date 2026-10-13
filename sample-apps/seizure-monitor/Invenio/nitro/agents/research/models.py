from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Paper(BaseModel):
    id: str = Field(..., description="Unique identifier for the paper")
    title: str = Field(..., description="Title of the paper")
    abstract: Optional[str] = Field(None, description="Abstract of the paper")
    authors: List[str] = Field(default_factory=list, description="List of author names")
    affiliations: List[str] = Field(default_factory=list, description="List of author affiliations")
    doi: Optional[str] = Field(None, description="Digital Object Identifier")
    venue: Optional[str] = Field(None, description="Conference or venue name")
    journal: Optional[str] = Field(None, description="Journal name")
    publication_year: Optional[int] = Field(None, description="Year of publication")
    citation_count: int = Field(default=0, description="Number of citations")
    url: Optional[str] = Field(None, description="URL to the paper landing page")
    pdf_url: Optional[str] = Field(None, description="Direct URL to the PDF")
    keywords: List[str] = Field(default_factory=list, description="Associated keywords")
    source_provider: str = Field(..., description="The provider that sourced this paper")

class ProviderStatistics(BaseModel):
    provider_name: str
    status: str = Field(..., description="'success', 'error', or 'timeout'")
    papers_found: int = 0
    error_message: Optional[str] = None

class ResearchPackage(BaseModel):
    query: str = Field(..., description="The original search query")
    papers: List[Paper] = Field(default_factory=list, description="Normalized and ranked papers")
    provider_statistics: List[ProviderStatistics] = Field(default_factory=list, description="Stats per provider")
    duplicates_removed: int = Field(default=0, description="Number of duplicates removed")
    search_time: float = Field(default=0.0, description="Total search execution time in seconds")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional package metadata")
