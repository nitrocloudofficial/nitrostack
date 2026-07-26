import os
import sys

# Ensure the parent directory is in path so we can import agents.qa
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.qa.agent import QAAgent

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    graph_path = os.path.join(current_dir, "test_app_graph.json")
    
    print("====================================")
    print(" QA AGENT - SMOKE TEST EXECUTION")
    print("====================================\n")
    
    agent = QAAgent(graph_path)
    results, coverage = agent.run()
    
    print("\n--- Result Summary ---")
    print(f"Total Tests Executed: {len(results.results)}")
    print(f"Total Passed: {results.total_passed}")
    print(f"Coverage Percentage: {coverage.coverage_percentage}%")
    
    print("\nDone! Check report.json for the full output.")
