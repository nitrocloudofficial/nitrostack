"""
Invenio Backend — FastAPI Application

Entry Point: app/main.py

This module creates the FastAPI application instance and registers all routers.

Phase 1: Architecture skeleton only. No endpoints, no business logic.

Phase 2+:
- Register API routers for all domain modules
- Add middleware: CORS, authentication, rate limiting, request logging
- Add startup/shutdown lifecycle handlers for database and cache connections
- Add OpenAPI documentation customization
- Add health check endpoint
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import research, correlation, workflow, workspace
# from app.routers import datasets, repositories, graph, evidence, reports
from app.core.config import settings
from app.core.http_client import close_http_client
# from app.core.database import init_db
# from app.core.cache import init_redis


def create_application() -> FastAPI:
    """
    Application factory.

    Creates and configures the FastAPI instance with all middleware,
    routers, and lifecycle event handlers.

    Returns:
        FastAPI: Configured application instance.
    """
    application = FastAPI(
        title="Invenio API",
        description=(
            "Invenio — AI Research Operating System. "
            "Connects scientific papers, datasets, repositories, patents, "
            "and natural phenomena to uncover research opportunities."
        ),
        version="0.1.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # ── Middleware ─────────────────────────────────────
    # CORS — Phase 1: Allow all origins for development
    # Phase 2: Restrict to frontend origin from config
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Future: settings.CORS_ORIGINS
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Future middleware (Phase 2+):
    # application.add_middleware(AuthenticationMiddleware, ...)
    # application.add_middleware(RateLimitMiddleware, ...)
    # application.add_middleware(RequestLoggingMiddleware, ...)

    # ── Routers ────────────────────────────────────────
    application.include_router(research.router, prefix=settings.API_V1_PREFIX + "/research", tags=["Research"])
    application.include_router(correlation.router, prefix=settings.API_V1_PREFIX + "/correlation", tags=["Correlation Engine"])
    application.include_router(workflow.router, prefix=settings.API_V1_PREFIX + "/workflow", tags=["Workflow Engine"])
    application.include_router(workspace.router, prefix=settings.API_V1_PREFIX + "/workspace", tags=["Workspace & Reports"])
    
    # Future (Phase 2): Register domain routers
    # application.include_router(datasets.router, prefix="/api/v1/datasets", tags=["Datasets"])
    # application.include_router(repositories.router, prefix="/api/v1/repositories", tags=["Repositories"])
    # application.include_router(graph.router, prefix="/api/v1/graph", tags=["Knowledge Graph"])
    # application.include_router(evidence.router, prefix="/api/v1/evidence", tags=["Evidence"])
    # application.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])

    # ── Lifecycle Events ───────────────────────────────
    @application.on_event("startup")
    async def startup_event() -> None:
        """
        Application startup handler.
        Future: Initialize database connections, Redis cache, and Nitro agents.
        """
        # await init_db()
        # await init_redis()
        pass

    @application.on_event("shutdown")
    async def shutdown_event() -> None:
        """
        Application shutdown handler.
        Closes shared HTTP client.
        Future: Gracefully close database and cache connections.
        """
        await close_http_client()

    # ── Health Check ───────────────────────────────────
    @application.get("/health", tags=["System"])
    async def health_check() -> dict:
        """
        Health check endpoint.
        Returns application status and version.
        Future: Include database, cache, and Nitro agent health.
        """
        return {
            "status": "healthy",
            "version": "0.1.0",
            "phase": "Phase 1 — Architecture Foundation",
        }

    return application


# Application instance — used by uvicorn
app = create_application()
