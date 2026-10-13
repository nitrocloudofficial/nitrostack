from fastapi import APIRouter
from . import research, correlation, workflow, workspace

api_router = APIRouter()

api_router.include_router(research.router, prefix="/research", tags=["research"])
api_router.include_router(correlation.router, prefix="/correlation", tags=["correlation"])
api_router.include_router(workflow.router, prefix="/workflow", tags=["workflow"])
api_router.include_router(workspace.router, prefix="/workspace", tags=["workspace"])
