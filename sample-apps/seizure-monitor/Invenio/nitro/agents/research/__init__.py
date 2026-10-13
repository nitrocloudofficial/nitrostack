"""
Research Agent — Nitro MCP Module
"""
import json
from mcp.server.fastmcp import FastMCP
from typing import Optional
from .engine import ResearchEngine
from .models import Paper

mcp = FastMCP("Invenio Research Agent")
engine = ResearchEngine()

@mcp.tool()
async def search_papers(query: str, limit: int = 10, source: Optional[str] = None) -> str:
    """Search for scientific papers across all federated providers."""
    package = await engine.search_papers(query)
    # FastMCP tools return strings usually, so we serialize the Pydantic model to JSON
    return package.model_dump_json(indent=2)

@mcp.tool()
async def search_author(author_name: str) -> str:
    """Search for papers by a specific author across all federated providers."""
    package = await engine.search_author(author_name)
    return package.model_dump_json(indent=2)

@mcp.tool()
async def search_keyword(keyword: str) -> str:
    """Search for papers using specific keywords across all federated providers."""
    package = await engine.search_keyword(keyword)
    return package.model_dump_json(indent=2)

@mcp.tool()
async def search_doi(doi: str) -> str:
    """Retrieve paper details by DOI from DOI-aware federated providers."""
    package = await engine.search_doi(doi)
    return package.model_dump_json(indent=2)

@mcp.tool()
async def normalize_results(results_json: str) -> str:
    """Normalize raw provider outputs into standard Paper objects.
    (With the federated engine, this is handled internally. This tool acts as an external normalizer if needed.)
    """
    try:
        raw_list = json.loads(results_json)
        # Very naive external normalization fallback if they just pass raw JSON
        # In a real scenario, this would map fields based on detected schema
        # For now we'll just try to parse them into Papers.
        papers = []
        for item in raw_list:
            papers.append(Paper(**item))
        return json.dumps([p.model_dump() for p in papers], indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to normalize: {str(e)}"})

@mcp.tool()
async def rank_results(results_json: str, criteria: str = "relevance") -> str:
    """Rank papers based on relevance criteria."""
    try:
        raw_list = json.loads(results_json)
        papers = [Paper(**item) for item in raw_list]
        ranked = engine.rank_results(papers, criteria)
        return json.dumps([p.model_dump() for p in ranked], indent=2)
    except Exception as e:
        return json.dumps({"error": f"Failed to rank: {str(e)}"})

if __name__ == "__main__":
    mcp.run()
