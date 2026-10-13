import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import json
import uuid
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from neo4j import GraphDatabase

def main():
    print("=== GraphRAG Dual-Ingestion Pipeline ===")
    
    # 1. Load ground truth graph dataset
    graph_path = os.path.join("zna_dataset", "ground_truth", "canonical_graph.json")
    if not os.path.exists(graph_path):
        raise FileNotFoundError(f"Cannot find dataset at {graph_path}")
        
    with open(graph_path, "r", encoding="utf-8", errors="ignore") as f:
        data = json.load(f)
        
    nodes_list = data.get("nodes", [])
    edges_list = data.get("edges", [])
    print(f"Loaded {len(nodes_list)} entity nodes and {len(edges_list)} relationships from {graph_path}.")

    # 2. Identify Document nodes
    entity_ids = set(n["id"] for n in nodes_list)
    edge_ids = set(e["source"] for e in edges_list) | set(e["target"] for e in edges_list)
    
    doc_prefixes = (
        "EMAIL-", "SLACK-", "MEET_MINUTES-", "SOP-", "ADR-", 
        "DEPLOY_LOG-", "GIT_COMMIT-", "INCIDENT_TICKET-", 
        "POST_MORTEM-", "SUPPORT_TICKET-", "VENDOR_CONTRACT-"
    )
    
    doc_ids = set()
    all_ids = entity_ids | edge_ids
    for nid in all_ids:
        if (nid not in entity_ids) or nid.startswith(doc_prefixes):
            doc_ids.add(nid)
            
    print(f"Identified {len(doc_ids)} total Document nodes for vector ingestion and graph linking.")

    # 3. Synchronize with Qdrant Vector Database
    print("\n--- Step 1: Qdrant Vector Ingestion ---")
    qdrant = QdrantClient("http://localhost:6333")
    collection_name = "helix_documents"
    
    # Initialize EmbeddingEngine to get accurate dimension and embeddings
    print("Initializing Qwen3 Embedding Engine...")
    from pipeline.embedding.embeddings import EmbeddingEngine
    embedding_engine = EmbeddingEngine()
    dim = embedding_engine.dimension
    print(f"Using embedding dimension: {dim}")

    if qdrant.collection_exists(collection_name):
        print(f"Collection '{collection_name}' exists. Deleting for clean sync...")
        qdrant.delete_collection(collection_name)
        
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=dim, distance=Distance.COSINE)
    )
    
    doc_id_to_vector_id = {}
    points = []
    
    docs_to_embed = sorted(list(doc_ids))
    print(f"Generating embeddings for {len(docs_to_embed)} documents...")
    # Generate actual embeddings using Qwen3
    embeddings = embedding_engine.embed_batch(docs_to_embed)
    
    for idx, doc_id in enumerate(docs_to_embed):
        vector_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, doc_id))
        doc_id_to_vector_id[doc_id] = vector_id
        
        vec = embeddings[idx]
        
        points.append(PointStruct(
            id=vector_id,
            vector=vec,
            payload={"doc_id": doc_id, "title": doc_id}
        ))
        
    batch_size = 100
    for i in range(0, len(points), batch_size):
        qdrant.upsert(collection_name=collection_name, points=points[i:i+batch_size])
        
    print(f"Successfully ingested {len(points)} document vectors into Qdrant collection '{collection_name}'.")

    # 4. Synchronize with Neo4j Knowledge Graph
    print("\n--- Step 2: Neo4j Knowledge Graph Ingestion ---")
    driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "helixpassword"))
    
    with driver.session() as session:
        print("Ensuring constraints on Entity and Document ids...")
        session.run("CREATE CONSTRAINT unique_entity_id IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE")
        session.run("CREATE CONSTRAINT unique_document_id IF NOT EXISTS FOR (n:Document) REQUIRE n.id IS UNIQUE")
        
        print("Ingesting entity nodes...")
        def ingest_entities(tx):
            for node in nodes_list:
                node_id = node["id"]
                node_type = node.get("type", "Entity")
                label = "".join(c for c in node_type if c.isalnum())
                
                query = f"""
                MERGE (n {{id: $id}})
                SET n:Entity, n:{label},
                    n.canonical_name = $canonical_name,
                    n.type = $type,
                    n.aliases = $aliases,
                    n.department = $department
                """
                tx.run(query,
                       id=node_id,
                       canonical_name=node.get("canonical_name", node_id),
                       type=node_type,
                       aliases=node.get("aliases", []),
                       department=node.get("department", "N/A"))
        session.execute_write(ingest_entities)
        print(f"Merged {len(nodes_list)} entity nodes.")
        
        print("Ingesting Document nodes and establishing The Bridge (embedding_id)...")
        def ingest_docs(tx):
            for doc_id, vector_id in doc_id_to_vector_id.items():
                query = """
                MERGE (n {id: $id})
                SET n:Document,
                    n.embedding_id = $embedding_id,
                    n.title = $id
                """
                tx.run(query, id=doc_id, embedding_id=vector_id)
        session.execute_write(ingest_docs)
        print(f"Merged {len(doc_ids)} Document nodes with Qdrant vector embedding_id link.")
        
        print("Ingesting relationships...")
        def ingest_rels(tx):
            for edge in edges_list:
                source = edge["source"]
                target = edge["target"]
                predicate = "".join(c for c in edge["predicate"] if c.isalnum() or c == "_").upper()
                query = f"""
                MERGE (s {{id: $source}})
                MERGE (t {{id: $target}})
                MERGE (s)-[r:{predicate}]->(t)
                """
                tx.run(query, source=source, target=target)
        session.execute_write(ingest_rels)
        print(f"Merged {len(edges_list)} relationships.")

    driver.close()
    print("\n=== Ingestion and Bridge Synchronization Complete! ===")

if __name__ == "__main__":
    main()
