from fastapi import APIRouter

from api.config import settings

router = APIRouter(
    prefix="/version",
    tags=["System"],
)


@router.get("")
async def version():

    return {
        "application": settings.APP_NAME,
        "version": settings.VERSION,
        "description": settings.DESCRIPTION,
    }