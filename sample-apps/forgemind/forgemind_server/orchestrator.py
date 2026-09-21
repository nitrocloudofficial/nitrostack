import os
import json
import logging
from typing import List, Dict, Any, Optional
import openai
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

log = logging.getLogger(__name__)

LLM_API_KEY = os.environ.get("LLM_API_KEY", "")
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o")

with open(os.path.join(os.path.dirname(__file__), "system_prompt.md"), "r") as f:
    SYSTEM_PROMPT = f.read()

class OrchestratorResult(BaseModel):
    thought_process: str
    root_cause_machine: str
    causal_chain: List[str]
    confidence: float
    insight: str
    recommended_action: str
    work_order_created: bool

class MCPOrchestrator:
    def __init__(self, mcp_client, on_log=None):
        """
        Initializes the Orchestrator with an active MCP Client connected to Nethra's NitroStack server.
        """
        self.mcp_client = mcp_client
        self.on_log = on_log
        self.llm = openai.OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)
        
    def _convert_mcp_tools_to_openai(self, mcp_tools) -> List[Dict]:
        """Converts dynamically loaded MCP tools into OpenAI function calling format."""
        openai_tools = []
        
        # Resolve the list of tools safely from Pydantic ListToolsResult or dict
        tools_list = []
        if hasattr(mcp_tools, "tools"):
            tools_list = mcp_tools.tools
        elif isinstance(mcp_tools, dict) and "tools" in mcp_tools:
            tools_list = mcp_tools["tools"]
        elif isinstance(mcp_tools, (list, tuple)):
            for item in mcp_tools:
                if isinstance(item, list):
                    tools_list = item
                    break
        else:
            tools_list = mcp_tools
            
        for tool in tools_list:
            name = getattr(tool, "name", None) or (tool.get("name") if isinstance(tool, dict) else "")
            description = getattr(tool, "description", None) or (tool.get("description") if isinstance(tool, dict) else "")
            
            # Retrieve schema parameters safely
            input_schema = getattr(tool, "inputSchema", None) or getattr(tool, "input_schema", None)
            if not input_schema and isinstance(tool, dict):
                input_schema = tool.get("inputSchema") or tool.get("input_schema")
                
            if not input_schema:
                input_schema = {"type": "object", "properties": {}}
            elif hasattr(input_schema, "model_dump"):
                # If it's a Pydantic object
                input_schema = input_schema.model_dump()
            elif not isinstance(input_schema, dict):
                # Fallback
                input_schema = {"type": "object", "properties": {}}
                
            openai_tools.append({
                "type": "function",
                "function": {
                    "name": name,
                    "description": description,
                    "parameters": input_schema
                }
            })
        return openai_tools

    async def analyze_fault(self, fault_alert: Dict) -> OrchestratorResult:
        """
        Main Agent Loop:
        1. Fetch dynamic tools from MCP Server
        2. Enter reasoning loop with LLM
        3. Execute tool calls via MCP Server until final JSON verdict is reached.
        """
        log.info(f"Received fault alert for analysis: {fault_alert.get('trigger_reason')}")
        if self.on_log:
            await self.on_log(f"🚨 [Alert Ingestion] Triggered fault correlation on machine: {fault_alert.get('machine_id')}")
            await self.on_log(f"🔬 [Filter Engine] Correlation window filter matched: '{fault_alert.get('trigger_reason')}'")
        
        # 1. Fetch available tools dynamically from MCP
        mcp_tools = await self.mcp_client.list_tools()
        openai_tools = self._convert_mcp_tools_to_openai(mcp_tools)
        log.info(f"Loaded {len(openai_tools)} tools from MCP server.")
        if self.on_log:
            tool_names = [t["function"]["name"] for t in openai_tools]
            await self.on_log(f"🤖 [MCP SDK Discovery] Loaded MCP Tools: {', '.join(tool_names)}")

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"New fault alert detected:\n{json.dumps(fault_alert, indent=2)}\n\nBegin your investigation and follow the Verification Chain."}
        ]

        # 2. Agent Loop
        MAX_TURNS = 10
        for turn in range(MAX_TURNS):
            log.info(f"Orchestrator Turn {turn+1}")
            if self.on_log:
                await self.on_log(f"🧠 [OpenAI Agent] Reasoning Loop Turn {turn+1} / {MAX_TURNS}...")
                
            response = self.llm.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                tools=openai_tools,
                tool_choice="auto",
                temperature=0.2
            )
            
            message = response.choices[0].message
            messages.append(message)
            
            if not message.tool_calls:
                # Agent has finished and provided a final answer
                verdict = self._parse_final_verdict(message.content)
                if self.on_log:
                    await self.on_log(f"📋 [Agent Verdict] Diagnostic resolved. Root Cause Machine: {verdict.root_cause_machine}. Action: {verdict.recommended_action}")
                return verdict

            # 3. Execute tool calls
            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                log.info(f"Calling MCP Tool: {tool_name} with args: {tool_args}")
                if self.on_log:
                    await self.on_log(f"⚡ [MCP Execution] Call: {tool_name}({json.dumps(tool_args)})")
                
                # Execute against Nethra's MCP server
                try:
                    result = await self.mcp_client.call_tool(tool_name, tool_args)
                    result_content = json.dumps(result)
                    if self.on_log:
                        # Clean truncation for nice display
                        display_result = result_content[:150] + "..." if len(result_content) > 150 else result_content
                        await self.on_log(f"🟢 [MCP Response] {tool_name} data: {display_result}")
                except Exception as e:
                    result_content = f"Error calling tool: {str(e)}"
                    log.error(result_content)
                    if self.on_log:
                        await self.on_log(f"🔴 [MCP Error] {tool_name} call failed: {str(e)}")

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result_content
                })
                
        raise TimeoutError("Agent exceeded max turns without reaching a verdict.")

    def _parse_final_verdict(self, content: str) -> OrchestratorResult:
        try:
            # Extract JSON block
            import re
            match = re.search(r"```json\s*(.*?)\s*```", content, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
            else:
                data = json.loads(content)
                
            return OrchestratorResult(**data)
        except Exception as e:
            log.error(f"Failed to parse final verdict JSON: {content}")
            raise e
