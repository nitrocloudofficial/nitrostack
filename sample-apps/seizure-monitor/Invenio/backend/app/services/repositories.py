"""
RepositoryService — Business Logic

Phase 1: Stub only. No business logic implemented.

Phase 2 Responsibilities:
GitHub/GitLab indexing, dependency analysis, README fetch

Dependencies:
- AsyncSession (SQLAlchemy — Supabase PostgreSQL)
- Redis (caching layer)
- External API clients (Phase 2)
"""
from typing import Any

class RepositoryService:
    """
    Repository domain service.
    
    Injected via FastAPI Depends() in the repositories router.
    Phase 2: Initialize with db: AsyncSession, cache: Redis.
    """
    pass
