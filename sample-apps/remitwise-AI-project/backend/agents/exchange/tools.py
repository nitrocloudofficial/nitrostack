"""
RemitWise AI – Exchange Agent Tools
=====================================
Thin wrappers around the existing exchange_service module.

These functions ARE the tools available to the Exchange Agent.
They call the existing backend service directly (no HTTP round-trip),
providing fast, in-process access to exchange rate data.

All functions return native Python dicts/values — no FastAPI concerns here.
"""

from __future__ import annotations

import sys
import os

# Ensure the backend root is on sys.path so service imports work
# regardless of which directory the server was launched from.
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from typing import Any, Dict, List

from services import exchange_service


def get_latest_rate(base: str, target: str) -> Dict[str, Any]:
    """
    Fetch the current mid-market exchange rate between two currencies.

    Parameters
    ----------
    base : str
        Source currency ISO-4217 code (e.g. 'USD').
    target : str
        Target currency ISO-4217 code (e.g. 'INR').

    Returns
    -------
    dict
        Contains: base, target, rate, date, source, cache, latency_ms, ...
    """
    return exchange_service.get_latest_rate(base=base, target=target)


def convert_amount(base: str, target: str, amount: float) -> Dict[str, Any]:
    """
    Convert a monetary amount from base currency to target at current rate.

    Parameters
    ----------
    base : str
        Source currency code.
    target : str
        Target currency code.
    amount : float
        Amount to convert (must be positive).

    Returns
    -------
    dict
        Contains: base, target, original_amount, converted_amount, rate, date, ...
    """
    return exchange_service.convert_amount(base=base, target=target, amount=amount)


def get_historical_rates(
    base: str,
    target: str,
    start_date: str,
    end_date: str,
) -> Dict[str, Any]:
    """
    Fetch historical exchange rates for a date range.

    Parameters
    ----------
    base : str
        Source currency code.
    target : str
        Target currency code.
    start_date : str
        Start date in YYYY-MM-DD format.
    end_date : str
        End date in YYYY-MM-DD format.

    Returns
    -------
    dict
        Contains: base, target, start_date, end_date, rates (dict[date, rate]), count, ...
    """
    return exchange_service.get_historical_rates(
        base=base,
        target=target,
        start_date=start_date,
        end_date=end_date,
    )


def list_currencies() -> Dict[str, Any]:
    """
    List all currencies supported by the Frankfurter API.

    Returns
    -------
    dict
        Contains: currencies (dict[code, name]), count, source, ...
    """
    return exchange_service.list_supported_currencies()
