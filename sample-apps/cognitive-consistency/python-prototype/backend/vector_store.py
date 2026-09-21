import os
import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "chroma")

_client = None
_collection = None
_embedder = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

def init_vector_store():
    global _client, _collection
    os.makedirs(CHROMA_PATH, exist_ok=True)
    _client = chromadb.PersistentClient(path=CHROMA_PATH)
    _collection = _client.get_or_create_collection(name="agent_memory", embedding_function=_embedder)

def add_memory(memory_dict: dict):
    _collection.add(
        ids=[memory_dict["memory_id"]],
        documents=[memory_dict["content"]],
        metadatas=[{
            "project_id": memory_dict["project_id"],
            "task_id": memory_dict["task_id"],
            "agent_id": memory_dict["agent_id"],
            "memory_type": memory_dict["memory_type"],
        }],
    )

def semantic_search(query: str, project_id: str, task_id: str = None, limit: int = 5) -> list:
    where = {"project_id": project_id}
    if task_id:
        where = {"$and": [{"project_id": project_id}, {"task_id": task_id}]}
    results = _collection.query(query_texts=[query], n_results=limit, where=where)
    output = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            output.append({
                "content": doc,
                "memory_id": results["ids"][0][i],
                **results["metadatas"][0][i],
            })
    return output
