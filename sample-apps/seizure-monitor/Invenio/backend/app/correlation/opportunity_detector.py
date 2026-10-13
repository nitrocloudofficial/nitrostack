from typing import List
from app.correlation.models import ResearchGap, Opportunity, Evidence, GraphNode

class OpportunityDetector:
    @staticmethod
    def generate_opportunities(gaps: List[ResearchGap], nodes: List[GraphNode]) -> List[Opportunity]:
        """
        Translates detected gaps into actionable research opportunities.
        """
        opportunities = []
        node_lookup = {n.id: n for n in nodes}
        
        for idx, gap in enumerate(gaps):
            # For each gap, generate an opportunity
            if "Disconnected" in gap.title:
                # Get some context from the relevant nodes
                keywords = []
                for nid in gap.relevant_node_ids:
                    if nid in node_lookup:
                        keywords.extend(node_lookup[nid].properties.get('keywords', []))
                
                unique_kw = list(set([k.lower() for k in keywords]))[:4]
                
                opportunities.append(Opportunity(
                    id=f"opp_bridge_{idx}",
                    title=f"Bridge: {unique_kw[0].title()} and {unique_kw[1].title() if len(unique_kw)>1 else 'Related Fields'}",
                    summary="There is a significant opportunity to apply methods from one isolated cluster to the other.",
                    reasoning=gap.description,
                    connected_domains=unique_kw,
                    supporting_paper_ids=gap.relevant_node_ids,
                    potential_applications=["Cross-domain methodology transfer", "Novel synthesis reviews"],
                    confidence=gap.confidence,
                    evidence=[Evidence(
                        id=f"ev_opp_{idx}",
                        description="Structural gap detected in citation/keyword network.",
                        confidence=gap.confidence,
                        supporting_paper_ids=gap.relevant_node_ids
                    )]
                ))
                
            elif "Isolated" in gap.title:
                opportunities.append(Opportunity(
                    id=f"opp_expand_{idx}",
                    title="Expand High-Impact Niche",
                    summary="Build upon an isolated but highly cited paper.",
                    reasoning=gap.reason,
                    connected_domains=[],
                    supporting_paper_ids=gap.relevant_node_ids,
                    potential_applications=["Reproducibility studies", "Application of niche method to broader dataset"],
                    confidence=gap.confidence,
                    evidence=[Evidence(
                        id=f"ev_opp_{idx}",
                        description=gap.description,
                        confidence=gap.confidence,
                        supporting_paper_ids=gap.relevant_node_ids
                    )]
                ))
                
        return opportunities
