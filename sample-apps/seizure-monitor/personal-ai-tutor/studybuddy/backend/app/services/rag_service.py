import logging
from typing import List, Dict, Any, Optional

from app.utils.file_processor import FileProcessor
from app.rag.chunker import DocumentChunker
from app.rag.embeddings import EmbeddingGenerator
from app.rag.vectorstore import FAISSVectorStore
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


class RAGService:
    """End-to-end Retrieval-Augmented Generation (RAG) service pipeline."""

    def __init__(
        self,
        vector_store: Optional[FAISSVectorStore] = None,
        embedding_generator: Optional[EmbeddingGenerator] = None,
        ai_service: Optional[AIService] = None
    ):
        """Initialize RAG service components."""
        self.embeddings = embedding_generator or EmbeddingGenerator()
        self.vector_store = vector_store or FAISSVectorStore(dimension=self.embeddings.dimension)
        self.chunker = DocumentChunker(chunk_size=1000, chunk_overlap=200)
        self.ai_service = ai_service or AIService()

    async def process_document(self, file_path: str, document_id: str) -> Dict[str, Any]:
        """
        Process an uploaded document: extract text, split into chunks, generate embeddings, and index into FAISS.
        
        Args:
            file_path: Path to the target document file.
            document_id: Unique document identifier.
            
        Returns:
            Dict containing metadata: page_count, chunk_count, document_id, status.
        """
        logger.info(f"Processing document {document_id} at {file_path}")

        # 1. Extract text and page structures
        extracted_data = FileProcessor.process_file(file_path)
        full_text = extracted_data.get("text", "")
        page_count = extracted_data.get("page_count", 1)

        if not full_text.strip():
            logger.warning(f"No text extracted from document {document_id}.")
            return {
                "document_id": document_id,
                "page_count": page_count,
                "chunk_count": 0,
                "status": "processed",
                "message": "Document processed but no text content was found."
            }

        # 2. Chunk document text
        chunks = self.chunker.chunk_document(extracted_data, document_id)

        # 3. Generate embeddings
        texts_to_embed = [c["text"] for c in chunks]
        embeddings_list = self.embeddings.embed_documents(texts_to_embed)

        # 4. Store vectors & metadata in FAISS
        self.vector_store.add_chunks(chunks, embeddings_list)

        logger.info(f"Successfully indexed document {document_id} with {len(chunks)} chunks.")

        return {
            "document_id": document_id,
            "page_count": page_count,
            "chunk_count": len(chunks),
            "status": "processed",
            "message": "Document successfully processed and indexed."
        }

    async def query(
        self,
        question: str,
        doc_ids: Optional[List[str]] = None,
        top_k: int = 4,
        history: Optional[List[Dict[str, str]]] = None,
        exam_target: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve relevant context for a user question and generate an AI tutor answer.
        
        Args:
            question: The user's question or query.
            doc_ids: Optional list of document IDs to restrict search scope.
            top_k: Number of relevant chunks to retrieve.
            history: Optional conversation history.
            exam_target: Target exam for custom tutoring adaptivity.
            
        Returns:
            Dict containing answer string, list of retrieved context sources, and doc_ids.
        """
        # 1. Embed user query
        query_vector = self.embeddings.embed_query(question)

        # 2. Retrieve top matching chunks
        retrieved_chunks = self.vector_store.similarity_search(
            query_vector=query_vector,
            top_k=top_k,
            doc_ids=doc_ids
        )

        # 3. Format context string for prompt
        context_parts = []
        sources = []
        for idx, chunk in enumerate(retrieved_chunks):
            chunk_text = chunk.get("text", "")
            doc_id = chunk.get("document_id")
            page_num = chunk.get("page_number", 1)
            score = chunk.get("score", 0.0)

            context_parts.append(f"[Source {idx+1} - Doc {doc_id} (Page {page_num})]:\n{chunk_text}")
            sources.append({
                "source_index": idx + 1,
                "document_id": doc_id,
                "page_number": page_num,
                "score": score,
                "snippet": chunk_text[:150] + "..." if len(chunk_text) > 150 else chunk_text
            })

        context_str = "\n\n".join(context_parts) if context_parts else ""

        # 4. Generate answer using AIService
        answer = await self.ai_service.generate_response(
            user_message=question,
            context=context_str if context_str else None,
            history=history,
            exam_target=exam_target
        )

        return {
            "answer": answer,
            "sources": sources,
            "doc_ids_searched": doc_ids or []
        }

    async def generate_quiz(
        self,
        doc_id: str,
        num_questions: int = 5,
        difficulty: str = "medium"
    ) -> Dict[str, Any]:
        """
        Retrieve document chunks for doc_id and generate an interactive quiz.
        
        Args:
            doc_id: Target document ID.
            num_questions: Desired number of questions.
            difficulty: Difficulty level ('easy', 'medium', 'hard').
            
        Returns:
            Dict containing generated quiz structure with questions, options, and explanations.
        """
        # Retrieve all chunks for this document
        doc_chunks = [m for m in self.vector_store.metadata if m.get("document_id") == doc_id]

        if not doc_chunks:
            # Fallback text if document vectors not present
            context_str = "General subject study material."
        else:
            # Combine up to 10 chunks for quiz generation
            context_str = "\n\n".join([c.get("text", "") for c in doc_chunks[:10]])

        # Generate quiz via AI Service
        quiz_data = await self.ai_service.generate_quiz(
            context=context_str,
            num_questions=num_questions,
            difficulty=difficulty
        )

        return quiz_data
