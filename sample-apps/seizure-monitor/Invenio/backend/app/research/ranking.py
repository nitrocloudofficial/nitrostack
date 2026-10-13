"""
Ranking Engine

Isolates the ranking algorithm for search results.
"""

from typing import List
import math
from datetime import date
from app.research.models import Paper

class RankingEngine:
    @staticmethod
    def rank(papers: List[Paper], query: str) -> List[Paper]:
        """
        Ranks papers based on:
        - Citation count (log normalized)
        - Recency
        - Keyword/Title match
        - Source confidence
        """
        query_terms = [t.lower() for t in query.split()]
        current_year = date.today().year
        
        for paper in papers:
            # 1. Citation score (log normalized to prevent huge citation counts from dominating)
            # max expected citations roughly 100k -> log10(100k) = 5
            citation_score = math.log10(paper.citation_count + 1) / 5.0 
            citation_score = min(citation_score, 1.0) * 0.35
            
            # 2. Recency score (exponential decay, half-life ~3 years)
            recency_score = 0.0
            if paper.year:
                age = max(0, current_year - paper.year)
                recency_score = (math.pow(0.5, age / 3.0)) * 0.25
                
            # 3. Keyword/Title match score
            keyword_score = 0.0
            text_to_search = f"{paper.title.lower()} {' '.join(paper.keywords).lower()}"
            matches = sum(1 for term in query_terms if term in text_to_search)
            if query_terms:
                keyword_score = (matches / len(query_terms)) * 0.25
                
            # 4. Exact match bonus
            exact_match_score = 0.0
            if query.lower() in paper.title.lower():
                exact_match_score = 0.10
                
            # 5. Source confidence
            source_weights = {"openalex": 1.0, "crossref": 0.8, "arxiv": 0.7}
            source_score = source_weights.get(paper.source, 0.5) * 0.05
            
            # Total
            paper.rank_score = citation_score + recency_score + keyword_score + exact_match_score + source_score
            
        # Sort descending by rank_score
        papers.sort(key=lambda p: p.rank_score, reverse=True)
        return papers
