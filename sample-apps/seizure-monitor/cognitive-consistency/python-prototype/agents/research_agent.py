import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from agents.llm_client import ask_llm

PROJECT_ID = "demo_project"
TASK_ID = "task_vector_db"
AGENT_ID = "research_agent"

RESEARCH_PROMPT = """You are a Research Agent working on a shared team project. Your task is:
"Research the best storage approach for a shared AI agent memory system, comparing at least 2 options."

Give a short comparison (3-4 sentences) and then clearly state your final decision in this format:
DECISION: <what you chose>
REASON: <why, in one sentence>

Keep your entire answer under 150 words."""

async def main():
    server_params = StdioServerParameters(command="uv", args=["run", "backend/mcp_server.py"])
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            print("Research agent thinking...")
            answer = ask_llm(RESEARCH_PROMPT)
            print("LLM answered:\n", answer)

            await session.call_tool("remember", {
                "content": answer,
                "memory_type": "decision",
                "project_id": PROJECT_ID,
                "task_id": TASK_ID,
                "agent_id": AGENT_ID,
                "importance": 0.9,
            })
            await session.call_tool("store_result", {
                "task_id": TASK_ID,
                "result": answer,
                "agent_id": AGENT_ID,
                "project_id": PROJECT_ID,
            })
            print("Research agent stored its findings in shared memory.")

if __name__ == "__main__":
    asyncio.run(main())
