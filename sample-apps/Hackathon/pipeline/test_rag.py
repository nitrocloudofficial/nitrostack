import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from pipeline.embedding.llm import LLMClient
from pipeline.embedding.embeddings import EmbeddingEngine
from pipeline.embedding.qdrant_connector import QdrantConnector
from pipeline.embedding.rag import RAGPipeline
from pipeline.embedding.prompt import PromptManager

def main():
    print("Initializing HELIX RAG Engine...")
    llm_client = LLMClient()
    embedding_engine = EmbeddingEngine()
    qdrant = QdrantConnector()
    rag = RAGPipeline(
        embedding_engine=embedding_engine,
        llm_client=llm_client,
        qdrant_connector=qdrant
    )

    query = "Analyze the Sarah Chen departure from Engineering, evaluate its impact on InfluxDB monitoring and alert drift, and check SOP-012 compliance."
    print(f"\nQuerying HELIX: '{query}'\n")
    res = rag.answer_question(question=query, department="Engineering")
    
    print("="*80)
    print("EXECUTIVE RAG REPORT OUTPUT:")
    print("="*80)
    print(res["answer"])
    print("\n" + "="*80)
    print(f"Confidence: {res['confidence_score']} | Passages: {res['retrieved_passages']} | Graph Paths: {res['graph_paths_traversed']}")

if __name__ == "__main__":
    main()
