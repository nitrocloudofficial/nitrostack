"""Pydantic models for monitoring network traffic during exploration."""

from typing import Optional, Dict
from pydantic import BaseModel, Field


class NetworkResponse(BaseModel):
    """HTTP response captured during page execution."""

    status_code: int = Field(description="HTTP status code")
    status_text: str = Field(default="", description="HTTP status text")
    headers: Dict[str, str] = Field(default_factory=dict, description="Response headers")
    response_time_ms: float = Field(default=0.0, description="Response latency in ms")


class NetworkRequest(BaseModel):
    """HTTP request captured during page execution."""

    request_id: str = Field(description="Unique request ID")
    url: str = Field(description="Target request URL")
    method: str = Field(description="HTTP method GET, POST, PUT, DELETE, etc.")
    resource_type: str = Field(default="document", description="Resource type: xhr, fetch, image, stylesheet, script")
    post_data: Optional[str] = Field(default=None, description="Request payload body if POST/PUT")
    response: Optional[NetworkResponse] = Field(default=None, description="Associated response if completed")
    failed: bool = Field(default=False, description="Whether request failed network connection")
    failure_text: Optional[str] = Field(default=None, description="Failure detail if request failed")
