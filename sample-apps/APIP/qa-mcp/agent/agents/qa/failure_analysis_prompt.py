FAILURE_ANALYSIS_PROMPT = """
Analyze the following test failure.
Test case: {test_case}
Error logs: {logs}
Is it a flaky test, an element selector issue, or a real application bug?
"""
