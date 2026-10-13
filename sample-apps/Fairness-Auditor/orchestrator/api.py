"""
orchestrator/api.py — Minimal HTTP endpoint for CI gate (Gap #5, #11).

DELIBERATELY plain HTTP via FastAPI (already in requirements.txt).
This is NOT an MCP server. The GitHub Action calls POST /ci-gate/{scan_run_id}
over plain HTTP because CI environments want a dependency-light, reliable call,
not MCP client machinery.

The same underlying logic is ALSO exposed as the run_ci_gate MCP tool —
but that's Person A's job on feat/mcp-server-wrapper, wrapping
gate.compute_ci_gate() UNMODIFIED. Do not add MCP imports here.

NOTE: No auth is implemented — this is intentionally open for hackathon
purposes. A real deployment would need auth (API key, JWT, etc.) before
exposing this endpoint to anything outside localhost.

Run standalone:
    cd orchestrator
    ../.venv/Scripts/python.exe -m uvicorn api:app --host 0.0.0.0 --port 8100
    # or:
    ../.venv/Scripts/python.exe api.py
"""

from __future__ import annotations

import sys
from pathlib import Path

_orchestrator_dir = Path(__file__).resolve().parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

from fastapi import FastAPI
from gate import compute_ci_gate

app = FastAPI(
    title="AFO CI Gate",
    description=(
        "Minimal HTTP endpoint for the CI gate. Deliberately plain HTTP, "
        "not MCP - see build plan Section 6.6 / Gap #11."
    ),
    version="0.1.0",
)


@app.post("/ci-gate/{scan_run_id}")
def ci_gate_endpoint(scan_run_id: str):
    """
    CI gate endpoint. Calls compute_ci_gate(scan_run_id) and returns
    the result as JSON.

    Returns 200 regardless of pass/fail — the GitHub Action checks the
    `passed` field in the JSON body, not the HTTP status code.
    """
    result = compute_ci_gate(scan_run_id)
    return result


@app.get("/health")
def health():
    return {"status": "ok", "service": "afo-ci-gate"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
