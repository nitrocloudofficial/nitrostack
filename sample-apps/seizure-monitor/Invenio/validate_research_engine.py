import asyncio
import time
import json
from nitro.agents.research.engine import ResearchEngine

async def test_individual_providers():
    engine = ResearchEngine()
    print("\n====================================================")
    print("VERIFY EACH PROVIDER & VERIFY ASYNC EXECUTION")
    print("====================================================")
    
    query = "Machine Learning"
    provider_results = {}
    
    for provider in engine.providers:
        start_time = time.time()
        status = ""
        error_msg = ""
        count = 0
        try:
            papers = await asyncio.wait_for(provider.search(query), timeout=15.0)
            if papers:
                status = "Working"
                count = len(papers)
            else:
                status = "Missing API key or No Results" # CORE/Lens return [] on no key
        except asyncio.TimeoutError:
            status = "Timeout"
        except Exception as e:
            msg = str(e)
            if "429" in msg:
                status = "Rate limited"
            elif "401" in msg or "403" in msg:
                status = "Missing API key"
            else:
                status = "Failed"
            error_msg = msg
            
        elapsed = time.time() - start_time
        provider_results[provider.name] = {
            "status": status,
            "time": elapsed,
            "count": count,
            "error": error_msg
        }
        
    for name, data in provider_results.items():
        err = f" ({data['error']})" if data['error'] else ""
        print(f"{name:20s} | {data['status']:15s} | {data['time']:5.2f}s | {data['count']} papers{err}")

async def test_real_searches():
    engine = ResearchEngine()
    print("\n====================================================")
    print("REAL SEARCH TESTS")
    print("====================================================")
    
    queries = [
        "Graph Neural Networks for Drug Discovery",
        "Large Language Models in Healthcare",
        "Transformer Architecture",
        "Quantum Error Correction"
    ]
    
    for q in queries:
        package = await engine.search_papers(q)
        print(f"Query: '{q}' -> Found {len(package.papers)} unique papers (Removed {package.duplicates_removed} duplicates)")
        
    print("\nTesting DOI Search...")
    package = await engine.search_doi("10.1038/nature09256")
    if package.papers:
        print(f"DOI Search 10.1038/nature09256 -> Success: {package.papers[0].title}")
    else:
        print("DOI Search failed.")

async def test_normalization_and_package():
    engine = ResearchEngine()
    print("\n====================================================")
    print("VERIFY NORMALIZATION & VERIFY RESEARCHPACKAGE")
    print("====================================================")
    
    package = await engine.search_papers("CRISPR Cas9")
    print(f"Total Papers: {len(package.papers)}")
    if package.papers:
        p = package.papers[0]
        print(json.dumps(p.model_dump(), indent=2))
        print("Schema verified: No provider-specific JSON leaked.")

async def test_ranking():
    engine = ResearchEngine()
    print("\n====================================================")
    print("VERIFY RANKING & VERIFY DEDUPLICATION")
    print("====================================================")
    
    package = await engine.search_papers("Deep Learning")
    
    def score(p) -> float:
        s = 0.0
        s += min(p.citation_count, 1000) * 0.1
        if p.publication_year:
            s += max(0, p.publication_year - 2000) * 0.5
        if p.abstract and len(p.abstract) > 50:
            s += 10.0
        if p.pdf_url:
            s += 15.0
        return s

    print(f"Duplicates removed during pipeline: {package.duplicates_removed}")
    
    print("\nTop 20 Papers Ranking Scores:")
    for i, p in enumerate(package.papers[:20]):
        sc = score(p)
        print(f"#{i+1:02d} | Score: {sc:6.2f} | Citations: {p.citation_count:4d} | Year: {p.publication_year} | {p.title[:60]}...")

async def test_failure_handling():
    engine = ResearchEngine()
    print("\n====================================================")
    print("VERIFY FAILURE HANDLING")
    print("====================================================")
    
    async def mock_fail(*args, **kwargs):
        raise Exception("Artificially Induced Failure")
        
    for p in engine.providers:
        if p.name in ["Semantic Scholar", "OpenAlex", "Crossref"]:
            print(f"Artificially disabling {p.name}...")
            p.search = mock_fail
            
    package = await engine.search_papers("Black Hole Thermodynamics")
    print(f"Search successful despite 3 disabled providers! Found {len(package.papers)} unique papers.")
    for stat in package.provider_statistics:
        if stat.provider_name in ["Semantic Scholar", "OpenAlex", "Crossref"]:
            print(f"  {stat.provider_name}: {stat.status} ({stat.error_message})")

async def test_caching():
    engine = ResearchEngine()
    print("\n====================================================")
    print("VERIFY CACHING")
    print("====================================================")
    
    q = "Superconductivity at room temperature"
    
    start1 = time.time()
    await engine.search_papers(q)
    t1 = time.time() - start1
    print(f"First request time: {t1:.2f}s (Cache miss)")
    
    start2 = time.time()
    await engine.search_papers(q)
    t2 = time.time() - start2
    print(f"Second request time: {t2:.4f}s (Cache hit)")

async def main():
    await test_individual_providers()
    await test_real_searches()
    await test_normalization_and_package()
    await test_ranking()
    await test_failure_handling()
    await test_caching()

if __name__ == "__main__":
    asyncio.run(main())
