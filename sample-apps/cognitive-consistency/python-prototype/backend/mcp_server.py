import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from mcp.server.fastmcp import FastMCP
from backend import memory_engine

memory_engine.setup()
mcp = FastMCP("shared-agent-memory")

@mcp.tool()
def remember(content: str, memory_type: str, project_id: str, task_id: str, agent_id: str, importance: float = 0.5) -> str:
    """Store a new memory (fact, decision, event, or result) so other agents can find it later."""
    return memory_engine.remember(content, memory_type, project_id, task_id, agent_id, importance)

@mcp.tool()
def recall(query: str, project_id: str, task_id: str = "", limit: int = 5) -> list:
    """Search memory by meaning. Use this BEFORE starting work to see what other agents already found."""
    return memory_engine.recall(query, project_id, task_id or None, limit)

@mcp.tool()
def get_task_memory(task_id: str) -> dict:
    """Get everything known about one task, grouped by type: facts, decisions, events, results."""
    return memory_engine.get_task_memory(task_id)

@mcp.tool()
def get_decisions(project_id: str, task_id: str = "") -> list:
    """Get just the decisions made so far on this project or task, with reasons."""
    return memory_engine.get_decisions(project_id, task_id or None)

@mcp.tool()
def get_agent_history(agent_id: str, project_id: str) -> list:
    """Get everything a specific agent has done before on this project."""
    return memory_engine.get_agent_history(agent_id, project_id)

@mcp.tool()
def store_result(task_id: str, result: str, agent_id: str, project_id: str) -> str:
    """Store the final output of a completed task."""
    return memory_engine.store_result(task_id, result, agent_id, project_id)

@mcp.tool()
def handoff_task(task_id: str, from_agent: str, to_agent: str, summary: str, next_steps: str, project_id: str) -> str:
    """Record that one agent is handing a task off to another, with a summary and next steps."""
    return memory_engine.handoff_task(task_id, from_agent, to_agent, summary, next_steps, project_id)

if __name__ == "__main__":
    mcp.run()
