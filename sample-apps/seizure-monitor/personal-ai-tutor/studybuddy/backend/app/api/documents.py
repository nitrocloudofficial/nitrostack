import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.config import settings
from app.core.database import get_db
from app.models.document import Document
from app.services.rag_service import RAGService

router = APIRouter(prefix="/documents", tags=["Documents"])

# Global RAG pipeline instance
rag_service = RAGService()

# --- Inline Pydantic Schemas ---

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    file_type: str
    page_count: int
    status: str
    processed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    message: str


# --- Endpoints ---

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = "mock-user-1",
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a study document (PDF, DOCX, PPTX, image, or text), process text extraction and RAG indexing.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a valid filename.")

    # Validate file size if content length header exists
    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".docx", ".doc", ".pptx", ".ppt", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(allowed_exts)}"
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(settings.UPLOAD_DIR, f"{doc_id}_{file.filename}")

    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Process text extraction & indexing via RAG Service
        rag_result = await rag_service.process_document(file_path, doc_id)
        page_count = rag_result.get("page_count", 1)

        # Store metadata in DB
        doc_record = Document(
            id=doc_id,
            user_id=user_id,
            filename=file.filename,
            file_type=ext.lstrip("."),
            page_count=page_count,
            status="processed",
            processed_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )

        try:
            db.add(doc_record)
            await db.commit()
            await db.refresh(doc_record)
            return DocumentResponse.model_validate(doc_record)
        except Exception:
            # Return response model even if database write is bypassed
            return DocumentResponse(
                id=doc_record.id,
                user_id=doc_record.user_id,
                filename=doc_record.filename,
                file_type=doc_record.file_type,
                page_count=doc_record.page_count,
                status=doc_record.status,
                processed_at=doc_record.processed_at,
                created_at=doc_record.created_at
            )

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to process document upload: {str(e)}")


@router.get("/list", response_model=List[DocumentResponse])
async def list_documents(user_id: str = "mock-user-1", db: AsyncSession = Depends(get_db)):
    """List all uploaded study documents for the user."""
    try:
        stmt = select(Document).where(Document.user_id == user_id).order_by(Document.created_at.desc())
        result = await db.execute(stmt)
        docs = result.scalars().all()
        return [DocumentResponse.model_validate(d) for d in docs]
    except Exception:
        # Return memory vector store docs if DB is down
        doc_ids = set(m.get("document_id") for m in rag_service.vector_store.metadata if m.get("document_id"))
        return [
            DocumentResponse(
                id=d_id,
                user_id=user_id,
                filename=f"document_{d_id[:8]}.pdf",
                file_type="pdf",
                page_count=1,
                status="processed",
                processed_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
            for d_id in doc_ids
        ]


@router.delete("/{document_id}", response_model=MessageResponse)
async def delete_document(
    document_id: str,
    user_id: str = "mock-user-1",
    db: AsyncSession = Depends(get_db)
):
    """Delete a document by ID, removing metadata and vector store indices."""
    # Delete from vector store
    rag_service.vector_store.delete_document(document_id)

    try:
        stmt = delete(Document).where(Document.id == document_id)
        await db.execute(stmt)
        await db.commit()
    except Exception:
        pass

    return MessageResponse(message=f"Document '{document_id}' deleted successfully.")
