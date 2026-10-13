from typing import List
from pydantic import BaseModel, Field

class Hypothesis(BaseModel):
    id: str
    title: str
    premise: str
    proposed_methodology: str
    expected_outcome: str
    confidence: float
    supporting_evidence_ids: List[str]

class HypothesisPackage(BaseModel):
    hypotheses: List[Hypothesis] = Field(default_factory=list)
