import os
import re
from typing import List, Dict, Any
from plugins.base import BaseSourcePlugin, RawCandidateField

class RecruiterNotesPlugin(BaseSourcePlugin):
    def detect(self, source_path: str) -> bool:
        filename = os.path.basename(source_path).lower()
        return filename.endswith('.txt') and 'notes' in filename

    def extract(self, source_path: str) -> List[RawCandidateField]:
        if not self.detect(source_path):
            return []

        results: List[RawCandidateField] = []
        try:
            mtime = os.path.getmtime(source_path)
            with open(source_path, mode='r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Skipping recruiter notes file {source_path}: {e}")
            return []

        record_id = f"{source_path}#default"
        
        # Check for timestamp line
        timestamp = mtime
        time_match = re.search(r'Timestamp:\s*(\d+)', content, re.IGNORECASE)
        if time_match:
            try:
                timestamp = float(time_match.group(1))
            except ValueError:
                pass

        lines = content.split('\n')
        for line in lines:
            if ":" not in line:
                continue
            
            parts = line.split(":", 1)
            raw_key = parts[0].strip()
            raw_val = parts[1].strip()
            if not raw_val:
                continue

            lower_key = raw_key.lower()
            if "candidate name" in lower_key:
                results.append({
                    "raw_key": raw_key,
                    "raw_value": raw_val,
                    "target_field": "full_name",
                    "evidence_tier": "A",
                    "source": source_path,
                    "timestamp": timestamp,
                    "record_id": record_id
                })
            elif lower_key == "email":
                results.append({
                    "raw_key": raw_key,
                    "raw_value": raw_val,
                    "target_field": "emails",
                    "evidence_tier": "A",
                    "source": source_path,
                    "timestamp": timestamp,
                    "record_id": record_id
                })
            elif lower_key == "phone":
                results.append({
                    "raw_key": raw_key,
                    "raw_value": raw_val,
                    "target_field": "phones",
                    "evidence_tier": "A",
                    "source": source_path,
                    "timestamp": timestamp,
                    "record_id": record_id
                })
            elif lower_key == "location":
                results.append({
                    "raw_key": raw_key,
                    "raw_value": raw_val,
                    "target_field": "location",
                    "evidence_tier": "A",
                    "source": source_path,
                    "timestamp": timestamp,
                    "record_id": record_id
                })
            elif lower_key == "skills":
                results.append({
                    "raw_key": raw_key,
                    "raw_value": raw_val,
                    "target_field": "skills",
                    "evidence_tier": "A",
                    "source": source_path,
                    "timestamp": timestamp,
                    "record_id": record_id
                })
            elif lower_key == "experience":
                # E.g. "10 years of programming" -> extract 10
                exp_match = re.search(r'(\d+(?:\.\d+)?)', raw_val)
                if exp_match:
                    try:
                        years = float(exp_match.group(1))
                        results.append({
                            "raw_key": raw_key,
                            "raw_value": years,
                            "target_field": "years_experience",
                            "evidence_tier": "B",  # regex extracted
                            "source": source_path,
                            "timestamp": timestamp,
                            "record_id": record_id
                        })
                    except ValueError:
                        pass
            elif lower_key == "timestamp":
                continue
            else:
                # Store unmapped fields in extra_fields
                results.append({
                    "raw_key": raw_key,
                    "raw_value": raw_val,
                    "target_field": "extra_fields",
                    "evidence_tier": "A",
                    "source": source_path,
                    "timestamp": timestamp,
                    "record_id": record_id
                })

        return results
