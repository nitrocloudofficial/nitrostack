"""
ReportService — Business Logic

Phase 1: Stub only. No business logic implemented.

Phase 2 Responsibilities:
Nitro-powered report generation, Markdown rendering, export

Dependencies:
- AsyncSession (SQLAlchemy — Supabase PostgreSQL)
- Redis (caching layer)
- External API clients (Phase 2)
"""
from typing import Any

class ReportService:
    """
    Report domain service.
    
    Injected via FastAPI Depends() in the reports router.
    Phase 2: Initialize with db: AsyncSession, cache: Redis.
    """
    pass
