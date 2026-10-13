from abc import ABC, abstractmethod
from typing import List, Optional
from src.domain.models import DomainPaper

class BaseProviderAdapter(ABC):
    """
    Anti-Corruption Layer Interface.
    All external data providers (OpenAlex, PubMed, SemanticScholar, etc.)
    must implement this interface and return the canonical DomainPaper.
    """
    
    @abstractmethod
    async def fetch_paper_by_doi(self, doi: str) -> Optional[DomainPaper]:
        pass

    @abstractmethod
    async def search_papers(self, query: str, limit: int = 10) -> List[DomainPaper]:
        pass

    @abstractmethod
    async def fetch_citations(self, paper_id: str) -> List[DomainPaper]:
        pass
