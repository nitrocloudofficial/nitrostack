import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, documents, tutor, quiz

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("studybuddy.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager for startup and shutdown events.
    """
    # Startup actions
    logger.info("Initializing StudyBuddy AI Backend application...")
    
    # Ensure required directories exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.VECTOR_STORE_PATH, exist_ok=True)

    # Auto-create database tables on startup if database is available
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema initialized successfully.")
    except Exception as e:
        logger.warning(f"Could not initialize database schema automatically: {e}")

    yield

    # Shutdown actions
    logger.info("Shutting down StudyBuddy AI Backend application...")
    await engine.dispose()


app = FastAPI(
    title="StudyBuddy AI Backend",
    description="FastAPI Backend for StudyBuddy AI - Personalized AI Tutor, RAG Document Processing, and Adaptive Quizzes.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(tutor.router, prefix="/api/v1")
app.include_router(quiz.router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root status endpoint."""
    return {
        "status": "ok",
        "app": "StudyBuddy AI API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "services": {
            "api": "online",
            "upload_dir": os.path.exists(settings.UPLOAD_DIR),
            "vector_store": os.path.exists(settings.VECTOR_STORE_PATH)
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
