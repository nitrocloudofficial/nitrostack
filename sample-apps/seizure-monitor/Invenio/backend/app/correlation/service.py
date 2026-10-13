from typing import List
import logging
from app.research.models import Paper
from app.correlation.graph_builder import GraphBuilder
from app.correlation.gap_detector import GapDetector
from app.correlation.opportunity_detector import OpportunityDetector
from app.correlation.models import CorrelationResponse

logger = logging.getLogger(__name__)

class CorrelationService:
    def __init__(self):
        self.graph_builder = GraphBuilder()
        self.gap_detector = GapDetector()
        self.opportunity_detector = OpportunityDetector()

    def process_papers(self, papers: List[Paper]) -> CorrelationResponse:
        """
        Runs the full correlation intelligence pipeline on a set of papers.
        """
        logger.info(f"Running Correlation Engine on {len(papers)} papers")
        
        # 1. Build Graph (Nodes & Edges via Similarity Engine)
        nodes, edges = self.graph_builder.build_graph(papers, similarity_threshold=0.25)
        
        # 2. Detect Gaps
        gaps = self.gap_detector.detect_gaps(nodes, edges)
        
        # 3. Detect Opportunities
        opportunities = self.opportunity_detector.generate_opportunities(gaps, nodes)
        
        return CorrelationResponse(
            nodes=nodes,
            edges=edges,
            gaps=gaps,
            opportunities=opportunities
        )
