"""
RemitWise AI – Route: Compliance
===================================
Exposes country-level compliance rules, KYC requirements, AML requirements,
and required documents from the local JSON dataset.

Endpoints
---------
GET /compliance                      – List all countries in dataset
GET /compliance/{country}            – Full compliance profile for a country
GET /compliance/{country}/documents  – Required/optional documents
GET /compliance/{country}/kyc        – KYC requirements
GET /compliance/{country}/aml        – AML & sanctions requirements
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException, status

from services import compliance_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/compliance", tags=["Compliance"])


# ---------------------------------------------------------------------------
# GET /compliance  – List all countries
# ---------------------------------------------------------------------------

@router.get(
    "",
    summary="List Compliance Countries",
    description=(
        "Return a summary of all countries available in the local compliance "
        "dataset, including risk level and KYC/AML flags."
    ),
)
def list_countries() -> List[Dict[str, Any]]:
    """Return compliance summaries for all countries in the dataset."""
    return compliance_service.list_all_countries()


# ---------------------------------------------------------------------------
# GET /compliance/{country}
# ---------------------------------------------------------------------------

@router.get(
    "/{country}",
    summary="Country Compliance Profile",
    description=(
        "Return the full compliance profile for a country, including KYC "
        "requirements, AML rules, sanctions screening, transaction limits, "
        "required documents, and the regulatory framework."
    ),
)
def get_country_compliance(country: str) -> Dict[str, Any]:
    """Return the complete compliance record for *country*."""
    try:
        rule = compliance_service.get_country_rules(country)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    if rule is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No compliance data found for country code '{country.upper()}'. "
                "This country may not yet be in the local dataset."
            ),
        )
    return rule


# ---------------------------------------------------------------------------
# GET /compliance/{country}/documents
# ---------------------------------------------------------------------------

@router.get(
    "/{country}/documents",
    summary="Required Documents",
    description=(
        "Return the list of required and optional identity/address documents "
        "for a specific country."
    ),
)
def get_documents(country: str) -> Dict[str, Any]:
    """Return document requirements for *country*."""
    try:
        docs = compliance_service.get_required_documents(country)
        return {
            "country_code": country.upper(),
            "documents": docs,
            "total": len(docs),
        }
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# GET /compliance/{country}/kyc
# ---------------------------------------------------------------------------

@router.get(
    "/{country}/kyc",
    summary="KYC Requirements",
    description=(
        "Return Know Your Customer (KYC) requirements for a country, "
        "including mandatory and optional documents, risk level, and "
        "the applicable regulatory framework."
    ),
)
def get_kyc(country: str) -> Dict[str, Any]:
    """Return KYC requirements for *country*."""
    try:
        return compliance_service.get_kyc_requirements(country)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# GET /compliance/{country}/aml
# ---------------------------------------------------------------------------

@router.get(
    "/{country}/aml",
    summary="AML Requirements",
    description=(
        "Return Anti-Money Laundering (AML) and sanctions screening requirements "
        "for a country, including transaction limits and risk level."
    ),
)
def get_aml(country: str) -> Dict[str, Any]:
    """Return AML requirements for *country*."""
    try:
        return compliance_service.get_aml_requirements(country)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
