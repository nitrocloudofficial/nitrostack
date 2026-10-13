import asyncio
import time
import tracemalloc
import sys

# Ensure backend modules can be imported
sys.path.append("backend/src")

from nitro.agents.research.engine import ResearchEngine
from nitro.agents.research.providers import (
    SemanticScholarProvider,
    OpenAlexProvider,
    PubMedProvider
)

async def main():
    print("====================================================")
    print("PHASE 2: FEDERATED RESEARCH ENGINE VERIFICATION")
    print("====================================================\n")
    
    tracemalloc.start()
    engine = ResearchEngine()
    
    queries = [
        "Graph Neural Networks for Drug Discovery",
        "Large Language Models in Healthcare",
        "Quantum Error Correction",
        "Vision Transformers",
        "Diffusion Models"
    ]
    
    # ---------------------------------------------------------
    # 1. Real Search Tests & Parallel Execution
    # ---------------------------------------------------------
    print("====================================================")
    print("REAL SEARCH TESTS & PARALLEL EXECUTION")
    print("====================================================\n")
    
    for i, query in enumerate(queries):
        print(f"Executing Query {i+1}: '{query}'")
        start_time = time.time()
        
        # This calls asyncio.gather internally over all 10 providers
        package = await engine.search_papers(query)
        
        end_time = time.time()
        
        print(f"Total Latency: {package.search_time:.2f}s")
        print(f"Unique Papers Returned: {len(package.papers)}")
        print(f"Duplicates Removed: {package.duplicates_removed}")
        print("\nProvider Status:")
        for stat in package.provider_statistics:
            print(f"  - {stat.provider_name.ljust(20)} | Status: {stat.status.ljust(10)} | Papers: {stat.papers_found} | Error: {stat.error_message}")
            
        if i == 0:
            print("\nRanking Validation (Top 3 of Query 1):")
            for rank, paper in enumerate(package.papers[:3]):
                print(f"  #{rank+1} [{paper.source_provider}] - {paper.title} (Citations: {paper.citation_count}, Year: {paper.publication_year})")
        print("-" * 50)
    
    # ---------------------------------------------------------
    # 2. Caching
    # ---------------------------------------------------------
    print("\n====================================================")
    print("CACHE VERIFICATION")
    print("====================================================\n")
    
    query = "Graph Neural Networks for Drug Discovery"
    
    # Force uncached by clearing it
    engine._cache.clear()
    
    t1 = time.time()
    await engine.search_papers(query)
    t1_end = time.time()
    
    t2 = time.time()
    await engine.search_papers(query)
    t2_end = time.time()
    
    print(f"First execution time (Miss): {t1_end - t1:.2f}s")
    print(f"Second execution time (Hit): {t2_end - t2:.2f}s")
    
    
    # ---------------------------------------------------------
    # 3. Failure Handling (Graceful Degradation)
    # ---------------------------------------------------------
    print("\n====================================================")
    print("FAILURE HANDLING (Graceful Degradation)")
    print("====================================================\n")
    
    # Artificially disable high-availability providers to verify pipeline continuation
    print("Artificially breaking Semantic Scholar, OpenAlex, and PubMed by injecting ValueError exceptions...\n")
    
    class BrokenSemantic(SemanticScholarProvider):
        async def search(self, query): raise ValueError("Simulated outage")
    class BrokenOpenAlex(OpenAlexProvider):
        async def search(self, query): raise ValueError("Simulated outage")
    class BrokenPubMed(PubMedProvider):
        async def search(self, query): raise ValueError("Simulated outage")
        
    engine.providers[0] = BrokenSemantic()
    engine.providers[1] = BrokenOpenAlex()
    engine.providers[4] = BrokenPubMed()
    
    # Clear cache to force real execution
    engine._cache.clear()
    
    fail_pkg = await engine.search_papers("Vision Transformers")
    print(f"Query: 'Vision Transformers' with 3 major providers disabled.")
    print(f"Unique Papers Returned: {len(fail_pkg.papers)}")
    print("Status of disabled providers:")
    for stat in fail_pkg.provider_statistics:
        if stat.provider_name in ["Semantic Scholar", "OpenAlex", "PubMed"]:
            print(f"  - {stat.provider_name.ljust(20)} | Status: {stat.status.ljust(10)} | Error: {stat.error_message}")
            
    print("\n✓ Pipeline continued execution gracefully without crashing.")
    
    # ---------------------------------------------------------
    # 4. Performance & Memory
    # ---------------------------------------------------------
    print("\n====================================================")
    print("PERFORMANCE METRICS")
    print("====================================================\n")
    
    current, peak = tracemalloc.get_traced_memory()
    print(f"Current memory usage is {current / 10**6:.2f} MB")
    print(f"Peak memory usage was {peak / 10**6:.2f} MB")
    tracemalloc.stop()
    
    print("\nGenerating final research_engine_validation.md...")

if __name__ == "__main__":
    asyncio.run(main())
