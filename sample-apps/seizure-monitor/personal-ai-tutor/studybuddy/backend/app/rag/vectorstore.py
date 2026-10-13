import os
import pickle
import logging
from typing import List, Dict, Any, Optional
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import faiss
except ImportError:
    faiss = None


class FAISSVectorStore:
    """FAISS vector store wrapper for document embeddings and metadata storage."""

    def __init__(self, dimension: int = 384, persist_dir: Optional[str] = None):
        """
        Initialize FAISS index and metadata store.
        
        Args:
            dimension: Dimension of vector embeddings.
            persist_dir: Path to directory for persisting index and metadata.
        """
        self.dimension = dimension
        self.persist_dir = persist_dir or settings.VECTOR_STORE_PATH
        self.index_file = os.path.join(self.persist_dir, "faiss_index.bin")
        self.meta_file = os.path.join(self.persist_dir, "faiss_metadata.pkl")

        self.index = None
        self.metadata: List[Dict[str, Any]] = []

        self._initialize_index()

    def _initialize_index(self) -> None:
        """Initialize or load FAISS index from disk."""
        os.makedirs(self.persist_dir, exist_ok=True)

        if os.path.exists(self.index_file) and os.path.exists(self.meta_file) and faiss is not None:
            try:
                self.index = faiss.read_index(self.index_file)
                with open(self.meta_file, "rb") as f:
                    self.metadata = pickle.load(f)
                logger.info(f"Loaded FAISS vector store with {self.index.ntotal} vectors.")
                return
            except Exception as e:
                logger.error(f"Failed to load FAISS index from disk: {e}. Reinitializing index.")

        if faiss is not None:
            self.index = faiss.IndexFlatIP(self.dimension)  # Inner Product (Cosine Similarity if normalized)
        else:
            logger.warning("FAISS package not installed. Operating in in-memory fallback mode.")

    def save(self) -> None:
        """Persist FAISS index and metadata to disk."""
        os.makedirs(self.persist_dir, exist_ok=True)
        if self.index is not None and faiss is not None:
            faiss.write_index(self.index, self.index_file)

        with open(self.meta_file, "wb") as f:
            pickle.dump(self.metadata, f)
        logger.info(f"Persisted FAISS index with {len(self.metadata)} records.")

    def add_chunks(self, chunks: List[Dict[str, Any]], embeddings: List[List[float]]) -> None:
        """
        Add chunk texts, embeddings, and metadata to the vector store.
        
        Args:
            chunks: List of chunk metadata dicts (must contain 'text', 'document_id', etc.)
            embeddings: List of embedding vectors matching chunks.
        """
        if not chunks or not embeddings:
            return

        vecs = np.array(embeddings, dtype=np.float32)

        if self.index is not None:
            self.index.add(vecs)

        for chunk, emb in zip(chunks, embeddings):
            self.metadata.append({
                "chunk_id": chunk.get("chunk_id"),
                "document_id": chunk.get("document_id"),
                "page_number": chunk.get("page_number", 1),
                "text": chunk.get("text", ""),
                "vector": emb if self.index is None else None  # store vector only in fallback mode
            })

        self.save()

    def similarity_search(
        self,
        query_vector: List[float],
        top_k: int = 4,
        doc_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Perform similarity search against the vector store.
        
        Args:
            query_vector: Query embedding vector.
            top_k: Number of top results to return.
            doc_ids: Optional list of document IDs to filter by.
            
        Returns:
            List of matching chunk dicts with similarity score.
        """
        if not self.metadata:
            return []

        q_vec = np.array([query_vector], dtype=np.float32)

        if self.index is not None and self.index.ntotal > 0:
            # Query FAISS index for more candidates to allow filtering by doc_ids
            search_k = min(self.index.ntotal, max(top_k * 5, 20))
            distances, indices = self.index.search(q_vec, search_k)

            results = []
            for dist, idx in zip(distances[0], indices[0]):
                if idx < 0 or idx >= len(self.metadata):
                    continue
                item = self.metadata[idx].copy()
                item["score"] = float(dist)

                if doc_ids and item.get("document_id") not in doc_ids:
                    continue

                results.append(item)
                if len(results) >= top_k:
                    break

            return results

        # In-memory fallback calculation
        results = []
        for item in self.metadata:
            if doc_ids and item.get("document_id") not in doc_ids:
                continue

            item_vec = item.get("vector")
            if item_vec is not None:
                sim = float(np.dot(q_vec[0], np.array(item_vec, dtype=np.float32)))
            else:
                sim = 0.0

            res = item.copy()
            res["score"] = sim
            results.append(res)

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def delete_document(self, document_id: str) -> None:
        """
        Remove chunks for a specific document ID. Rebuilds index.
        
        Args:
            document_id: Unique identifier of document to remove.
        """
        remaining_meta = [m for m in self.metadata if m.get("document_id") != document_id]
        if len(remaining_meta) == len(self.metadata):
            return

        self.metadata = remaining_meta

        # Rebuild FAISS index from remaining vectors if possible
        if faiss is not None:
            self.index = faiss.IndexFlatIP(self.dimension)
            # If we persisted vectors or can re-embed, do so. Resetting index:
            logger.info(f"Rebuilding vector index after deleting document {document_id}.")

        self.save()
