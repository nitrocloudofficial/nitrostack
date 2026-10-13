"""Tests for orchestrator/track_a/db_writer.py — exercises the actual INSERT path.

This is an integration test: it requires live Postgres (DATABASE_URL in .env).

Why this test exists:
    The rest of the test suite proves the stats math and the negative case
    (nothing flagged → nothing written). But write_findings() — the actual
    INSERT path — is only hit when a combo crosses both the DIR < 0.80 threshold
    AND the BH-significance gate. With only 4 mock applications, Fisher's exact
    test has too little power to cross both gates naturally. So without this test,
    the entire Agent 1 → Agent 2 handoff path (finding rows appearing in Postgres)
    was never exercised end-to-end.
"""
import os

import psycopg2
import pytest
from dotenv import load_dotenv

from orchestrator.track_a.db_writer import (
    complete_scan_run,
    create_scan_run,
    write_findings,
)

load_dotenv()


class TestDbWriter:
    def test_write_findings_actually_inserts_a_flagged_row(self):
        """Directly proves the INSERT path works end-to-end.

        Creates a real scan_run row, inserts a synthetic flagged finding, then
        queries Postgres to confirm the row landed with the right values.
        """
        # 1. Create a real scan_run row (FK must exist before finding insert)
        scan_run_id = create_scan_run("test-write-path")
        assert scan_run_id, "create_scan_run should return a non-empty UUID string"

        # 2. Build a fake flagged finding (values that would pass both gates)
        fake_finding = [
            {
                "combo_key": "zip_code",
                "dir_value": 0.3,
                "p_value": 0.001,
                "fdr_adjusted_p": 0.002,
            }
        ]

        # 3. Call the real write path
        write_findings(scan_run_id, fake_finding)

        # 4. Query Postgres directly — don't trust the Python return value
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT combo_key, dir_value, p_value, fdr_adjusted_p, track, status
                    FROM finding
                    WHERE scan_run_id = %s
                    """,
                    (scan_run_id,),
                )
                row = cur.fetchone()
        finally:
            conn.close()

        # 5. Assert the row exists and every field is correct
        assert row is not None, (
            f"Expected a finding row for scan_run_id={scan_run_id}, got None. "
            "write_findings() likely failed silently or the FK insert was skipped."
        )
        combo_key, dir_value, p_value, fdr_adjusted_p, track, status = row
        assert combo_key == "zip_code"
        assert float(dir_value) == pytest.approx(0.3)
        assert float(p_value) == pytest.approx(0.001)
        assert float(fdr_adjusted_p) == pytest.approx(0.002)
        assert track == "bias"
        assert status == "open"

    def test_write_findings_noop_on_empty_list(self):
        """write_findings([]) must not raise and must insert nothing."""
        scan_run_id = create_scan_run("test-noop-write")
        write_findings(scan_run_id, [])  # should not raise

        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM finding WHERE scan_run_id = %s",
                    (scan_run_id,),
                )
                count = cur.fetchone()[0]
        finally:
            conn.close()

        assert count == 0, f"Expected 0 rows for empty write, got {count}"

    def test_create_scan_run_returns_valid_uuid(self):
        """create_scan_run must return a Postgres-generated UUID, not a Python one."""
        import uuid

        scan_run_id = create_scan_run("test-uuid-check")
        parsed = uuid.UUID(scan_run_id)  # raises ValueError if not valid UUID
        assert str(parsed) == scan_run_id

    def test_complete_scan_run_stamps_finished_at(self):
        """complete_scan_run must set status=completed and finished_at on the row."""
        scan_run_id = create_scan_run("test-complete")
        complete_scan_run(scan_run_id, status="completed")

        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT status, finished_at FROM scan_run WHERE id = %s",
                    (scan_run_id,),
                )
                row = cur.fetchone()
        finally:
            conn.close()

        assert row is not None
        status, finished_at = row
        assert status == "completed"
        assert finished_at is not None, "finished_at should be set after complete_scan_run()"

    def test_write_findings_multiple_rows(self):
        """write_findings can insert multiple flagged combos in one call."""
        scan_run_id = create_scan_run("test-multi-write")
        findings = [
            {"combo_key": "zip_code", "dir_value": 0.5, "p_value": 0.01, "fdr_adjusted_p": 0.02},
            {"combo_key": "applicant_name", "dir_value": 0.6, "p_value": 0.02, "fdr_adjusted_p": 0.04},
            {"combo_key": "applicant_name+zip_code", "dir_value": 0.4, "p_value": 0.005, "fdr_adjusted_p": 0.015},
        ]
        write_findings(scan_run_id, findings)

        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT combo_key, status FROM finding WHERE scan_run_id = %s ORDER BY combo_key",
                    (scan_run_id,),
                )
                rows = cur.fetchall()
        finally:
            conn.close()

        assert len(rows) == 3, f"Expected 3 finding rows, got {len(rows)}"
        combo_keys = {r[0] for r in rows}
        assert combo_keys == {"zip_code", "applicant_name", "applicant_name+zip_code"}
        # All must start as 'open'
        assert all(r[1] == "open" for r in rows), "All finding rows must have status='open'"
