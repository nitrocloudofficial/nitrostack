"""Combo-space enumeration and perturbation utilities.

Generates every subset of proxy fields (power-set, size 1..N) and applies
them as a single neutral-value substitution to an application dict.

All three functions are pure — no side effects, deterministic, safe to call
from any thread / async context.
"""
import itertools


def generate_combos(proxy_fields: list[str]) -> list[tuple[str, ...]]:
    """Return all non-empty subsets of proxy_fields as sorted tuples.

    Args:
        proxy_fields: List of field names classified as proxy-sensitive.

    Returns:
        List of tuples, one per subset, ordered by size then lexicographically.
        An empty input returns an empty list.

    Example:
        >>> generate_combos(["zip_code", "applicant_name"])
        [("applicant_name",), ("zip_code",), ("applicant_name", "zip_code")]
    """
    combos: list[tuple[str, ...]] = []
    for r in range(1, len(proxy_fields) + 1):
        combos.extend(itertools.combinations(sorted(proxy_fields), r))
    return combos


def combo_key(combo: tuple[str, ...]) -> str:
    """Canonical string key for a combo tuple.

    Sorts the fields so (zip_code, applicant_name) and
    (applicant_name, zip_code) hash to the same key.

    Args:
        combo: Tuple of field name strings.

    Returns:
        Plus-joined, alphabetically sorted key, e.g. "applicant_name+zip_code".
    """
    return "+".join(sorted(combo))


def apply_combo(application: dict, combo: tuple[str, ...], neutral_value: str) -> dict:
    """Return a copy of application with each field in combo set to neutral_value.

    Args:
        application:   Original applicant dict.  Not mutated.
        combo:         Fields to redact.
        neutral_value: Replacement value (e.g. "REDACTED").

    Returns:
        New dict with the specified fields overwritten.
    """
    perturbed = dict(application)
    for field in combo:
        perturbed[field] = neutral_value
    return perturbed
