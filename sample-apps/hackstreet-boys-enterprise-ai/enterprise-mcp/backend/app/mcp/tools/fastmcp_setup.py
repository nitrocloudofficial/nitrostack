from fastmcp import FastMCP
from app.vectorstore.faiss_store import vector_store
from app.connectors.mocks import JiraConnector, SlackConnector, NotionConnector
from typing import List, Dict, Any

# Create the MCP server
mcp = FastMCP("Enterprise Knowledge MCP Server")

@mcp.tool()
async def search_documents(query: str) -> List[Dict[str, Any]]:
    """Search company documents by query. Returns ranked results with confidence scores."""
    return vector_store.search(query, k=3)

@mcp.tool()
async def find_policy(policy_name: str) -> Dict[str, Any]:
    """Find a specific company policy by name."""
    # In a real scenario, this would query the DB for the policy.
    # For now, we use the vector store for a semantic search focused on policies.
    results = vector_store.search(f"{policy_name} policy", k=1)
    if results:
        return {"found": True, "policy": results[0]}
    return {"found": False, "message": "Policy not found."}

@mcp.tool()
async def summarize_meeting(date: str) -> str:
    """Summarize meetings for a given date."""
    # Mocking meeting summary
    return f"Summary for {date}: 10:00 AM Daily Standup (Discussed sprint goals), 2:00 PM Architecture Sync."

@mcp.tool()
async def lookup_employee(name: str) -> Dict[str, Any]:
    """Look up employee information by ID or name."""
    # Mock employee response
    return {
        "id": "emp_005",
        "name": name,
        "role": "Product Manager",
        "department": "Product",
        "projects": ["Project Atlas", "Project Titan"]
    }

@mcp.tool()
async def find_owner(project_name: str) -> Dict[str, Any]:
    """Find the owner of a project by project name."""
    return {
        "project": project_name,
        "owner": {
            "name": "Emma Brown",
            "role": "Product Manager"
        }
    }

@mcp.tool()
async def create_ticket(title: str, description: str, priority: str) -> Dict[str, Any]:
    """Create a Jira ticket."""
    return await JiraConnector.create_ticket(title, description, priority)

@mcp.tool()
async def search_incidents(month: str) -> List[Dict[str, Any]]:
    """Search incidents from a given month."""
    return [
        {"id": "INC-892", "severity": "High", "description": "Database latency spikes in US-East"},
        {"id": "INC-893", "severity": "Medium", "description": "API rate limit exceeded"}
    ]

@mcp.tool()
async def search_slack(query: str) -> List[Dict[str, Any]]:
    """Search Slack messages."""
    return await SlackConnector.search_messages(query)

@mcp.tool()
async def search_notion(query: str) -> List[Dict[str, Any]]:
    """Search Notion pages."""
    return await NotionConnector.search_pages(query)

# We can expose `mcp` as an endpoint or internal service
