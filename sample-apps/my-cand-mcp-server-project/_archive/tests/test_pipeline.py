import unittest
import os
import tempfile
import json
import shutil
from models.candidate import Candidate, ProvenanceRecord, Location
from normalizers.phone import PhoneNormalizer
from normalizers.location import LocationNormalizer
from normalizers.date import DateNormalizer
from engine.pipeline import CandidateTransformerEngine
from engine.projection import ProjectionLayer
from engine.validation import ProjectionValidator
from models.config import ProjectionConfig, ProjectionFieldConfig
from engine.explainability import DecisionLogCompiler
from engine.dashboard import QualityDashboardCompiler
from models.reporting import ValidationResult

class TestCandidateTransformer(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.engine = CandidateTransformerEngine()
        
    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_phone_normalization_and_validation(self):
        normalizer = PhoneNormalizer()
        
        # Valid US phone formats
        res1 = normalizer.normalize("+1 617-555-0244", {"country": "US"})
        res2 = normalizer.normalize("6175550244", {"country": "US"})
        res3 = normalizer.normalize("+16175550244", {"country": "US"})
        self.assertEqual(res1["value"], "+16175550244")
        self.assertEqual(res2["value"], "+16175550244")
        self.assertEqual(res3["value"], "+16175550244")
        
        # Invalid phone format failing US rules
        res_invalid = normalizer.normalize("5550244", {"country": "US"})
        self.assertIsNone(res_invalid["value"])
        self.assertEqual(res_invalid["confidence"], 0.0)
        self.assertIn("Invalid US phone number", res_invalid["note"])

        # Validation without country context and no prefix should fail (no US assumption)
        res_no_context = normalizer.normalize("6175550244")
        self.assertIsNone(res_no_context["value"])
        self.assertEqual(res_no_context["confidence"], 0.0)
        self.assertIn("No country signal", res_no_context["note"])

    def test_smart_location_merging_and_enrichment(self):
        c1 = Candidate(candidate_id="C1")
        p1 = ProvenanceRecord(
            source="source_a.json",
            field="location", raw_key="location", raw_value="Springfield",
            normalized_value=Location(raw="Springfield", city="Springfield"),
            evidence_tier="A", confidence=0.95, timestamp=2000.0, action="normalized"
        )
        c1.provenance.append(p1)

        c2 = Candidate(candidate_id="C1")
        p2 = ProvenanceRecord(
            source="source_b.json",
            field="location", raw_key="location", raw_value="Springfield, IL, US",
            normalized_value=Location(raw="Springfield, IL, US", city="Springfield", state="IL", country="US"),
            evidence_tier="A", confidence=0.95, timestamp=1000.0, action="normalized"
        )
        c2.provenance.append(p2)

        # Merge them
        merged = self.engine._merge_candidates([c1, c2])
        
        # Verify enrichment
        self.assertEqual(merged.location.city, "Springfield")
        self.assertEqual(merged.location.state, "IL")
        self.assertEqual(merged.location.country, "US")
        
        # Verify provenance was NOT overwritten
        self.assertEqual(p1.normalized_value.state, None)
        self.assertEqual(p2.normalized_value.state, "IL")
        
        # Verify merge enrichment reasons and confidence set on winner
        winner_prov = next(p for p in merged.provenance if p.action == "merged")
        self.assertIsNotNone(winner_prov.merge_reason)
        self.assertIn("inferred from complementary source", winner_prov.merge_reason)
        self.assertAlmostEqual(winner_prov.merge_confidence, 0.80)

    def test_unresolved_tie_conflict(self):
        c1 = Candidate(candidate_id="C1")
        c1.emails = ["test@example.com"]
        p1 = ProvenanceRecord(
            field="full_name", raw_key="name", raw_value="John Tie A",
            normalized_value="John Tie A", evidence_tier="A", confidence=0.95,
            norm_confidence=0.95, timestamp=1000.0, source="source_a.json", action="normalized"
        )
        c1.provenance.append(p1)

        c2 = Candidate(candidate_id="C1")
        c2.emails = ["test@example.com"]
        p2 = ProvenanceRecord(
            field="full_name", raw_key="name", raw_value="John Tie B",
            normalized_value="John Tie B", evidence_tier="A", confidence=0.95,
            norm_confidence=0.95, timestamp=1000.0, source="source_b.json", action="normalized"
        )
        c2.provenance.append(p2)

        merged = self.engine._merge_candidates([c1, c2])
        self.assertIsNone(merged.full_name)
        
        # Provenance action should be "tied" with 0.15 confidence
        for p in merged.provenance:
            self.assertEqual(p.action, "tied")
            self.assertEqual(p.confidence, 0.15)
            self.assertIn("Unresolved conflict", p.reason)

    def test_weak_signal_promotion(self):
        c1 = Candidate(candidate_id="C1")
        p1 = ProvenanceRecord(
            field="headline", raw_key="headline", raw_value="Engineer",
            normalized_value="Engineer", evidence_tier="C", confidence=0.50,
            norm_confidence=0.90, timestamp=1000.0, source="source_a.json", action="normalized"
        )
        c1.provenance.append(p1)

        c2 = Candidate(candidate_id="C1")
        p2 = ProvenanceRecord(
            field="headline", raw_key="headline", raw_value="Engineer",
            normalized_value="Engineer", evidence_tier="C", confidence=0.50,
            norm_confidence=0.90, timestamp=2000.0, source="source_b.json", action="normalized"
        )
        c2.provenance.append(p2)

        merged = self.engine._merge_candidates([c1, c2])
        winner_prov = next(p for p in merged.provenance if p.action == "merged")
        
        # Weak signal promotion should boost confidence: c1 + c2 - c1*c2 = 0.5 + 0.5 - 0.25 = 0.75
        self.assertAlmostEqual(winner_prov.confidence, 0.75)
        self.assertIn("Weak signal promotion", winner_prov.reason)

    def test_evidence_conflict_penalty(self):
        c1 = Candidate(candidate_id="C1")
        p1 = ProvenanceRecord(
            field="headline", raw_key="headline", raw_value="Engineer A",
            normalized_value="Engineer A", evidence_tier="C", confidence=0.50,
            norm_confidence=0.90, timestamp=2000.0, source="source_a.json", action="normalized"
        )
        c1.provenance.append(p1)

        c2 = Candidate(candidate_id="C1")
        p2 = ProvenanceRecord(
            field="headline", raw_key="headline", raw_value="Engineer B",
            normalized_value="Engineer B", evidence_tier="C", confidence=0.50,
            norm_confidence=0.90, timestamp=1000.0, source="source_b.json", action="normalized"
        )
        c2.provenance.append(p2)

        merged = self.engine._merge_candidates([c1, c2])
        winner_prov = next(p for p in merged.provenance if p.action == "merged")
        
        # Conflict penalty reduces confidence by 0.10 -> 0.50 - 0.10 = 0.40
        self.assertAlmostEqual(winner_prov.confidence, 0.40)
        self.assertIn("Conflict penalty", winner_prov.reason)

    def test_source_format_locking(self):
        # We test locks on slash separated dates
        raw_fields = [
            {"target_field": "headline", "raw_key": "x", "raw_value": "25/12/2022", "evidence_tier": "C", "source": "s1.json", "timestamp": 1.0, "record_id": "r1"},
            {"target_field": "headline", "raw_key": "y", "raw_value": "13/05/2021", "evidence_tier": "C", "source": "s1.json", "timestamp": 1.0, "record_id": "r1"}
        ]
        locks = self.engine._analyze_date_formats(raw_fields)
        # 25/12 represents DD/MM because 25 > 12
        # 13/05 represents DD/MM because 13 > 12
        self.assertEqual(locks.get("s1.json"), "DD/MM/YYYY")

    def test_validation_missing_required_fields(self):
        validator = ProjectionValidator()
        config = ProjectionConfig(
            include_confidence=True,
            on_missing="null",
            fields=[
                ProjectionFieldConfig(path="name", from_path="full_name", type="string", required=True)
            ]
        )
        
        # Projected candidate with missing required 'name'
        proj_candidate = {
            "name": {
                "value": None,
                "confidence": 0.95
            }
        }
        
        res = validator.validate(Candidate(candidate_id="C1"), proj_candidate, config)
        self.assertFalse(res.is_valid)
        self.assertIn("Required projected field 'name' is missing or null.", res.errors[0])

    def test_malformed_json_skip(self):
        # Create a malformed JSON file
        bad_json_path = os.path.join(self.temp_dir, "bad_ats.json")
        with open(bad_json_path, 'w') as f:
            f.write("{ invalid json [ }")
            
        res = self.engine.run_pipeline([bad_json_path])
        self.assertEqual(len(res), 0)
        self.assertEqual(self.engine.malformed_sources_skipped, 1)
        self.assertIn(bad_json_path, self.engine.malformed_sources)

if __name__ == "__main__":
    unittest.main()
