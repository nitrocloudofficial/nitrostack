from typing import List, Dict, Any
from app.vectorstore.faiss_store import vector_store
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import Document
import uuid

class DocumentIngestionService:
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Simple text chunker."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += (chunk_size - overlap)
        return chunks

    @staticmethod
    async def ingest_document(db: AsyncSession, title: str, category: str, content: str, source: str) -> Document:
        # Create DB record
        doc = Document(
            id=str(uuid.uuid4()),
            title=title,
            category=category,
            content=content,
            source=source
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        
        # Process for vector search
        chunks = DocumentIngestionService.chunk_text(content)
        metadatas = []
        for chunk in chunks:
            metadatas.append({
                "doc_id": doc.id,
                "title": doc.title,
                "category": doc.category,
                "source": doc.source,
                "snippet": chunk[:200] + "..."
            })
            
        try:
            vector_store.add_documents(chunks, metadatas)
        except ValueError as e:
            # Handle mock mode when no API key is available
            print(f"Skipping vector insertion: {e}")
            
        return doc
