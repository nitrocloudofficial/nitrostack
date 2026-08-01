"""
RemitWise AI – Route: Providers
==================================
Exposes remittance provider data from the local JSON file.

Endpoints
---------
GET /providers                    – List all active providers
GET /providers/corridors          – List/filter corridors across providers
GET /providers/compare            – Compare providers for a corridor
GET /providers/{provider_id}      – Provider detail
GET /providers/{provider_id}/payment-methods   – Payment methods
GET /providers/{provider_id}/delivery-methods  – Delivery methods
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from services import provider_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/providers", tags=["Providers"])


# ---------------------------------------------------------------------------
# GET /providers
# ---------------------------------------------------------------------------

@router.get(
    "",
    summary="List Providers",
    description="Return all active remittance providers from the local dataset.",
)
def list_providers(
    active_only: bool = Query(True, description="If true, return only active providers"),
) -> List[Dict[str, Any]]:
    """Return the full list of providers (active by default)."""
    return provider_service.list_providers(active_only=active_only)


# ---------------------------------------------------------------------------
# GET /providers/corridors  – MUST be before /{provider_id}
# ---------------------------------------------------------------------------

@router.get(
    "/corridors",
    summary="List Supported Corridors",
    description=(
        "Return all remittance corridors supported across active providers. "
        "Optionally filter by sender and/or receiver country."
    ),
)
def get_corridors(
    from_country: Optional[str] = Query(None, description="Sender country code (e.g. US)"),
    to_country: Optional[str] = Query(None, description="Receiver country code (e.g. IN)"),
) -> List[Dict[str, Any]]:
    """Return supported corridors, optionally filtered by country."""
    return provider_service.get_supported_corridors(
        from_country=from_country, to_country=to_country
    )


# ---------------------------------------------------------------------------
# GET /providers/compare
# ---------------------------------------------------------------------------

@router.get(
    "/compare",
    summary="Compare Providers",
    description=(
        "Return a side-by-side comparison of all providers that support a "
        "specific corridor, sorted by rating."
    ),
)
def compare_providers(
    from_country: str = Query(..., description="Sender country code", examples=["US"]),
    to_country: str = Query(..., description="Receiver country code", examples=["IN"]),
) -> List[Dict[str, Any]]:
    """Compare providers for a given corridor."""
    return provider_service.compare_providers(
        from_country=from_country, to_country=to_country
    )


# ---------------------------------------------------------------------------
# GET /providers/{provider_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{provider_id}",
    summary="Provider Details",
    description="Return full details for a specific provider by its unique ID.",
)
def get_provider(provider_id: str) -> Dict[str, Any]:
    """Return provider details for the given provider ID."""
    provider = provider_service.get_provider_by_id(provider_id)
    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider '{provider_id}' not found.",
        )
    return provider


# ---------------------------------------------------------------------------
# GET /providers/{provider_id}/payment-methods
# ---------------------------------------------------------------------------

@router.get(
    "/{provider_id}/payment-methods",
    summary="Provider Payment Methods",
    description="Return accepted payment methods for a specific provider.",
)
def get_payment_methods(provider_id: str) -> Dict[str, Any]:
    """Return payment methods for the given provider."""
    try:
        methods = provider_service.get_payment_methods(provider_id)
        return {"provider_id": provider_id, "payment_methods": methods}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# GET /providers/{provider_id}/delivery-methods
# ---------------------------------------------------------------------------

@router.get(
    "/{provider_id}/delivery-methods",
    summary="Provider Delivery Methods",
    description="Return available delivery methods for a specific provider.",
)
def get_delivery_methods(provider_id: str) -> Dict[str, Any]:
    """Return delivery methods for the given provider."""
    try:
        methods = provider_service.get_delivery_methods(provider_id)
        return {"provider_id": provider_id, "delivery_methods": methods}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
