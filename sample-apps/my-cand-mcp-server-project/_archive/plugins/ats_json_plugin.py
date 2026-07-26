import os
import json
from typing import List, Any
from plugins.base import BaseSourcePlugin, RawCandidateField

class ATSJsonPlugin(BaseSourcePlugin):
    def detect(self, source_path: str) -> bool:
        filename = os.path.basename(source_path).lower()
        return filename.endswith('.json') and ('ats' in filename or ('profile' in filename and 'linkedin' not in filename))

    def extract(self, source_path: str) -> List[RawCandidateField]:
        if not self.detect(source_path):
            return []

        results: List[RawCandidateField] = []
        try:
            # Check modification time for default timestamp
            mtime = os.path.getmtime(source_path)
        except OSError:
            mtime = 0.0

        try:
            with open(source_path, mode='r', encoding='utf-8') as f:
                data = json.load(f)
                
            record_id = f"{source_path}#default"
            timestamp = float(data.get('timestamp', mtime))

            # We will map each key according to Tier rules:
            # Tier A: Exact alias/schema key match (max 0.95)
            # Tier C: Fuzzy key similarity (max 0.50)
            mapping_tiers = {
                "ats_id": ("candidate_id", "A"),
                "candidate_name": ("full_name", "A"),
                "primary_email": ("emails", "A"),
                "phone_number": ("phones", "A"),
                "current_location": ("location", "A"),
                "profile_summary": ("headline", "C"),  # Fuzzy mapping
                "experience_years": ("years_experience", "A"),
                "skills_list": ("skills", "C"),        # Fuzzy mapping
                "work_history": ("experience", "A"),
                "school_history": ("education", "A"),
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
                    # Unmapped fields go to extra_fields
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
            # Gracefully handle missing, garbled, or malformed JSON
            print(f"Skipping malformed or error-prone file {source_path}: {e}")
            return []

        return results
