from dataclasses import dataclass, field
from typing import List, Optional, Any

@dataclass
class Location:
    raw: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None  # ISO-3166 alpha-2 code

@dataclass
class Experience:
    company: str
    title: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None

@dataclass
class Education:
    institution: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@dataclass
class ProvenanceRecord:
    source: str
    field: str
    raw_key: str
    raw_value: Any
    evidence_tier: str  # 'A', 'B', 'C', or 'D'
    confidence: float
    timestamp: float
    action: str  # 'merged', 'discarded', 'normalized', etc.
    reason: Optional[str] = None
    normalized_value: Any = None
    norm_confidence: float = 0.0
    norm_note: str = ""
    merge_confidence: Optional[float] = None
    merge_reason: Optional[str] = None

@dataclass
class ExtraField:
    raw_key: str
    value: Any
    source: str
    reason: Optional[str] = None

@dataclass
class Candidate:
    candidate_id: str
    full_name: Optional[str] = None
    emails: List[str] = field(default_factory=list)
    phones: List[str] = field(default_factory=list)
    location: Optional[Location] = None
    links: List[str] = field(default_factory=list)
    headline: Optional[str] = None
    years_experience: Optional[float] = None
    skills: List[str] = field(default_factory=list)
    experience: List[Experience] = field(default_factory=list)
    education: List[Education] = field(default_factory=list)
    provenance: List[ProvenanceRecord] = field(default_factory=list)
    overall_confidence: float = 0.0
    extra_fields: List[ExtraField] = field(default_factory=list)
