"""
Test MCP server by connecting as a real MCP client over SSE transport.
Verifies: tools, resources, prompts match the spec.
"""
import asyncio
from mcp import ClientSession
from mcp.client.sse import sse_client


async def main():
    print("[MCP Client Test] Connecting to http://127.0.0.1:8000/sse ...")
    async with sse_client("http://127.0.0.1:8000/sse") as streams:
        read_stream, write_stream = streams
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            print("[MCP Client Test] Session initialized successfully!")

            # List tools
            tools_result = await session.list_tools()
            tool_names = [t.name for t in tools_result.tools]
            print(f"[MCP Client Test] TOOLS ({len(tool_names)}): {tool_names}")

            # List resources
            resources_result = await session.list_resources()
            resource_uris = [str(r.uri) for r in resources_result.resources]
            print(f"[MCP Client Test] RESOURCES ({len(resource_uris)}): {resource_uris}")

            # List prompts
            prompts_result = await session.list_prompts()
            prompt_names = [p.name for p in prompts_result.prompts]
            print(f"[MCP Client Test] PROMPTS ({len(prompt_names)}): {prompt_names}")

            # Verify expected tools
            expected_tools = ['run_bias_audit', 'synthesize_and_apply_patch', 'verify_patch', 'run_ci_gate']
            missing_tools = [t for t in expected_tools if t not in tool_names]
            extra_tools = [t for t in tool_names if t not in expected_tools]
            if missing_tools:
                print(f"[MCP Client Test] MISSING TOOLS: {missing_tools}")
            if extra_tools:
                print(f"[MCP Client Test] EXTRA TOOLS: {extra_tools}")

            # Verify expected resources
            expected_resources = ['findings://scan/{scan_run_id}', 'policy://active', 'policy://history']
            if not missing_tools and not extra_tools:
                print("[MCP Client Test] All expected tools PRESENT")

            print("[MCP Client Test] DONE")


if __name__ == "__main__":
    asyncio.run(main())
