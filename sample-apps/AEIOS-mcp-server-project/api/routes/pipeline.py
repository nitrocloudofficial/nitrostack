from fastapi import APIRouter
from fastapi import HTTPException

from api.models import PipelineRequest
from api.models import PipelineStatusResponse

from api.services.pipeline_service import pipeline_service

router = APIRouter(

    prefix="/pipeline",

    tags=["Pipeline"],

)


@router.get(
    "/status",
    response_model=PipelineStatusResponse,
)
async def status():

    return pipeline_service.status()


@router.get("/info")
async def info():

    return pipeline_service.info()


@router.post("/execute")
async def execute(request: PipelineRequest):

    try:

        result = pipeline_service.execute(
            request.query
        )

        enterprise = result["result"]

        return {

            "success": enterprise.success,

            "response": enterprise.result,

            "metadata": enterprise.metadata,

        }

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )


@router.post("/reset")
async def reset():

    return pipeline_service.reset()


@router.get("/workflows")
async def workflows():

    return pipeline_service.workflows()


@router.get("/history")
async def history():

    return pipeline_service.history()