from pydantic import BaseModel
from typing import List, Literal, Dict, Any

class Evidence(BaseModel):
    id: str
    description: str
    confidence: float
    supporting_paper_ids: List[str]

class GraphNode(BaseModel):
    id: str
    label: str
    group: Literal['paper', 'author', 'institution', 'topic', 'domain']
    properties: Dict[str, Any]

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: Literal['cites', 'authored_by', 'affiliated_with', 'has_topic', 'related_to', 'contradicts', 'supports']
    weight: float
    evidence: List[Evidence]

class ResearchGap(BaseModel):
    id: str
    title: str
    description: str
    reason: str
    confidence: float
    relevant_node_ids: List[str]

class Opportunity(BaseModel):
    id: str
    title: str
    summary: str
    reasoning: str
    connected_domains: List[str]
    supporting_paper_ids: List[str]
    potential_applications: List[str]
    confidence: float
    evidence: List[Evidence]

class CorrelationResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    gaps: List[ResearchGap]
    opportunities: List[Opportunity]
