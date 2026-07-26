from .models import TestSuiteResult, CoverageReport

class TestPublisher:
    def publish(self, result: TestSuiteResult, coverage: CoverageReport, target_system: str):
        """
        Publishes test reports and metrics to external dashboard (e.g. QTest, Jira, TestRail).
        """
        print(f"Publishing {result.total_passed} passed tests to {target_system}...")
        return {"status": "published", "destination": target_system}
