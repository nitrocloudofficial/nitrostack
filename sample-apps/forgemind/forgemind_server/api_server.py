import os
import json
import logging
from typing import Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from mcp.client.stdio import stdio_client, StdioServerParameters
from mcp.client.session import ClientSession
from forgemind_server.orchestrator import MCPOrchestrator
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

from typing import List
from fastapi import WebSocket, WebSocketDisconnect

# Global instances & connection list
mcp_session = None
orchestrator = None
active_connections: List[WebSocket] = []

async def broadcast_log(message: str):
    log.info(f"Broadcasting to WS: {message}")
    for ws in list(active_connections):
        try:
            await ws.send_text(json.dumps({"type": "log", "message": message}))
        except Exception as e:
            log.error(f"Error broadcasting log: {e}")
            if ws in active_connections:
                active_connections.remove(ws)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global mcp_session, orchestrator
    
    script_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "nitrostack-mcp-server", "mcp_wrapper.cjs"))
    
    server_params = StdioServerParameters(
        command="node",
        args=[script_path],
        env={**os.environ, "PATH": os.environ.get("PATH", "")}
    )
    
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            mcp_session = session
            orchestrator = MCPOrchestrator(session, on_log=broadcast_log)
            log.info("✅ ForgeMind MCP Session Initialized and AI Orchestrator Ready")
            yield
            
app = FastAPI(lifespan=lifespan, title="ForgeMind API Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class InjectFaultRequest(BaseModel):
    machineId: str
    sensor: str
    value: float
    scenarioId: str = None

class McpToolCallRequest(BaseModel):
    toolName: str
    args: Dict[str, Any]

@app.get("/health")
async def health():
    return {"ok": True, "service": "forgemind-api-gateway"}

@app.post("/api/simulate-fault")
async def simulate_fault(req: InjectFaultRequest):
    if not orchestrator:
        return {"error": "Orchestrator not ready"}
    
    # Construct a fault alert payload similar to what the correlation engine would send
    fault_alert = {
        "trigger_reason": f"{req.sensor} anomaly detected on {req.machineId} with value {req.value}",
        "machine_id": req.machineId
    }
    
    try:
        log.info(f"Triggering fault simulation for {req.machineId}")
        result = await orchestrator.analyze_fault(fault_alert)
        return {"success": True, "result": result.model_dump()}
    except Exception as e:
        import traceback
        log.error(f"Error during AI analysis: {e}")
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@app.post("/api/mcp/tool")
async def call_mcp_tool(req: McpToolCallRequest):
    if not mcp_session:
        return {"error": "MCP Session not ready"}
    try:
        log.info(f"Direct MCP Tool Call: {req.toolName}")
        result = await mcp_session.call_tool(req.toolName, req.args)
        return {"success": True, "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/machines")
async def get_machines():
    data_path = os.path.join(os.path.dirname(__file__), "data", "equipment (2).json")
    telemetry_path = os.path.join(os.path.dirname(__file__), "data", "telemetry_logs.json")
    try:
        with open(data_path, "r") as f:
            raw_equipment = json.load(f)
            
        telemetry_map = {}
        try:
            with open(telemetry_path, "r") as f:
                raw_telemetry = json.load(f)
                for entry in raw_telemetry:
                    telemetry_map[entry.get("equipment_id")] = entry
        except Exception as te:
            log.error(f"Failed to read telemetry logs: {te}")
            
        machines = []
        for eq in raw_equipment:
            # Map status
            status_map = {
                "Running": "HEALTHY",
                "Running - Degraded": "WARNING",
                "Stopped - Fault": "CRITICAL"
            }
            eq_id = eq.get("equipment_id", "")
            
            # Load real telemetry metrics from telemetry_logs.json
            tel = telemetry_map.get(eq_id, {})
            vibration = tel.get("vibration", 1.2)
            temperature = tel.get("temperature", 45.0)
            
            tel_status = tel.get("status")
            if tel_status == "Alarm":
                mapped_status = "WARNING"
            elif tel_status == "Critical":
                mapped_status = "CRITICAL"
            else:
                mapped_status = status_map.get(eq.get("status"), "HEALTHY")
                
            health_score = 98 if mapped_status == "HEALTHY" else (65 if mapped_status == "WARNING" else 42)
            
            machines.append({
                "id": eq_id,
                "name": eq.get("name", ""),
                "line": eq.get("production_line", ""),
                "type": eq.get("model", ""),
                "status": mapped_status,
                "healthScore": health_score,
                "telemetry": {
                    "vibration": vibration,
                    "temperature": temperature,
                    "powerConsumption": tel.get("power_consumption", 15.0) if "power_consumption" in tel else 15.0,
                    "cycleTime": tel.get("cycle_time", 30.0) if "cycle_time" in tel else 30.0
                },
                "lastMaintenance": eq.get("last_service_date", ""),
                "assignedTechnician": "Unassigned"
            })
        return machines
    except Exception as e:
        log.error(f"Failed to read machines: {e}")
        return []

@app.post("/api/simulate-plc-event")
async def simulate_plc_event(req: Dict[str, Any]):
    if not orchestrator:
        return {"error": "Orchestrator not ready"}
    
    trigger_reason = f"PLC EVENT [{req.get('eventType', 'UNKNOWN')}]: {req.get('alarmDescription', 'N/A')} (Alarm {req.get('alarmCode', 'N/A')}). "
    trigger_reason += f"Telemetry: {json.dumps(req.get('telemetry', {}))} | "
    trigger_reason += f"Operator Note: {req.get('operatorNote', '')}"
    
    fault_alert = {
        "trigger_reason": trigger_reason,
        "machine_id": req.get("equipmentId", "UNKNOWN")
    }
    
    try:
        log.info(f"Triggering rich PLC fault simulation for {req.get('equipmentId')}")
        result = await orchestrator.analyze_fault(fault_alert)
        return {"success": True, "result": result.model_dump()}
    except Exception as e:
        log.error(f"Error during AI analysis: {e}")
        return {"success": False, "error": str(e)}

@app.get("/api/scenarios")
async def get_scenarios():
    scenarios_dir = os.path.join(os.path.dirname(__file__), "scenarios")
    scenarios = []
    try:
        for filename in os.listdir(scenarios_dir):
            if filename.endswith(".json"):
                with open(os.path.join(scenarios_dir, filename), "r") as f:
                    scenarios.append(json.load(f))
        return scenarios
    except Exception as e:
        log.error(f"Failed to read scenarios: {e}")
        return []

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    active_connections.append(ws)
    log.info("WebSocket connected to dashboard.")
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        if ws in active_connections:
            active_connections.remove(ws)
        log.info("WebSocket disconnected.")

if __name__ == "__main__":
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
