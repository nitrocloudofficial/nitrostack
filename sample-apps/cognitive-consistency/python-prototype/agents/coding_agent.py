import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from agents.llm_client import ask_llm

PROJECT_ID = "demo_project"
TASK_ID = "task_vector_db"
AGENT_ID = "coding_agent"

CODING_PROMPT_TEMPLATE = """You are a Coding Agent working on the same shared team project as other agents.
Before starting, here is what a previous agent already discovered and decided:

{recalled_memories}

Your task is: "Describe how you would implement the memory storage layer, given the above decision."
You MUST explicitly reference the previous agent's decision by name in your first sentence — do not repeat their research, build on it.
Keep your entire answer under 150 words."""

async def main():
    server_params = StdioServerParameters(command="uv", args=["run", "backend/mcp_server.py"])
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            print("Coding agent recalling prior work...")
            recalled = await session.call_tool("recall", {
                "query": "vector database storage decision",
                "project_id": PROJECT_ID,
                "task_id": TASK_ID,
            })
            recalled_text = str(recalled.content)
            print("Recalled:\n", recalled_text)

            prompt = CODING_PROMPT_TEMPLATE.format(recalled_memories=recalled_text)
            answer = ask_llm(prompt)
            print("LLM answered:\n", answer)

            await session.call_tool("remember", {
                "content": answer,
                "memory_type": "event",
                "project_id": PROJECT_ID,
                "task_id": TASK_ID,
                "agent_id": AGENT_ID,
                "importance": 0.8,
            })
            await session.call_tool("store_result", {
                "task_id": TASK_ID,
                "result": answer,
                "agent_id": AGENT_ID,
                "project_id": PROJECT_ID,
            })
            print("Coding agent stored its work in shared memory.")

if __name__ == "__main__":
    asyncio.run(main())
