from typing import List, Dict
import networkx as nx
from app.correlation.models import GraphNode, GraphEdge, ResearchGap

class GapDetector:
    @staticmethod
    def detect_gaps(nodes: List[GraphNode], edges: List[GraphEdge]) -> List[ResearchGap]:
        """
        Identifies structural holes in the graph using networkx.
        """
        gaps = []
        
        G = nx.Graph()
        for n in nodes:
            G.add_node(n.id, **n.properties)
        for e in edges:
            G.add_edge(e.source, e.target, weight=e.weight)
            
        # Find disconnected components
        components = list(nx.connected_components(G))
        if len(components) > 1:
            # We have distinct islands of research
            for idx, comp in enumerate(components):
                # Pick the largest other component to compare
                other_comps = [c for i, c in enumerate(components) if i != idx]
                if other_comps:
                    largest_other = max(other_comps, key=len)
                    
                    # Heuristic: if we have disconnected clusters, there is a gap between them
                    gaps.append(ResearchGap(
                        id=f"gap_structural_{idx}",
                        title="Disconnected Research Domains",
                        description=f"Cluster A ({len(comp)} papers) is entirely disconnected from Cluster B ({len(largest_other)} papers).",
                        reason="Lack of cross-citations or shared terminology between these fields.",
                        confidence=0.85,
                        relevant_node_ids=list(comp)[:3] + list(largest_other)[:3]
                    ))
                    break # just report the primary disconnected gap to avoid spam
                    
        # Check for highly cited papers with zero connections (lone wolves)
        lone_wolves = [n for n, d in G.degree() if d == 0]
        for node_id in lone_wolves:
            node_data = G.nodes[node_id]
            if node_data.get('citations', 0) > 50:
                gaps.append(ResearchGap(
                    id=f"gap_lonewolf_{node_id}",
                    title="Isolated High-Impact Research",
                    description=f"The paper '{node_data.get('label')}' has high citations but is structurally isolated from current search results.",
                    reason="Potential paradigm shift or highly specialized niche.",
                    confidence=0.9,
                    relevant_node_ids=[node_id]
                ))
                
        return gaps
