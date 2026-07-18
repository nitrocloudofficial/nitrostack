import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager

# Add root project path to PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.agent.orchestrator import mcp_manager, query_agent_orchestrator
from backend.api import (
    attendance_api, timetable_api, complaint_api, hostel_api,
    library_api, finance_api, placement_api, events_api, profile_api
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start all 9 MCP servers as background process threads
    print("==================================================")
    print("AURA Backend Startup: Initializing MCP client connections...")
    await mcp_manager.start()
    print("All MCP Servers registered successfully.")
    print("==================================================")
    yield
    # Shutdown: Stop subprocesses cleanly
    print("AURA Backend Shutdown: Cleaning up MCP connections...")
    await mcp_manager.stop()
    print("MCP connections closed.")

app = FastAPI(
    title="AURA — Smart Campus Operations API",
    description="FastAPI Backend for AURA Agent Console and REST widgets.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local React/Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include domain REST routes
app.include_router(attendance_api.router, prefix="/api")
app.include_router(timetable_api.router, prefix="/api")
app.include_router(complaint_api.router, prefix="/api")
app.include_router(hostel_api.router, prefix="/api")
app.include_router(library_api.router, prefix="/api")
app.include_router(finance_api.router, prefix="/api")
app.include_router(placement_api.router, prefix="/api")
app.include_router(events_api.router, prefix="/api")
app.include_router(profile_api.router, prefix="/api")

# Agent Console query payload schema
class AgentQueryRequest(BaseModel):
    query: str
    student_id: str = "S1001"

@app.post("/agent/query")
async def execute_agent_query(payload: AgentQueryRequest):
    """
    Main conversational agent route. Runs the query through the orchestrator
    which coordinates tool-use across the 9 MCP servers.
    """
    try:
        response_text, trace = await query_agent_orchestrator(payload.query, payload.student_id)
        return {
            "query": payload.query,
            "student_id": payload.student_id,
            "response": response_text,
            "trace": trace
        }
    except Exception as e:
        return {
            "query": payload.query,
            "student_id": payload.student_id,
            "response": f"An error occurred while compiling your request: {str(e)}",
            "trace": [{"server": "system", "tool": "orchestrator", "arguments": {}, "status": "Failed", "result": str(e)}]
        }

@app.get("/")
def read_root():
    return {"status": "AURA operational", "engine": "FastAPI + MCP", "timestamp": "2026-07-18T00:00:00"}
