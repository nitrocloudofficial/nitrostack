from typing import List, Tuple
from app.research.models import Paper
from app.correlation.models import GraphNode, GraphEdge
from app.correlation.similarity import SimilarityEngine

class GraphBuilder:
    @staticmethod
    def build_graph(papers: List[Paper], similarity_threshold: float = 0.3) -> Tuple[List[GraphNode], List[GraphEdge]]:
        """
        Transforms a list of Papers into Nodes and Edges.
        Adds implicit edges based on similarity scores.
        """
        nodes = []
        edges = []
        
        # 1. Create Paper Nodes
        for p in papers:
            nodes.append(GraphNode(
                id=p.id,
                label=p.title,
                group="paper",
                properties={
                    "year": p.year,
                    "citations": p.citation_count,
                    "source": p.source,
                    "authors": [a.name for a in p.authors],
                    "keywords": p.keywords
                }
            ))
            
        # 2. Compute Similarities to generate Edges
        # O(N^2) comparison - acceptable for Phase 3 limit sizes (e.g. 50 papers max)
        for i, p1 in enumerate(papers):
            for j in range(i + 1, len(papers)):
                p2 = papers[j]
                
                score, evidence = SimilarityEngine.compute_similarity(p1, p2)
                
                if score >= similarity_threshold:
                    edges.append(GraphEdge(
                        id=f"edge_{p1.id}_{p2.id}",
                        source=p1.id,
                        target=p2.id,
                        relationship="related_to",
                        weight=score,
                        evidence=evidence
                    ))
                    
        return nodes, edges
