import asyncio
import os
import json
from dotenv import load_dotenv

from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from typing import Annotated, TypedDict

# Load environment variables
load_dotenv(dotenv_path="../.env")

# 1. Define State
class State(TypedDict):
    messages: Annotated[list, add_messages]

async def main():
    print("🚀 Initializing Agent Orchestrator...")
    
    # 2. Connect to the Memora MCP Server via stdio
    server_params = StdioServerParameters(
        command="npx",
        args=["nitrostack-cli", "start"],
        env=os.environ.copy()
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print("✅ Connected to Memora MCP Server")
            
            # 3. Get Tools from MCP Server
            mcp_tools_response = await session.list_tools()
            
            # 4. Convert MCP Tools to LangChain format
            lc_tools = []
            tool_mapping = {}
            for tool in mcp_tools_response.tools:
                lc_tools.append({
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.inputSchema
                    }
                })
                tool_mapping[tool.name] = tool
                
            print(f"🔧 Loaded {len(lc_tools)} tools: {[t['function']['name'] for t in lc_tools]}")

            # 5. Initialize Groq LLM
            llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                api_key=os.environ.get("GROQ_API_KEY")
            )
            # Bind tools to the LLM
            llm_with_tools = llm.bind_tools(lc_tools)

            # 6. Define Agent Node
            async def agent_node(state: State):
                response = await llm_with_tools.ainvoke(state["messages"])
                return {"messages": [response]}

            # 7. Define Tool Executor Node
            async def tool_node(state: State):
                last_message = state["messages"][-1]
                tool_calls = last_message.tool_calls
                
                results = []
                for tool_call in tool_calls:
                    print(f"⚡ Agent decided to call tool: {tool_call['name']}")
                    # 8. Execute MCP Tool
                    result = await session.call_tool(tool_call["name"], arguments=tool_call["args"])
                    
                    # 9. Send result back
                    result_content = result.content[0].text if result.content else str(result)
                    results.append(ToolMessage(
                        content=result_content,
                        tool_call_id=tool_call["id"]
                    ))
                
                return {"messages": results}

            # Define Router
            def should_continue(state: State):
                messages = state["messages"]
                last_message = messages[-1]
                if last_message.tool_calls:
                    return "tools"
                return END

            # 10. Build LangGraph
            workflow = StateGraph(State)
            workflow.add_node("agent", agent_node)
            workflow.add_node("tools", tool_node)
            workflow.add_edge(START, "agent")
            workflow.add_conditional_edges("agent", should_continue, ["tools", END])
            workflow.add_edge("tools", "agent")

            app = workflow.compile()
            print("🧠 LangGraph Orchestrator Ready!\n")

            # Chat Loop
            print("Type 'quit' to exit.")
            while True:
                user_input = input("\nUser: ")
                if user_input.lower() == 'quit':
                    break
                
                inputs = {"messages": [HumanMessage(content=user_input)]}
                
                async for event in app.astream(inputs, stream_mode="values"):
                    last_msg = event["messages"][-1]
                    if not getattr(last_msg, "tool_calls", None) and getattr(last_msg, "content", None) and isinstance(last_msg, type(llm.invoke("hello"))):
                        print(f"\n🤖 Agent: {last_msg.content}")

if __name__ == "__main__":
    asyncio.run(main())
