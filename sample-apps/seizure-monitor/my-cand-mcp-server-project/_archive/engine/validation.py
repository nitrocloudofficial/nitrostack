from typing import Any, Dict, List
from models.candidate import Candidate
from models.config import ProjectionConfig, ProjectionFieldConfig
from models.reporting import ValidationResult
from engine.projection import resolve_nested_path

class ProjectionValidator:
    def validate(self, candidate: Candidate, projected_output: Dict[str, Any], config: ProjectionConfig) -> ValidationResult:
        """
        Validates the projected JSON output dictionary against the original Candidate and ProjectionConfig.
        """
        errors: List[str] = []
        warnings: List[str] = []
        
        # Check duplicate target names
        seen_paths = set()
        for field_cfg in config.fields:
            if field_cfg.path in seen_paths:
                errors.append(f"Duplicate projected field name targeted in configuration: '{field_cfg.path}'")
            seen_paths.add(field_cfg.path)

        for field_cfg in config.fields:
            target_name = field_cfg.path
            source_path = field_cfg.from_path if field_cfg.from_path else target_name

            # 1. Validate projection path exists in canonical model
            val, _ = resolve_nested_path(candidate, source_path)
            if val is None and not source_path.startswith("extra_fields"):
                # Check if it was genuinely not resolvable (invalid path) vs just null
                # We can check if candidate has the base attribute
                base_attribute = source_path.split('.')[0].split('[')[0]
                if not hasattr(candidate, base_attribute):
                    errors.append(f"Invalid projection source path: '{source_path}' is not a valid attribute on Candidate.")
                    continue

            # 2. Extract actual projected value (handling include_confidence wrapper)
            has_field = target_name in projected_output
            projected_item = projected_output.get(target_name)
            
            actual_val = projected_item
            if config.include_confidence and isinstance(projected_item, dict) and "value" in projected_item:
                actual_val = projected_item["value"]

            # 3. Check required fields
            if field_cfg.required:
                if not has_field or actual_val is None or actual_val == "" or actual_val == []:
                    errors.append(f"Required projected field '{target_name}' is missing or null.")
                    continue

            # 4. Check projected value type matches config specification
            if actual_val is not None and field_cfg.type:
                expected_type = field_cfg.type.lower()
                if expected_type == "string" and not isinstance(actual_val, str):
                    errors.append(f"Field '{target_name}' expected type 'string', got '{type(actual_val).__name__}'")
                elif expected_type == "number" and not isinstance(actual_val, (int, float)):
                    errors.append(f"Field '{target_name}' expected type 'number', got '{type(actual_val).__name__}'")
                elif expected_type == "array" and not isinstance(actual_val, (list, tuple)):
                    errors.append(f"Field '{target_name}' expected type 'array', got '{type(actual_val).__name__}'")
                elif expected_type == "object" and not isinstance(actual_val, dict):
                    errors.append(f"Field '{target_name}' expected type 'object', got '{type(actual_val).__name__}'")

        is_valid = len(errors) == 0
        return ValidationResult(is_valid=is_valid, errors=errors, warnings=warnings)
