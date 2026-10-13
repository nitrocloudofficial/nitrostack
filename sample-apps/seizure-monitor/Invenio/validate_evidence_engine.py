import asyncio
import time
from nitro.agents.research.engine import ResearchEngine
from nitro.agents.correlation.engine import CorrelationEngine
from nitro.agents.evidence.engine import EvidenceEngine

async def main():
    print("Initializing Engines...")
    r_engine = ResearchEngine()
    c_engine = CorrelationEngine()
    e_engine = EvidenceEngine()
    
    query = "Contrastive Learning Vision"
    print(f"\n1. Fetching ResearchPackage for: '{query}'")
    start_time = time.time()
    research_pkg = await r_engine.search_papers(query)
    print(f"   Found {len(research_pkg.papers)} unique papers in {time.time() - start_time:.2f}s")
    
    print("\n2. Transforming into CorrelationPackage...")
    start_time = time.time()
    correlation_pkg = c_engine.process(research_pkg)
    print(f"   CorrelationEngine finished in {time.time() - start_time:.2f}s")
    
    print("\n3. Transforming into EvidencePackage...")
    start_time = time.time()
    evidence_pkg = e_engine.process(correlation_pkg, research_pkg.papers)
    print(f"   EvidenceEngine finished in {time.time() - start_time:.2f}s")
    
    print("\n====================================================")
    print("EVIDENCE STATISTICS")
    print("====================================================")
    
    print(f"Total Claims Extracted: {len(evidence_pkg.claims)}")
    types = {}
    for c in evidence_pkg.claims:
        types[c.type] = types.get(c.type, 0) + 1
    for t, count in types.items():
        print(f"  - {t}: {count}")
        
    print(f"\nTotal Claim Edges (Supports/Contradicts): {len(evidence_pkg.claim_edges)}")
    print(f"Total Contradictions Detected: {len(evidence_pkg.contradictions)}")
    print(f"Total Consensus Findings: {len(evidence_pkg.consensus_findings)}")
    print(f"Total Research Gaps: {len(evidence_pkg.research_gaps)}")
    print(f"Total Opportunities: {len(evidence_pkg.opportunities)}")
    
    print("\n====================================================")
    print("SAMPLE INSIGHTS")
    print("====================================================")
    
    if evidence_pkg.consensus_findings:
        print("\nTOP CONSENSUS FINDING:")
        c = evidence_pkg.consensus_findings[0]
        print(f"  Finding: {c.finding}")
        print(f"  Supported by {len(c.supporting_papers)} papers (Confidence: {c.confidence:.2f})")
        
    if evidence_pkg.contradictions:
        print("\nTOP CONTRADICTION:")
        c = evidence_pkg.contradictions[0]
        print(f"  {c.description}")
        print(f"  Evidence: {c.evidence}")
        print(f"  Confidence: {c.confidence:.2f}")
        
    if evidence_pkg.opportunities:
        print("\nTOP OPPORTUNITY:")
        o = evidence_pkg.opportunities[0]
        print(f"  Title: {o.title}")
        print(f"  Impact: {o.potential_impact}")
        print(f"  Reason: {o.reason}")

if __name__ == "__main__":
    asyncio.run(main())
