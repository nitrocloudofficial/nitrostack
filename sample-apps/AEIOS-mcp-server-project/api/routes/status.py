from fastapi import APIRouter

from api.models import StatusResponse

router = APIRouter(
    prefix="/status",
    tags=["System"],
)


@router.get("")
async def status():

    return StatusResponse(
        kernel="running",
        runtime="running",
        pipeline="ready",
    )