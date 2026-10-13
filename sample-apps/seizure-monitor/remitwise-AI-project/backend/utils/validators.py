"""
RemitWise AI – Utility: Validators
=====================================
Reusable input validation helpers shared across routes and services.
"""

import re
import logging
from datetime import date, datetime
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)

# ISO 3166-1 alpha-2 country code pattern
_COUNTRY_CODE_RE = re.compile(r"^[A-Z]{2}$")

# ISO 4217 currency code pattern
_CURRENCY_CODE_RE = re.compile(r"^[A-Z]{3}$")


# ---------------------------------------------------------------------------
# Currency helpers
# ---------------------------------------------------------------------------

def is_valid_currency(code: str) -> bool:
    """
    Return True if *code* is a recognised ISO-4217 currency code supported
    by the Frankfurter API.

    Parameters
    ----------
    code:
        Three-letter currency code, e.g. ``"USD"``.
    """
    if not _CURRENCY_CODE_RE.match(code.upper()):
        return False
    return code.upper() in settings.SUPPORTED_CURRENCIES


def validate_currency(code: str) -> str:
    """
    Normalise and validate a currency code.

    Returns
    -------
    str
        Upper-cased, validated currency code.

    Raises
    ------
    ValueError
        When the code is malformed or not in the supported list.
    """
    normalised = code.strip().upper()
    if not is_valid_currency(normalised):
        raise ValueError(
            f"Unsupported or invalid currency code: '{code}'. "
            f"Supported currencies: {', '.join(settings.SUPPORTED_CURRENCIES)}"
        )
    return normalised


# ---------------------------------------------------------------------------
# Country helpers
# ---------------------------------------------------------------------------

def is_valid_country_code(code: str) -> bool:
    """Return True if *code* is a well-formed ISO 3166-1 alpha-2 code."""
    return bool(_COUNTRY_CODE_RE.match(code.upper()))


def validate_country_code(code: str) -> str:
    """
    Normalise and validate a country code.

    Returns
    -------
    str
        Upper-cased two-letter country code.

    Raises
    ------
    ValueError
        When the code does not match the ISO 3166-1 alpha-2 pattern.
    """
    normalised = code.strip().upper()
    if not is_valid_country_code(normalised):
        raise ValueError(
            f"Invalid country code: '{code}'. Expected ISO 3166-1 alpha-2 "
            f"(e.g., 'US', 'IN', 'GB')."
        )
    return normalised


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------

def validate_date_string(date_str: str) -> date:
    """
    Parse and validate an ISO-8601 date string (``YYYY-MM-DD``).

    Parameters
    ----------
    date_str:
        Date string to validate.

    Returns
    -------
    datetime.date
        Parsed date object.

    Raises
    ------
    ValueError
        When the string is not a valid ISO date.
    """
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(
            f"Invalid date format: '{date_str}'. Expected YYYY-MM-DD."
        )


def validate_date_range(start_date: str, end_date: str) -> tuple[date, date]:
    """
    Validate that *start_date* <= *end_date* and both are valid ISO dates.

    Parameters
    ----------
    start_date:
        ISO-8601 start date string.
    end_date:
        ISO-8601 end date string.

    Returns
    -------
    tuple[date, date]
        Parsed (start, end) date objects.

    Raises
    ------
    ValueError
        On invalid format or inverted range.
    """
    start = validate_date_string(start_date)
    end = validate_date_string(end_date)

    if start > end:
        raise ValueError(
            f"start_date ({start_date}) must be on or before end_date ({end_date})."
        )
    return start, end


# ---------------------------------------------------------------------------
# Amount helpers
# ---------------------------------------------------------------------------

def validate_amount(amount: Optional[float]) -> float:
    """
    Validate that a monetary amount is a positive finite number.

    Parameters
    ----------
    amount:
        Amount to validate.

    Returns
    -------
    float
        The validated amount.

    Raises
    ------
    ValueError
        When the amount is None, non-positive, or not finite.
    """
    if amount is None:
        raise ValueError("Amount must be provided.")
    if not isinstance(amount, (int, float)):
        raise ValueError(f"Amount must be a number, got: {type(amount).__name__}.")
    if amount <= 0:
        raise ValueError(f"Amount must be positive, got: {amount}.")
    import math
    if not math.isfinite(amount):
        raise ValueError("Amount must be a finite number.")
    return float(amount)
