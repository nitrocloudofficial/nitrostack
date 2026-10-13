"""
EvidenceService — Business Logic

Phase 1: Stub only. No business logic implemented.

Phase 2 Responsibilities:
Evidence extraction from papers, confidence scoring, chain building

Dependencies:
- AsyncSession (SQLAlchemy — Supabase PostgreSQL)
- Redis (caching layer)
- External API clients (Phase 2)
"""
from typing import Any

class EvidenceService:
    """
    Evidence domain service.
    
    Injected via FastAPI Depends() in the evidence router.
    Phase 2: Initialize with db: AsyncSession, cache: Redis.
    """
    pass
