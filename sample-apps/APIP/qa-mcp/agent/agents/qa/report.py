from .models import TestSuiteResult, CoverageReport
import json

class Reporter:
    def generate_report(self, test_result: TestSuiteResult, coverage: CoverageReport, output_path: str):
        report_data = {
            "test_summary": {
                "passed": test_result.total_passed,
                "failed": test_result.total_failed,
                "skipped": test_result.total_skipped
            },
            "coverage": {
                "percentage": coverage.coverage_percentage,
                "missed_entities": coverage.entities_missed
            }
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=4)
