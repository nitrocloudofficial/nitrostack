from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from enum import Enum

# Graph Entities
class EntityType(str, Enum):
    PAGE = "page"
    API = "api"
    FORM = "form"
    WORKFLOW = "workflow"

class GraphEntity(BaseModel):
    id: str
    type: EntityType
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Page(GraphEntity):
    type: EntityType = EntityType.PAGE
    url: str
    title: str
    elements: List[Dict[str, Any]] = Field(default_factory=list)

class APIEndpoint(GraphEntity):
    type: EntityType = EntityType.API
    method: str
    path: str
    headers: Dict[str, str] = Field(default_factory=dict)
    query_params: Dict[str, Any] = Field(default_factory=dict)
    body_schema: Optional[Dict[str, Any]] = None
    response_schema: Optional[Dict[str, Any]] = None

class FormField(BaseModel):
    name: str
    type: str
    required: bool
    validation_rules: List[str] = Field(default_factory=list)

class Form(GraphEntity):
    type: EntityType = EntityType.FORM
    action_url: str
    fields: List[FormField] = Field(default_factory=list)

class WorkflowStep(BaseModel):
    action: str
    target_id: str
    data: Optional[Dict[str, Any]] = None

class Workflow(GraphEntity):
    type: EntityType = EntityType.WORKFLOW
    start_page_id: str
    steps: List[WorkflowStep] = Field(default_factory=list)

# Test Planning & Execution
class TestType(str, Enum):
    UI = "ui"
    API = "api"
    FORM = "form"
    E2E = "e2e"

class TestData(BaseModel):
    scenario_name: str
    inputs: Dict[str, Any]
    expected_outputs: Dict[str, Any]
    is_edge_case: bool = False

class TestCase(BaseModel):
    id: str
    type: TestType
    target_entity_id: str
    description: str
    test_data: List[TestData] = Field(default_factory=list)
    generated_code: Optional[str] = None # For playwright/pytest scripts

class TestPlan(BaseModel):
    id: str
    created_at: str
    cases: List[TestCase] = Field(default_factory=list)

class TestStatus(str, Enum):
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"

class TestResult(BaseModel):
    test_case_id: str
    status: TestStatus
    logs: str = ""
    error_message: Optional[str] = None
    execution_time_ms: int = 0
    artifacts: Dict[str, str] = Field(default_factory=dict) # e.g. path to traces/screenshots

class TestSuiteResult(BaseModel):
    plan_id: str
    results: List[TestResult] = Field(default_factory=list)
    total_passed: int = 0
    total_failed: int = 0
    total_skipped: int = 0

class CoverageReport(BaseModel):
    entities_covered: List[str] = Field(default_factory=list)
    entities_missed: List[str] = Field(default_factory=list)
    coverage_percentage: float = 0.0
