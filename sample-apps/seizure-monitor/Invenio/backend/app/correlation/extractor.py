from typing import List, Dict, Set
from app.research.models import Paper

class Extractor:
    @staticmethod
    def extract_topics(papers: List[Paper]) -> Dict[str, List[str]]:
        """Extracts unique topics across papers."""
        topics = {}
        for paper in papers:
            for kw in paper.keywords:
                kw_clean = kw.lower().strip()
                if kw_clean not in topics:
                    topics[kw_clean] = []
                topics[kw_clean].append(paper.id)
        return topics

    @staticmethod
    def extract_authors(papers: List[Paper]) -> Dict[str, List[str]]:
        authors = {}
        for paper in papers:
            for a in paper.authors:
                if a.name:
                    authors.setdefault(a.name, []).append(paper.id)
        return authors
