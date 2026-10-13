"""
RemitWise AI – Compliance Service
Compatible with the current compliance_rules.json
"""

import logging
from typing import Any, Dict, List, Optional

from config import settings
from utils.file_loader import load_json_file
from utils.validators import validate_country_code

logger = logging.getLogger(__name__)


def _load_rules() -> Dict[str, Dict[str, Any]]:
    """Load compliance rules."""

    data = load_json_file(settings.COMPLIANCE_FILE)

    if isinstance(data, dict):
        return data

    return {}


def _find_rule(country_code: str) -> Optional[Dict[str, Any]]:
    code = validate_country_code(country_code)

    rules = _load_rules()

    return rules.get(code)


def get_country_rules(country_code: str):

    rule = _find_rule(country_code)

    if not rule:
        logger.warning("Country %s not found", country_code)
        return None

    return rule


def get_required_documents(country_code: str):

    rule = _find_rule(country_code)

    if not rule:
        raise ValueError(f"No compliance data found for {country_code}")

    return rule.get("required_documents", [])


def get_kyc_requirements(country_code: str):

    rule = _find_rule(country_code)

    if not rule:
        raise ValueError(f"No compliance data found for {country_code}")

    return {
        "country": rule["country"],
        "currency": rule["currency"],
        "kyc_required": rule.get("kyc_required", False),
        "required_documents": rule.get("required_documents", []),
        "purpose_required": rule.get("purpose_required", False),
    }


def get_aml_requirements(country_code: str):

    rule = _find_rule(country_code)

    if not rule:
        raise ValueError(f"No compliance data found for {country_code}")

    return {
        "country": rule["country"],
        "currency": rule["currency"],
        "aml_check": rule.get("aml_check", False),
        "sanctions_screening": rule.get("sanctions_screening", False),
    }


def list_all_countries():

    rules = _load_rules()

    result = []

    for code, rule in rules.items():

        result.append({
            "country_code": code,
            "country": rule["country"],
            "currency": rule["currency"],
            "kyc_required": rule.get("kyc_required", False),
            "aml_check": rule.get("aml_check", False),
            "sanctions_screening": rule.get("sanctions_screening", False)
        })

    return result