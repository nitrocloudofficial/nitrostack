from abc import ABC, abstractmethod
from typing import Any, List, TypedDict

class RawCandidateField(TypedDict):
    raw_key: str
    raw_value: Any
    target_field: str       # E.g., 'full_name', 'phones', 'skills'
    evidence_tier: str      # 'A', 'B', 'C', or 'D'
    source: str             # File path or source identifier
    timestamp: float        # Timestamp representing data recency (e.g. file modification time or embedded date)
    record_id: str          # Identifies which candidate profile this field belongs to in the source file

class BaseSourcePlugin(ABC):
    @abstractmethod
    def detect(self, source_path: str) -> bool:
        """
        Detects if this plugin is capable of reading/parsing the given source file.
        Returns True if it can, False otherwise.
        """
        pass

    @abstractmethod
    def extract(self, source_path: str) -> List[RawCandidateField]:
        """
        Reads the source file and extracts a list of raw fields with metadata.
        Does NOT perform normalization or update canonical records.
        """
        pass
