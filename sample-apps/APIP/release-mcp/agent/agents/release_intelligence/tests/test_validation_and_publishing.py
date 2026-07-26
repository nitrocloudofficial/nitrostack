"""Unit tests for ValidationChecker and Publisher components."""

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from agents.release_intelligence.publishing import ValidationChecker, Publisher
from agents.release_intelligence.models.change import Change, AffectedComponent
from agents.release_intelligence.utils.constants import ChangeCategory


class TestValidationAndPublishing(unittest.TestCase):
    """Test suite verifying validation rules and publishing logic."""

    def setUp(self):
        self.validator = ValidationChecker()

    def test_validate_changes_duplicate_ids(self):
        chg1 = Change(
            id="CHG-001",
            category=ChangeCategory.ADDED,
            title="Feature 1",
            description="Desc",
            affected_component=AffectedComponent(id="c1", name="Comp 1", type="Page")
        )
        chg2 = Change(
            id="CHG-001",  # Duplicate ID
            category=ChangeCategory.ADDED,
            title="Feature 2",
            description="Desc",
            affected_component=AffectedComponent(id="c2", name="Comp 2", type="Page")
        )

        status = self.validator.validate_changes([chg1, chg2])
        self.assertFalse(status.is_valid)
        self.assertTrue(any("Duplicate" in e for e in status.errors))


if __name__ == "__main__":
    unittest.main()
