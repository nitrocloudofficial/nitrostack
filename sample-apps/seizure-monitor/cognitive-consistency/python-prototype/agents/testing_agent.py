import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from agents.llm_client import ask_llm

PROJECT_ID = "demo_project"
TASK_ID = "task_vector_db"
AGENT_ID = "testing_agent"

TESTING_PROMPT_TEMPLATE = """You are a Testing Agent working on the same shared team project as other agents.
Here is the full history of what has been done on this task so far:

{full_task_memory}

Summarize what has been built and confirm whether the work is ready for testing, in under 100 words.
Reference at least the research decision and the implementation approach by name."""

async def main():
    server_params = StdioServerParameters(command="uv", args=["run", "backend/mcp_server.py"])
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            print("Testing agent retrieving full task history...")
            full_memory = await session.call_tool("get_task_memory", {"task_id": TASK_ID})
            full_memory_text = str(full_memory.content)

            prompt = TESTING_PROMPT_TEMPLATE.format(full_task_memory=full_memory_text)
            answer = ask_llm(prompt)
            print("Testing agent summary:\n", answer)

            await session.call_tool("store_result", {
                "task_id": TASK_ID,
                "result": answer,
                "agent_id": AGENT_ID,
                "project_id": PROJECT_ID,
            })
            print("Testing agent stored its summary.")

if __name__ == "__main__":
    asyncio.run(main())
