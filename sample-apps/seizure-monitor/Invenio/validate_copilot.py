import asyncio
import json
from nitro.agents.copilot.engine import CopilotEngine
from nitro.agents.copilot.models import CopilotRequest, CopilotContext

def mock_packages():
    # We provide a mock EvidencePackage structure imitating Phase 4 output
    return {
        "evidencePackage": {
            "contradictions": [
                {
                    "id": "contradiction_001",
                    "description": "Conflict regarding self-supervised pretraining necessity.",
                    "evidence": {
                        "claim_1": {
                            "id": "claim_A",
                            "source_paper_id": "paper_101",
                            "text": "Self-supervised pretraining is absolutely strictly required for high accuracy."
                        },
                        "claim_2": {
                            "id": "claim_B",
                            "source_paper_id": "paper_202",
                            "text": "Pretraining provides negligible benefits and can be bypassed entirely."
                        }
                    }
                }
            ]
        }
    }

async def run_validation():
    print("====================================================")
    print("COPILOT AGENT VALIDATION")
    print("====================================================\n")
    
    engine = CopilotEngine()
    packages = mock_packages()
    
    # ---------------------------------------------------------
    # TEST 1: Context Awareness & Explainability (Zero Hallucination)
    # ---------------------------------------------------------
    print("TEST 1: Explaining a Contradiction (Context Resolution)\n")
    print("User UI State: User clicked Contradiction 'contradiction_001'")
    print("User Query : 'Please explain this contradiction.'\n")
    
    ctx1 = CopilotContext(active_node_id="contradiction_001", active_node_type="Contradiction")
    req1 = CopilotRequest(query="Please explain this contradiction.", context=ctx1, packages=packages)
    
    res1 = engine.process(req1)
    
    print("Copilot Markdown Output:")
    print("-" * 40)
    print(res1.markdown_text)
    print("-" * 40)
    print(f"Cited Papers: {res1.cited_paper_ids}")
    print(f"Confidence: {res1.confidence}")
    print(f"Emitted UI Actions: {[a.action_type.value for a in res1.actions]}")
    if res1.actions:
        print(f"Action Payload: {res1.actions[0].payload}")
        
    print("\n" + "="*50 + "\n")
    
    # ---------------------------------------------------------
    # TEST 2: Multi-Agent Delegation
    # ---------------------------------------------------------
    print("TEST 2: Multi-Agent Delegation (Planner Control)\n")
    print("User Query : 'Please search for more papers on this.'\n")
    
    ctx2 = CopilotContext()
    req2 = CopilotRequest(query="Please search more papers.", context=ctx2, packages=packages)
    
    res2 = engine.process(req2)
    
    print("Copilot Markdown Output:")
    print("-" * 40)
    print(res2.markdown_text)
    print("-" * 40)
    print(f"Emitted Actions: {[a.action_type.value for a in res2.actions]}")
    if res2.actions:
        print(f"Action Payload: {res2.actions[0].payload}")

if __name__ == "__main__":
    asyncio.run(run_validation())
