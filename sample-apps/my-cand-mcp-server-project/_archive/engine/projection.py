import re
from typing import Any, Dict, List, Optional, Tuple
from models.candidate import Candidate, Location, Experience, Education, ProvenanceRecord
from models.config import ProjectionConfig, ProjectionFieldConfig

def resolve_nested_path(obj: Any, path: str) -> Tuple[Any, Optional[ProvenanceRecord]]:
    """
    Resolves a nested path string (e.g., 'location.city' or 'experience[0].company') on a Candidate object.
    Returns a tuple of (resolved_value, winning_provenance_record).
    """
    parts = re.split(r'\.|(?=\[)', path)
    parts = [p.strip('.') for p in parts if p]
    
    current = obj
    last_field = None
    
    for part in parts:
        if not current:
            return None, None
            
        # Check if it's an array index segment, e.g., "[0]"
        match = re.match(r'^\[(\d+)\]$', part)
        if match:
            idx = int(match.group(1))
            if isinstance(current, (list, tuple)):
                if idx < len(current):
                    current = current[idx]
                else:
                    return None, None
            else:
                return None, None
        else:
            # Attribute lookup
            if hasattr(current, part):
                current = getattr(current, part)
                last_field = part
            elif isinstance(current, dict) and part in current:
                current = current[part]
                last_field = part
            else:
                return None, None

    # Retrieve winning provenance record for the resolved field
    winning_prov = None
    if isinstance(obj, Candidate) and last_field:
        # Find merged/normalized record in provenance matching the last field
        for prov in obj.provenance:
            if prov.field == last_field and prov.action in ["merged", "normalized"]:
                winning_prov = prov
                break
        if not winning_prov:
            # Fallback to check if it was tied
            for prov in obj.provenance:
                if prov.field == last_field and prov.action == "tied":
                    winning_prov = prov
                    break
                
    return current, winning_prov

class ProjectionLayer:
    def project(self, candidate: Candidate, config: ProjectionConfig) -> Dict[str, Any]:
        """
        Projects a Candidate canonical record into the final output JSON schema based on the config.
        """
        output: Dict[str, Any] = {}
        
        # If no fields are specified, default to writing standard fields
        fields_to_project = config.fields
        if not fields_to_project:
            # Generate default fields configuration if empty
            fields_to_project = [
                ProjectionFieldConfig(path="candidate_id", type="string"),
                ProjectionFieldConfig(path="full_name", type="string"),
                ProjectionFieldConfig(path="emails", type="array"),
                ProjectionFieldConfig(path="phones", type="array"),
                ProjectionFieldConfig(path="location", type="object"),
                ProjectionFieldConfig(path="links", type="array"),
                ProjectionFieldConfig(path="headline", type="string"),
                ProjectionFieldConfig(path="years_experience", type="number"),
                ProjectionFieldConfig(path="skills", type="array")
            ]

        for field_cfg in fields_to_project:
            target_name = field_cfg.path
            source_path = field_cfg.from_path if field_cfg.from_path else target_name
            
            # Resolve value and corresponding provenance
            val, prov = resolve_nested_path(candidate, source_path)
            
            # Check for per-field normalize override (e.g. converting format, capitalization)
            if field_cfg.normalize and val:
                # E.g. "uppercase", "lowercase", etc.
                if field_cfg.normalize == "uppercase" and isinstance(val, str):
                    val = val.upper()
                elif field_cfg.normalize == "lowercase" and isinstance(val, str):
                    val = val.lower()

            # Handle on_missing behavior for null/missing values
            if val is None or val == [] or val == "":
                if field_cfg.required:
                    if config.on_missing == "error":
                        raise ValueError(f"Required field '{target_name}' is missing on candidate '{candidate.candidate_id}'.")
                    elif config.on_missing == "omit":
                        continue
                    else:
                        val = None
                else:
                    if config.on_missing == "omit":
                        continue
                    else:
                        val = None

            # Serialize custom types like Location, Experience, Education to dictionaries
            serialized_val = self._serialize_value(val)

            # Check if we should include confidence alongside the field
            if config.include_confidence:
                confidence = prov.merge_confidence if (prov and getattr(prov, 'merge_confidence', None) is not None) else (prov.confidence if prov else 1.0)
                if target_name == "overall_confidence":
                    confidence = 1.0
                output[target_name] = {
                    "value": serialized_val,
                    "confidence": confidence
                }
            else:
                output[target_name] = serialized_val

        # If include_provenance is enabled, attach candidate provenance
        # We can support include_provenance at top level
        # Let's check if the config specifies include_provenance (defaulting to True/False)
        include_prov = getattr(config, 'include_provenance', False)
        if include_prov:
            output["provenance"] = [self._serialize_provenance(p) for p in candidate.provenance]

        return output

    def _serialize_value(self, val: Any) -> Any:
        if isinstance(val, Location):
            return {
                "raw": val.raw,
                "city": val.city,
                "state": val.state,
                "country": val.country
            }
        elif isinstance(val, Experience):
            return {
                "company": val.company,
                "title": val.title,
                "start_date": val.start_date,
                "end_date": val.end_date,
                "description": val.description
            }
        elif isinstance(val, Education):
            return {
                "institution": val.institution,
                "degree": val.degree,
                "field_of_study": val.field_of_study,
                "start_date": val.start_date,
                "end_date": val.end_date
            }
        elif isinstance(val, list):
            return [self._serialize_value(item) for item in val]
        return val

    def _serialize_provenance(self, p: ProvenanceRecord) -> Dict[str, Any]:
        return {
            "source": p.source,
            "field": p.field,
            "raw_key": p.raw_key,
            "raw_value": p.raw_value,
            "normalized_value": self._serialize_value(p.normalized_value),
            "evidence_tier": p.evidence_tier,
            "confidence": p.confidence,
            "norm_confidence": p.norm_confidence,
            "norm_note": p.norm_note,
            "timestamp": p.timestamp,
            "action": p.action,
            "reason": p.reason
        }
