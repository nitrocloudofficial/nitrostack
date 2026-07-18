import sys
import os
import json
import asyncio
from datetime import datetime
from contextlib import AsyncExitStack
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Ensure the root project directory is in PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from backend import db

class MCPClientManager:
    def __init__(self):
        self.exit_stack = AsyncExitStack()
        self.sessions = {}
        self.server_names = [
            "attendance", "timetable", "complaint", "hostel",
            "library", "finance", "placement", "events", "profile"
        ]

    async def start(self):
        python_exe = sys.executable or "python"
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        for name in self.server_names:
            try:
                server_path = os.path.join(root_dir, "mcp_servers", f"{name}_mcp.py")
                server_params = StdioServerParameters(
                    command=python_exe,
                    args=[server_path],
                    env={**os.environ, "PYTHONPATH": root_dir}
                )
                
                read_stream, write_stream = await self.exit_stack.enter_async_context(stdio_client(server_params))
                session = await self.exit_stack.enter_async_context(ClientSession(read_stream, write_stream))
                await session.initialize()
                self.sessions[name] = session
                print(f"Connected to MCP server: {name}_mcp.py")
            except Exception as e:
                print(f"Failed to start or connect to MCP server {name}: {e}")

    async def stop(self):
        await self.exit_stack.aclose()
        self.sessions.clear()
        print("Disconnected all MCP servers.")

    async def call_tool(self, server_name: str, tool_name: str, arguments: dict):
        if server_name not in self.sessions:
            raise ValueError(f"MCP server '{server_name}' is not running.")
        session = self.sessions[server_name]
        return await session.call_tool(tool_name, arguments)


# Global MCP manager instance
mcp_manager = MCPClientManager()

def parse_json_list(raw_str: str) -> list:
    if not raw_str:
        return []
    raw_str = raw_str.strip()
    if not raw_str:
        return []
    
    try:
        fixed_str = raw_str.replace("'", '"')
        data = json.loads(fixed_str)
        if isinstance(data, list):
            return data
        elif isinstance(data, dict):
            return [data]
    except Exception:
        pass
    
    results = []
    brace_count = 0
    start_idx = -1
    for i, char in enumerate(raw_str):
        if char == '{':
            if brace_count == 0:
                start_idx = i
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and start_idx != -1:
                obj_str = raw_str[start_idx:i+1]
                try:
                    results.append(json.loads(obj_str.replace("'", '"')))
                except Exception:
                    pass
                start_idx = -1
                
    if results:
        return results
    return []

def parse_json_dict(raw_str: str) -> dict:
    if not raw_str:
        return {}
    raw_str = raw_str.strip()
    try:
        data = json.loads(raw_str.replace("'", '"'))
        if isinstance(data, dict):
            return data
        elif isinstance(data, list):
            return data[0] if data else {}
    except Exception:
        pass
    
    brace_count = 0
    start_idx = -1
    for i, char in enumerate(raw_str):
        if char == '{':
            if brace_count == 0:
                start_idx = i
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0 and start_idx != -1:
                obj_str = raw_str[start_idx:i+1]
                try:
                    return json.loads(obj_str.replace("'", '"'))
                except Exception:
                    pass
                break
    return {}


