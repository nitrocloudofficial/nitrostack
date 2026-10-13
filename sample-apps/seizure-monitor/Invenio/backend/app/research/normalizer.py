"""
Normalizer

Provides additional normalizations that apply across all providers
after they have created the base Paper models.
"""

from typing import List
from app.research.models import Paper

class Normalizer:
    @staticmethod
    def normalize_list(papers: List[Paper]) -> List[Paper]:
        """
        Applies cross-provider normalizations to a list of papers.
        Currently, just ensures empty abstracts are standardized and trims whitespace.
        """
        for paper in papers:
            if paper.title:
                paper.title = paper.title.strip()
            
            if paper.abstract:
                paper.abstract = paper.abstract.strip()
            else:
                paper.abstract = ""
                
            if paper.journal:
                paper.journal = paper.journal.strip()
                
            # Normalize DOI to always be lowercase and not have URL prefixes
            if paper.doi:
                doi = paper.doi.lower().strip()
                if doi.startswith("https://doi.org/"):
                    doi = doi.replace("https://doi.org/", "")
                elif doi.startswith("http://doi.org/"):
                    doi = doi.replace("http://doi.org/", "")
                elif doi.startswith("doi:"):
                    doi = doi.replace("doi:", "")
                paper.doi = doi
                
        return papers
