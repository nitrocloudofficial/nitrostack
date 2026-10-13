import asyncio
import time
import json
from nitro.agents.research.engine import ResearchEngine
from nitro.agents.correlation.engine import CorrelationEngine

async def main():
    print("Initializing Engines...")
    r_engine = ResearchEngine()
    c_engine = CorrelationEngine()
    
    query = "Quantum Error Correction"
    print(f"\n1. Fetching ResearchPackage for: '{query}'")
    start_time = time.time()
    research_pkg = await r_engine.search_papers(query)
    print(f"   Found {len(research_pkg.papers)} unique papers in {time.time() - start_time:.2f}s")
    
    print("\n2. Transforming into CorrelationPackage...")
    start_time = time.time()
    correlation_pkg = c_engine.process(research_pkg)
    print(f"   CorrelationEngine finished in {time.time() - start_time:.2f}s")
    
    print("\n====================================================")
    print("GRAPH STATISTICS")
    print("====================================================")
    kg = correlation_pkg.knowledge_graph
    
    node_counts = {}
    for n in kg.nodes:
        node_counts[n.type] = node_counts.get(n.type, 0) + 1
        
    print(f"Total Nodes: {len(kg.nodes)}")
    for t, c in sorted(node_counts.items()):
        print(f"  - {t}: {c}")
        
    edge_counts = {}
    for e in kg.edges:
        edge_counts[e.relation] = edge_counts.get(e.relation, 0) + 1
        
    print(f"\nTotal Edges: {len(kg.edges)}")
    for t, c in sorted(edge_counts.items()):
        print(f"  - {t}: {c}")
        
    print(f"\nClusters Detected: {len(correlation_pkg.clusters)}")
    for c in correlation_pkg.clusters:
        print(f"  - {c.name}: {len(c.node_ids)} papers")
        
    print(f"\nSimilarity Pairs Computed (Score > 0.3): {len(correlation_pkg.similarity_matrix)}")
    
    print("\n====================================================")
    print("EXTRACTED ENTITIES (Top 5 Examples)")
    print("====================================================")
    
    def print_top(ntype):
        nodes = [n for n in kg.nodes if n.type == ntype]
        print(f"\nTop {ntype}s:")
        for n in nodes[:5]:
            print(f"  - {n.label}")
            
    print_top("Author")
    print_top("Institution")
    print_top("Method")
    print_top("Dataset")
    print_top("Concept")

if __name__ == "__main__":
    asyncio.run(main())
