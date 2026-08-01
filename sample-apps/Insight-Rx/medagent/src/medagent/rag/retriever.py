"""
RAG retriever factory for the Evidence Agent. Wraps the FAISS-backed
vector store as a standard LangChain retriever so evidence_agent.py can
call it without knowing anything about the underlying vector store
implementation.
"""
from __future__ import annotations

from langchain_core.vectorstores import VectorStoreRetriever
from medagent.rag.vectorstore import get_vectorstore

def get_retriever() -> VectorStoreRetriever:
    """
    Loads the ATS/IDSA guideline vector store and returns it configured
    as a LangChain retriever, capped to the top 3 most relevant chunks
    per query.
    """
    vectorstore = get_vectorstore()
    return vectorstore.as_retriever(search_kwargs={"k": 3})

# --- Added Test Block below ---
if __name__ == "__main__":
    print("Loading vector database and initializing retriever...\n")
    
    try:
        retriever = get_retriever()
        
        # This is the test question we are asking the AI's database
        test_query = "What is the protocol for pneumonia?"
        print(f"Searching database for: '{test_query}'\n")
        
        # Actually run the search
        results = retriever.invoke(test_query)
        
        if not results:
            print("No results found. The database might be empty.")
        else:
            print(f"Found {len(results)} relevant documents!\n")
            for i, doc in enumerate(results, 1):
                print(f"--- Result {i} ---")
                print(doc.page_content)
                print("-" * 20 + "\n")
                
    except Exception as e:
        print(f"Error loading the vector database: {e}")