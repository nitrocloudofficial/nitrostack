from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict

@dataclass
class ConsideredSourceValue:
    source: str
    raw_key: str
    raw_value: Any
    evidence_tier: str
    confidence: float
    timestamp: float

@dataclass
class FieldDecision:
    field: str
    winner_value: Any
    winner_source: str
    winner_evidence_tier: str
    winner_confidence: float
    reason: str
    alternatives: List[ConsideredSourceValue] = field(default_factory=list)

@dataclass
class DecisionLog:
    candidate_id: str
    decisions: Dict[str, FieldDecision] = field(default_factory=dict)

@dataclass
class CandidateQualityMetric:
    candidate_id: str
    fields_filled_count: int
    fields_null_count: int
    fill_rate: float  # Percentage of filled fields
    average_confidence: float

@dataclass
class ConflictResolutionRecord:
    candidate_id: str
    field: str
    winning_value: Any
    losing_values: List[Any]
    resolution_type: str  # e.g. "recency", "confidence", "tier", "union"
    reason: str

@dataclass
class BatchQualityDashboard:
    candidate_metrics: List[CandidateQualityMetric] = field(default_factory=list)
    average_confidence_across_batch: float = 0.0
    multi_source_conflict_count: int = 0
    conflict_resolutions: List[ConflictResolutionRecord] = field(default_factory=list)
    extra_fields_count: int = 0

@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
