"""
DatasetService — Business Logic

Phase 1: Stub only. No business logic implemented.

Phase 2 Responsibilities:
Dataset indexing from Kaggle/HuggingFace, preview, metadata

Dependencies:
- AsyncSession (SQLAlchemy — Supabase PostgreSQL)
- Redis (caching layer)
- External API clients (Phase 2)
"""
from typing import Any

class DatasetService:
    """
    Dataset domain service.
    
    Injected via FastAPI Depends() in the datasets router.
    Phase 2: Initialize with db: AsyncSession, cache: Redis.
    """
    pass
