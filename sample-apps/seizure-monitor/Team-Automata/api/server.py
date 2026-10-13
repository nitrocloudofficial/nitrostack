"""
Standalone HTTP API wrapping the CAD scripts (cad/fill.py, cad/precise_cap.py,
cad/repair_mesh.py) that used to only be invoked as local subprocesses from
the NitroStack tools.

Why this exists: NitroCloud's managed hosting runs the MCP server in a
Node-only container with no Python interpreter, so `fill`/`generate_precise_cap`/
`repair_mesh` can't spawn `python3` there. This service runs wherever Python +
CadQuery + PyMeshLab actually are available (your own machine, a VPS, Render/
Railway/Fly.io/etc.), and the Node tools call it over HTTP instead.

Endpoints mirror the existing subprocess contracts exactly, so the TS side
only needs an HTTP call bolted on, not a rewrite:

  POST /fill    body = FillGeometry JSON        -> {fileBase64, format, sizeBytes, warnings}
  POST /cap     body = CapDimensions JSON       -> {fileBase64, format, sizeBytes}
  POST /repair  body = repair request JSON      -> {repairedBase64, format, sizeBytes, summary}
  GET  /health                                  -> {status: "ok"}

Auth: if CAD_API_KEY is set in the environment, every POST must include a
matching `X-API-Key` header. Leave CAD_API_KEY unset only for fully local
testing (e.g. behind localhost) — this service executes CAD scripts on
whatever host it runs on, so treat it like any other exposed compute endpoint.

Run locally:
    pip install -r requirements.txt
    uvicorn api.server:app --host 0.0.0.0 --port 8787

Then point the Node side at it (in .env, wherever the MCP server actually
runs — e.g. NitroCloud's environment variables dashboard):
    CAD_API_URL=https://your-api-host
    CAD_API_KEY=<same value as above>
"""
import asyncio
import base64
import json
import os
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

# Repo root (one level up from api/), so relative paths like "cad/fill.py"
# resolve the same way whether this is run from the repo root or elsewhere.
REPO_ROOT = Path(__file__).resolve().parent.parent
CAD_API_KEY = os.environ.get("CAD_API_KEY")

app = FastAPI(title="bottle-cap-cad-api", version="1.0.0")


def _check_auth(x_api_key: Optional[str]) -> None:
    if CAD_API_KEY and x_api_key != CAD_API_KEY:
        raise HTTPException(status_code=401, detail="missing or invalid X-API-Key")


async def _run_script(args: list[str]) -> str:
    """Run `python3 <args...>` from the repo root, same as the old
    execFile(pythonCmd, [...]) calls on the Node side. Returns stdout."""
    proc = await asyncio.create_subprocess_exec(
        "python3",
        *args,
        cwd=str(REPO_ROOT),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"{args[0]} failed: {stderr.decode(errors='replace')[:4000]}",
        )
    return stdout.decode()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/fill")
async def fill(payload: dict, x_api_key: Optional[str] = Header(default=None)):
    _check_auth(x_api_key)
    stdout = await _run_script(["cad/fill.py", json.dumps(payload)])
    try:
        parsed = json.loads(stdout.strip())
    except json.JSONDecodeError:
        # Safety net matching fill.tools.ts's own fallback, in case fill.py
        # is ever invoked in a form that prints a bare path.
        parsed = {"file": stdout.strip()}

    file_path = Path(parsed["file"])
    data = file_path.read_bytes()
    file_path.unlink(missing_ok=True)

    return {
        "fileBase64": base64.b64encode(data).decode(),
        "format": "stl",
        "sizeBytes": len(data),
        "warnings": parsed.get("warnings", []),
    }


@app.post("/cap")
async def cap(payload: dict, x_api_key: Optional[str] = Header(default=None)):
    _check_auth(x_api_key)
    stdout = await _run_script(["cad/precise_cap.py", json.dumps(payload)])
    file_path = Path(stdout.strip())
    data = file_path.read_bytes()
    file_path.unlink(missing_ok=True)

    return {
        "fileBase64": base64.b64encode(data).decode(),
        "format": "stl",
        "sizeBytes": len(data),
    }


class RepairRequest(BaseModel):
    url: Optional[str] = None
    stlBase64: Optional[str] = None
    inputFormat: str = "stl"
    outputFormat: str = "stl"
    repairLevel: str = "standard"
    holeSizeThreshold: int = 500
    targetFaceCount: int = 50000


@app.post("/repair")
async def repair(payload: RepairRequest, x_api_key: Optional[str] = Header(default=None)):
    _check_auth(x_api_key)

    if not payload.url and not payload.stlBase64:
        raise HTTPException(status_code=400, detail="Provide either `url` or `stlBase64`.")
    if payload.url and payload.stlBase64:
        raise HTTPException(status_code=400, detail="Provide either `url` or `stlBase64`, not both.")

    uid = uuid.uuid4().hex
    tmp = Path(tempfile.gettempdir())
    in_path = tmp / f"repair_in_{uid}.{payload.inputFormat}"
    out_path = tmp / f"repair_out_{uid}.{payload.outputFormat}"

    try:
        if payload.stlBase64:
            in_path.write_bytes(base64.b64decode(payload.stlBase64))

        cfg = {
            "url": payload.url,
            "inPath": str(in_path) if payload.stlBase64 else None,
            "outPath": str(out_path),
            "repairLevel": payload.repairLevel,
            "holeSizeThreshold": payload.holeSizeThreshold,
            "targetFaceCount": payload.targetFaceCount,
        }
        stdout = await _run_script(["cad/repair_mesh.py", json.dumps(cfg)])
        summary = json.loads(stdout.strip())

        data = out_path.read_bytes()
        return {
            "repairedBase64": base64.b64encode(data).decode(),
            "format": payload.outputFormat,
            "sizeBytes": len(data),
            "summary": summary,
        }
    finally:
        in_path.unlink(missing_ok=True)
        out_path.unlink(missing_ok=True)
