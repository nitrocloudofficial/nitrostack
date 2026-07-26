from pydantic import BaseModel, Field
from typing import List, Optional

class ProcessRequest(BaseModel):
    input_source: str = Field(..., example="live")
    meeting_url: Optional[str] = Field(None, example="https://meet.google.com/xyz-dev-sync")
    transcript_text: Optional[str] = Field(None, example="We discussed FastAPI auth middleware and ChromaDB vector embeddings.")
    context_pack_id: str = Field(..., example="software_dev")
    workspace_id: str = Field("ws-acme", example="ws-acme")

class TaskApprovalRequest(BaseModel):
    task_id: str
    action: str = Field(..., example="approve") # approve, reject, edit
    edited_title: Optional[str] = None
    edited_owner: Optional[str] = None
    edited_deadline: Optional[str] = None

class SimilaritySearchRequest(BaseModel):
    query_text: str = Field(..., example="FastAPI JWT Auth middleware")
    top_k: int = Field(5, example=5)
    workspace_id: str = Field("ws-acme", example="ws-acme")

class IntegrationTestRequest(BaseModel):
    integration_key: str = Field(..., example="jira") # slack, jira, notion, github, calendar
