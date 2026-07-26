from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import sys
import os
import tempfile

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from agents.orchestrator.agent import OrchestratorAgent

app = FastAPI(title="ADIP Orchestrator API", description="Autonomous Product Intelligence Platform Orchestrator")

_static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
_dashboard_path = os.path.join(_static_dir, "dashboard.html")

def get_dashboard_html():
    if os.path.exists(_dashboard_path):
        with open(_dashboard_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>APIP Dashboard Not Found</h1>"

orchestrator = OrchestratorAgent()

class WorkflowRequest(BaseModel):
    goal: str
    user_id: str = "anonymous"
    priority: int = 1

@app.get("/", response_class=HTMLResponse)
def read_root():
    """Serve the APIP Dashboard"""
    return HTMLResponse(content=get_dashboard_html(), status_code=200)

@app.post("/workflows")
def submit_workflow(req: WorkflowRequest):
    wf_id = orchestrator.submit_workflow({"goal": req.goal}, user_id=req.user_id, priority=req.priority)
    return {"workflow_id": wf_id, "status": "SUBMITTED"}

@app.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: str):
    status = orchestrator.get_workflow_status(workflow_id)
    if not status:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return status

@app.get("/workflows/{workflow_id}/demo_html", response_class=HTMLResponse)
def get_demo_html(workflow_id: str):
    """Serve the Demo Agent's generated interactive 3D HTML showcase for an iframe"""
    status = orchestrator.get_workflow_status(workflow_id)
    if not status or "context" not in status:
        raise HTTPException(status_code=404, detail="Workflow context not found")
    demo_out = status["context"].get("demo_output", {})
    file_path = demo_out.get("animation_file", "")
    if file_path and os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    # Fallback inline showcase if file isn't on disk
    return HTMLResponse(content=f"<html><body style='background:#0a0e1a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;'><h2>3D Demo Showcase for Workflow {workflow_id}</h2></body></html>", status_code=200)

@app.get("/workflows/{workflow_id}/explorer_html", response_class=HTMLResponse)
def get_explorer_html(workflow_id: str):
    """Serve the Explorer Agent's generated interactive video showcase for an iframe"""
    status = orchestrator.get_workflow_status(workflow_id)
    if not status or "context" not in status:
        raise HTTPException(status_code=404, detail="Workflow context not found")
    exp_out = status["context"].get("explorer_output", {})
    file_path = exp_out.get("explorer_video_file", "")
    if file_path and os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    return HTMLResponse(content=f"<html><body style='background:#0a0e1a;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;'><h2>Explorer Video Showcase for Workflow {workflow_id}</h2></body></html>", status_code=200)

@app.get("/system/status")
def system_status():
    return orchestrator.get_system_status()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "3000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
