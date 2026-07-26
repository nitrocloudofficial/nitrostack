import os
import json
from typing import List, Any
from plugins.base import BaseSourcePlugin, RawCandidateField

class LinkedInPlugin(BaseSourcePlugin):
    def detect(self, source_path: str) -> bool:
        filename = os.path.basename(source_path).lower()
        return filename.endswith('.json') and 'linkedin' in filename

    def extract(self, source_path: str) -> List[RawCandidateField]:
        if not self.detect(source_path):
            return []

        results: List[RawCandidateField] = []
        try:
            mtime = os.path.getmtime(source_path)
        except OSError:
            mtime = 0.0

        try:
            with open(source_path, mode='r', encoding='utf-8') as f:
                data = json.load(f)

            record_id = f"{source_path}#default"
            timestamp = float(data.get('timestamp', mtime))

            mapping_tiers = {
                "full_name": ("full_name", "A"),
                "email_address": ("emails", "A"),
                "phone": ("phones", "A"),
                "geo_location": ("location", "A"),  # Known schema field
                "tagline": ("headline", "C"),       # Fuzzy headline match
                "experience": ("experience", "A"),
                "skills": ("skills", "A"),
                "linkedin_url": ("links", "A")       # Mapping single url string into array target
            }

            for key, val in data.items():
                if key == 'timestamp' or val is None:
                    continue

                if key in mapping_tiers:
                    target_field, tier = mapping_tiers[key]
                    results.append({
                        "raw_key": key,
                        "raw_value": val,
                        "target_field": target_field,
                        "evidence_tier": tier,
                        "source": source_path,
                        "timestamp": timestamp,
                        "record_id": record_id
                    })
                else:
                    results.append({
                        "raw_key": key,
                        "raw_value": val,
                        "target_field": "extra_fields",
                        "evidence_tier": "A",
                        "source": source_path,
                        "timestamp": timestamp,
                        "record_id": record_id
                    })
        except (json.JSONDecodeError, Exception) as e:
            print(f"Skipping malformed or error-prone file {source_path}: {e}")
            return []

        return results