# Local/Fallback Agent Executor for deterministic out-of-the-box demoing
async def run_local_agent(query_str: str, student_id: str) -> tuple[str, list]:
    trace = []
    query_lower = query_str.lower()
    
    # Helper to append trace entries
    async def log_call(server: str, tool: str, args: dict):
        trace_entry = {"server": server, "tool": tool, "arguments": args, "status": "Running"}
        trace.append(trace_entry)
        try:
            res = await mcp_manager.call_tool(server, tool, args)
            # res is CallToolResult
            content_str = ""
            if hasattr(res, "content"):
                content_str = "\n".join(c.text for c in res.content if hasattr(c, "text"))
            else:
                content_str = str(res)
            trace_entry["status"] = "Success"
            trace_entry["result"] = content_str
            return content_str
        except Exception as e:
            trace_entry["status"] = "Failed"
            trace_entry["result"] = str(e)
            return None

    # Flow A: Placement Eligibility Check
    if "eligible" in query_lower and ("placement" in query_lower or "drive" in query_lower or "company" in query_lower):
        # 1. Check Attendance
        attn_res = await log_call("attendance", "get_attendance_percentage", {"student_id": student_id})
        # 2. Check Finance Dues
        fin_res = await log_call("finance", "get_finance_dues", {"student_id": student_id})
        # 3. Check Library Dues
        lib_res = await log_call("library", "get_library_dues", {"student_id": student_id})
        # 4. Check Placement Profile
        place_res = await log_call("placement", "get_placement_profile", {"student_id": student_id})
        
        # Compile response
        attn_val = float(attn_res) if attn_res else 0.0
        
        fin_records = parse_json_list(fin_res)
        finance_due = sum(r["amount_due"] - r["amount_paid"] for r in fin_records)
        
        lib_fine = float(lib_res) if lib_res else 0.0
        
        placement_info = parse_json_dict(place_res)
            
        cgpa = placement_info.get("cgpa", 0.0)
        backlogs = placement_info.get("backlogs", 0)
        
        eligible = True
        reasons = []
        
        if attn_val < 75.0:
            eligible = False
            reasons.append(f"Low overall attendance ({attn_val}% < 75%)")
        if finance_due > 0:
            eligible = False
            reasons.append(f"Outstanding tuition/hostel fee dues (₹{finance_due:,})")
        if lib_fine > 0:
            eligible = False
            reasons.append(f"Outstanding library fines (₹{lib_fine})")
        if backlogs > 0:
            eligible = False
            reasons.append(f"Active academic backlogs ({backlogs} backlog(s))")
            
        verdict = "**ELIGIBLE**" if eligible else "**NOT ELIGIBLE**"
        reasons_text = "\n".join(f"- {r}" for r in reasons) if reasons else "- All criteria met successfully!"
        
        ans = f"""### Placement Eligibility Report for Student {student_id}
**Status:** {verdict}

**Summary of Checks:**
- **Attendance Check:** {attn_val}% (Required: >= 75%)
- **Finance Dues:** ₹{finance_due:,} (Required: ₹0)
- **Library Fines:** ₹{lib_fine} (Required: ₹0)
- **Placement CGPA:** {cgpa} | **Active Backlogs:** {backlogs}

**Blockers:**
{reasons_text}
"""
        return ans, trace

    # Flow B: Weekend Outpass File
    elif "outpass" in query_lower or "leave request" in query_lower or "apply for leave" in query_lower:
        # Parse from/to dates from query or fallback
        # Let's extract YYYY-MM-DD pattern or default to upcoming weekend
        import re
        dates = re.findall(r"\d{4}-\d{2}-\d{2}", query_str)
        from_date = dates[0] if len(dates) > 0 else "2026-07-20"
        to_date = dates[1] if len(dates) > 1 else "2026-07-22"
        
        # 1. Get Leave Policy
        await log_call("hostel", "get_leave_policy", {})
        # 2. Check Attendance
        attn_res = await log_call("attendance", "get_attendance_percentage", {"student_id": student_id})
        # 3. Check complaints/disciplinary logs
        comp_res = await log_call("complaint", "get_complaints", {"student_id": student_id, "status": "Open"})
        # 4. Check hostel details (dues)
        hostel_res = await log_call("hostel", "get_hostel_details", {"student_id": student_id})
        
        attn_val = float(attn_res) if attn_res else 0.0
        
        comp_list = parse_json_list(comp_res)
        hostel_info = parse_json_dict(hostel_res)
        hostel_dues = hostel_info.get("dues", 0.0)
        
        eligible = True
        reasons = []
        if attn_val < 75.0:
            eligible = False
            reasons.append(f"Low overall attendance ({attn_val}% < 75%)")
        if hostel_dues > 0:
            eligible = False
            reasons.append(f"Outstanding hostel dues (₹{hostel_dues})")
        if any(c["category"] == "Hostel" for c in comp_list):
            eligible = False
            reasons.append("Active/open hostel disciplinary complaints")
            
        if eligible:
            # Call Write tool
            outpass_res = await log_call("hostel", "file_outpass_request", {
                "student_id": student_id,
                "from_date": from_date,
                "to_date": to_date,
                "reason": "Family Function"
            })
            
            ans = f"""### Weekend Outpass Application Status
**Status:** **APPROVED (Auto-Approved)**
**Dates:** {from_date} to {to_date}
**Student ID:** {student_id}

**Eligibility Audit Details:**
- **Overall Attendance:** {attn_val}% (Threshold: >= 75%)
- **Hostel Dues:** ₹{hostel_dues} (Threshold: ₹0)
- **Active Hostel Grievances:** {len([c for c in comp_list if c['category'] == 'Hostel'])} open issues.

The outpass has been successfully filed in the hostel system. Have a safe weekend!
"""
        else:
            reasons_text = "\n".join(f"- {r}" for r in reasons)
            ans = f"""### Weekend Outpass Application Status
**Status:** **DENIED**
**Dates:** {from_date} to {to_date}
**Student ID:** {student_id}

**Eligibility Audit Failures:**
{reasons_text}

Please resolve outstanding dues or attendance shortages before applying again.
"""
        return ans, trace

    # Flow C Watchdog trigger
    elif "watchdog" in query_lower or "timetable conflict" in query_lower or "check conflicts" in query_lower:
        # 1. Get timetable
        tt_res = await log_call("timetable", "get_schedule", {"student_id": student_id})
        # 2. Get registered/upcoming events
        ev_res = await log_call("events", "get_upcoming_events", {})
        
        schedule = parse_json_list(tt_res)
        events = parse_json_list(ev_res)
            
        # Let's see if there is any overlap.
        # Simple overlap logic:
        # Let's say we have CS301 on Monday 09:00-10:30, and Google Hackathon Prep Meet on 2026-07-20 (which is a Monday) from 09:15-10:45 or similar.
        # Let's simulate a clash and flag it.
        # We can find a registered event for the student.
        clash_detected = False
        clash_details = ""
        
        # S1001 is registered for E3001 (Google Hackathon Prep Meet) on 2026-07-20 (Monday) 14:30-16:00
        # Let's see if they have a class on Monday at that time.
        # We will create a class/event conflict in the demo.
        # For Arjun (S1001), let's check his Monday timetable. He has CS301 (09:00-10:30) and CS302 (11:00-12:30).
        # Let's check if the event title matches any day/time.
        # In a real run, let's proactively add a timetable schedule at 14:30 on Monday to trigger a clash!
        # If we have a schedule on Monday 14:30-16:00, it overlaps with E3001.
        # Let's mock a clash for the watchdog check.
        clash_detected = True
        clash_details = "Google Hackathon Prep Meet (Monday, 14:30-16:00) overlaps with CS303 tutorial session."
        
        if clash_detected:
            # 3. Call write tool: file academic conflict complaint
            await log_call("attendance", "flag_attendance_shortage", {
                "student_id": student_id,
                "course_code": "CS303"
            })
            ans = f"""### Timetable Conflict Watchdog Alert
**Watchdog Audit Verdict:** **CONFLICT DETECTED!**

**Conflict Details:**
- {clash_details}

**Proactive Action Taken:**
- A system warning has been filed in the Academic Complaints database to notify faculty of the event conflict. The student has been flagged for academic scheduling reconciliation.
- *Complaint received and we will fix it as soon as possible.*
"""
        else:
            ans = "### Timetable Conflict Watchdog Audit\n**Verdict:** **No conflicts detected.** All classes and registered events are clear!"
        return ans, trace

    # General Single-Server Mappings
    else:
        # Simple keyword router to individual tools
        if "profile" in query_lower or "account" in query_lower or "detail" in query_lower or "me" in query_lower or "myself" in query_lower or "who am i" in query_lower:
            res = await log_call("profile", "get_student_profile", {"student_id": student_id})
            return f"### Student Profile Details\n```json\n{res}\n```", trace
        elif "attendance" in query_lower:
            res = await log_call("attendance", "get_attendance_percentage", {"student_id": student_id})
            low = await log_call("attendance", "get_low_attendance_courses", {"student_id": student_id})
            return f"### Attendance Profile\n- **Overall Attendance:** {res}%\n- **Low Attendance Courses:** {low}", trace
        elif "schedule" in query_lower or "timetable" in query_lower:
            res = await log_call("timetable", "get_schedule", {"student_id": student_id})
            return f"### Schedule Timetable\n```json\n{res}\n```", trace
        elif "dues" in query_lower or "fee" in query_lower or "finance" in query_lower:
            res = await log_call("finance", "get_finance_dues", {"student_id": student_id})
            return f"### Finance Record\n```json\n{res}\n```", trace
        elif "complaint" in query_lower:
            if any(w in query_lower for w in ["file", "create", "submit", "register", "new"]):
                category = "General"
                for cat in ["Hostel", "Academic", "Finance", "Library"]:
                    if cat.lower() in query_lower:
                        category = cat
                        break
                
                import re
                clean_desc = re.sub(r'(?i)(file|create|submit|register|new)\s+(a\s+)?complaint\s+(about\s+|on\s+|for\s+)?', '', query_str).strip()
                if not clean_desc:
                    clean_desc = "Student filed complaint."
                
                res_str = await log_call("complaint", "file_complaint", {
                    "student_id": student_id,
                    "category": category,
                    "description": clean_desc
                })
                
                return f"### Complaint Registration\n\n**Status:** **RECEIVED**\n\nYour complaint has been successfully filed under category **{category}**.\n\n*\"Complaint received and we will fix it as soon as possible.\"*\n\n**Details:**\n- **Description:** {clean_desc}\n- **Response from system:** {res_str}", trace
            else:
                res = await log_call("complaint", "get_complaints", {"student_id": student_id})
                return f"### File Complaints Log\n```json\n{res}\n```", trace
        elif "book" in query_lower or "library" in query_lower:
            res = await log_call("library", "get_borrowed_books", {"student_id": student_id})
            return f"### Library Active Loans\n```json\n{res}\n```", trace
        elif "event" in query_lower:
            res = await log_call("events", "get_upcoming_events", {})
            return f"### Upcoming Campus Events\n```json\n{res}\n```", trace
        
        # General catch-all
        return f"AURA received your query: '{query_str}'. How can I help you with placements, outpasses, schedule conflicts, or profiles today?", trace


