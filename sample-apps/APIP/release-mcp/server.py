from mcp.server.fastmcp import FastMCP
from tools import release_generate_notes

mcp = FastMCP("ReleaseIntelligenceAgent Server")
mcp.tool()(release_generate_notes)

if __name__ == "__main__":
    mcp.run()
