"""
Seed script: inserts fake scan_run + findings into Postgres.

Idempotent — uses ON CONFLICT DO NOTHING, safe to re-run.

Usage:
    python -m orchestrator.fixtures.seed_fake_data
    # or from orchestrator/ directory:
    python fixtures/seed_fake_data.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Ensure orchestrator/ is on sys.path so imports work from any CWD
_orchestrator_dir = Path(__file__).resolve().parent.parent
if str(_orchestrator_dir) not in sys.path:
    sys.path.insert(0, str(_orchestrator_dir))

from dotenv import load_dotenv

# Load .env before any db imports
load_dotenv(dotenv_path=_orchestrator_dir / ".env")

import psycopg2
from fixtures.fake_findings import FAKE_SCAN_RUN_ID, FAKE_FINDINGS


def seed() -> None:
    """Insert fake scan_run and findings into Postgres."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL not set — check orchestrator/.env")

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            # 1. Insert fake scan_run
            cur.execute(
                """
                INSERT INTO scan_run (id, target_name, status)
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (FAKE_SCAN_RUN_ID, "loan-decision-agent-fake", "running"),
            )
            print(f"[seed] scan_run {FAKE_SCAN_RUN_ID} -> inserted or exists")

            # 2. Insert fake findings
            for f in FAKE_FINDINGS:
                cur.execute(
                    """
                    INSERT INTO finding
                        (id, scan_run_id, track, combo_key, dir_value,
                         p_value, fdr_adjusted_p, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (
                        f["id"],
                        f["scan_run_id"],
                        f["track"],
                        f["combo_key"],
                        f["dir_value"],
                        f["p_value"],
                        f["fdr_adjusted_p"],
                        f["status"],
                    ),
                )
                print(f"[seed] finding {f['id']} ({f['combo_key']}) -> inserted or exists")

            conn.commit()
            print("[seed] OK - fake data seeded successfully")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    seed()
