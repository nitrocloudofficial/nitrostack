import asyncio
import json
from nitro.agents.planner.engine import PlannerEngine

async def main():
    engine = PlannerEngine()
    query = "Transformers in Computer Vision"
    
    print("====================================================")
    print(f"PLANNER AGENT: Executing autonomous pipeline for: '{query}'")
    print("====================================================\n")
    
    final_report = None
    
    # Iterate over the state updates yielded by the DAG
    async for state_json in engine.execute_pipeline(query):
        state_dict = json.loads(state_json)
        print("--- DAG STATE UPDATE ---")
        for agent, status in state_dict.items():
            s = status['state']
            t = status['execution_time']
            a = "Artifact Generated" if status['has_artifact'] else ""
            print(f"[{agent.ljust(18)}] | State: {s.ljust(10)} | Time: {str(t).ljust(5)}s | {a}")
        print("-" * 24 + "\n")
        
        # If the ReportAgent has an artifact in the local engine state, we can pull it
        ctx = engine._last_ctx if hasattr(engine, '_last_ctx') else None
    
    # Actually, the engine doesn't store ctx on `self`. 
    # But we know `ReportAgent` is the last step.
    
    print("\n====================================================")
    print("FINAL REPORT PACKAGE")
    print("====================================================")
    
    # A bit of a hack to get the final artifact for demonstration in the validation script
    # We'll just run it normally and wait for the pipeline to finish.
    # Wait, the UI wants to see the actual Markdown. 
    # Let me just manually grab the report artifact if it exists by monkey patching.
    pass

# We will patch PlannerEngine to save the last context for the test
original_execute = PlannerEngine.execute_pipeline
async def patched_execute(self, query):
    # This is a generator
    async for state in original_execute(self, query):
        yield state
        
async def run_test():
    engine = PlannerEngine()
    
    # Capture the context manually
    ctx = None
    original_execute_task = engine._execute_task
    
    async def intercept_execute_task(c, *args, **kwargs):
        nonlocal ctx
        ctx = c
        return await original_execute_task(c, *args, **kwargs)
        
    engine._execute_task = intercept_execute_task
    
    query = "Transformers in Computer Vision"
    
    print("====================================================")
    print(f"PLANNER AGENT: Executing autonomous pipeline for: '{query}'")
    print("====================================================\n")
    
    async for state_json in engine.execute_pipeline(query):
        state_dict = json.loads(state_json)
        print("--- DAG STATE UPDATE ---")
        for agent, status in state_dict.items():
            s = status['state']
            t = status['execution_time']
            a = "Artifact Ready" if status['has_artifact'] else ""
            
            # Format nicely
            if s == "RUNNING":
                s = f"\033[93m{s}\033[0m" # Yellow
            elif s == "COMPLETED":
                s = f"\033[92m{s}\033[0m" # Green
            elif s == "FAILED":
                s = f"\033[91m{s}\033[0m" # Red
                
            print(f"[{agent.ljust(18)}] | State: {s.ljust(19)} | Time: {str(t).ljust(5)}s | {a}")
        print("-" * 24 + "\n")
        
    if ctx and "ReportAgent" in ctx.tasks:
        report = ctx.tasks["ReportAgent"].artifact
        if report:
            print("\n====================================================")
            print("FINAL GENERATED REPORT")
            print("====================================================")
            print(report.markdown_content)
        else:
            print("Report generation failed.")

if __name__ == "__main__":
    asyncio.run(run_test())
