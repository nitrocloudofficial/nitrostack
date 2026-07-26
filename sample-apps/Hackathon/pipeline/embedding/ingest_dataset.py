"""
HELIX: Advanced Enterprise Cognitive Genome Platform - Dataset Vector Ingestion Script
Uses Qwen Embedder to index documents, employees, and entities into Qdrant Vector Database.
"""

import os
import sys
import json
import re
from pathlib import Path
from typing import List, Dict, Any

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from pipeline.embedding.embeddings import EmbeddingEngine
from pipeline.embedding.qdrant_connector import QdrantConnector
from pipeline.embedding.rag import RAGPipeline


def infer_department(filename: str, content: str) -> str:
    """Infer department based on document name or content."""
    fname = filename.lower()
    cnt = content.lower()
    
    if any(k in fname or k in cnt for k in ["eng", "git_commit", "deploy_log", "influx", "timescale", "okta", "kong"]):
        return "Engineering"
    elif any(k in fname or k in cnt for k in ["sop", "adr", "architecture", "policy"]):
        return "Operations & Architecture"
    elif any(k in fname or k in cnt for k in ["contract", "vendor", "legal", "compliance"]):
        return "Legal & Compliance"
    elif any(k in fname or k in cnt for k in ["meet_minutes", "slack", "email"]):
        return "Corporate Communications"
    elif any(k in fname or k in cnt for k in ["incident", "post_mortem", "support"]):
        return "Site Reliability & Support"
    return "General Enterprise"


