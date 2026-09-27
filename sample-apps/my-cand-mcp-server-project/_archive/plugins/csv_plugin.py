import os
import csv
from typing import List, Any
from plugins.base import BaseSourcePlugin, RawCandidateField

class CSVPlugin(BaseSourcePlugin):
    def detect(self, source_path: str) -> bool:
        return os.path.basename(source_path).lower().endswith('.csv')

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
                reader = csv.DictReader(f)
                for index, row in enumerate(reader):
                    row_id = row.get('candidate_id') or f"row_{index}"
                    record_id = f"{source_path}#{row_id}"
                    
                    # Determine row timestamp
                    row_time = mtime
                    if 'timestamp' in row and row['timestamp']:
                        try:
                            row_time = float(row['timestamp'])
                        except ValueError:
                            pass

                    # Extract each field
                    for key, val in row.items():
                        if not val:
                            continue
                        
                        # Strip spacing
                        val_str = val.strip() if isinstance(val, str) else val
                        if val_str == "":
                            continue

                        # Map columns to target fields
                        if key == 'candidate_id':
                            results.append({
                                "raw_key": key,
                                "raw_value": val_str,
                                "target_field": "candidate_id",
                                "evidence_tier": "A",
                                "source": source_path,
                                "timestamp": row_time,
                                "record_id": record_id
                            })
                        elif key == 'full_name':
                            results.append({
                                "raw_key": key,
                                "raw_value": val_str,
                                "target_field": "full_name",
                                "evidence_tier": "A",
                                "source": source_path,
                                "timestamp": row_time,
                                "record_id": record_id
                            })
                        elif key == 'email':
                            results.append({
                                "raw_key": key,
                                "raw_value": val_str,
                                "target_field": "emails",
                                "evidence_tier": "A",
                                "source": source_path,
                                "timestamp": row_time,
                                "record_id": record_id
                            })
                        elif key == 'phone':
                            results.append({
                                "raw_key": key,
                                "raw_value": val_str,
                                "target_field": "phones",
                                "evidence_tier": "A",
                                "source": source_path,
                                "timestamp": row_time,
                                "record_id": record_id
                            })
                        elif key == 'location':
                            results.append({
                                "raw_key": key,
                                "raw_value": val_str,
                                "target_field": "location",
                                "evidence_tier": "A",
                                "source": source_path,
                                "timestamp": row_time,
                                "record_id": record_id
                            })
                        elif key == 'skills':
                            results.append({
                                "raw_key": key,
                                "raw_value": val_str,
                                "target_field": "skills",
                                "evidence_tier": "A",
                                "source": source_path,
                                "timestamp": row_time,
                                "record_id": record_id
                            })
                        elif key == 'timestamp':
                            # Internal metadata column, skip
                            continue
                        else:
                            # Unmapped fields go to extra_fields
                            results.append({
                                "raw_key": key,
                                "raw_value": val_str,
                                "target_field": "extra_fields",
                                "evidence_tier": "A",
                                "source": source_path,
                                "timestamp": row_time,
                                "record_id": record_id
                            })
        except Exception as e:
            # Let the engine handle file reading errors or return empty results gracefully
            # to demonstrate edge case "missing or garbled/malformed source file is skipped gracefully".
            # We can log this or let the caller catch it. Returning empty list here allows graceful skip.
            print(f"Error reading CSV {source_path}: {e}")
            return []

        return results
