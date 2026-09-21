from typing import Any, Dict

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    success: bool
    response: str
    metadata: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    version: str
    dependencies: Dict[str, bool] = {}


class StatusResponse(BaseModel):
    kernel: str
    runtime: str
    pipeline: str


class APIResponse(BaseModel):
    success: bool
    message: str


class PipelineRequest(BaseModel):
    query: str


class PipelineStatusResponse(BaseModel):
    pipeline: str
    status: str
    version: str
