import os
import json
from typing import Any, Dict, Optional
from normalizers.base import BaseNormalizer, NormalizationResult
from models.candidate import Location

def load_location_mappings() -> dict:
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_path = os.path.join(base_dir, 'configs', 'location_mappings.json')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load location mappings: {e}")
    return {}

class LocationNormalizer(BaseNormalizer):
    def normalize(self, raw: Any, context: Optional[Dict[str, Any]] = None) -> NormalizationResult:
        if not raw:
            return {
                "value": None,
                "confidence": 0.0,
                "note": "Empty location."
            }

        if isinstance(raw, Location):
            return {
                "value": raw,
                "confidence": 1.0,
                "note": "Already a normalized Location object."
            }

        raw_str = str(raw).strip()
        parts = [p.strip() for p in raw_str.split(',') if p.strip()]

        # Load dynamic mappings
        mappings = load_location_mappings()

        city = None
        state = None
        country = None
        note_parts = []

        # Helper to find country by name or code
        def find_country_by_name_or_code(text: str) -> Optional[str]:
            text_lower = text.lower()
            text_upper = text.upper()
            # Direct ISO code match
            if text_upper in mappings:
                return text_upper
            # Check alias names
            for code, data in mappings.items():
                if text_lower in [name.lower() for name in data.get("names", [])]:
                    return code
            return None

        # Helper to map state to country/countries
        def find_countries_by_state(state_text: str) -> Dict[str, str]:
            # Returns dict of country_code -> state_abbreviation
            state_lower = state_text.lower()
            state_upper = state_text.upper()
            matched_countries = {}
            for code, data in mappings.items():
                states_dict = data.get("states", {})
                # Check abbreviation match
                if state_upper in states_dict:
                    matched_countries[code] = state_upper
                else:
                    # Check name match
                    for abbr, name in states_dict.items():
                        if state_lower == name.lower():
                            matched_countries[code] = abbr
                            break
            return matched_countries

        if len(parts) == 1:
            city = parts[0]
            note_parts.append("Single city segment. Country and State left null due to ambiguity.")
        elif len(parts) == 2:
            city = parts[0]
            val2 = parts[1]
            
            # 1. Check if val2 is a country
            matched_country = find_country_by_name_or_code(val2)
            if matched_country:
                country = matched_country
                note_parts.append(f"City and Country parsed ({country}).")
            else:
                # 2. Check if val2 maps uniquely to a country as a state
                state_matches = find_countries_by_state(val2)
                if len(state_matches) == 1:
                    country = list(state_matches.keys())[0]
                    state = state_matches[country]
                    note_parts.append(f"State '{val2}' uniquely mapped; inferred country as {country}.")
                elif len(state_matches) > 1:
                    note_parts.append(f"State '{val2}' is ambiguous across multiple countries ({list(state_matches.keys())}). Country left null.")
                    state = val2
                else:
                    # Fallback: if 2 chars, assume country code, else state
                    if len(val2) == 2:
                        country = val2.upper()
                        note_parts.append(f"Assumed ISO country code '{country}'.")
                    else:
                        state = val2
                        note_parts.append("Region/state parsed. Country remains null.")
        elif len(parts) >= 3:
            city = parts[0]
            val2 = parts[1] # state candidate
            val3 = parts[2] # country candidate
            
            # Check country first
            matched_country = find_country_by_name_or_code(val3)
            if matched_country:
                country = matched_country
            elif len(val3) == 2:
                country = val3.upper()
            
            # Check state
            state_matches = find_countries_by_state(val2)
            if country:
                # Use matching state under the known country
                if country in state_matches:
                    state = state_matches[country]
                else:
                    state = val2
                note_parts.append(f"Parsed City, State, and Country ({country}).")
            else:
                # No country identified from segment 3, infer from state
                if len(state_matches) == 1:
                    country = list(state_matches.keys())[0]
                    state = state_matches[country]
                    note_parts.append(f"Inferred country as {country} from unique state '{val2}'.")
                else:
                    state = val2
                    if len(val3) == 2:
                        country = val3.upper()
                        note_parts.append(f"Assumed ISO country code '{country}'.")
                    else:
                        note_parts.append("Parsed City and State. Country remains null.")
        else:
            city = raw_str
            note_parts.append("Could not parse location segments. Map raw as city.")

        loc_obj = Location(
            raw=raw_str,
            city=city,
            state=state,
            country=country
        )

        return {
            "value": loc_obj,
            "confidence": 0.95 if country else 0.60,
            "note": " ".join(note_parts)
        }
