"""
GraphService — Business Logic

Phase 1: Stub only. No business logic implemented.

Phase 2 Responsibilities:
Neo4j CRUD, entity relationship queries, path finding

Dependencies:
- AsyncSession (SQLAlchemy — Supabase PostgreSQL)
- Redis (caching layer)
- External API clients (Phase 2)
"""
from typing import Any

class GraphService:
    """
    Graph domain service.
    
    Injected via FastAPI Depends() in the graph router.
    Phase 2: Initialize with db: AsyncSession, cache: Redis.
    """
    pass
