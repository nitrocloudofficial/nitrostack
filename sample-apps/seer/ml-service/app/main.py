import logging
import re
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from hmac import compare_digest
from uuid import uuid4

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, TypeAdapter

from .analysis import (
    AnalysisFailure,
    AnalysisPlan,
    AnalysisResponse,
    analyze_csv,
)
from .config import Settings
from .profiling import ProfileFailure, ProfileResponse, profile_csv

logger = logging.getLogger("seer_ml")
REQUEST_ID_HEADER = "X-Request-ID"
_request_id_pattern = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "seer-ml"
    version: str = "0.1.0"


def require_api_key(request: Request) -> None:
    authorization = request.headers.get("authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )

    supplied_key = authorization.removeprefix("Bearer ")
    settings: Settings = request.app.state.settings
    if not compare_digest(supplied_key, settings.api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )


def create_app(settings: Settings | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.settings = settings or Settings.from_environment()
        yield

    app = FastAPI(title="Seer ML Service", version="0.1.0", lifespan=lifespan)

    @app.middleware("http")
    async def add_request_context(request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER, "")
        if not _request_id_pattern.fullmatch(request_id):
            request_id = str(uuid4())
        request.state.request_id = request_id
        started = time.perf_counter()
        response: JSONResponse | None = None
        try:
            response = await call_next(request)
            return response
        except Exception:
            logger.exception("Unhandled ML service failure", extra={"request_id": request_id, "path": request.url.path})
            response = JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "ML service could not complete the request."})
            return response
        finally:
            if response is not None:
                response.headers[REQUEST_ID_HEADER] = request_id
                logger.info(
                    "ML service request completed",
                    extra={
                        "request_id": request_id,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "dataset_id": getattr(request.state, "dataset_id", None),
                        "rows": getattr(request.state, "rows", None),
                        "columns": getattr(request.state, "columns", None),
                        "duration_ms": round((time.perf_counter() - started) * 1000, 2),
                    },
                )

    @app.exception_handler(RequestValidationError)
    async def request_validation_error(_request: Request, _error: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content={"detail": "Request is invalid."})

    @app.get(
        "/health",
        response_model=HealthResponse,
        dependencies=[Depends(require_api_key)],
    )
    async def health() -> HealthResponse:
        return HealthResponse()

    @app.post(
        "/v1/profile",
        response_model=ProfileResponse,
        dependencies=[Depends(require_api_key)],
    )
    async def profile_dataset(
        request: Request,
        file: UploadFile = File(...),
        dataset_id: str = Form(..., min_length=1),
    ) -> ProfileResponse:
        settings: Settings = request.app.state.settings
        request.state.dataset_id = dataset_id
        if file.content_type not in {
            "text/csv",
            "application/csv",
            "application/vnd.ms-excel",
        }:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Expected a CSV file.",
            )

        raw_csv = await file.read(settings.max_csv_bytes + 1)
        try:
            response = profile_csv(dataset_id, raw_csv, settings)
            request.state.rows = response.dimensions["rows"]
            request.state.columns = response.dimensions["columns"]
            return response
        except ProfileFailure as error:
            raise HTTPException(
                status_code=error.status_code, detail=error.detail
            ) from error

    @app.post(
        "/v1/analyze",
        response_model=AnalysisResponse,
        dependencies=[Depends(require_api_key)],
    )
    async def analyze_dataset(
        request: Request,
        file: UploadFile = File(...),
        plan: str = Form(...),
    ) -> AnalysisResponse:
        settings: Settings = request.app.state.settings
        if file.content_type not in {
            "text/csv",
            "application/csv",
            "application/vnd.ms-excel",
        }:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Expected a CSV file.",
            )

        raw_csv = await file.read(settings.max_csv_bytes + 1)
        try:
            parsed_plan = TypeAdapter(AnalysisPlan).validate_json(plan)
            request.state.dataset_id = parsed_plan.datasetId
            response = analyze_csv(raw_csv, parsed_plan, settings)
            request.state.rows = response.explanationFacts["usableRows"]
            request.state.columns = len(parsed_plan.featureColumns) + 1
            return response
        except AnalysisFailure as error:
            raise HTTPException(
                status_code=error.status_code, detail=error.detail
            ) from error
        except ValueError as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Analysis plan is invalid.",
            ) from error

    return app


app = create_app()
