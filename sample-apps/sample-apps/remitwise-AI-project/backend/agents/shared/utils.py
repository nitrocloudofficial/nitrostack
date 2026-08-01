"""
RemitWise AI – Agent Utilities
================================
Shared helpers used across the agent layer.

Includes:
  - Safe dict merging (no key collision clobber)
  - Currency / country code normalisation
  - JSON-safe serialisation
  - Execution timing context manager
"""

from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Currency / Country normalisation
# ---------------------------------------------------------------------------

# Map common country names and aliases → ISO-2 codes
_COUNTRY_ALIASES: Dict[str, str] = {
    "india":           "IN",
    "united states":   "US",
    "usa":             "US",
    "america":         "US",
    "united kingdom":  "GB",
    "uk":              "GB",
    "britain":         "GB",
    "philippines":     "PH",
    "mexico":          "MX",
    "kenya":           "KE",
    "nigeria":         "NG",
    "germany":         "DE",
    "canada":          "CA",
    "australia":       "AU",
}

# Map common currency names / symbols → ISO-4217 codes
_CURRENCY_ALIASES: Dict[str, str] = {
    "dollar":  "USD",
    "dollars": "USD",
    "$":       "USD",
    "euro":    "EUR",
    "euros":   "EUR",
    "€":       "EUR",
    "pound":   "GBP",
    "pounds":  "GBP",
    "sterling":"GBP",
    "£":       "GBP",
    "rupee":   "INR",
    "rupees":  "INR",
    "yen":     "JPY",
    "¥":       "JPY",
    "peso":    "MXN",
    "pesos":   "MXN",
    "dirham":  "AED",
    "riyal":   "SAR",
}

# Country → primary currency mapping (for cross-domain context passing)
_COUNTRY_TO_CURRENCY: Dict[str, str] = {
    "US": "USD", "IN": "INR", "GB": "GBP", "PH": "PHP",
    "MX": "MXN", "KE": "KES", "NG": "NGN", "DE": "EUR",
    "CA": "CAD", "AU": "AUD", "AE": "AED", "SA": "SAR",
    "JP": "JPY", "CN": "CNY", "SG": "SGD", "HK": "HKD",
}


def normalize_currency(raw: str) -> Optional[str]:
    """
    Normalise a free-text currency reference to ISO-4217 code.

    Returns uppercase ISO code if recognised, else None.
    """
    if not raw:
        return None
    cleaned = raw.strip().upper()
    if len(cleaned) == 3 and cleaned.isalpha():
        return cleaned  # already looks like ISO code
    lower = raw.strip().lower()
    return _CURRENCY_ALIASES.get(lower)


def normalize_country(raw: str) -> Optional[str]:
    """
    Normalise a free-text country reference to ISO-3166-1 alpha-2 code.

    Returns uppercase 2-letter code if recognised, else None.
    """
    if not raw:
        return None
    cleaned = raw.strip().upper()
    if len(cleaned) == 2 and cleaned.isalpha():
        return cleaned  # already looks like ISO-2
    lower = raw.strip().lower()
    return _COUNTRY_ALIASES.get(lower)


def country_to_currency(country_code: str) -> Optional[str]:
    """Return the primary currency for a given country ISO-2 code."""
    return _COUNTRY_TO_CURRENCY.get(country_code.upper().strip())


# ---------------------------------------------------------------------------
# Dict utilities
# ---------------------------------------------------------------------------

def safe_merge(*dicts: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deep-merge multiple dicts.  Later values win on scalar conflicts;
    nested dicts are merged recursively.
    """
    result: Dict[str, Any] = {}
    for d in dicts:
        for key, val in d.items():
            if key in result and isinstance(result[key], dict) and isinstance(val, dict):
                result[key] = safe_merge(result[key], val)
            else:
                result[key] = val
    return result


def flatten_agent_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Merge a list of agent result dicts into a single flat dict.
    Each result should have an 'agent' key; collisions are namespaced.
    """
    merged: Dict[str, Any] = {}
    for r in results:
        agent_name = r.get("agent", "unknown")
        for k, v in r.items():
            if k == "agent":
                continue
            # namespace to avoid collisions: prefer plain key, fallback to agent_key
            if k not in merged:
                merged[k] = v
            else:
                merged[f"{agent_name}_{k}"] = v
    return merged


def json_safe(obj: Any) -> Any:
    """
    Recursively convert an object to a JSON-serialisable structure.
    Handles Pydantic models, sets, custom objects.
    """
    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    if isinstance(obj, dict):
        return {k: json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [json_safe(item) for item in obj]
    if isinstance(obj, set):
        return [json_safe(item) for item in sorted(obj)]
    if hasattr(obj, "model_dump"):  # Pydantic v2
        return json_safe(obj.model_dump())
    if hasattr(obj, "__dict__"):
        return json_safe(obj.__dict__)
    return str(obj)


# ---------------------------------------------------------------------------
# Timing
# ---------------------------------------------------------------------------

@contextmanager
def timed() -> Generator[Dict[str, float], None, None]:
    """
    Context manager that measures elapsed time in milliseconds.

    Usage::

        with timed() as t:
            do_work()
        print(t["ms"])  # elapsed ms
    """
    result: Dict[str, float] = {"ms": 0.0}
    start = time.perf_counter()
    try:
        yield result
    finally:
        result["ms"] = round((time.perf_counter() - start) * 1000, 2)


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

def truncate(text: str, max_length: int = 200, suffix: str = "…") -> str:
    """Truncate text to max_length, appending suffix if truncated."""
    if len(text) <= max_length:
        return text
    return text[: max_length - len(suffix)] + suffix


def fmt_currency(amount: float, currency: str = "USD") -> str:
    """Format a monetary amount with currency symbol."""
    symbols = {"USD": "$", "EUR": "€", "GBP": "£", "INR": "₹",
               "JPY": "¥", "AED": "د.إ", "CAD": "C$", "AUD": "A$"}
    sym = symbols.get(currency.upper(), currency.upper() + " ")
    return f"{sym}{amount:,.2f}"
