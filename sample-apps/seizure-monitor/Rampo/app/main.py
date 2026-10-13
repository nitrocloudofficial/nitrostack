"""FastAPI backend for the escalation-prediction PoC.

Serves the banking demo page, ingests client-side behavioral signals,
and exposes the escalation-risk predictor (the kernel of an MCP tool).
Optionally forwards events to PostHog Cloud.
"""
from __future__ import annotations

import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from . import db as db_sink
from .auth import router as auth_router
from .escalation import store

load_dotenv()

POSTHOG_KEY = os.getenv("POSTHOG_KEY", "")
POSTHOG_HOST = os.getenv("POSTHOG_HOST", "https://us.i.posthog.com")

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

app = FastAPI(title="Escalation Prediction PoC")

# CORS for the Vite dev server (TanStack Start React frontend) on common ports.
# The capture proxy is the in-memory predictor + PostHog mirror, called from the
# browser. Service-role rights are server-side; anon JWTs are forwarded by the
# browser itself when (and only when) the user is signed in.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+|http://127\.0\.0\.1:\d+|http://100\.\d+\.\d+\.\d+:\d+|http://10\.\d+\.\d+\.\d+:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)
app.include_router(auth_router)


def _forward_to_posthog(event: dict) -> None:
    """Best-effort forward of a captured event to PostHog Cloud.

    Only fires when POSTHOG_KEY is set to a real key. Otherwise no-op so the
    PoC works fully offline (client JS already sends to PostHog directly via
    the snippet; this is a server-side mirror for events the server observes).
    """
    if not POSTHOG_KEY or POSTHOG_KEY.startswith("phc_replace"):
        return
    payload = {
        "api_key": POSTHOG_KEY,
        "event": event.get("event", "signal"),
        "distinct_id": event.get("distinct_id", "anon"),
        "properties": event.get("properties", {}),
    }
    try:
        httpx.post(f"{POSTHOG_HOST}/capture", json=payload, timeout=3.0)
    except Exception:  # noqa: BLE001 - best effort
        pass


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(
        request,
        "index.html",
        {"posthog_key": POSTHOG_KEY, "posthog_host": POSTHOG_HOST},
    )


@app.post("/api/capture")
async def capture(request: Request):
    """Ingest a behavioral signal from the browser.

    Body: {
      session_id, distinct_id, kind, event, funnel_step, properties,
      session_row_id (optional — Supabase customer_sessions.id, set on sign-in)
    }
    """
    data = await request.json()
    session_id = data.get("session_id") or data.get("distinct_id") or "anon"
    kind = data.get("kind")
    funnel_step = data.get("funnel_step")
    session_row_id = data.get("session_row_id")

    if funnel_step:
        store.set_funnel_step(session_id, funnel_step)
    if kind:
        store.add_signal(session_id, kind, data.get("properties"))

    properties = {
        "kind": kind,
        "funnel_step": funnel_step,
        **(data.get("properties") or {}),
    }

    # Mirror to PostHog Cloud (best-effort).
    _forward_to_posthog(
        {
            "distinct_id": data.get("distinct_id", session_id),
            "event": data.get("event", kind or "signal"),
            "properties": properties,
        }
    )

    # Mirror to Supabase journey_events (best-effort). Only if caller passed
    # session_row_id (i.e. user signed in).
    journey_event_id = None
    if session_row_id and kind:
        journey_event_id = db_sink.record_journey_event(
            session_row_id=session_row_id,
            event_type=kind,
            page_route=funnel_step,
            payload=properties,
        )

    risk = store.predict_escalation_risk(session_id)

    # If risk crossed threshold and we haven't written an escalation_predictions
    # row for this session yet, write one.
    prediction = None
    if session_row_id:
        prediction = db_sink.maybe_record_prediction(
            session_row_id=session_row_id,
            last_event_id=journey_event_id,
            risk=risk,
        )

    return JSONResponse(
        {
            "ok": True,
            "risk": risk,
            "supabase": {
                "journey_event_id": journey_event_id,
                "prediction_written": bool(prediction),
            },
        }
    )


@app.get("/api/session/{session_id}/risk")
async def session_risk(session_id: str):
    return JSONResponse(store.predict_escalation_risk(session_id))


@app.post("/api/session/{session_id}/funnel")
async def set_funnel(session_id: str, request: Request):
    data = await request.json()
    store.set_funnel_step(session_id, data.get("step", "default"))
    return JSONResponse({"ok": True})


# The "MCP tool" the support agent calls — exposed here as plain JSON for the PoC.
@app.get("/api/tool/predict_escalation_risk")
async def tool_predict(session_id: str):
    return JSONResponse(store.predict_escalation_risk(session_id))


@app.get("/api/sessions")
async def list_sessions():
    return JSONResponse(store.list_sessions())


@app.post("/api/debug/clear/{session_id}")
async def clear_session(session_id: str):
    store.clear(session_id)
    db_sink.reset_prediction_guard(session_id)
    return JSONResponse({"ok": True})


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "posthog_configured": bool(POSTHOG_KEY and not POSTHOG_KEY.startswith("phc_replace")),
        "supabase_configured": db_sink.is_configured(),
    }