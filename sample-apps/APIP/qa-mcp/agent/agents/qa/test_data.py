from typing import List, Dict, Any
from .models import TestCase, TestData, FormField

class TestDataGenerator:
    """
    Generates test data points for specified TestCases.
    """
    def generate_for_form(self, test_case: TestCase, fields: List[FormField]) -> List[TestData]:
        # Dummy generation logic representing LLM generation or deterministic strategies
        data = []
        # Valid case
        data.append(TestData(
            scenario_name="Valid Inputs",
            inputs={f.name: "test_value" for f in fields},
            expected_outputs={"status": "success"},
            is_edge_case=False
        ))
        
        # Empty case for required fields
        data.append(TestData(
            scenario_name="Missing Required Fields",
            inputs={f.name: "" for f in fields if f.required},
            expected_outputs={"error": "Field is required"},
            is_edge_case=True
        ))
        return data

    def generate_for_api(self, test_case: TestCase, schema: Dict[str, Any]) -> List[TestData]:
        return [
            TestData(
                scenario_name="Valid Payload",
                inputs={"data": "sample"},
                expected_outputs={"status": 200},
                is_edge_case=False
            )
        ]
