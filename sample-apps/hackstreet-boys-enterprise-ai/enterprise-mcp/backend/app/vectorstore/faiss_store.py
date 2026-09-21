import faiss
import numpy as np
import pickle
import os
from typing import List, Dict, Any
from langchain_community.embeddings import OpenAIEmbeddings
from app.config.settings import settings

class VectorStore:
    def __init__(self):
        self.dimension = 1536 # OpenAI embeddings dimension
        self.index_path = settings.FAISS_INDEX_PATH
        self.index_file = f"{self.index_path}/index.faiss"
        self.meta_file = f"{self.index_path}/meta.pkl"
        
        # We will initialize embeddings conditionally so it doesn't crash without key
        self.embeddings = None 
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your_openai_api_key":
            self.embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
            
        self.index = None
        self.metadata = []
        
        self.load_index()

    def _ensure_dir(self):
        os.makedirs(self.index_path, exist_ok=True)

    def load_index(self):
        if os.path.exists(self.index_file) and os.path.exists(self.meta_file):
            self.index = faiss.read_index(self.index_file)
            with open(self.meta_file, 'rb') as f:
                self.metadata = pickle.load(f)
        else:
            self.index = faiss.IndexFlatL2(self.dimension)
            self.metadata = []

    def save_index(self):
        self._ensure_dir()
        faiss.write_index(self.index, self.index_file)
        with open(self.meta_file, 'wb') as f:
            pickle.dump(self.metadata, f)

    def add_documents(self, texts: List[str], metadatas: List[Dict[str, Any]]):
        if not self.embeddings:
            raise ValueError("OpenAI API key not configured for embeddings.")
            
        embeddings_list = self.embeddings.embed_documents(texts)
        vectors = np.array(embeddings_list).astype('float32')
        self.index.add(vectors)
        self.metadata.extend(metadatas)
        self.save_index()

    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        if not self.embeddings:
            # Mock search if no API key
            return [{"snippet": "Mock search result", "confidence": 0.9}]
            
        query_vector = self.embeddings.embed_query(query)
        vector = np.array([query_vector]).astype('float32')
        distances, indices = self.index.search(vector, k)
        
        results = []
        for j, i in enumerate(indices[0]):
            if i != -1 and i < len(self.metadata):
                meta = self.metadata[i].copy()
                # Simple distance to confidence conversion (L2 distance)
                meta['confidence'] = max(0.0, 1.0 - (float(distances[0][j]) / 2.0))
                meta['similarity_score'] = float(distances[0][j])
                results.append(meta)
        return results

# Singleton instance
vector_store = VectorStore()
