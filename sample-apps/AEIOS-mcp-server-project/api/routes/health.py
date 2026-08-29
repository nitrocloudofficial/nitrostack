import os

from fastapi import APIRouter

from api.config import settings

router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


@router.get("")
async def health():
    groq_ok = bool(os.getenv("GROQ_API_KEY"))
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "dependencies": {
            "groq_api_key": groq_ok,
            "groq_model": bool(os.getenv("GROQ_MODEL")),
        },
    }
