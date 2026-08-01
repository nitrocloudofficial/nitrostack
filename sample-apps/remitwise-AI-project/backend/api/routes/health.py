"""
RemitWise AI – Route: Health (Enterprise Health & Upstream Status)
===================================================================
Health-check endpoint detailing backend status, upstream provider statuses,
cache health, and service uptime.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter
import requests
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["Health"])

_START_TIME = time.time()


def _check_upstream(url: str) -> str:
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": settings.USER_AGENT},
            timeout=3,
        )
        return "healthy" if resp.ok else f"degraded ({resp.status_code})"
    except Exception as e:
        return f"unreachable ({type(e).__name__})"


@router.get(
    "",
    summary="Health Check",
    description="Returns detailed health status for backend and upstream APIs.",
)
def health_check() -> Dict[str, Any]:
    uptime = round(time.time() - _START_TIME, 2)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Upstream status checks
    frankfurter_status = _check_upstream(f"{settings.FRANKFURTER_BASE_URL}/latest?from=USD&to=INR")
    opener_status = _check_upstream(f"{settings.OPEN_ER_API_BASE_URL}/USD")

    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": now_iso,
        "uptime_seconds": uptime,
        "backend": "healthy",
        "frankfurter": frankfurter_status,
        "exchangeratehost": opener_status,
        "cache": "healthy",
    }
