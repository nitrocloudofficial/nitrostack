"""
RemitWise AI – Provider Service
Compatible with the current providers.json
"""

import logging
from typing import Any, Dict, List, Optional

from config import settings
from utils.file_loader import load_json_file

logger = logging.getLogger(__name__)


def _load_providers() -> List[Dict[str, Any]]:
    data = load_json_file(settings.PROVIDERS_FILE)

    if isinstance(data, list):
        return data

    if isinstance(data, dict):
        return data.get("providers", [])

    return []


def list_providers(active_only: bool = True) -> List[Dict[str, Any]]:
    providers = _load_providers()

    if active_only:
        providers = [
            p for p in providers
            if p.get("active", True)
        ]

    return providers


def get_provider_by_id(provider_id: str) -> Optional[Dict[str, Any]]:
    providers = _load_providers()

    for provider in providers:
        if provider["provider_id"].lower() == provider_id.lower():
            return provider

    return None


def _normalize_country_code(code: str) -> str:
    """Normalize country codes to handle ISO-2 and ISO-3 variations (e.g., US <-> USA)."""
    if not code:
        return ""
    upper = code.strip().upper()
    mapping = {
        "US": "USA", "USA": "USA", "UNITED STATES": "USA", "AMERICA": "USA",
        "IN": "IN", "IND": "IN", "INDIA": "IN",
        "UK": "UK", "GB": "UK", "GBR": "UK", "UNITED KINGDOM": "UK", "BRITAIN": "UK",
        "UAE": "UAE", "AE": "UAE", "UNITED ARAB EMIRATES": "UAE",
        "CAN": "CAN", "CA": "CAN", "CANADA": "CAN",
        "AUS": "AUS", "AU": "AUS", "AUSTRALIA": "AUS",
        "SGP": "SGP", "SG": "SGP", "SINGAPORE": "SGP",
        "PH": "PH", "PHL": "PH", "PHILIPPINES": "PH",
        "MX": "MX", "MEX": "MX", "MEXICO": "MX",
    }
    return mapping.get(upper, upper)


def get_supported_corridors(
    from_country: Optional[str] = None,
    to_country: Optional[str] = None,
) -> List[Dict[str, Any]]:

    providers = list_providers()
    results = []

    norm_from = _normalize_country_code(from_country) if from_country else None
    norm_to = _normalize_country_code(to_country) if to_country else None

    for provider in providers:
        for corridor in provider.get("supported_corridors", []):
            try:
                sender, receiver = corridor.split("-")
            except ValueError:
                continue

            if norm_from and _normalize_country_code(sender) != norm_from:
                continue

            if norm_to and _normalize_country_code(receiver) != norm_to:
                continue

            results.append({
                "provider_id": provider["provider_id"],
                "provider_name": provider["provider_name"],
                "from": sender,
                "to": receiver,
            })

    return results


def get_payment_methods(provider_id: str):

    provider = get_provider_by_id(provider_id)

    if not provider:
        raise ValueError("Provider not found")

    return provider["payment_methods"]


def get_delivery_methods(provider_id: str):

    provider = get_provider_by_id(provider_id)

    if not provider:
        raise ValueError("Provider not found")

    return provider["payout_methods"]


def compare_providers(
    from_country: str,
    to_country: str,
) -> List[Dict[str, Any]]:

    providers = list_providers()
    norm_from = _normalize_country_code(from_country)
    norm_to = _normalize_country_code(to_country)

    matches = []

    for provider in providers:
        supported = False
        for corridor in provider.get("supported_corridors", []):
            try:
                s, r = corridor.split("-")
            except ValueError:
                continue
            if _normalize_country_code(s) == norm_from and _normalize_country_code(r) == norm_to:
                supported = True
                break

        if not supported:
            continue

        matches.append({
            "provider_id": provider["provider_id"],
            "provider_name": provider["provider_name"],
            "website": provider["website"],
            "payment_methods": provider["payment_methods"],
            "payout_methods": provider["payout_methods"],
            "delivery_speed": provider["delivery_speed"],
            "fee_model": provider["fee_model"],
            "tracking_available": provider["tracking_available"],
        })

    return matches