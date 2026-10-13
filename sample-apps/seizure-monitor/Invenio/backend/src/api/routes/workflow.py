import time
import asyncio
from typing import Dict
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

router = APIRouter()

# In-memory store for demo workflow runs
WORKFLOW_RUNS: Dict[str, dict] = {}

class RunRequest(BaseModel):
    query: str

def simulate_workflow(run_id: str, query: str):
    """
    Background task that simulates a sequential workflow execution
    over ~15 seconds to look impressive on demo.
    """
    nodes = [
        {"id": "node_search", "label": "Research Search", "status": "pending"},
        {"id": "node_correlate", "label": "Correlation Engine", "status": "pending"},
        {"id": "node_graph", "label": "Knowledge Graph", "status": "pending"},
        {"id": "node_opportunity", "label": "Opportunity Detection", "status": "pending"},
        {"id": "node_report", "label": "Report Synthesis", "status": "pending"}
    ]
    
    WORKFLOW_RUNS[run_id] = {
        "status": "running",
        "query": query,
        "nodes": nodes,
        "logs": [],
        "summary": None
    }
    
    def add_log(msg: str):
        WORKFLOW_RUNS[run_id]["logs"].append({"timestamp": time.time(), "message": msg})

    # Execute nodes sequentially
    for i, node in enumerate(nodes):
        node["status"] = "running"
        add_log(f"Starting {node['label']}...")
        
        # Simulate processing time
        time.sleep(2)
        
        node["status"] = "completed"
        node["execution_ms"] = 2000
        node["confidence"] = 0.95 - (i * 0.05)
        add_log(f"Completed {node['label']} successfully.")
        
    WORKFLOW_RUNS[run_id]["status"] = "completed"
    WORKFLOW_RUNS[run_id]["summary"] = {
        "title": f"Autonomous Research Complete: {query}",
        "description": "Successfully synthesized cross-domain insights.",
        "findings_count": 12
    }
    add_log("Workflow execution fully completed.")


@router.post("/run")
async def run_workflow(req: RunRequest, background_tasks: BackgroundTasks):
    run_id = f"run_{int(time.time())}"
    background_tasks.add_task(simulate_workflow, run_id, req.query)
    return {"run_id": run_id}

@router.get("/status/{run_id}")
async def get_workflow_status(run_id: str):
    if run_id not in WORKFLOW_RUNS:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return {"run": WORKFLOW_RUNS[run_id]}
