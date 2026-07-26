from mcp.server.fastmcp import FastMCP
from tools import explorer_record_session

mcp = FastMCP("ExplorerAgent Server")
mcp.tool()(explorer_record_session)

if __name__ == "__main__":
    mcp.run()
