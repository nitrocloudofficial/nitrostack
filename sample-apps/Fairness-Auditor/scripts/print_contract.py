"""Print the exact build_graph() contract output for Person A's Hour-14 handoff."""
import json
from orchestrator.track_a.agent1_auditor import build_graph

graph = build_graph()
result = graph.invoke({"target_name": "loan-decision-agent", "budget_remaining": 20})

print("=== build_graph() output shape (for Person A) ===")
output = {
    "scan_run_id": result["scan_run_id"],
    "findings": result["findings"],
}
print(json.dumps(output, indent=2, default=str))
print()
print(f"scan_run_id type: {type(result['scan_run_id']).__name__}")
print(f"findings count: {len(result['findings'])}")
if result["findings"]:
    print(f"finding keys: {list(result['findings'][0].keys())}")
    print(f"example finding: {json.dumps(result['findings'][0], indent=2, default=str)}")
else:
    print("(empty findings list is valid: no combo crossed both DIR < 0.80 AND BH-significance)")
