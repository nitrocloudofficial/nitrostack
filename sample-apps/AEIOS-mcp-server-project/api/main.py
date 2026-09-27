import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.config import settings
from api.middleware import logging_middleware

from api.routes.health import router as health_router
from api.routes.status import router as status_router
from api.routes.version import router as version_router
from api.routes.chat import router as chat_router
from api.routes.pipeline import router as pipeline_router

logger = logging.getLogger("aeios-api")


def validate_startup() -> dict:
    checks = {}
    checks["groq_api_key"] = bool(os.getenv("GROQ_API_KEY"))
    checks["groq_model"] = bool(os.getenv("GROQ_MODEL"))
    checks["python"] = True
    return checks


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info("  AEIOS-X Enterprise Backend Starting")
    logger.info("=" * 50)

    checks = validate_startup()
    all_ok = True
    for name, ok in checks.items():
        status = "OK" if ok else "MISSING"
        if not ok:
            all_ok = False
        logger.info("  [%s] %s", status, name)

    if not checks["groq_api_key"]:
        logger.warning("  GROQ_API_KEY not set — LLM features will be unavailable")

    logger.info("  Backend URL: http://%s:%s", settings.HOST, settings.PORT)
    logger.info("=" * 50)

    yield

    logger.info("AEIOS-X Backend shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(logging_middleware)

app.include_router(health_router)
app.include_router(status_router)
app.include_router(version_router)
app.include_router(chat_router)
app.include_router(pipeline_router)


@app.get("/")
async def root():
    return {
        "application": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "running",
    }
