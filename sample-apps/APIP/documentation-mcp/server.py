from mcp.server.fastmcp import FastMCP
from tools import docs_publish_documentation

mcp = FastMCP("DocumentationAgent Server")
mcp.tool()(docs_publish_documentation)

if __name__ == "__main__":
    mcp.run()
