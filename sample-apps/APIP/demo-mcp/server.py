from mcp.server.fastmcp import FastMCP
from tools import demo_create_video_workflow

mcp = FastMCP("DemoAgent Server")
mcp.tool()(demo_create_video_workflow)

if __name__ == "__main__":
    mcp.run()
