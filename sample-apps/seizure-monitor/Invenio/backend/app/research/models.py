"""
Domain Models for Research Package

These are the canonical internal representations of research entities.
All providers must normalize their raw responses into these models.
"""

from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field


class Institution(BaseModel):
    id: str | None = None
    name: str
    country_code: str | None = None
    type: str | None = None


class Author(BaseModel):
    id: str | None = None
    name: str
    affiliations: list[Institution] = Field(default_factory=list)
    orcid: str | None = None


class Paper(BaseModel):
    """
    Canonical representation of a research paper.
    ID format: {source}:{source_specific_id}
    """
    id: str
    title: str
    abstract: str
    authors: list[Author] = Field(default_factory=list)
    journal: str | None = None
    year: int | None = None
    doi: str | None = None
    url: str
    pdf_url: str | None = None
    citation_count: int = 0
    keywords: list[str] = Field(default_factory=list)
    source: Literal["openalex", "arxiv", "crossref"]
    license: str | None = None
    language: str | None = None
    published_at: date | None = None
    updated_at: date | None = None
    rank_score: float = 0.0

    # Added to store the exact provider ID before the '{source}:' prefix is added
    # Useful for debugging/linking.
    provider_id: str | None = None