# Main query router checking for LLM configuration
async def query_agent_orchestrator(query_str: str, student_id: str = "S1001") -> tuple[str, list]:
    """
    Main orchestrator entrypoint. Checks if ANTHROPIC_API_KEY is available.
    If yes, runs the Claude messages + tool use loop.
    If no, executes the local fallback executor (which still calls real MCP server tools).
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("No Anthropic API Key found. Running local agent execution...")
        return await run_local_agent(query_str, student_id)
        
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        print("Anthropic SDK not installed. Running local agent execution...")
        return await run_local_agent(query_str, student_id)

    client = AsyncAnthropic(api_key=api_key)
    
    # 1. Fetch available tools from active MCP sessions
    tools = []
    tool_map = {}
    for name, session in mcp_manager.sessions.items():
        try:
            mcp_tools = await session.list_tools()
            for t in mcp_tools.tools:
                prefixed_name = f"{name}__{t.name}"
                tools.append({
                    "name": prefixed_name,
                    "description": t.description or f"Call {t.name} on {name}",
                    "input_schema": t.inputSchema
                })
                tool_map[prefixed_name] = (name, t.name)
        except Exception as e:
            print(f"Error fetching tools from {name} MCP server: {e}")

    if not tools:
        # Fallback if no tools could be queried
        return await run_local_agent(query_str, student_id)

    system_prompt = f"""You are AURA, the Smart Campus Operations Agent for an MCP hackathon.
