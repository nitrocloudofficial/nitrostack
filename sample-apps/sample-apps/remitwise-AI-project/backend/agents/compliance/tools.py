"""
RemitWise AI – Compliance Agent Tools
=======================================
Thin wrappers around the existing compliance_service module.
"""

from __future__ import annotations

import sys
import os

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from typing import Any, Dict, List, Optional

from services import compliance_service


def get_country_rules(country_code: str) -> Optional[Dict[str, Any]]:
    """
    Return the full compliance profile for a country.

    Parameters
    ----------
    country_code : str
        ISO-3166-1 alpha-2 country code (e.g. 'IN', 'US').

    Returns
    -------
    dict or None
        Full compliance record, or None if country not in dataset.
    """
    return compliance_service.get_country_rules(country_code=country_code)


def get_kyc_requirements(country_code: str) -> Dict[str, Any]:
    """
    Return KYC-specific requirements for a country.

    Returns
    -------
    dict
        Contains: country, kyc_required, required_documents, purpose_required, ...
    """
    return compliance_service.get_kyc_requirements(country_code=country_code)


def get_aml_requirements(country_code: str) -> Dict[str, Any]:
    """
    Return AML and sanctions screening requirements for a country.

    Returns
    -------
    dict
        Contains: country, aml_check, sanctions_screening, ...
    """
    return compliance_service.get_aml_requirements(country_code=country_code)


def get_required_documents(country_code: str) -> List[str]:
    """
    Return the list of required documents for a country.

    Returns
    -------
    list[str]
        Document names (e.g. ['Passport', 'Proof of Address']).
    """
    return compliance_service.get_required_documents(country_code=country_code)


def list_all_countries() -> List[Dict[str, Any]]:
    """
    Return a summary of all countries in the compliance dataset.
    """
    return compliance_service.list_all_countries()
