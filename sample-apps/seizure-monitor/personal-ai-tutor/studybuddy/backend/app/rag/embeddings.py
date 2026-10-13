import logging
from typing import List, Union
import numpy as np

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None


class EmbeddingGenerator:
    """Wrapper class for generating text embeddings using SentenceTransformers."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        """
        Initialize the embedding model.
        
        Args:
            model_name: Pretrained SentenceTransformer model identifier.
        """
        self.model_name = model_name
        self.model = None
        self._dimension = 384  # Default dimension for all-MiniLM-L6-v2

        if SentenceTransformer is not None:
            try:
                self.model = SentenceTransformer(model_name)
                self._dimension = self.model.get_sentence_embedding_dimension()
                logger.info(f"Successfully loaded SentenceTransformer model '{model_name}'.")
            except Exception as e:
                logger.warning(f"Could not load SentenceTransformer model '{model_name}': {e}. Falling back to fallback embeddings.")
        else:
            logger.warning("sentence-transformers package not installed. Using fallback vector generator.")

    @property
    def dimension(self) -> int:
        """Returns vector dimension for embeddings."""
        return self._dimension

    def embed_query(self, text: str) -> List[float]:
        """
        Generate embedding vector for a single query text.
        
        Args:
            text: Query string.
            
        Returns:
            List of floats representing the embedding vector.
        """
        if not text:
            return [0.0] * self._dimension

        if self.model is not None:
            embedding = self.model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
            return embedding.tolist()

        # Fallback deterministic pseudo-embedding
        return self._generate_fallback_embedding(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embedding vectors for a batch of document texts.
        
        Args:
            texts: List of text strings.
            
        Returns:
            List of embedding vector lists.
        """
        if not texts:
            return []

        if self.model is not None:
            embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            return embeddings.tolist()

        return [self._generate_fallback_embedding(t) for t in texts]

    def _generate_fallback_embedding(self, text: str) -> List[float]:
        """Generate a deterministic fallback vector based on hashing."""
        seed = sum(ord(c) for c in text) % (2**32)
        rng = np.random.RandomState(seed)
        vec = rng.randn(self._dimension)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()
