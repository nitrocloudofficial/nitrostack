"""
sim_bridge.py
FastAPI bridge — NitroStack TS <-> MuJoCo Physics Engine.

Supports waypoint-sequence navigation so the 3D robot physically steers
along the exact curved green CBF-deflected trajectory!
"""

import os, time, threading, socket
import numpy as np
import mujoco
import mujoco.viewer
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "amr_factory.xml")
print(f"📦 Loading: {MODEL_PATH}")

model = mujoco.MjModel.from_xml_path(MODEL_PATH)
data  = mujoco.MjData(model)

# Initialise freejoint quaternion to identity (w=1)
data.qpos[3] = 1.0
data.qpos[4] = 0.0
data.qpos[5] = 0.0
data.qpos[6] = 0.0
data.qpos[0] = 2.0
data.qpos[1] = 2.0
data.qpos[2] = 0.3

state_lock  = threading.Lock()

target_dest = {
    "waypoints": [],
    "wp_idx": 0,
    "target_x": 2.0,
    "target_y": 2.0,
    "moving": False
}

app = FastAPI(title="NitroGuard MuJoCo Bridge", version="4.5.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000",
                   "http://127.0.0.1:3001", "http://localhost:8080"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

class Cmd(BaseModel):
    targetX: float = None
    targetY: float = None
    waypoints: list = []
    linearVelocity: float = 1.2
    angularVelocity: float = 0.0

def state_dict():
    return {
        "robotId": "AMR-01",
        "x": round(float(data.qpos[0]), 3),
        "y": round(float(data.qpos[1]), 3),
        "z": 0.3,
        "heading": 0.0,
        "linearVelocity": 1.2 if target_dest["moving"] else 0.0,
        "angularVelocity": 0.0,
        "battery": 88,
        "mode": "AUTO",
        "status": "MOVING" if target_dest["moving"] else "IDLE",
    }

@app.post("/apply_command")
def apply_command(cmd: Cmd):
    with state_lock:
        wps = []
        if cmd.waypoints and len(cmd.waypoints) > 0:
            for pt in cmd.waypoints:
                if isinstance(pt, dict) and 'x' in pt and 'y' in pt:
                    wps.append((float(pt['x']), float(pt['y'])))
        
        if not wps and cmd.targetX is not None and cmd.targetY is not None:
            wps.append((float(cmd.targetX), float(cmd.targetY)))

        if wps:
            target_dest["waypoints"] = wps
            target_dest["wp_idx"] = 0
            target_dest["moving"] = True
            print(f"🎯 Waypoints sequence set in MuJoCo ({len(wps)} points): {wps[0]} -> {wps[-1]}")

        return state_dict()

@app.get("/robot_state")
def robot_state():
    with state_lock:
        return state_dict()

@app.get("/factory_layout")
def factory_layout():
    return {
        "bounds": {"width": 15, "height": 15},
        "obstacles": [
            {"id": "pressA",   "label": "Press Cell A",         "x":  5.0, "y":  5.0, "radius": 2.0},
            {"id": "cabinet",  "label": "High Voltage Cabinet", "x": 10.0, "y":  3.0, "radius": 1.5},
            {"id": "conveyor", "label": "Automated Gantry",     "x":  7.0, "y": 11.0, "radius": 2.2},
        ],
        "safetyMargin": 0.5,
    }

def find_port(start=8000):
    for p in range(start, start + 10):
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    return start

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", find_port(8000)))
    print(f"🌐 API -> http://0.0.0.0:{port}")

    cfg = uvicorn.Config(app=app, host="0.0.0.0", port=port, log_level="warning")
    srv = uvicorn.Server(cfg)
    threading.Thread(target=srv.run, daemon=True).start()

    print("🚀 Launching MuJoCo Viewer ...")
    try:
        with mujoco.viewer.launch_passive(model, data) as viewer:
            print("✅ Viewer open — AMR starts at (2.0, 2.0)")
            while viewer.is_running():
                with state_lock:
                    if target_dest["moving"] and len(target_dest["waypoints"]) > 0:
                        idx = target_dest["wp_idx"]
                        if idx < len(target_dest["waypoints"]):
                            tx, ty = target_dest["waypoints"][idx]
                            cx, cy = data.qpos[0], data.qpos[1]
                            dx, dy = tx - cx, ty - cy
                            dist   = np.hypot(dx, dy)

                            if dist > 0.08:
                                step = min(0.06, dist)
                                data.qpos[0] += (dx / dist) * step
                                data.qpos[1] += (dy / dist) * step
                            else:
                                # Reached current waypoint -> advance to next
                                target_dest["wp_idx"] += 1
                                if target_dest["wp_idx"] >= len(target_dest["waypoints"]):
                                    target_dest["moving"] = False
                                    print(f"✅ Safe trajectory complete! Final pos: ({data.qpos[0]:.2f}, {data.qpos[1]:.2f})")
                        else:
                            target_dest["moving"] = False

                        data.qpos[2] = 0.3
                        data.qpos[3] = 1.0
                        data.qpos[4] = 0.0
                        data.qpos[5] = 0.0
                        data.qpos[6] = 0.0
                        data.qvel[:] = 0.0

                    mujoco.mj_forward(model, data)
                    viewer.sync()

                time.sleep(0.016)

    except Exception as e:
        print(f"⚠️  Viewer closed: {e}")
        while True:
            time.sleep(1)
