import uuid
from typing import List, Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from nitro.agents.correlation.models import CorrelationPackage, Graph, Node
from .models import (
    Claim, ClaimEdge, Contradiction, Consensus,
    ResearchGap, Opportunity, EvidenceTimelineEvent, EvidencePackage
)
from .extractor import SentenceExtractor

class EvidenceEngine:
    def __init__(self):
        self.extractor = SentenceExtractor()

    def process(self, correlation_pkg: CorrelationPackage, papers: list) -> EvidencePackage:
        # 1. Extract Claims
        claims = self.extractor.extract_claims(papers)
        
        # 2. Build Claim Graph
        claim_edges = self._build_claim_graph(claims)
        
        # 3. Detect Contradictions & Consensus
        contradictions, consensus = self._detect_contradictions_and_consensus(claims, claim_edges)
        
        # 4. Detect Research Gaps
        gaps = self._detect_research_gaps(correlation_pkg)
        
        # 5. Generate Opportunities
        opportunities = self._generate_opportunities(gaps, correlation_pkg)
        
        # 6. Timeline
        timeline = self._build_evidence_timeline(correlation_pkg)
        
        return EvidencePackage(
            claims=claims,
            claim_edges=claim_edges,
            contradictions=contradictions,
            consensus_findings=consensus,
            research_gaps=gaps,
            opportunities=opportunities,
            timeline=timeline
        )

    def _build_claim_graph(self, claims: List[Claim]) -> List[ClaimEdge]:
        if not claims:
            return []
            
        corpus = [c.text for c in claims]
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(corpus)
            cos_sim = cosine_similarity(tfidf_matrix)
        except ValueError:
            return []
            
        edges = []
        n = len(claims)
        for i in range(n):
            for j in range(i + 1, n):
                score = cos_sim[i][j]
                if score > 0.2:
                    c1, c2 = claims[i], claims[j]
                    
                    # Heuristics for relation type
                    if c1.type == "limitation" and c2.type == "contribution":
                        rel = "contradicts"
                    elif c1.type == "contribution" and c2.type == "limitation":
                        rel = "contradicts"
                    else:
                        rel = "supports"
                        
                    edges.append(ClaimEdge(
                        source_claim_id=c1.id,
                        target_claim_id=c2.id,
                        relation=rel,
                        weight=float(score)
                    ))
        return edges

    def _detect_contradictions_and_consensus(self, claims: List[Claim], edges: List[ClaimEdge]) -> Tuple[List[Contradiction], List[Consensus]]:
        contradictions = []
        consensus_findings = []
        
        claim_map = {c.id: c for c in claims}
        
        # Aggregate supports and contradicts
        supports_graph = {}
        for e in edges:
            if e.relation == "supports":
                supports_graph.setdefault(e.source_claim_id, []).append(e.target_claim_id)
                supports_graph.setdefault(e.target_claim_id, []).append(e.source_claim_id)
            elif e.relation == "contradicts":
                c1 = claim_map[e.source_claim_id]
                c2 = claim_map[e.target_claim_id]
                contradictions.append(Contradiction(
                    id=f"contra_{uuid.uuid4().hex[:8]}",
                    description=f"Conflicting claims regarding: {c1.text[:50]}...",
                    supporting_papers=[c1.paper_id] if c1.type == "contribution" else [c2.paper_id],
                    contradicting_papers=[c2.paper_id] if c1.type == "limitation" else [c1.paper_id],
                    confidence=e.weight,
                    evidence=f"Paper A claims: '{c1.text}'. Paper B claims: '{c2.text}'."
                ))
                
        # Detect Consensus (Claims with >= 2 supports)
        visited = set()
        for cid, neighbors in supports_graph.items():
            if cid in visited:
                continue
            if len(neighbors) >= 2:
                group = [cid] + neighbors
                visited.update(group)
                
                c_main = claim_map[cid]
                papers = list(set([claim_map[c].paper_id for c in group]))
                if len(papers) >= 2:
                    consensus_findings.append(Consensus(
                        id=f"cons_{uuid.uuid4().hex[:8]}",
                        finding=c_main.text,
                        supporting_papers=papers,
                        confidence=min(0.99, c_main.confidence + (len(papers) * 0.1))
                    ))
                    
        return contradictions, consensus_findings

    def _detect_research_gaps(self, pkg: CorrelationPackage) -> List[ResearchGap]:
        gaps = []
        # Find Methods that are completely disconnected from Datasets
        # This requires checking the Master Knowledge Graph
        kg = pkg.knowledge_graph
        
        methods = [n for n in pkg.method_graph.nodes]
        datasets = [n for n in pkg.dataset_graph.nodes]
        
        if methods and not datasets:
            gaps.append(ResearchGap(
                id=f"gap_{uuid.uuid4().hex[:8]}",
                description="High concentration of Methods with zero unified Benchmarks/Datasets.",
                related_nodes=[m.id for m in methods[:5]],
                weak_evidence_areas=["Empirical Benchmarking"]
            ))
            
        # Find disconnected clusters (Subfields)
        if len(pkg.clusters) > 1:
            c1, c2 = pkg.clusters[0], pkg.clusters[1]
            gaps.append(ResearchGap(
                id=f"gap_{uuid.uuid4().hex[:8]}",
                description=f"Lack of interdisciplinary research between '{c1.name}' and '{c2.name}'.",
                related_nodes=[],
                weak_evidence_areas=["Cross-domain application"]
            ))
            
        return gaps

    def _generate_opportunities(self, gaps: List[ResearchGap], pkg: CorrelationPackage) -> List[Opportunity]:
        opps = []
        for g in gaps:
            if "Benchmarks" in g.description:
                opps.append(Opportunity(
                    id=f"opp_{uuid.uuid4().hex[:8]}",
                    title="Standardized Benchmark Creation",
                    description="Develop a unified dataset to benchmark the diverse methods currently lacking empirical comparison.",
                    reason=g.description,
                    supporting_evidence=g.related_nodes,
                    potential_impact="High - Will unify the field and establish clear SOTA.",
                    novelty_score=0.85,
                    difficulty="High",
                    confidence=0.9
                ))
            elif "interdisciplinary" in g.description:
                opps.append(Opportunity(
                    id=f"opp_{uuid.uuid4().hex[:8]}",
                    title="Cross-Domain Knowledge Transfer",
                    description="Apply methodologies from one isolated subfield to another to spark novel discoveries.",
                    reason=g.description,
                    supporting_evidence=[],
                    potential_impact="Medium - High risk but high reward for novel applications.",
                    novelty_score=0.95,
                    difficulty="Medium",
                    confidence=0.75
                ))
        return opps

    def _build_evidence_timeline(self, pkg: CorrelationPackage) -> List[EvidenceTimelineEvent]:
        # Synthesize from Correlation Timeline
        ev_timeline = []
        for t in pkg.timeline:
            ev_timeline.append(EvidenceTimelineEvent(
                year=t.year,
                event_type="Consensus Shift",
                description=t.description
            ))
        return ev_timeline
