# app.py - Real sidecar for the Kernels model-building system.
# Exposes each agent as an endpoint, a synchronous /build_model, and an
# ASYNC build (/build_async + /status/{job_id}) so a website can poll live
# progress while the loop runs.
#
# Run:  uvicorn app:app --port 8000 --reload

import os
import json
import uuid
import threading

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

import plan as planner
import scout as scout_agent
import curate as curator
import train_real as trainer
import diagnose as diagnostician
import sentinel as sentinel_agent
import orchestrator as orch
import report as report_gen

app = FastAPI(title="Kernels - agent sidecar")

# allow the local website (any origin in dev) to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

STORAGE_ROOT = "C:/hack/storage"

# in-memory job registry for async builds
JOBS: dict = {}


@app.get("/health")
def health():
    return {"ok": True}


# ---------------------------------------------------------------- Planner
class PlanReq(BaseModel):
    request: str
    target_accuracy: float = 0.85
    images_per_class: int = 30
    max_iterations: int = 3


@app.post("/plan")
def plan_ep(req: PlanReq):
    return planner.plan(req.request, target_accuracy=req.target_accuracy,
                        images_per_class=req.images_per_class,
                        max_iterations=req.max_iterations)


# ---------------------------------------------------------------- Scout
class ScoutReq(BaseModel):
    query: str
    n: int = 30
    out_dir: str
    base_class: str = ""


@app.post("/scout")
def scout_ep(req: ScoutReq):
    res = scout_agent.fetch_images(req.query, req.n, req.out_dir, req.base_class)
    return {"query": res.query, "requested": res.requested,
            "downloaded": res.downloaded, "per_source": res.per_source,
            "errors": res.errors, "out_dir": res.out_dir}


# ---------------------------------------------------------------- Curator
class CurateReq(BaseModel):
    images_root: str
    threshold: float = 0.24


@app.post("/curate")
def curate_ep(req: CurateReq):
    return curator.curate(req.images_root, req.threshold)


# ---------------------------------------------------------------- Trainer
class TrainReq(BaseModel):
    images_root: str


@app.post("/train")
def train_ep(req: TrainReq):
    return trainer.train_from_cache(req.images_root)


# ---------------------------------------------------------------- Diagnostician
class DiagnoseReq(BaseModel):
    train_report: dict
    target_accuracy: float = 0.85


@app.post("/diagnose")
def diagnose_ep(req: DiagnoseReq):
    return diagnostician.diagnose(req.train_report,
                                  target_accuracy=req.target_accuracy)


# ---------------------------------------------------------------- Sentinel
class ScanReq(BaseModel):
    path: str


@app.post("/scan")
def scan_ep(req: ScanReq):
    return sentinel_agent.scan_pickle(req.path)


class ConvertReq(BaseModel):
    path: str
    out_path: Optional[str] = None


@app.post("/convert")
def convert_ep(req: ConvertReq):
    return sentinel_agent.convert_safetensors(req.path, req.out_path)


class EvilReq(BaseModel):
    out_path: str


@app.post("/make_evil")
def make_evil_ep(req: EvilReq):
    return sentinel_agent.make_malicious_fixture(req.out_path)




class ReportReq(BaseModel):
    state_path: str


@app.post("/report")
def report_ep(req: ReportReq):
    return report_gen.generate_report(req.state_path)


@app.get("/download_report")
def download_report(path: str):
    # stream a generated audit PDF to the browser
    if not os.path.exists(path):
        return {"error": f"report not found: {path}"}
    return FileResponse(path, media_type="application/pdf",
                        filename="kernels_audit_report.pdf")

# ---------------------------------------------------------------- Orchestrator (sync)
class BuildReq(BaseModel):
    request: str
    target_accuracy: float = 0.85
    images_per_class: int = 12
    max_iterations: int = 3


def _summarize(state: dict) -> dict:
    return {
        "request": state.get("request"),
        "classes": state.get("classes"),
        "iterations": [
            {"iteration": it["iteration"], "accuracy": it["accuracy"],
             "decision": it["decision"], "per_class": it.get("per_class"),
             "confusion": it.get("confusion")}
            for it in state.get("iterations", [])
        ],
        "final_model": state.get("final_model"),
        "events": state.get("events"),
        "state_file": os.path.join(state.get("run_dir", ""), "state.json"),
        "audit_report": state.get("audit_report"),
    }


@app.post("/build_model")
def build_model_ep(req: BuildReq):
    state = orch.run(req.request, target=req.target_accuracy,
                     per_class=req.images_per_class,
                     max_iter=req.max_iterations)
    return _summarize(state)


# ---------------------------------------------------------------- Orchestrator (async)
@app.post("/build_async")
def build_async_ep(req: BuildReq):
    job_id = uuid.uuid4().hex[:12]
    JOBS[job_id] = {"status": "running", "events": [], "result": None,
                    "request": req.request}

    def worker():
        try:
            # monkeypatch the orchestrator's logger to also push into this job
            orig_log = orch._log

            def tee_log(state, agent, msg, data=None):
                orig_log(state, agent, msg, data)
                JOBS[job_id]["events"].append(
                    {"agent": agent, "message": msg, "data": data})

            orch._log = tee_log
            state = orch.run(req.request, target=req.target_accuracy,
                             per_class=req.images_per_class,
                             max_iter=req.max_iterations)
            orch._log = orig_log
            JOBS[job_id]["result"] = _summarize(state)
            JOBS[job_id]["status"] = "done"
        except Exception as e:  # noqa: BLE001
            JOBS[job_id]["status"] = "error"
            JOBS[job_id]["error"] = str(e)

    threading.Thread(target=worker, daemon=True).start()
    return {"job_id": job_id}


@app.get("/status/{job_id}")
def status_ep(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return {"error": "unknown job_id"}
    return {"status": job["status"], "events": job["events"],
            "result": job.get("result"), "error": job.get("error"),
            "request": job.get("request")}
