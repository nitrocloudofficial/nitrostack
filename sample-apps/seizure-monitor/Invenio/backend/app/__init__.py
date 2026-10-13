"""
Invenio Backend Package

This package contains the FastAPI backend application.

Structure:
  app/
    main.py         — Application factory and entry point
    routers/        — FastAPI route handlers (one per domain module)
    services/       — Business logic layer (stateless service classes)
    models/         — SQLAlchemy ORM models (Supabase PostgreSQL)
    schemas/        — Pydantic request/response schemas
    core/           — Configuration, database, security, cache
    utils/          — Shared utilities (logging, pagination, validators)
    config/         — Environment-specific configuration

Phase 1: Architecture skeleton only.
Phase 2: Full CRUD implementations for all domain modules.
"""