def main():
    print("=" * 70)
    print("🚀 HELIX Qwen Embedder - Dataset Vector DB Generation")
    print("=" * 70)

    dataset_dir = PROJECT_ROOT / "zna_dataset"
    docs_dir = dataset_dir / "documents"
    emp_file = dataset_dir / "employees.json"
    gt_dir = dataset_dir / "ground_truth"

    if not dataset_dir.exists():
        print(f"Error: Dataset directory not found at {dataset_dir}")
        sys.exit(1)

    # 1. Initialize Qwen Embedding Engine & Qdrant Connector
    print("\n[1/4] Initializing Qwen Embedding Engine & Qdrant Vector DB...")
    embedder = EmbeddingEngine()
    qdrant = QdrantConnector(vector_size=embedder.dimension)
    rag_pipeline = RAGPipeline(embedding_engine=embedder, qdrant_connector=qdrant)

    all_points = []
    chunk_count = 0

    # 2. Ingest Document Files
    print(f"\n[2/4] Processing documents from {docs_dir}...")
    doc_files = list(docs_dir.glob("*"))
    print(f"Found {len(doc_files)} document files.")

    batch_chunks = []
    
    for doc_path in doc_files:
        if not doc_path.is_file():
            continue

        try:
            content = doc_path.read_text(encoding="utf-8")
        except Exception:
            try:
                content = doc_path.read_text(encoding="latin-1")
            except Exception as e:
                print(f"Skipping {doc_path.name}: {e}")
                continue

        doc_id = doc_path.stem
        title = doc_path.name
        dept = infer_department(doc_path.name, content)
        
        # Extract title from markdown header if available
        first_line = content.strip().split("\n")[0]
        if first_line.startswith("# "):
            title = first_line[2:].strip()

        # Hierarchical Chunking
        pairs = rag_pipeline._hierarchical_chunk_text(content)
        for idx, (child_text, parent_text) in enumerate(pairs):
            c_id = f"{doc_id}-chunk-{idx}"
            batch_chunks.append({
                "id": c_id,
                "text": child_text,
                "payload": {
                    "doc_id": doc_id,
                    "title": title,
                    "filename": doc_path.name,
                    "department": dept,
                    "chunk_index": idx,
                    "parent_text": parent_text,
                    "text": child_text,
                    "type": "document"
                }
            })

    print(f"Extracted {len(batch_chunks)} chunks from documents.")

    # Batch embedding for speed
    BATCH_SIZE = 32
    print(f"Embedding document chunks using Qwen model '{embedder.model_name}'...")
    for i in range(0, len(batch_chunks), BATCH_SIZE):
        batch = batch_chunks[i:i + BATCH_SIZE]
        texts = [item["text"] for item in batch]
        embeddings = embedder.embed_batch(texts)
        
        points = []
        for item, emb in zip(batch, embeddings):
            points.append({
                "id": item["id"],
                "vector": emb,
                "payload": item["payload"]
            })
        
        qdrant.upsert_vectors(points)
        chunk_count += len(points)
        print(f"  Indexed {chunk_count}/{len(batch_chunks)} document chunks...")

    # 3. Ingest Employee Profiles
    if emp_file.exists():
        print(f"\n[3/4] Processing employee profiles from {emp_file}...")
        with open(emp_file, "r", encoding="utf-8") as f:
            employees = json.load(f)
        
        print(f"Found {len(employees)} employee profiles.")
        emp_batch = []
        for emp in employees:
            fname = emp.get("first_name", "")
            lname = emp.get("last_name", "")
            role = emp.get("role", "")
            dept = emp.get("department", "General Enterprise")
            email = emp.get("email", "")
            aliases = ", ".join(emp.get("aliases", []))
            
            profile_text = (
                f"Employee Profile: {fname} {lname}. Role: {role}. "
                f"Department: {dept}. Email: {email}. Status: {emp.get('status', 'Active')}. "
                f"Hire Date: {emp.get('hire_date', 'N/A')}. Known Aliases: {aliases}."
            )
            
            emp_id = f"employee-{emp.get('uuid', fname.lower() + '_' + lname.lower())}"
            emp_batch.append({
                "id": emp_id,
                "text": profile_text,
                "payload": {
                    "doc_id": emp_id,
                    "title": f"Employee: {fname} {lname}",
                    "department": dept,
                    "role": role,
                    "email": email,
                    "type": "employee",
                    "parent_text": profile_text,
                    "text": profile_text
                }
            })

        print("Embedding employee profiles...")
        for i in range(0, len(emp_batch), BATCH_SIZE):
            batch = emp_batch[i:i + BATCH_SIZE]
            texts = [item["text"] for item in batch]
            embeddings = embedder.embed_batch(texts)
            points = [
                {"id": item["id"], "vector": emb, "payload": item["payload"]}
                for item, emb in zip(batch, embeddings)
            ]
            qdrant.upsert_vectors(points)
            print(f"  Indexed {i + len(points)}/{len(emp_batch)} employee profiles...")

    # 4. Ingest Entity Knowledge Graph Annotations
    entities_file = gt_dir / "entities.json"
    if entities_file.exists():
        print(f"\n[4/4] Processing Knowledge Graph Entities from {entities_file}...")
        with open(entities_file, "r", encoding="utf-8") as f:
            entities_data = json.load(f)
        
        ent_list = entities_data if isinstance(entities_data, list) else entities_data.get("entities", [])
        print(f"Found {len(ent_list)} entities.")
        
        ent_batch = []
        for idx, ent in enumerate(ent_list):
            name = ent.get("name", ent.get("id", f"Entity-{idx}"))
            category = ent.get("type", ent.get("category", "Entity"))
            desc = ent.get("description", ent.get("summary", str(ent)))
            
            ent_text = f"Entity: {name} (Type: {category}). Summary: {desc}"
            ent_id = f"entity-{idx}"
            
            ent_batch.append({
                "id": ent_id,
                "text": ent_text,
                "payload": {
                    "doc_id": ent_id,
                    "title": f"Entity: {name}",
                    "department": "Knowledge Graph",
                    "type": "entity",
                    "parent_text": ent_text,
                    "text": ent_text
                }
            })

        for i in range(0, len(ent_batch), BATCH_SIZE):
            batch = ent_batch[i:i + BATCH_SIZE]
            texts = [item["text"] for item in batch]
            embeddings = embedder.embed_batch(texts)
            points = [
                {"id": item["id"], "vector": emb, "payload": item["payload"]}
                for item, emb in zip(batch, embeddings)
            ]
            qdrant.upsert_vectors(points)

    total_count = qdrant.count()
    print("\n" + "=" * 70)
    print("✅ DATASET VECTOR DATABASE CREATION COMPLETE!")
    print(f"   Embedder Model: {embedder.model_name}")
    print(f"   Embedding Vector Size: {embedder.dimension}")
    print(f"   Qdrant Collection Name: {qdrant.collection_name}")
    print(f"   Total Indexed Vector Points: {total_count}")
    print("=" * 70)


if __name__ == "__main__":
    main()
