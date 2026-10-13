import asyncio
import json
import os
from nitro.agents.planner.engine import PlannerEngine
from nitro.agents.research.engine import ResearchEngine
from nitro.agents.correlation.engine import CorrelationEngine
from nitro.agents.evidence.engine import EvidenceEngine
from nitro.agents.hypothesis.engine import HypothesisEngine
from nitro.agents.report.engine import ReportEngine

async def export_data():
    print("Generating real packages for frontend...")
    query = "Contrastive Learning Vision"
    
    r_engine = ResearchEngine()
    c_engine = CorrelationEngine()
    e_engine = EvidenceEngine()
    h_engine = HypothesisEngine()
    rep_engine = ReportEngine()
    
    print("1. ResearchEngine")
    r_pkg = await r_engine.search_papers(query)
    
    print("2. CorrelationEngine")
    c_pkg = c_engine.process(r_pkg)
    
    print("3. EvidenceEngine")
    e_pkg = e_engine.process(c_pkg, r_pkg.papers)
    
    print("4. HypothesisEngine")
    h_pkg = h_engine.process(e_pkg)
    
    print("5. ReportEngine")
    rep_pkg = rep_engine.process(query, r_pkg, c_pkg, e_pkg, h_pkg)
    
    data = {
        "query": query,
        "researchPackage": r_pkg.model_dump(),
        "correlationPackage": c_pkg.model_dump(),
        "evidencePackage": e_pkg.model_dump(),
        "hypothesisPackage": h_pkg.model_dump(),
        "reportPackage": rep_pkg.model_dump()
    }
    
    out_dir = "frontend/src/data"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "packages.json")
    
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f)
        
    print(f"Exported to {out_path}")

if __name__ == "__main__":
    asyncio.run(export_data())
