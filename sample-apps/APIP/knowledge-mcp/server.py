from mcp.server.fastmcp import FastMCP
from tools import codex_query_knowledge_graph

mcp = FastMCP("KnowledgeGraphAgent Server")
mcp.tool()(codex_query_knowledge_graph)

if __name__ == "__main__":
    mcp.run()
