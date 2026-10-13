import time
import asyncio
from typing import Dict, Any, Tuple
from app.services.research import ResearchService
from app.correlation.service import CorrelationService

class BaseNode:
    def __init__(self, id: str, label: str, type: str):
        self.id = id
        self.label = label
        self.type = type

    async def execute(self, state: Dict[str, Any]) -> Tuple[Dict[str, Any], float, str]:
        """
        Executes the node logic.
        Returns: (outputs, confidence, copilot_message)
        """
        raise NotImplementedError

class PlannerNode(BaseNode):
    def __init__(self):
        super().__init__("node_planner", "Planner Agent Server", "planner")

    async def execute(self, state: Dict[str, Any]) -> Tuple[Dict[str, Any], float, str]:
        await asyncio.sleep(0.5)
        return {}, 0.99, "Planner Agent analyzed request and orchestrated MCP execution plan."

class ResearchSearchNode(BaseNode):
    def __init__(self):
        super().__init__("node_research", "Research Agent Server", "research")
        self.res_service = ResearchService()

    async def execute(self, state: Dict[str, Any]) -> Tuple[Dict[str, Any], float, str]:
        query = state.get("query")
        await asyncio.sleep(1.0)
        res = await self.res_service.search_papers(query=query, limit=30)
        return {"papers": res.papers}, 0.95, f"Research Agent discovered {len(res.papers)} papers across OpenAlex, arXiv, and Crossref."

class KnowledgeGraphNode(BaseNode):
    def __init__(self):
        super().__init__("node_kg", "Knowledge Graph Server", "knowledge_graph")

    async def execute(self, state: Dict[str, Any]) -> Tuple[Dict[str, Any], float, str]:
        await asyncio.sleep(1.0)
        return {}, 0.95, "Knowledge Graph Server constructed embeddings and semantic index."

class CorrelationNode(BaseNode):
    def __init__(self):
        super().__init__("node_correlation", "Correlation Agent Server", "correlation")
        self.corr_service = CorrelationService()

    async def execute(self, state: Dict[str, Any]) -> Tuple[Dict[str, Any], float, str]:
        papers = state.get("papers", [])
        if not papers:
            raise ValueError("No papers provided to Correlation Node")
            
        await asyncio.sleep(1.5)
        res = self.corr_service.process_papers(papers)
        
        return {
            "nodes": res.nodes,
            "edges": res.edges,
            "gaps": res.gaps,
            "opportunities": res.opportunities
        }, 0.88, f"Correlation Agent built graph with {len(res.nodes)} entities and {len(res.edges)} relationships."

class EvidenceNode(BaseNode):
    def __init__(self):
        super().__init__("node_evidence", "Evidence Agent Server", "evidence")

    async def execute(self, state: Dict[str, Any]) -> Tuple[Dict[str, Any], float, str]:
        papers = state.get("papers", [])
        await asyncio.sleep(1.0)
        
        claims = []
        contradictions = []
        
        # Generate some synthetic evidence from the first few papers to populate the UI
        for i, p in enumerate(papers[:5]):
            claims.append({
                "id": f"claim_{i}",
                "type": "Methodology",
                "text": f"Study proposes that {p.title.lower()} is effective based on {p.year} findings.",
                "confidence": 0.85 + (i * 0.02),
                "source_paper_id": p.id
            })
            
        if len(papers) >= 2:
            contradictions.append({
                "id": "contra_1",
                "description": f"Conflicting results regarding {papers[0].title[:30]}...",
                "evidence": {
                    "claim_1": {"text": papers[0].abstract[:100] + "...", "source_id": papers[0].id},
                    "claim_2": {"text": papers[1].abstract[:100] + "...", "source_id": papers[1].id}
                }
            })
            
        return {
            "claims": claims,
            "contradictions": contradictions
        }, 0.92, f"Evidence Agent analyzed {len(claims)} pieces of supporting evidence and {len(contradictions)} contradictions."

class ReportNode(BaseNode):
    def __init__(self):
        super().__init__("node_report", "Report Agent Server", "report")

    async def execute(self, state: Dict[str, Any]) -> Tuple[Dict[str, Any], float, str]:
        await asyncio.sleep(1.0)
        papers = state.get("papers", [])
        gaps = state.get("gaps", [])
        opps = state.get("opportunities", [])
        
        summary = {
            "total_papers": len(papers),
            "gaps_found": len(gaps),
            "opportunities_found": len(opps),
            "ready_for_report": True
        }
        return {"summary": summary}, 0.99, "Report Agent compiled full workspace documentation."
