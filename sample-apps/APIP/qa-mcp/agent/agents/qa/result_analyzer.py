from .models import TestSuiteResult, TestStatus
from typing import List, Dict

class ResultAnalyzer:
    def analyze(self, result: TestSuiteResult) -> List[Dict[str, str]]:
        """
        Analyzes failed tests to determine root cause (flaky test vs app bug).
        """
        failures = []
        for r in result.results:
            if r.status == TestStatus.FAILED:
                failures.append({
                    "test_case_id": r.test_case_id,
                    "reason": r.error_message or "Unknown failure",
                    "suggestion": "Implement retry logic or fix target element in UI."
                })
        return failures
