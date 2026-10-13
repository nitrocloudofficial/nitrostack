from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class ActionType(str, Enum):
    HIGHLIGHT_GRAPH = "HIGHLIGHT_GRAPH"
    CREATE_WORKSPACE_BLOCK = "CREATE_WORKSPACE_BLOCK"
    DELEGATE_PLANNER = "DELEGATE_PLANNER"
    FILTER_TIMELINE = "FILTER_TIMELINE"
    EXPAND_NETWORK = "EXPAND_NETWORK"

class CopilotAction(BaseModel):
    action_type: ActionType
    payload: Dict[str, Any]

class CopilotContext(BaseModel):
    active_node_id: Optional[str] = None
    active_node_type: Optional[str] = None
    session_history: List[str] = Field(default_factory=list)

class CopilotRequest(BaseModel):
    query: str
    context: CopilotContext
    packages: Dict[str, Any]  # Passes the raw package dictionaries

class CopilotResponse(BaseModel):
    markdown_text: str
    cited_evidence_ids: List[str] = Field(default_factory=list)
    cited_paper_ids: List[str] = Field(default_factory=list)
    confidence: float
    actions: List[CopilotAction] = Field(default_factory=list)