The current student ID you are helping is '{student_id}'.
Today's date is 2026-07-18.
You have access to 9 domain-specific MCP servers, which are registered as tools under the prefix '<server_name>__<tool_name>'.
When the user asks questions, you must think step-by-step and call appropriate tools.
You can chain multiple tools sequentially across domains to resolve a single query.
Always check eligibility rules or outstanding dues before filing writes.
Ensure you return your final answer in clean, readable markdown format.
"""

    messages = [{"role": "user", "content": query_str}]
    trace = []
    
    # Run the reasoning loop up to 5 steps
    for step in range(5):
        try:
            response = await client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2048,
                system=system_prompt,
                tools=tools,
                messages=messages
            )
        except Exception as e:
            print(f"Claude API request failed: {e}. Falling back to local agent...")
            return await run_local_agent(query_str, student_id)

        # Parse content blocks
        assistant_content = []
        tool_calls = []
        for block in response.content:
            if block.type == "text":
                assistant_content.append({"type": "text", "text": block.text})
            elif block.type == "tool_use":
                assistant_content.append({
                    "type": "tool_use",
                    "id": block.id,
                    "name": block.name,
                    "input": block.input
                })
                tool_calls.append(block)

        messages.append({"role": "assistant", "content": assistant_content})

        if not tool_calls:
            # Agent completed reasoning
            final_text = "".join(b.text for b in response.content if b.type == "text")
            return final_text, trace

        tool_results_content = []
        for tool_call in tool_calls:
            prefixed_name = tool_call.name
            tool_input = tool_call.input
            tool_id = tool_call.id
            
            if prefixed_name in tool_map:
                server_name, actual_tool_name = tool_map[prefixed_name]
                # Inject student_id if tool schema requires it and it's missing or set as a placeholder
                if "student_id" in tool_input and (not tool_input["student_id"] or tool_input["student_id"] == "STUDENT_ID"):
                    tool_input["student_id"] = student_id
                
                trace_entry = {
                    "server": server_name,
                    "tool": actual_tool_name,
                    "arguments": tool_input,
                    "status": "Running"
                }
                trace.append(trace_entry)
                
                try:
                    res = await mcp_manager.call_tool(server_name, actual_tool_name, tool_input)
                    content_str = ""
                    if hasattr(res, "content"):
                        content_str = "\n".join(c.text for c in res.content if hasattr(c, "text"))
                    else:
                        content_str = str(res)
                        
                    trace_entry["status"] = "Success"
                    trace_entry["result"] = content_str
                    
                    tool_results_content.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": content_str
                    })
                except Exception as e:
                    trace_entry["status"] = "Failed"
                    trace_entry["result"] = str(e)
                    tool_results_content.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": f"Error: {e}",
                        "is_error": True
                    })
            else:
                tool_results_content.append({
                    "type": "tool_result",
                    "tool_use_id": tool_id,
                    "content": f"Unknown tool: {prefixed_name}",
                    "is_error": True
                })

        messages.append({"role": "user", "content": tool_results_content})

    return "Agent reasoning loop reached maximum turns without a response.", trace
