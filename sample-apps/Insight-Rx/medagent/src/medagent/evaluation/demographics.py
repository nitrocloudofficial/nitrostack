"""
Shared demographic bucketing for Phase 1 clinical validation -- used by
both dataset_split.py (stratifying the locked split) and stratified.py
(reporting subgroup metrics on model predictions). Kept in one place
deliberately: if the age bands used to *split* the data ever drifted
from the bands used to *report* on it, subgroup metrics would silently
stop meaning what the split was actually stratified on.
"""
from __future__ import annotations

from typing import Callable

# Clinically conventional age bands, not evenly-spaced bins -- chosen to
# separate pediatric, adult, and older-adult populations, since CXR
# presentation and finding prevalence genuinely differ across these
# groups rather than by an arbitrary decade cut.
AGE_BANDS: list[tuple[str, Callable[[int], bool]]] = [
    ("0-17", lambda age: age < 18),
    ("18-39", lambda age: 18 <= age < 40),
    ("40-64", lambda age: 40 <= age < 65),
    ("65+", lambda age: age >= 65),
]

VALID_SEX_VALUES = ("M", "F", "O")
VALID_VIEW_POSITIONS = ("PA", "AP")


def age_band(age: int) -> str:
    for label, predicate in AGE_BANDS:
        if predicate(age):
            return label
    return "unknown"
