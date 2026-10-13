import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from pydantic import BaseModel

from app.services.rag_service import RAGService
from app.services.ai_service import AIService

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])

rag_service = RAGService()
ai_service = AIService()
logger = logging.getLogger(__name__)

# --- Inline Pydantic Schemas ---

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    message: str
    doc_ids: Optional[List[str]] = None
    history: Optional[List[ChatMessage]] = None
    target_exam: Optional[str] = None


class SourceInfo(BaseModel):
    source_index: int
    document_id: str
    page_number: int
    score: float
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]
    doc_ids_searched: List[str]


# --- Endpoints ---

@router.post("/chat", response_model=ChatResponse)
async def chat_with_tutor(payload: ChatRequest):
    """
    Send a message to StudyBuddy AI tutor with RAG context support.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty.")

    history_dicts = [h.model_dump() for h in payload.history] if payload.history else None

    result = await rag_service.query(
        question=payload.message,
        doc_ids=payload.doc_ids,
        history=history_dicts,
        exam_target=payload.target_exam
    )

    return ChatResponse(
        answer=result["answer"],
        sources=[SourceInfo(**s) for s in result["sources"]],
        doc_ids_searched=result["doc_ids_searched"]
    )


@router.websocket("/ws/chat")
async def websocket_chat_tutor(websocket: WebSocket):
    """
    Real-time streaming WebSocket endpoint for StudyBuddy AI tutoring.
    Client sends JSON: {"message": "...", "doc_ids": [...], "history": [...], "target_exam": "..."}
    Server streams token chunks: {"type": "token", "content": "..."} and finishes with {"type": "end"}.
    """
    await websocket.accept()
    logger.info("WebSocket client connected to AI tutor stream.")

    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except Exception:
                await websocket.send_json({"type": "error", "message": "Invalid JSON format."})
                continue

            user_message = data.get("message", "")
            doc_ids = data.get("doc_ids")
            history = data.get("history")
            target_exam = data.get("target_exam")

            if not user_message.strip():
                await websocket.send_json({"type": "error", "message": "Message is required."})
                continue

            # 1. Retrieve RAG context chunks
            query_vector = rag_service.embeddings.embed_query(user_message)
            retrieved = rag_service.vector_store.similarity_search(query_vector=query_vector, top_k=4, doc_ids=doc_ids)

            context_parts = []
            sources_out = []
            for idx, item in enumerate(retrieved):
                context_parts.append(f"[Source {idx+1}]: {item.get('text', '')}")
                sources_out.append({
                    "source_index": idx + 1,
                    "document_id": item.get("document_id"),
                    "page_number": item.get("page_number", 1),
                    "snippet": item.get("text", "")[:100]
                })

            context_str = "\n\n".join(context_parts) if context_parts else None

            # Send metadata header to client
            await websocket.send_json({"type": "start", "sources": sources_out})

            # Stream response tokens
            async for token in ai_service.generate_stream(
                user_message=user_message,
                context=context_str,
                history=history,
                exam_target=target_exam
            ):
                await websocket.send_json({"type": "token", "content": token})

            # Send completion signal
            await websocket.send_json({"type": "end"})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
