from typing import Any, Dict, List
from models.candidate import Candidate
from models.reporting import ValidationResult

class QualityDashboardCompiler:
    def compile_dashboard(
        self,
        raw_candidates_count: int,
        merged_candidates: List[Candidate],
        validation_results: List[ValidationResult],
        malformed_sources_skipped: int
    ) -> Dict[str, Any]:
        """
        Compiles the aggregate Quality Dashboard summary JSON for a batch execution.
        """
        total_merged = len(merged_candidates)
        
        # 1. Field fill rate calculation
        # Core fields: full_name, emails, phones, location, links, headline, years_experience, skills, experience, education
        core_fields = ["full_name", "emails", "phones", "location", "links", "headline", "years_experience", "skills", "experience", "education"]
        total_slots = total_merged * len(core_fields)
        populated_count = 0

        for c in merged_candidates:
            for field in core_fields:
                val = getattr(c, field)
                if val is not None and val != [] and val != "":
                    populated_count += 1

        fields_populated_pct = (populated_count / total_slots * 100.0) if total_slots > 0 else 0.0
        fields_missing_pct = 100.0 - fields_populated_pct

        # 2. Average confidence per canonical field
        field_confs: Dict[str, List[float]] = {f: [] for f in core_fields}
        for c in merged_candidates:
            # Check provenance for resolved/tied values
            for prov in c.provenance:
                if prov.field in field_confs and prov.action in ["merged", "normalized", "tied"]:
                    field_confs[prov.field].append(prov.confidence)

        avg_confidence_per_field = {}
        all_confs = []
        for field, confs in field_confs.items():
            if confs:
                avg = sum(confs) / len(confs)
                avg_confidence_per_field[field] = round(avg, 3)
                all_confs.extend(confs)
            else:
                avg_confidence_per_field[field] = 0.0

        average_confidence_across_batch = sum(all_confs) / len(all_confs) if all_confs else 0.0

        # 3. Conflicts, promotions, and skipped files
        total_conflicts = 0
        unresolved_conflicts = 0
        unresolved_fields = set()
        conflict_resolutions = []
        promoted_weak_signals = 0
        extra_fields_count = 0

        for c in merged_candidates:
            extra_fields_count += len(c.extra_fields)
            
            # Check unresolved conflicts per candidate
            tied_fields_for_candidate = set()
            for prov in c.provenance:
                if prov.action == "tied":
                    tied_fields_for_candidate.add(prov.field)
                
                # Check for conflict penalty indicator
                if prov.action == "merged" and prov.reason and "conflict penalty" in prov.reason.lower():
                    total_conflicts += 1
                    conflict_resolutions.append({
                        "candidate_id": c.candidate_id,
                        "field": prov.field,
                        "winning_value": str(prov.normalized_value),
                        "resolution": "priority_winner (conflict penalty applied)",
                        "reason": prov.reason
                    })
                # Check for weak signal promotion indicator
                if prov.reason and "weak signal promotion" in prov.reason.lower():
                    promoted_weak_signals += 1

            unresolved_conflicts += len(tied_fields_for_candidate)
            unresolved_fields.update(tied_fields_for_candidate)

        # 4. Unresolved identities
        unresolved_identities = 0
        for c in merged_candidates:
            unique_sources = set(prov.source for prov in c.provenance)
            if len(unique_sources) == 1:
                unresolved_identities += 1

        # 5. Validation errors
        total_validation_errors = 0
        for v in validation_results:
            total_validation_errors += len(v.errors)

        dashboard: Dict[str, Any] = {
            "batch_summary": {
                "total_candidates_processed": raw_candidates_count,
                "total_merged_candidates": total_merged,
                "unresolved_identities": unresolved_identities,
                "malformed_sources_skipped": malformed_sources_skipped,
            },
            "schema_coverage": {
                "fields_populated_pct": round(fields_populated_pct, 2),
                "fields_missing_pct": round(fields_missing_pct, 2),
                "average_confidence_across_batch": round(average_confidence_across_batch, 3),
                "average_confidence_per_field": avg_confidence_per_field
            },
            "resolution_metrics": {
                "total_conflicts": total_conflicts,
                "unresolved_conflicts": unresolved_conflicts,
                "unresolved_fields_count": len(unresolved_fields),
                "unresolved_fields": list(unresolved_fields),
                "promoted_weak_signals_count": promoted_weak_signals,
                "extra_fields_count": extra_fields_count,
                "validation_errors_count": total_validation_errors,
                "conflict_resolutions": conflict_resolutions
            }
        }

        return dashboard
