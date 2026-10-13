"""Postgres persistence layer for Agent 1.

Two-phase write protocol (matches the FK constraint in db/schema.sql):
  1. create_scan_run()  — insert a scan_run row, get back Postgres's UUID.
  2. write_findings()   — insert one finding row PER FLAGGED COMBO ONLY.
  3. complete_scan_run() — stamp finished_at and set status.

Never generate a UUID in Python and skip step 1 — finding.scan_run_id is
a NOT NULL FK into scan_run(id).  The FK will reject it at insert time.

Finding rows are ONLY written for combos that are both:
  - DIR < 0.80  (four-fifths rule)
  - BH-adjusted p-value significant  (Gap #1 gate)

Unflagged combos are not "findings" and produce no row at all.
status is always 'open' on first write.  Agent 2 / Agent 3 advance it.
"""
import os

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/afo"
)


def create_scan_run(target_name: str) -> str:
    """Insert a scan_run row and return the Postgres-generated UUID string.

    MUST be called before any write_findings() call — finding.scan_run_id
    is a foreign key into scan_run(id).

    Args:
        target_name: Human-readable name of the target being audited
                     (e.g. "loan-decision-agent").

    Returns:
        The scan_run UUID as a string (Postgres-generated, not Python-generated).
    """
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO scan_run (target_name) VALUES (%s) RETURNING id",
                (target_name,),
            )
            row = cur.fetchone()
            if row is None:
                raise RuntimeError("INSERT INTO scan_run returned no row")
            return str(row[0])
    finally:
        conn.close()


def complete_scan_run(scan_run_id: str, status: str = "completed") -> None:
    """Stamp finished_at and update status on the scan_run row.

    Args:
        scan_run_id: UUID string returned by create_scan_run().
        status:      One of 'completed' | 'failed'.  Defaults to 'completed'.
    """
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE scan_run SET status = %s, finished_at = now() WHERE id = %s",
                (status, scan_run_id),
            )
    finally:
        conn.close()


def write_findings(scan_run_id: str, rows: list[dict]) -> None:
    """Bulk-insert finding rows for all flagged combos.

    Args:
        scan_run_id: UUID string from create_scan_run() — must already exist.
        rows:        List of dicts, ONE PER FLAGGED COMBO ONLY.
                     Each dict must have: combo_key (str), dir_value (float),
                     p_value (float), fdr_adjusted_p (float).

    Notes:
        - Do NOT pass unflagged combos here; they don't get a row at all.
        - status is always 'open' on first write (schema: open | patched |
          verified_fixed | still_failing); later agents advance it.
        - track is always 'bias' for Agent 1.
        - No-ops if rows is empty — calling with an empty list is valid and safe.
    """
    if not rows:
        return
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn, conn.cursor() as cur:
            execute_values(
                cur,
                """
                INSERT INTO finding
                    (scan_run_id, track, combo_key, dir_value, p_value, fdr_adjusted_p, status)
                VALUES %s
                """,
                [
                    (
                        scan_run_id,
                        "bias",
                        r["combo_key"],
                        r["dir_value"],
                        r["p_value"],
                        r["fdr_adjusted_p"],
                        "open",
                    )
                    for r in rows
                ],
            )
    finally:
        conn.close()
