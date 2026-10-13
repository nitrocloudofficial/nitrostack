"""
RemitWise AI – Provider Agent Tools
=====================================
Thin wrappers around the existing provider_service module.
"""

from __future__ import annotations

import sys
import os

_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from typing import Any, Dict, List, Optional

from services import provider_service


def list_providers(active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Return all remittance providers (active only by default).

    Parameters
    ----------
    active_only : bool
        If True, only return providers marked as active.
    """
    return provider_service.list_providers(active_only=active_only)


def compare_providers(from_country: str, to_country: str) -> List[Dict[str, Any]]:
    """
    Return providers that support the given corridor, ready for comparison.

    Parameters
    ----------
    from_country : str
        Sender country ISO-2 code (e.g. 'US').
    to_country : str
        Receiver country ISO-2 code (e.g. 'IN').
    """
    return provider_service.compare_providers(
        from_country=from_country,
        to_country=to_country,
    )


def get_provider_detail(provider_id: str) -> Optional[Dict[str, Any]]:
    """
    Return the full profile for a specific provider.

    Parameters
    ----------
    provider_id : str
        Provider identifier (e.g. 'wise', 'remitly', 'western_union').
    """
    return provider_service.get_provider_by_id(provider_id=provider_id)


def get_corridors(
    from_country: Optional[str] = None,
    to_country: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    List all supported transfer corridors, optionally filtered.

    Parameters
    ----------
    from_country : str, optional
        Filter by sender country ISO-2.
    to_country : str, optional
        Filter by receiver country ISO-2.
    """
    return provider_service.get_supported_corridors(
        from_country=from_country,
        to_country=to_country,
    )
