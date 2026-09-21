from typing import Any, Dict, Optional
from normalizers.base import BaseNormalizer, NormalizationResult

class NameNormalizer(BaseNormalizer):
    def normalize(self, raw: Any, context: Optional[Dict[str, Any]] = None) -> NormalizationResult:
        if not raw:
            return {"value": "", "confidence": 0.0, "note": "Empty name."}
        
        raw_str = str(raw).strip()
        
        # Clean extra spaces inside the name
        cleaned_words = [w for w in raw_str.split() if w]
        
        # Title case each part of the name to handle capitalization nicely (e.g. "JOHN" -> "John")
        # We don't assume a fixed word order (e.g. whether it's First Last or Last First),
        # but title casing each part makes it look clean.
        normalized_words = [w.capitalize() for w in cleaned_words]
        normalized_name = " ".join(normalized_words)
        
        return {
            "value": normalized_name,
            "confidence": 0.95,
            "note": f"Normalized name via word capitalization: '{raw_str}' -> '{normalized_name}'."
        }
