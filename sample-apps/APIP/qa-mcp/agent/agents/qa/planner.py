from typing import List
from .models import Page, APIEndpoint, Form, Workflow, TestCase, TestType
import uuid

class TestPlanner:
    def __init__(self, pages: List[Page], apis: List[APIEndpoint], forms: List[Form], workflows: List[Workflow]):
        self.pages = pages
        self.apis = apis
        self.forms = forms
        self.workflows = workflows
        
    def generate_plan(self) -> List[TestCase]:
        cases = []
        
        # UI tests for pages
        for page in self.pages:
            cases.append(TestCase(
                id=str(uuid.uuid4()),
                type=TestType.UI,
                target_entity_id=page.id,
                description=f"Verify UI elements for page: {page.title}"
            ))
            
        # API tests
        for api in self.apis:
            cases.append(TestCase(
                id=str(uuid.uuid4()),
                type=TestType.API,
                target_entity_id=api.id,
                description=f"Verify {api.method} {api.path} response schema and status codes."
            ))
            
        # Form validation tests
        for form in self.forms:
            cases.append(TestCase(
                id=str(uuid.uuid4()),
                type=TestType.FORM,
                target_entity_id=form.id,
                description=f"Verify form validation at action URL {form.action_url}"
            ))
            
        # E2E Tests for Workflows
        for wf in self.workflows:
             cases.append(TestCase(
                id=str(uuid.uuid4()),
                type=TestType.E2E,
                target_entity_id=wf.id,
                description=f"End-to-End workflow test starting from {wf.start_page_id}"
            ))
            
        return cases
