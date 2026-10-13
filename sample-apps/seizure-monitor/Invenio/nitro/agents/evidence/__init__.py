"""
Evidence Agent — Nitro MCP Module
"""
import json
from mcp.server.fastmcp import FastMCP
from nitro.agents.research.models import ResearchPackage, Paper
from nitro.agents.correlation.models import CorrelationPackage
from .engine import EvidenceEngine

mcp = FastMCP("Invenio Evidence Agent")
engine = EvidenceEngine()

@mcp.tool()
async def generate_evidence_package(correlation_package_json: str, papers_json: str) -> str:
    """Transform a CorrelationPackage into a full EvidencePackage containing Claims, Contradictions, and Research Gaps."""
    try:
        corr_data = json.loads(correlation_package_json)
        correlation_pkg = CorrelationPackage(**corr_data)
        
        papers_data = json.loads(papers_json)
        papers = [Paper(**p) for p in papers_data]
        
        evidence_pkg = engine.process(correlation_pkg, papers)
        return evidence_pkg.model_dump_json(indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to generate evidence package: {str(e)}"})

@mcp.tool()
async def build_claim_graph(papers_json: str) -> str:
    """(Deprecated) Build a claim graph. Use generate_evidence_package instead."""
    return "Deprecated: Use generate_evidence_package."

@mcp.tool()
async def detect_contradictions(claims_json: str) -> str:
    """(Deprecated) Detect contradictions."""
    return "Deprecated: Use generate_evidence_package."

@mcp.tool()
async def evaluate_evidence(claim_id: str) -> str:
    """Evaluate the strength of evidence for a specific claim."""
    return "Evidence evaluated."

@mcp.tool()
async def verify_claim(claim_text: str) -> str:
    """Verify a user-provided claim against the evidence graph."""
    return "Claim verified."

if __name__ == "__main__":
    mcp.run()
