import os
import json
import re
from typing import Any, Dict, Optional
from normalizers.base import BaseNormalizer, NormalizationResult

def load_phone_rules() -> dict:
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_path = os.path.join(base_dir, 'configs', 'phone_rules.json')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load phone rules: {e}")
    return {}

class PhoneNormalizer(BaseNormalizer):
    def normalize(self, raw: Any, context: Optional[Dict[str, Any]] = None) -> NormalizationResult:
        if not raw:
            return {"value": None, "confidence": 0.0, "note": "Empty phone value."}
        
        raw_str = str(raw).strip()
        
        # Cleaned digits extraction
        digits_only = re.sub(r'\D', '', raw_str)
        if not digits_only:
            return {"value": None, "confidence": 0.0, "note": "No digits found in phone number."}

        # Determine country code from context
        country_code = None
        if context and 'country' in context and context['country']:
            country_code = str(context['country']).upper()

        # Load configurations
        phone_rules = load_phone_rules()

        # If country code is not present, try to infer it from the dialing code prefix
        if not country_code:
            # Sort country rules by dialing code length descending to match longest dialing codes first
            sorted_countries = sorted(phone_rules.items(), key=lambda x: len(x[1].get("dialing_code", "")), reverse=True)
            for c_code, rule in sorted_countries:
                dial_code = str(rule.get("dialing_code", ""))
                if dial_code and digits_only.startswith(dial_code):
                    nat_len = int(rule.get("national_length", 10))
                    # Check if total length matches case A (with dial code) or case B (without)
                    if len(digits_only) == nat_len + len(dial_code) or len(digits_only) == nat_len:
                        country_code = c_code
                        break
            
            # No default fallback: if undetected, return None
            if not country_code:
                return {
                    "value": None,
                    "confidence": 0.0,
                    "note": "No country signal available. Country not assumed."
                }

        # Apply rule validation
        if country_code in phone_rules:
            rule = phone_rules[country_code]
            dial_code = str(rule["dialing_code"])
            nat_len = int(rule["national_length"])
            min_d = int(rule["min_digits"])
            max_d = int(rule["max_digits"])

            total_digits = len(digits_only)

            # 1. Check total digit limits
            if not (min_d <= total_digits <= max_d):
                return {
                    "value": None,
                    "confidence": 0.0,
                    "note": f"Invalid {country_code} phone number. Expected total digits between {min_d} and {max_d} but received {total_digits}."
                }

            # 2. Check cases
            is_case_a = (digits_only.startswith(dial_code) and total_digits == len(dial_code) + nat_len)
            is_case_b = (total_digits == nat_len)

            if not (is_case_a or is_case_b):
                return {
                    "value": None,
                    "confidence": 0.0,
                    "note": f"Invalid {country_code} phone number. Expected {nat_len} national digits but received {total_digits if not digits_only.startswith(dial_code) else total_digits - len(dial_code)}."
                }

            # Format to canonical E.164 value
            canonical_value = f"+{digits_only}" if is_case_a else f"+{dial_code}{digits_only}"
            return {
                "value": canonical_value,
                "confidence": 0.95 if raw_str.startswith('+') else 0.80,
                "note": f"Successfully validated and formatted to E.164 for country '{country_code}'."
            }

        # If country rules not found, keep digits as-is with capped confidence
        formatted_val = f"+{digits_only}" if raw_str.startswith('+') else digits_only
        return {
            "value": formatted_val,
            "confidence": 0.50,
            "note": "No country signal and no validation rules found. Digits kept as-is, confidence capped."
        }
