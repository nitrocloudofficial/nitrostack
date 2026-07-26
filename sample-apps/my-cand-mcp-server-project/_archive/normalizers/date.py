import re
from typing import Any, Dict, Optional
from normalizers.base import BaseNormalizer, NormalizationResult

class DateNormalizer(BaseNormalizer):
    def normalize(self, raw: Any, context: Optional[Dict[str, Any]] = None) -> NormalizationResult:
        if not raw:
            return {"value": "", "confidence": 0.0, "note": "Empty date value."}
        
        raw_str = str(raw).strip()
        
        # Handle "present" or "current"
        if raw_str.lower() in ['present', 'current', 'now', 'active']:
            return {"value": "present", "confidence": 0.95, "note": "Normalized standard active date."}

        # Check for Year only
        year_match = re.match(r'^\b(\d{4})\b$', raw_str)
        if year_match:
            return {"value": f"{year_match.group(1)}-01-01", "confidence": 0.90, "note": "Year-only date normalized to January 1st."}

        # Handle month names like "July 2021" or "Dec 2023"
        # We can extract month and year using regex
        months_pattern = r'\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b'
        month_match = re.search(months_pattern, raw_str, re.IGNORECASE)
        year_match = re.search(r'\b(\d{4}|\d{2})\b', raw_str)
        if month_match and year_match:
            month_str = month_match.group(1).lower()
            year_str = year_match.group(1)
            
            # Map month name to number
            month_map = {
                'jan': '01', 'january': '01',
                'feb': '02', 'february': '02',
                'mar': '03', 'march': '03',
                'apr': '04', 'april': '04',
                'may': '05',
                'jun': '06', 'june': '06',
                'jul': '07', 'july': '07',
                'aug': '08', 'august': '08',
                'sep': '09', 'september': '09',
                'oct': '10', 'october': '10',
                'nov': '11', 'november': '11',
                'dec': '12', 'december': '12'
            }
            m_num = month_map[month_str]
            y_num = year_str if len(year_str) == 4 else f"20{year_str}"
            return {
                "value": f"{y_num}-{m_num}-01",
                "confidence": 0.95,
                "note": f"Normalized from word-based month and year: '{raw_str}'"
            }

        # Check for slash or dash formats: DD/MM/YYYY or MM/DD/YYYY or YYYY-MM-DD
        # Let's match A/B/C where separators can be / or -
        slash_match = re.search(r'\b(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})\b', raw_str)
        if slash_match:
            g1, g2, g3 = slash_match.group(1), slash_match.group(2), slash_match.group(3)
            
            # Case 1: YYYY-MM-DD or YYYY/MM/DD (starts with 4 digits)
            if len(g1) == 4:
                year = int(g1)
                month = int(g2)
                day = int(g3)
                if month <= 12 and day <= 31:
                    return {
                        "value": f"{year:04d}-{month:02d}-{day:02d}",
                        "confidence": 0.95,
                        "note": "ISO format YYYY-MM-DD parsed unambiguously."
                    }

            # Case 2: Ends with 4 digits (e.g. DD/MM/YYYY or MM/DD/YYYY)
            if len(g3) == 4:
                year = int(g3)
                v1 = int(g1)
                v2 = int(g2)
                
                # Check if we can determine DD vs MM deterministically
                # Rule: "if either segment >12, it must be the day (deterministic)"
                if v1 > 12 and v2 <= 12:
                    # v1 is Day, v2 is Month -> DD/MM/YYYY
                    return {
                        "value": f"{year:04d}-{v2:02d}-{v1:02d}",
                        "confidence": 0.95,
                        "note": f"Deterministic: Segment 1 ({v1}) > 12, parsed as DD/MM/YYYY."
                    }
                elif v2 > 12 and v1 <= 12:
                    # v2 is Day, v1 is Month -> MM/DD/YYYY
                    return {
                        "value": f"{year:04d}-{v1:02d}-{v2:02d}",
                        "confidence": 0.95,
                        "note": f"Deterministic: Segment 2 ({v2}) > 12, parsed as MM/DD/YYYY."
                    }
                elif v1 <= 12 and v2 <= 12:
                    # Both segments <= 12: Ambiguous!
                    # Check if the source has a locked format in the context
                    source = context.get('source') if context else None
                    source_formats = context.get('source_formats') if context else None
                    locked_format = source_formats.get(source) if (source_formats and source) else None
                    
                    if locked_format == 'DD/MM/YYYY':
                        return {
                            "value": f"{year:04d}-{v2:02d}-{v1:02d}",
                            "confidence": 0.90,
                            "note": f"Ambiguous date parsed as DD/MM/YYYY matching locked format for source '{source}'."
                        }
                    elif locked_format == 'MM/DD/YYYY':
                        return {
                            "value": f"{year:04d}-{v1:02d}-{v2:02d}",
                            "confidence": 0.90,
                            "note": f"Ambiguous date parsed as MM/DD/YYYY matching locked format for source '{source}'."
                        }
                    else:
                        # Apply documented default: MM/DD/YYYY, mark low-confidence, log both readings in note
                        default_val = f"{year:04d}-{v1:02d}-{v2:02d}"  # MM/DD/YYYY
                        alt_val = f"{year:04d}-{v2:02d}-{v1:02d}"      # DD/MM/YYYY
                        return {
                            "value": default_val,
                            "confidence": 0.40,  # low confidence
                            "note": f"Ambiguous date. Defaulted to MM/DD/YYYY ({default_val}). Alternative reading is DD/MM/YYYY ({alt_val}). Source formats unlocked."
                        }

        # Fallback to dateutil parser if available
        try:
            from dateutil import parser as du_parser
            parsed_dt = du_parser.parse(raw_str)
            return {
                "value": parsed_dt.strftime("%Y-%m-%d"),
                "confidence": 0.70,
                "note": f"Parsed using fallback python-dateutil parser from '{raw_str}'."
            }
        except Exception:
            pass

        return {
            "value": raw_str,
            "confidence": 0.20,
            "note": "Unrecognized date format. Passed raw string."
        }
