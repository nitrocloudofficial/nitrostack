"""
HELIX: Advanced Enterprise Cognitive Genome Platform - Qdrant Vector DB Connector
"""

import os
import time
import uuid
from dataclasses import dataclass
from typing import Dict, Any, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

try:
    from .embeddings import compute_cosine_similarity
except ImportError:
    from pipeline.embedding.embeddings import compute_cosine_similarity


@dataclass
class SearchResult:
    id: str
    score: float
    text: str
    metadata: Dict[str, Any]


class QdrantConnector:
    """
    Production-Ready Qdrant Vector Database Client.
    Supports live Qdrant endpoints with an in-memory shadow vector store.
    """

    def __init__(
        self,
        url: Optional[str] = None,
        api_key: Optional[str] = None,
        collection_name: str = "helix_cognitive_genome",
        vector_size: int = 1536
    ):
        self.url = url or os.getenv("QDRANT_URL", "http://localhost:6333")
        self.api_key = api_key or os.getenv("QDRANT_API_KEY")
        self.collection_name = collection_name
        self.vector_size = vector_size
        self.client = None
        self.memory_store: List[Dict[str, Any]] = []

        if self.url:
            try:
                kwargs = {"url": self.url}
                if self.api_key:
                    kwargs["api_key"] = self.api_key
                self.client = QdrantClient(**kwargs)
                
                # Check and ensure collection exists
                try:
                    collections = [c.name for c in self.client.get_collections().collections]
                    if self.collection_name not in collections:
                        print(f"Creating Qdrant collection '{self.collection_name}' (dim={self.vector_size})...")
                        self.client.create_collection(
                            collection_name=self.collection_name,
                            vectors_config=qmodels.VectorParams(size=self.vector_size, distance=qmodels.Distance.COSINE)
                        )
                    print(f"Successfully connected to Qdrant collection '{self.collection_name}'.")
                except Exception as e:
                    print(f"Collection check notice: {e}")
            except Exception as e:
                print(f"Qdrant connection notice: {e}")
                self.client = None

    def upsert_vectors(self, points: List[Dict[str, Any]]) -> bool:
        """Upserts vector points into Qdrant collection or in-memory shadow store."""
        if self.client:
            try:
                q_points = []
                for p in points:
                    raw_id = str(p["id"])
                    try:
                        # Validate if raw_id is valid UUID
                        uuid_obj = uuid.UUID(raw_id)
                        pt_id = str(uuid_obj)
                    except ValueError:
                        # Convert arbitrary string to deterministic namespace UUID
                        pt_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, raw_id))

                    payload = dict(p.get("payload", {}))
                    payload["passage_id"] = raw_id

                    q_points.append(
                        qmodels.PointStruct(
                            id=pt_id,
                            vector=p["vector"],
                            payload=payload
                        )
                    )

                self.client.upsert(
                    collection_name=self.collection_name,
                    points=q_points
                )
                return True
            except Exception as e:
                print(f"Qdrant client upsert error: {e}")
                pass

        for p in points:
            self.memory_store = [item for item in self.memory_store if item["id"] != p["id"]]
            self.memory_store.append(p)

        return True

    def upsert_passage(self, passage_id: str, text: str, vector: List[float], metadata: Dict[str, Any]) -> bool:
        """Convenience wrapper for upserting a single text passage."""
        payload = dict(metadata or {})
        payload["text"] = text
        return self.upsert_vectors([{"id": passage_id, "vector": vector, "payload": payload}])

    def search_similar(
        self,
        query_vector: Optional[List[float]] = None,
        top_k: int = 5,
        department_filter: Optional[str] = None,
        vector: Optional[List[float]] = None,
        department: Optional[str] = None
    ) -> List[SearchResult]:
        """Searches vector space for top-K matching vectors."""
        q_vec = query_vector if query_vector is not None else vector
        dept = department_filter if department_filter is not None else department

        if q_vec is None:
            return []

        query_vector = q_vec
        department_filter = dept
        if department_filter and department_filter.lower() != "all":
            d_lower = department_filter.lower()
            if "eng" in d_lower or "infra" in d_lower:
                department_filter = "Engineering"
            elif "leg" in d_lower or "comp" in d_lower or "risk" in d_lower:
                department_filter = "Legal & Compliance"
            elif "oper" in d_lower or "arch" in d_lower or "prod" in d_lower:
                department_filter = "Operations & Architecture"
            elif "comm" in d_lower or "mark" in d_lower or "sales" in d_lower:
                department_filter = "Corporate Communications"
            elif "rel" in d_lower or "supp" in d_lower or "serv" in d_lower:
                department_filter = "Site Reliability & Support"

        if self.client:
            try:
                query_filter = None
                if department_filter and department_filter.lower() != "all":
                    query_filter = qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="department",
                                match=qmodels.MatchValue(value=department_filter)
                            )
                        ]
                    )

                if hasattr(self.client, "query_points"):
                    res = self.client.query_points(
                        collection_name=self.collection_name,
                        query=query_vector,
                        query_filter=query_filter,
                        limit=top_k
                    )
                    results = res.points
                else:
                    results = self.client.search(
                        collection_name=self.collection_name,
                        query_vector=query_vector,
                        query_filter=query_filter,
                        limit=top_k
                    )
                return [
                    SearchResult(
                        id=str(r.id),
                        score=round(float(r.score), 4),
                        text=r.payload.get("text", ""),
                        metadata=r.payload
                    )
                    for r in results
                ]
            except Exception as e:
                print(f"[Qdrant Search Error]: {e}")
                pass

        scored_results = []
        for item in self.memory_store:
            payload = item.get("payload", {})
            if department_filter and department_filter.lower() != "all":
                doc_dept = payload.get("department", "").lower()
                if doc_dept and doc_dept != department_filter.lower():
                    continue

            similarity = compute_cosine_similarity(query_vector, item["vector"])
            scored_results.append(
                SearchResult(
                    id=item["id"],
                    score=round(float(similarity), 4),
                    text=payload.get("text", ""),
                    metadata=payload
                )
            )

        scored_results.sort(key=lambda x: x.score, reverse=True)
        return scored_results[:top_k]

    def count(self) -> int:
        """Returns total vector points stored."""
        if self.client:
            try:
                res = self.client.count(collection_name=self.collection_name)
                return res.count
            except Exception:
                pass
        return len(self.memory_store)
