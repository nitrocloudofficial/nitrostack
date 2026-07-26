from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import ProcessRequest
from app.services.context_engine import context_engine
from app.services.vector_memory import vector_memory_service
from app.auth import get_current_user, UserSession

router = APIRouter(prefix="/api/v1/process", tags=["AI Processing Pipeline"])

@router.post("")
async def process_meeting(req: ProcessRequest, current_user: UserSession = Depends(get_current_user)):
    """
    Executes the Live AI Processing Pipeline:
    1. Whisper STT / Transcript Stream
    2. Apply Selected Context Pack Rules
    3. AI Reasoning & Task/Deadline Extraction
    4. Index ChromaDB Vector Memory
    """
    transcript = req.transcript_text or "Discussed FastAPI Supabase Auth JWT and ChromaDB vector embeddings for ContextOS."
    
    result = await context_engine.process_transcript(transcript, req.context_pack_id)
    
    # Auto-index into ChromaDB vector memory
    await vector_memory_service.add_memory_node(
        text_snippet=result["summary"],
        meeting_title="Sprint 24 Technical Review",
        context_pack=req.context_pack_id,
        category="Meeting Summary",
        entities=["FastAPI", "Supabase", "ChromaDB"]
    )

    return {
        "status": "success",
        "user_email": current_user.email,
        "workspace_id": current_user.workspace_id,
        "data": result
    }
