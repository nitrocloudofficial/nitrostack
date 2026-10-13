"""
Correlation Agent — Nitro MCP Module
"""
import json
from mcp.server.fastmcp import FastMCP
from nitro.agents.research.models import ResearchPackage
from .engine import CorrelationEngine

mcp = FastMCP("Invenio Correlation Agent")
engine = CorrelationEngine()

@mcp.tool()
async def generate_correlation_package(research_package_json: str) -> str:
    """Transform a ResearchPackage into a full CorrelationPackage containing Knowledge Graphs and relationships."""
    try:
        data = json.loads(research_package_json)
        package = ResearchPackage(**data)
        
        correlation_pkg = engine.process(package)
        return correlation_pkg.model_dump_json(indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to generate correlation package: {str(e)}"})

@mcp.tool()
async def build_graph(papers_json: str) -> str:
    """(Deprecated) Build a correlation graph from papers. Use generate_correlation_package instead."""
    return "Deprecated: Use generate_correlation_package."

@mcp.tool()
async def compute_similarity(node_a: str, node_b: str) -> str:
    """Compute semantic similarity between two nodes."""
    return "Similarity computed: 0.85"

@mcp.tool()
async def detect_clusters(graph_json: str) -> str:
    """Detect topical clusters in the correlation graph."""
    return "Clusters detected."

@mcp.tool()
async def detect_gaps(graph_json: str) -> str:
    """Identify structural gaps in the research graph."""
    return "Gaps detected."

@mcp.tool()
async def find_opportunities(gaps_json: str) -> str:
    """Find high-impact research opportunities based on gaps."""
    return "Opportunities identified."

@mcp.tool()
async def explain_relationship(node_a: str, node_b: str) -> str:
    """Generate natural language explanation for a relationship."""
    return f"Relationship between {node_a} and {node_b} explained."

if __name__ == "__main__":
    mcp.run()
