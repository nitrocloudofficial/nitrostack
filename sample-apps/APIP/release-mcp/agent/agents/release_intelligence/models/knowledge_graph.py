"""Strongly typed Pydantic models for Product Knowledge Graph input structure."""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class UIElement(BaseModel):
    """UI element representation within a page or form."""
    id: str = Field(description="Unique element identifier")
    name: str = Field(description="Element display name or label")
    element_type: str = Field(description="Button, Input, Select, Checkbox, Table, etc.")
    selector: Optional[str] = Field(default=None, description="DOM selector or locator")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Additional element properties")


class FormNode(BaseModel):
    """Form representation in Knowledge Graph."""
    id: str = Field(description="Unique form identifier")
    name: str = Field(description="Form name")
    fields: List[UIElement] = Field(default_factory=list, description="Fields contained in the form")
    submit_action: Optional[str] = Field(default=None, description="Submit API endpoint or action")


class PageNode(BaseModel):
    """Page representation in Knowledge Graph."""
    id: str = Field(description="Unique page identifier")
    title: str = Field(description="Page title")
    url_path: str = Field(description="Route path or URL pattern")
    elements: List[UIElement] = Field(default_factory=list, description="UI elements on the page")
    forms: List[FormNode] = Field(default_factory=list, description="Forms on the page")
    permissions: List[str] = Field(default_factory=list, description="Required user roles/permissions")


class WorkflowStep(BaseModel):
    """Step inside a user workflow."""
    step_number: int = Field(description="Sequential step index")
    action: str = Field(description="Action description (e.g. Click Submit)")
    target_element_id: Optional[str] = Field(default=None, description="Target element ID")


class WorkflowNode(BaseModel):
    """User workflow sequence in Knowledge Graph."""
    id: str = Field(description="Unique workflow identifier")
    name: str = Field(description="Workflow title")
    description: Optional[str] = Field(default=None, description="Workflow description")
    steps: List[WorkflowStep] = Field(default_factory=list, description="Ordered steps")


class APIEndpoint(BaseModel):
    """API endpoint representation."""
    id: str = Field(description="API identifier")
    method: str = Field(description="HTTP method: GET, POST, PUT, DELETE")
    path: str = Field(description="API path endpoint")
    request_schema: Dict[str, Any] = Field(default_factory=dict, description="Expected request parameters")
    response_schema: Dict[str, Any] = Field(default_factory=dict, description="Expected response schema")


class RelationshipEdge(BaseModel):
    """Edge linking graph entities (e.g. Page -> Form, Workflow -> Page)."""
    source_id: str = Field(description="Source entity ID")
    target_id: str = Field(description="Target entity ID")
    relationship_type: str = Field(description="NAVIGATES_TO, CONTAINS, TRIGGERS, USES_API")


class PermissionSetting(BaseModel):
    """Permission setting across features/pages."""
    role: str = Field(description="Role name (e.g. Admin, Member)")
    resource_id: str = Field(description="Protected resource or page ID")
    actions_allowed: List[str] = Field(default_factory=list, description="Allowed actions (READ, WRITE, DELETE)")


class KnowledgeGraphVersion(BaseModel):
    """Complete versioned Product Knowledge Graph model."""
    version_id: str = Field(description="Version tag or commit hash (e.g., '1.0.0' or '2.0.0')")
    product_name: str = Field(default="ADIP Application", description="Application name")
    pages: List[PageNode] = Field(default_factory=list, description="List of page nodes")
    workflows: List[WorkflowNode] = Field(default_factory=list, description="List of workflow nodes")
    forms: List[FormNode] = Field(default_factory=list, description="List of standalone forms")
    api_endpoints: List[APIEndpoint] = Field(default_factory=list, description="List of API endpoints")
    relationships: List[RelationshipEdge] = Field(default_factory=list, description="List of graph relationships")
    permissions: List[PermissionSetting] = Field(default_factory=list, description="List of permission settings")
