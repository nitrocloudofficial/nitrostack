from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, TypedDict

class NormalizationResult(TypedDict):
    value: Any
    confidence: float  # Value between 0.0 and 1.0 (post-normalization confidence score)
    note: str          # Explanation of normalization conversion, tiebreaks, or warnings

class BaseNormalizer(ABC):
    @abstractmethod
    def normalize(self, raw: Any, context: Optional[Dict[str, Any]] = None) -> NormalizationResult:
        """
        Normalizes a raw value and calculates the post-normalization confidence score.
        context can be used to pass external state (e.g. country codes for phone, date formats, etc.)
        """
        pass
