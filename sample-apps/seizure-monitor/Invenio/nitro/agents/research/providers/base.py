from abc import ABC, abstractmethod
from typing import List
from ..models import Paper

class BaseProvider(ABC):
    """
    Abstract base class for all scholarly search providers.
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the provider (e.g., 'Semantic Scholar', 'arXiv')"""
        pass

    @abstractmethod
    async def search(self, query: str) -> List[Paper]:
        """
        Search for papers matching the given query.
        """
        pass

    @abstractmethod
    async def search_by_author(self, author_name: str) -> List[Paper]:
        """
        Search for papers by a specific author.
        """
        pass

    @abstractmethod
    async def search_by_doi(self, doi: str) -> List[Paper]:
        """
        Search for a paper by its DOI.
        Providers that do not support this should return an empty list.
        """
        pass
