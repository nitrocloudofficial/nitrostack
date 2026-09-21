from fastapi import APIRouter, HTTPException

from api.models import ChatRequest, ChatResponse
from api.services.chat_service import chat_service

router = APIRouter(
    prefix="/chat",
    tags=["Enterprise Chat"],
)


@router.post(
    "",
    response_model=ChatResponse,
)
async def chat(request: ChatRequest):

    try:

        result = chat_service.chat(request.message)

        enterprise = result["result"]

        return ChatResponse(
            success=enterprise.success,
            response=enterprise.result,
            metadata=enterprise.metadata,
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )