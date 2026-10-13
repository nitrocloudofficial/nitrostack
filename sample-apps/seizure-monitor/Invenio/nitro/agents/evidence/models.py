from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class Claim(BaseModel):
    id: str
    text: str
    type: str  # 'contribution', 'limitation', 'future_work', 'result'
    paper_id: str
    confidence: float

class ClaimEdge(BaseModel):
    source_claim_id: str
    target_claim_id: str
    relation: str  # 'supports', 'contradicts', 'extends', 'compares_with'
    weight: float = 1.0

class Contradiction(BaseModel):
    id: str
    description: str
    supporting_papers: List[str]
    contradicting_papers: List[str]
    confidence: float
    evidence: str

class Consensus(BaseModel):
    id: str
    finding: str
    supporting_papers: List[str]
    confidence: float

class ResearchGap(BaseModel):
    id: str
    description: str
    related_nodes: List[str]  # IDs of Methods/Datasets involved
    weak_evidence_areas: List[str]

class Opportunity(BaseModel):
    id: str
    title: str
    description: str
    reason: str
    supporting_evidence: List[str]
    potential_impact: str
    novelty_score: float
    difficulty: str
    confidence: float

class EvidenceTimelineEvent(BaseModel):
    year: int
    event_type: str
    description: str

class EvidencePackage(BaseModel):
    claims: List[Claim] = Field(default_factory=list)
    claim_edges: List[ClaimEdge] = Field(default_factory=list)
    contradictions: List[Contradiction] = Field(default_factory=list)
    consensus_findings: List[Consensus] = Field(default_factory=list)
    research_gaps: List[ResearchGap] = Field(default_factory=list)
    opportunities: List[Opportunity] = Field(default_factory=list)
    timeline: List[EvidenceTimelineEvent] = Field(default_factory=list)
