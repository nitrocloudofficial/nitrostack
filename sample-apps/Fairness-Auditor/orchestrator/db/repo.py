"""
orchestrator.db.repo — Thin data-access layer for AFO Postgres schema.

Uses psycopg2 with a SimpleConnectionPool. Connection string read from
orchestrator/.env via python-dotenv.

IMPORTANT: These function signatures are the contract that Person A's
mcp_server.py (Hour 14, branch feat/mcp-server-wrapper) will import
and call directly. Do NOT change signatures without coordinating with A.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

import psycopg2
import psycopg2.extras
from psycopg2.pool import SimpleConnectionPool
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Connection pool — lazily initialized on first call
# ---------------------------------------------------------------------------

_pool: Optional[SimpleConnectionPool] = None


def _get_pool() -> SimpleConnectionPool:
    """Return the module-level connection pool, creating it on first call."""
    global _pool
    if _pool is None:
        # Load .env from orchestrator/ directory
        env_path = Path(__file__).resolve().parent.parent / ".env"
        load_dotenv(dotenv_path=env_path)

        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            raise RuntimeError(
                "DATABASE_URL not set. Create orchestrator/.env with "
                "DATABASE_URL=postgresql://postgres:afo@localhost:5432/afo"
            )
        _pool = SimpleConnectionPool(1, 5, dsn=database_url)
    return _pool


def _get_conn():
    """Get a connection from the pool."""
    return _get_pool().getconn()


def _put_conn(conn):
    """Return a connection to the pool."""
    _get_pool().putconn(conn)


# ---------------------------------------------------------------------------
# Helper: row → dict using cursor.description
# ---------------------------------------------------------------------------

def _rows_to_dicts(cursor) -> list[dict]:
    """Convert cursor results to list of dicts, handling special types."""
    if cursor.description is None:
        return []
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    result = []
    for row in rows:
        d = {}
        for col, val in zip(columns, row):
            # Convert UUIDs, Decimals, datetimes to JSON-friendly types
            if hasattr(val, "hex"):  # UUID
                d[col] = str(val)
            elif hasattr(val, "isoformat"):  # datetime
                d[col] = val.isoformat()
            elif isinstance(val, (int, float, str, bool, list, dict, type(None))):
                d[col] = val
            else:
                d[col] = str(val)  # Decimal → str
        result.append(d)
    return result


# ---------------------------------------------------------------------------
# Public API — signatures are the contract for Person A's mcp_server.py
# ---------------------------------------------------------------------------

def get_findings(scan_run_id: str) -> list[dict]:
    """Return all finding rows for a scan_run_id as a list of dicts."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM finding WHERE scan_run_id = %s ORDER BY created_at",
                (scan_run_id,),
            )
            return _rows_to_dicts(cur)
    finally:
        _put_conn(conn)


def insert_mitigation_policy(
    scan_run_id: str,
    redact_fields: list[str],
    neutral_value: str,
    group_adjustments: dict,
    rationale: str,
) -> dict:
    """
    Insert a new mitigation_policy row. Enforces single-active-policy rule:
    deactivates any prior active policy for this scan_run_id first.
    Links the new policy to every open finding via mitigation_edges.
    Returns the inserted policy row as a dict.
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            # 1. Deactivate any prior active policies for this scan_run_id
            cur.execute(
                "UPDATE mitigation_policy SET is_active = false "
                "WHERE scan_run_id = %s AND is_active = true",
                (scan_run_id,),
            )

            # 2. Insert the new policy
            cur.execute(
                """
                INSERT INTO mitigation_policy
                    (scan_run_id, is_active, redact_fields, neutral_value,
                     group_adjustments, rationale)
                VALUES (%s, true, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    scan_run_id,
                    json.dumps(redact_fields),
                    neutral_value,
                    json.dumps(group_adjustments),
                    rationale,
                ),
            )
            policy_rows = _rows_to_dicts(cur)
            policy = policy_rows[0]

            # 3. Link to every open finding for this scan_run_id
            cur.execute(
                "SELECT id FROM finding "
                "WHERE scan_run_id = %s AND status = 'open'",
                (scan_run_id,),
            )
            finding_ids = [row[0] for row in cur.fetchall()]

            for fid in finding_ids:
                cur.execute(
                    "INSERT INTO mitigation_edges (finding_id, policy_id) "
                    "VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (str(fid), policy["id"]),
                )

            conn.commit()
            return policy
    except Exception:
        conn.rollback()
        raise
    finally:
        _put_conn(conn)


def get_active_policy(scan_run_id: str = None) -> dict | None:
    """
    Return the currently active mitigation_policy row.
    If scan_run_id given, scope to it; else return the most recent
    active policy overall.
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            if scan_run_id:
                cur.execute(
                    "SELECT * FROM mitigation_policy "
                    "WHERE scan_run_id = %s AND is_active = true "
                    "ORDER BY created_at DESC LIMIT 1",
                    (scan_run_id,),
                )
            else:
                cur.execute(
                    "SELECT * FROM mitigation_policy "
                    "WHERE is_active = true "
                    "ORDER BY created_at DESC LIMIT 1",
                )
            rows = _rows_to_dicts(cur)
            return rows[0] if rows else None
    finally:
        _put_conn(conn)


def get_policy_history(scan_run_id: str = None) -> list[dict]:
    """Return all mitigation_policy rows, most recent first."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            if scan_run_id:
                cur.execute(
                    "SELECT * FROM mitigation_policy "
                    "WHERE scan_run_id = %s "
                    "ORDER BY created_at DESC",
                    (scan_run_id,),
                )
            else:
                cur.execute(
                    "SELECT * FROM mitigation_policy ORDER BY created_at DESC",
                )
            return _rows_to_dicts(cur)
    finally:
        _put_conn(conn)


def update_finding_status(finding_id: str, status: str) -> None:
    """Update a finding's status column (e.g. 'open' -> 'resolved')."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE finding SET status = %s WHERE id = %s",
                (status, finding_id),
            )
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _put_conn(conn)


def get_findings_for_policy(policy_id: str) -> list[dict]:
    """
    Return all findings linked to a policy via the mitigation_edges table.
    Used by Agent 3 to know which combos to re-verify.
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT f.*
                FROM finding f
                JOIN mitigation_edges me ON me.finding_id = f.id
                WHERE me.policy_id = %s
                ORDER BY f.created_at
                """,
                (policy_id,),
            )
            return _rows_to_dicts(cur)
    finally:
        _put_conn(conn)


def insert_ci_gate_result(scan_run_id: str, passed: bool, summary: dict) -> dict:
    """
    Insert a ci_gate_result row recording a CI gate pass/fail decision.
    Returns the inserted row as a dict.
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ci_gate_result (scan_run_id, passed, summary)
                VALUES (%s, %s, %s)
                RETURNING *
                """,
                (scan_run_id, passed, json.dumps(summary)),
            )
            row = _rows_to_dicts(cur)
            conn.commit()
            return row[0]
    except Exception:
        conn.rollback()
        raise
    finally:
        _put_conn(conn)

