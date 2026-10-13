"""Supabase Auth routes for the Escalation PoC.

Two endpoints:
    POST /api/auth/signup   {email, password}  →  creates a Supabase user
    POST /api/auth/signin   {email, password}  →  signs in, creates a customer_sessions
                                                  row, returns access_token + session_row_id

Also:
    GET  /api/auth/me       (Bearer token)     →  returns the user from the JWT
    POST /api/auth/logout   (Bearer token)     →  stamps logout_time on the session row

Sign-in flow (service-role pattern):
    1. Server signs in via anon client (gets user access_token + user.id).
    2. Server immediately uses the service-role client to INSERT into
       customer_sessions (which RLS would have allowed via the user's JWT too,
       but service-role keeps it uniform with the other writes).
    3. Server hands back the customer_sessions.id as `session_row_id` to the
       browser. The browser includes it on every subsequent /api/capture call so
       the server can write journey_events + escalation_predictions against it.
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from . import db as db_sink
from .supabase_client import anon_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _require_supabase() -> None:
    """Sign-in / sign-up only need the anon client. Service role is optional
    (used for best-effort DB writes elsewhere)."""
    if anon_client is None:
        raise HTTPException(
            status_code=503,
            detail="Supabase anon client not configured. Set SUPABASE_URL / SUPABASE_ANON_KEY.",
        )


def _summarize_user(user: Any) -> dict[str, Any]:
    return {
        "id": getattr(user, "id", None),
        "email": getattr(user, "email", None),
        "created_at": str(getattr(user, "created_at", "")),
    }


@router.post("/signup")
async def signup(request: Request):
    _require_supabase()
    data = await request.json()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")
    try:
        resp = anon_client.auth.sign_up({"email": email, "password": password})
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"signup failed: {e}") from e
    user = getattr(resp, "user", None)
    return JSONResponse(
        {"ok": True, "user": _summarize_user(user) if user else None, "session": getattr(resp, "session", None) is not None}
    )


@router.post("/signin")
async def signin(request: Request):
    _require_supabase()
    data = await request.json()
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")

    try:
        resp = anon_client.auth.sign_in_with_password({"email": email, "password": password})
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"invalid credentials: {e}") from e

    user = getattr(resp, "user", None)
    session = getattr(resp, "session", None)
    if not user or not session:
        raise HTTPException(status_code=500, detail="auth returned no session")

    access_token = getattr(session, "access_token", None)

    # Create a customer_sessions row via service-role client (bypasses RLS).
    ip = (
        request.client.host if request.client else None
    )
    ua = request.headers.get("user-agent")
    sess_row = db_sink.create_customer_session(
        customer_id=user.id, ip_address=ip, user_agent=ua
    )
    session_row_id = sess_row["id"] if sess_row else None

    return JSONResponse(
        {
            "ok": True,
            "user": _summarize_user(user),
            "access_token": access_token,
            "session_row_id": session_row_id,
        }
    )


@router.get("/me")
async def me(authorization: Optional[str] = Header(default=None)):
    _require_supabase()
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        # Use anon client to resolve the user from their JWT.
        anon_client.auth.set_session(token, "")  # refresh_token unknown — ok for lookup
        user = anon_client.auth.get_user(token).user
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=401, detail=f"invalid token: {e}") from e
    return JSONResponse({"ok": True, "user": _summarize_user(user)})


@router.post("/logout")
async def logout(request: Request):
    _require_supabase()
    data = await request.json()
    session_row_id = data.get("session_row_id")
    if session_row_id:
        db_sink.close_customer_session(session_row_id)
    return JSONResponse({"ok": True})