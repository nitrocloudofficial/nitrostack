from typing import List
from .models import Page, Form, Workflow, APIEndpoint, TestCase

class TestMaintainer:
    def identify_stale_tests(self, old_graph: dict, new_graph: dict, current_tests: List[TestCase]) -> List[TestCase]:
        """
        Compare graphs to find tests that need pruning or updating because elements changed.
        """
        stale_tests = []
        # In a real implementation, we compare hashes of element models in old vs new graphs
        for test in current_tests:
            if test.id.endswith("old"):
                stale_tests.append(test)
        return stale_tests
