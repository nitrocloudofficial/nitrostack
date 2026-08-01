"""Supabase client wrappers for the Escalation PoC.

Two clients:
- `anon_client`: created with the publishable/anon key. Used for user-side auth
  (sign-in / sign-up) — exactly what a browser would use.
- `service_client`: created with the service role key. Bypasses RLS. Used by the
  FastAPI server to write journey_events, escalation_predictions, and
  customer_sessions rows on behalf of any user. The service role key NEVER
  leaves the server.

Both are None when SUPABASE_URL is not configured, so the PoC falls back to its
in-memory-only behaviour if Supabase isn't wired.
"""
from __future__ import annotations

import os
from typing import Any, Optional

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()


def configured() -> bool:
    return bool(
        SUPABASE_URL
        and SUPABASE_SERVICE_KEY
        and not SUPABASE_SERVICE_KEY.startswith("replace_")
    )


def _make_client(key: str, *, allow_placeholder: bool = False) -> Optional[Client]:
    if not SUPABASE_URL or not key:
        return None
    if not allow_placeholder and key.startswith("replace_"):
        return None
    return create_client(SUPABASE_URL, key)


anon_client: Optional[Client] = _make_client(SUPABASE_ANON_KEY)
service_client: Optional[Client] = _make_client(SUPABASE_SERVICE_KEY)


def db() -> Optional[Client]:
    """Return the service-role client (bypasses RLS). For server writes only."""
    return service_client


def auth_admin() -> Any:
    """Return the service-role auth admin (lets server manage users)."""
    if service_client is None:
        return None
    return service_client.auth.admin