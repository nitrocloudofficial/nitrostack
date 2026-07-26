from typing import List
from .models import TestSuiteResult, TestCase, CoverageReport, Page, Form, Workflow, APIEndpoint

class CoverageAnalyzer:
    def calculate_coverage(
        self, 
        test_cases: List[TestCase], 
        pages: List[Page], 
        forms: List[Form], 
        workflows: List[Workflow], 
        apis: List[APIEndpoint]
    ) -> CoverageReport:
        covered_ids = {case.target_entity_id for case in test_cases}
        
        all_entities = []
        all_entities.extend(pages)
        all_entities.extend(forms)
        all_entities.extend(workflows)
        all_entities.extend(apis)
        
        missed = [entity.id for entity in all_entities if entity.id not in covered_ids]
        
        coverage = 100.0 if not all_entities else (len(covered_ids) / len(all_entities)) * 100
        
        return CoverageReport(
            entities_covered=list(covered_ids),
            entities_missed=missed,
            coverage_percentage=coverage
        )
