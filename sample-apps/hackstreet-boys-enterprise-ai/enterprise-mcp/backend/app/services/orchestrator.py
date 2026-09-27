from typing import List, Dict, Any, Generator
from app.config.settings import settings
import json

# Try to import langchain and openai
try:
    from langchain.chat_models import ChatOpenAI
    from langchain.schema import HumanMessage, SystemMessage, AIMessage
    import openai
except ImportError:
    pass

from app.mcp.tools.fastmcp_setup import mcp

class AIOrchestrator:
    def __init__(self):
        self.system_prompt = """You are the Enterprise AI Assistant.
You answer employee questions using MCP tools.
Never hallucinate.
Always use tools whenever data is available.
If multiple tools are required, call them automatically.
If information cannot be found, clearly state that."""
        
        self.llm = None
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your_openai_api_key":
            self.llm = ChatOpenAI(
                model_name="gpt-4",
                temperature=0,
                openai_api_key=settings.OPENAI_API_KEY,
                streaming=True
            )

    async def execute_tool(self, tool_name: str, kwargs: Dict[str, Any]) -> Any:
        """Dynamically execute a tool from the fastmcp setup"""
        tool = next((t for t in mcp._tools if t.name == tool_name), None)
        if not tool:
            return f"Error: Tool {tool_name} not found."
        
        try:
            return await tool.fn(**kwargs)
        except Exception as e:
            return f"Error executing {tool_name}: {str(e)}"

    async def chat(self, user_message: str, history: List[Dict[str, str]] = None) -> str:
        """Process a chat message, orchestrate tools if necessary, and return a response."""
        
        if not self.llm:
            # Fallback mock orchestrator if no OpenAI key is set
            return await self._mock_orchestrate(user_message)
            
        messages = [SystemMessage(content=self.system_prompt)]
        if history:
            for msg in history:
                if msg["role"] == "user":
                    messages.append(HumanMessage(content=msg["content"]))
                else:
                    messages.append(AIMessage(content=msg["content"]))
                    
        messages.append(HumanMessage(content=user_message))
        
        # In a real implementation, we would use Langchain's bind_functions or AgentExecutor
        # to expose the mcp tools to OpenAI. Since we want to keep it robust without
        # full langchain agent setup here, we'll return a simple simulated response.
        response = self.llm(messages)
        return response.content

    async def chat_stream(self, user_message: str, history: List[Dict[str, str]] = None):
        """Streaming version of chat"""
        if not self.llm:
            # Mock streaming
            response = await self._mock_orchestrate(user_message)
            for chunk in response.split(" "):
                yield chunk + " "
            return

        # Real streaming would be implemented here using LangChain's AsyncCallbackHandler
        response = await self.chat(user_message, history)
        yield response
        
    async def _mock_orchestrate(self, user_message: str) -> str:
        msg = user_message.lower()
        if "leave policy" in msg:
            res = await self.execute_tool("find_policy", {"policy_name": "Leave"})
            return f"Based on the knowledge base: {res['policy']['snippet']}"
        elif "jira" in msg:
            res = await self.execute_tool("create_ticket", {"title": "Fix bug", "description": "Auto", "priority": "High"})
            return f"Created Jira ticket: {res['ticket_id']}"
        elif "atlas" in msg:
            res = await self.execute_tool("find_owner", {"project_name": "Project Atlas"})
            return f"{res['project']} is owned by {res['owner']['name']}."
        else:
            return "I am the Enterprise Assistant. I would normally use tools to answer this."

orchestrator = AIOrchestrator()
