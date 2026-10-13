from typing import List
import math
from app.research.models import Paper
from app.correlation.models import Evidence

class SimilarityEngine:
    @staticmethod
    def compute_similarity(p1: Paper, p2: Paper) -> tuple[float, List[Evidence]]:
        """
        Computes a similarity score between two papers using multiple heuristics.
        Returns the score and the explainable evidence.
        """
        score = 0.0
        evidence = []
        
        # 1. Keyword Overlap (Jaccard Similarity)
        k1 = set([k.lower() for k in p1.keywords])
        k2 = set([k.lower() for k in p2.keywords])
        
        if k1 and k2:
            intersection = k1.intersection(k2)
            union = k1.union(k2)
            jaccard = len(intersection) / len(union)
            if jaccard > 0.2:
                weight = jaccard * 0.4
                score += weight
                evidence.append(Evidence(
                    id=f"ev_kw_{p1.id}_{p2.id}",
                    description=f"High topic overlap ({jaccard:.0%}): {', '.join(list(intersection)[:3])}",
                    confidence=0.9,
                    supporting_paper_ids=[p1.id, p2.id]
                ))

        # 2. Author Overlap
        a1 = set([a.name for a in p1.authors])
        a2 = set([a.name for a in p2.authors])
        shared_authors = a1.intersection(a2)
        if shared_authors:
            score += 0.3
            evidence.append(Evidence(
                id=f"ev_auth_{p1.id}_{p2.id}",
                description=f"Shared authors: {', '.join(shared_authors)}",
                confidence=1.0,
                supporting_paper_ids=[p1.id, p2.id]
            ))

        # 3. Temporal Proximity
        if p1.year and p2.year:
            diff = abs(p1.year - p2.year)
            if diff <= 2:
                score += 0.1
                evidence.append(Evidence(
                    id=f"ev_time_{p1.id}_{p2.id}",
                    description=f"Published concurrently (within {diff} years)",
                    confidence=0.8,
                    supporting_paper_ids=[p1.id, p2.id]
                ))

        # 4. Source Cross-Pollination
        if p1.source != p2.source:
            score += 0.2
            evidence.append(Evidence(
                id=f"ev_src_{p1.id}_{p2.id}",
                description=f"Cross-domain correlation ({p1.source} and {p2.source})",
                confidence=0.7,
                supporting_paper_ids=[p1.id, p2.id]
            ))

        return min(score, 1.0), evidence
