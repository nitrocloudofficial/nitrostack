import re
from typing import Any, Dict, Optional, List
from normalizers.base import BaseNormalizer, NormalizationResult

import os
import json

def load_skill_aliases() -> dict:
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        config_path = os.path.join(base_dir, 'configs', 'skill_aliases.json')
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: Failed to load skill aliases: {e}")
    return {}

def get_similarity(s1: str, s2: str) -> float:
    # Try importing RapidFuzz
    try:
        from rapidfuzz import fuzz
        return fuzz.token_sort_ratio(s1, s2) / 100.0
    except ImportError:
        pass
    
    # Simple fallback: Jaccard similarity of character 2-grams
    def get_ngrams(s, n=2):
        return set(s[i:i+n] for i in range(len(s)-n+1))
    
    g1 = get_ngrams(s1)
    g2 = get_ngrams(s2)
    if not g1 or not g2:
        return 1.0 if s1 == s2 else 0.0
    return len(g1.intersection(g2)) / float(len(g1.union(g2)))

class SkillNormalizer(BaseNormalizer):
    def normalize(self, raw: Any, context: Optional[Dict[str, Any]] = None) -> NormalizationResult:
        canonical_skills = load_skill_aliases()
        # Split raw input if it's a comma-separated string, or convert to list
        raw_skills: List[str] = []
        if isinstance(raw, list):
            raw_skills = [str(s).strip() for s in raw if s]
        elif isinstance(raw, str):
            # Split on commas or semicolons
            raw_skills = [s.strip() for s in re.split(r'[,;]', raw) if s.strip()]
        else:
            raw_skills = [str(raw).strip()]

        matched_skills: List[str] = []
        unmatched_skills: List[str] = []
        notes: List[str] = []
        total_confidence = 0.0
        match_count = 0

        for skill in raw_skills:
            skill_lower = skill.lower()
            found_canonical = None
            found_confidence = 0.0
            found_note = ""

            # 1. Check exact match
            for canonical, aliases in canonical_skills.items():
                if skill_lower == canonical.lower() or skill_lower in aliases:
                    found_canonical = canonical
                    found_confidence = 0.95
                    found_note = f"Exact alias match for '{skill}'"
                    break
            
            # 2. Check fuzzy match
            if not found_canonical:
                best_match = None
                best_score = 0.0
                for canonical, aliases in canonical_skills.items():
                    for alias in [canonical] + aliases:
                        score = get_similarity(skill_lower, alias)
                        if score > best_score:
                            best_score = score
                            best_match = canonical
                
                # Threshold for fuzzy match: 75% similarity
                if best_score >= 0.75:
                    found_canonical = best_match
                    found_confidence = 0.70 * best_score  # Scale confidence based on similarity
                    found_note = f"Fuzzy match for '{skill}' -> '{best_match}' (score: {best_score:.2f})"

            if found_canonical:
                matched_skills.append(found_canonical)
                total_confidence += found_confidence
                notes.append(found_note)
                match_count += 1
            else:
                unmatched_skills.append(skill)

        # Deduplicate matched skills
        unique_matches = []
        for s in matched_skills:
            if s not in unique_matches:
                unique_matches.append(s)

        avg_confidence = total_confidence / match_count if match_count > 0 else 0.0
        
        # Combine notes
        combined_note = "; ".join(notes)
        if unmatched_skills:
            combined_note += f" | Unmatched skills routed to extra_fields: {unmatched_skills}"

        # Return a dictionary that adheres to the interface but carries the extra 'unmatched' field
        res: NormalizationResult = {
            "value": unique_matches,
            "confidence": avg_confidence if unique_matches else 0.0,
            "note": combined_note
        }
        # Add custom key 'unmatched' to let the engine capture unmatched skills
        res["unmatched"] = unmatched_skills  # type: ignore
        return res
