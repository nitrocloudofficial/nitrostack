from typing import Any, Dict, List
from models.candidate import Candidate, ProvenanceRecord

class DecisionLogCompiler:
    def compile_log(self, candidate: Candidate) -> Dict[str, Any]:
        """
        Compiles a structured explainable decision log for a single Candidate.
        Traces every decision back to raw sources, showing winners and losers.
        """
        log: Dict[str, Any] = {
            "candidate_id": candidate.candidate_id,
            "fields": {},
            "extra_fields": [
                {
                    "raw_key": ef.raw_key,
                    "value": ef.value,
                    "source": ef.source,
                    "reason": ef.reason
                }
                for ef in candidate.extra_fields
            ]
        }

        # Group provenance records by field name
        grouped_provenance: Dict[str, List[ProvenanceRecord]] = {}
        for p in candidate.provenance:
            if p.field not in grouped_provenance:
                grouped_provenance[p.field] = []
            grouped_provenance[p.field].append(p)

        for field, records in grouped_provenance.items():
            # Find the winner (action = "merged", or the single "normalized" record)
            winner_rec = None
            for r in records:
                if r.action in ["merged", "normalized"]:
                    # Note: in a group of size 1, "normalized" is the winner.
                    # In a merged group, the winner gets "merged".
                    winner_rec = r
                    break
            
            # If multiple records have "merged" (such as array fields), let's list them
            # or treat array fields slightly differently.
            # For array fields (emails, phones, skills, links, experience, education), there is no single winner;
            # they are all unioned and kept. Let's document this as "Union resolution".
            is_array_field = field in ["emails", "phones", "skills", "links", "experience", "education"]
            
            field_decision: Dict[str, Any] = {
                "field": field,
                "is_array_field": is_array_field,
                "winner_details": None,
                "conflict_penalty_applied": False,
                "final_confidence": 0.0,
                "candidates_considered": []
            }

            for r in records:
                # Serialize normalized value cleanly
                serialized_norm = self._serialize_val(r.normalized_value)
                serialized_raw = self._serialize_val(r.raw_value)
                
                contender = {
                    "source": r.source,
                    "raw_key": r.raw_key,
                    "raw_value": serialized_raw,
                    "normalized_value": serialized_norm,
                    "evidence_tier": r.evidence_tier,
                    "evidence_confidence": r.confidence,
                    "norm_confidence": r.norm_confidence,
                    "timestamp": r.timestamp,
                    "action": r.action,
                    "reason": r.reason if r.reason else ""
                }
                field_decision["candidates_considered"].append(contender)

            tied_records = [r for r in records if r.action == "tied"]
            if not is_array_field and winner_rec:
                # Single-valued fields winner details
                serialized_winner_val = self._serialize_val(getattr(candidate, field, None))
                
                # Check if conflict penalty was applied
                penalty_applied = "conflict penalty" in (winner_rec.reason or "").lower()
                
                winner_details = {
                    "value": serialized_winner_val,
                    "source": winner_rec.source,
                    "evidence_tier": winner_rec.evidence_tier,
                    "evidence_confidence": winner_rec.confidence,
                    "norm_confidence": winner_rec.norm_confidence,
                    "timestamp": winner_rec.timestamp,
                    "reason": winner_rec.reason if winner_rec.reason else "Default selection (highest priority)."
                }
                
                if winner_rec.merge_confidence is not None:
                    winner_details["merge_confidence"] = winner_rec.merge_confidence
                if winner_rec.merge_reason is not None:
                    winner_details["merge_reason"] = winner_rec.merge_reason
                    
                field_decision["winner_details"] = winner_details
                field_decision["conflict_penalty_applied"] = penalty_applied
                field_decision["final_confidence"] = winner_rec.merge_confidence if winner_rec.merge_confidence is not None else winner_rec.confidence
            elif not is_array_field and tied_records:
                # Unresolved Conflict tie
                field_decision["winner_details"] = {
                    "value": None,
                    "unresolved_conflict": True,
                    "reason": "Unresolved conflict: evidence tier, timestamp and post-normalization confidence were identical across multiple sources. No deterministic winner exists. Canonical value set to null."
                }
                field_decision["conflict_penalty_applied"] = False
                field_decision["final_confidence"] = tied_records[0].confidence
            elif is_array_field:
                # For array fields, overall confidence is average of merged confidences
                winners = [r for r in records if r.action in ["merged", "normalized"]]
                avg_conf = sum(w.confidence for w in winners) / len(winners) if winners else 0.0
                
                unioned_vals = []
                for w in winners:
                    ser = self._serialize_val(w.normalized_value)
                    if ser not in unioned_vals:
                        unioned_vals.append(ser)
                        
                field_decision["winner_details"] = {
                    "unioned_values": unioned_vals,
                    "reason": f"Union + deduplicated array values from {len(winners)} source signals."
                }
                field_decision["final_confidence"] = avg_conf

            log["fields"][field] = field_decision

        return log

    def _serialize_val(self, val: Any) -> Any:
        from engine.projection import ProjectionLayer
        return ProjectionLayer()._serialize_value(val)
