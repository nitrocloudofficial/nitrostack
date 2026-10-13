import asyncio
import json
from nitro.agents.research.engine import ResearchEngine

async def main():
    print("Initializing engine...")
    engine = ResearchEngine()
    
    print("\n--- Testing search_papers ---")
    query = "Quantum Entanglement"
    print(f"Searching for: {query}")
    package = await engine.search_papers(query)
    
    print(f"\nStats:")
    print(f"Query: {package.query}")
    print(f"Search Time: {package.search_time:.2f}s")
    print(f"Total Papers Found: {len(package.papers)}")
    print(f"Duplicates Removed: {package.duplicates_removed}")
    
    print("\nProvider Stats:")
    for stat in package.provider_statistics:
        print(f"- {stat.provider_name}: {stat.status} ({stat.papers_found} papers)")
        if stat.error_message:
            print(f"  Error: {stat.error_message}")
            
    print("\nTop 3 Papers:")
    for i, paper in enumerate(package.papers[:3]):
        print(f"{i+1}. [{paper.source_provider}] {paper.title} (Citations: {paper.citation_count}, Year: {paper.publication_year})")
        print(f"   DOI: {paper.doi}")
        print(f"   URL: {paper.url}")

if __name__ == "__main__":
    asyncio.run(main())
