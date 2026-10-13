from pydantic import BaseModel, Field
from typing import Literal, Dict, Any, List, Optional
import datetime
import uuid

ExportFormat = Literal['markdown', 'html', 'bibtex']
SectionType = Literal['summary', 'landscape', 'papers', 'correlation', 'gaps', 'opportunities', 'future']
InsightType = Literal['gap', 'opportunity', 'correlation']

class Insight(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: InsightType
    title: str
    description: str
    confidence: float
    related_paper_ids: List[str] = Field(default_factory=list)
    reasoning: str

class ReportSection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    type: SectionType
    insights: List[Insight] = Field(default_factory=list)

class WorkspaceSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    run_id: str
    query: str
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    last_modified: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    sections: List[ReportSection] = Field(default_factory=list)
    graph_data: Dict[str, Any] = Field(default_factory=dict)
    evidence_data: Dict[str, Any] = Field(default_factory=dict)
    raw_papers: List[Dict[str, Any]] = Field(default_factory=list)
