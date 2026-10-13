from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date

class Author(BaseModel):
    id: str
    name: str
    affiliations: List[str] = []

class Concept(BaseModel):
    id: str
    name: str
    wikidata_id: Optional[str] = None

class DomainPaper(BaseModel):
    """
    Unified Domain Model for a Research Paper.
    This acts as the canonical representation inside our application,
    independent of whether it came from OpenAlex, PubMed, or Crossref.
    """
    id: str
    title: str
    abstract: str
    publication_date: Optional[date]
    authors: List[Author] = []
    concepts: List[Concept] = []
    doi: Optional[str] = None
    citations_count: int = 0
