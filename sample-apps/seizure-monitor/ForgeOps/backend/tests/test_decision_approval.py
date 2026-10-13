"""Tests for the persistent human decision audit record."""

import os
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database.audit_log import log_decision_approval


class TestDecisionApproval(unittest.TestCase):
    def test_records_approval_without_claiming_execution(self):
        with tempfile.TemporaryDirectory() as directory:
            database = os.path.join(directory, "audit-test.db")
            with patch("backend.database.audit_log.DB_PATH", database):
                result = log_decision_approval(
                    incident_id="INC-2407-001",
                    recommendation={"title": "Reduce queue delay"},
                    approved_by="Test Manager",
                    agent_conclusion="Reduce the queue first.",
                )

        self.assertEqual(result["id"], 1)
        self.assertEqual(result["execution_status"], "recorded_not_executed")
        self.assertEqual(result["approved_by"], "Test Manager")


if __name__ == "__main__":
    unittest.main()
