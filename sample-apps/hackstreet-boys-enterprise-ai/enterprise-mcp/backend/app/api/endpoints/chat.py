from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
from app.services.orchestrator import orchestrator
from fastapi.responses import StreamingResponse

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, str]] = []
    stream: bool = False

@router.post("/")
async def chat(req: ChatRequest):
    if req.stream:
        async def generator():
            async for chunk in orchestrator.chat_stream(req.message, req.history):
                yield chunk
        return StreamingResponse(generator(), media_type="text/plain")
    else:
        response = await orchestrator.chat(req.message, req.history)
        return {"response": response}

