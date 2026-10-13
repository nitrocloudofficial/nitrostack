import uuid
from nitro.agents.evidence.models import EvidencePackage
from .models import HypothesisPackage, Hypothesis

class HypothesisEngine:
    def process(self, evidence_pkg: EvidencePackage) -> HypothesisPackage:
        hypotheses = []
        
        # Turn every Opportunity into a formal Hypothesis
        for opp in evidence_pkg.opportunities:
            hypotheses.append(Hypothesis(
                id=f"hyp_{uuid.uuid4().hex[:8]}",
                title=f"Hypothesis: {opp.title}",
                premise=f"Given that {opp.reason}, it is hypothesized that new insights can be derived.",
                proposed_methodology=f"Investigate by applying {opp.description}",
                expected_outcome=f"Expected impact: {opp.potential_impact}",
                confidence=opp.confidence,
                supporting_evidence_ids=opp.supporting_evidence
            ))
            
        return HypothesisPackage(hypotheses=hypotheses)
