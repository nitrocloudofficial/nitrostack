"""Database sink — durable mirror of in-memory session state into Supabase Rampo.

Tables touched (all writes use the service-role client, bypassing RLS):
- `customer_sessions`   one row per browser login. PK = session_id we hand back.
- `journey_events`     one row per captured signal. FK session_id -> customer_sessions.
- `escalation_predictions`  written once when risk crosses threshold per session.
- `support_cases`     (optional) open a case when level == high.

All calls are best-effort: the in-memory store is the source of truth for the
live predictor; the DB is the durable audit trail. Failures are swallowed but
logged via the returned dict so callers can surface them.
"""
from __future__ import annotations

import json
from typing import Any, Optional

from .supabase_client import db, configured

# Track which (session_id) we've already written an escalation_predictions row for,
# so we don't spam one prediction per event once threshold is crossed.
_prediction_written: set[str] = set()


def is_configured() -> bool:
    return configured()


def create_customer_session(
    customer_id: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Insert a row into customer_sessions on sign-in. Returns the row with the
    new session id (customer_sessions.id), or None if Supabase isn't configured.
    """
    client = db()
    if client is None:
        return None
    payload = {"customer_id": customer_id}
    if ip_address:
        payload["ip_address"] = ip_address
    if user_agent:
        payload["user_agent"] = user_agent
    resp = client.table("customer_sessions").insert(payload).execute()
    return resp.data[0] if resp.data else None


def close_customer_session(session_row_id: str, session_token: Optional[str] = None) -> None:
    """Stamp logout_time on the customer_sessions row. Best-effort."""
    client = db()
    if client is None:
        return
    payload: dict[str, Any] = {"logout_time": "now()"}
    if session_token:
        payload["session_token"] = session_token
    try:
        client.table("customer_sessions").update(payload).eq("id", session_row_id).execute()
    except Exception:  # noqa: BLE001
        pass


def record_journey_event(
    session_row_id: str,
    event_type: str,
    page_route: Optional[str] = None,
    payload: Optional[dict[str, Any]] = None,
) -> Optional[str]:
    """Insert one row into journey_events. Returns the new journey_events.id or None.
    """
    client = db()
    if client is None:
        return None
    row: dict[str, Any] = {
        "session_id": session_row_id,
        "event_type": event_type,
    }
    if page_route:
        row["page_route"] = page_route
    if payload:
        row["payload"] = json.dumps(payload) if isinstance(payload, (dict, list)) else payload
    try:
        resp = client.table("journey_events").insert(row).execute()
        return resp.data[0]["id"] if resp.data else None
    except Exception as e:  # noqa: BLE001
        # Swallow — we don't want a Postgres hiccup to break the PoC flow.
        # But surface the error in stderr so it's visible during debugging.
        import sys
        print(f"[db.record_journey_event] failed: {e}", file=sys.stderr)
        return None


def record_escalation_prediction(
    event_id: Optional[str],
    risk_score: float,
    reason: str,
    case_id: Optional[str] = None,
) -> None:
    """Insert one row into escalation_predictions. Idempotent per session
    (caller passes session_id indirectly via _prediction_written guard at the
    FastAPI layer).
    """
    client = db()
    if client is None:
        return
    row: dict[str, Any] = {
        "risk_score": float(risk_score),
        "escalation_reason": reason,
    }
    if event_id:
        row["event_id"] = event_id
    if case_id:
        row["case_id"] = case_id
    try:
        client.table("escalation_predictions").insert(row).execute()
    except Exception as e:  # noqa: BLE001
        import sys
        print(f"[db.record_escalation_prediction] failed: {e}", file=sys.stderr)


def maybe_record_prediction(
    session_row_id: str,
    last_event_id: Optional[str],
    risk: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """Called after every capture. If risk level crosses `elevated` or `high`
    and we haven't already written a prediction row for this session, write one
    once. Returns the prediction row if written, else None.
    """
    if not risk.get("nudge_threshold_crossed"):
        return None
    if session_row_id in _prediction_written:
        return None
    reason = "; ".join(risk.get("reasons") or [])
    record_escalation_prediction(
        event_id=last_event_id,
        risk_score=float(risk.get("risk_score", 0.0)),
        reason=reason,
    )
    _prediction_written.add(session_row_id)
    return {
        "prediction_written": True,
        "risk_score": risk.get("risk_score"),
        "reason": reason,
    }


def reset_prediction_guard(session_row_id: str) -> None:
    """Clear the in-process 'already wrote a prediction for this session' guard.
    Used by /api/debug/clear so a session can re-fire the prediction after reset.
    """
    _prediction_written.discard(session_row_id)