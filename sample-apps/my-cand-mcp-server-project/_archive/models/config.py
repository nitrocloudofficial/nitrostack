from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class ProjectionFieldConfig:
    path: str
    from_path: Optional[str] = None
    type: Optional[str] = None
    required: bool = False
    normalize: Optional[str] = None

@dataclass
class ProjectionConfig:
    include_confidence: bool = True
    on_missing: str = "null"  # must be one of: 'null', 'omit', 'error'
    fields: List[ProjectionFieldConfig] = field(default_factory=list)
