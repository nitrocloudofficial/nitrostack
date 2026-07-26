from mcp.server.fastmcp import FastMCP
from tools import qa_run_tests

mcp = FastMCP("QAAgent Server")
mcp.tool()(qa_run_tests)

if __name__ == "__main__":
    mcp.run()
