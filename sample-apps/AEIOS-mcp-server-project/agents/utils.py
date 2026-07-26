from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional
from uuid import uuid4


# --------------------------------------------------
# IDs
# --------------------------------------------------

def generate_agent_id() -> str:
    """Generate a unique agent identifier."""
    return str(uuid4())


def generate_task_id() -> str:
    """Generate a unique task identifier."""
    return str(uuid4())


def utc_now() -> datetime:
    """Return current UTC datetime."""
    return datetime.utcnow()


def utc_now_iso() -> str:
    """Return current UTC timestamp."""
    return utc_now().isoformat()


# --------------------------------------------------
# Dictionaries
# --------------------------------------------------

def merge_dicts(
    *dictionaries: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Merge multiple dictionaries.
    """

    merged: Dict[str, Any] = {}

    for dictionary in dictionaries:
        merged.update(dictionary)

    return merged


def remove_none(
    data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Remove None values.
    """

    return {
        key: value
        for key, value in data.items()
        if value is not None
    }


# --------------------------------------------------
# Collections
# --------------------------------------------------

def chunk(
    items: List[Any],
    size: int,
) -> List[List[Any]]:
    """
    Split list into chunks.
    """

    if size <= 0:
        raise ValueError(
            "Chunk size must be greater than zero."
        )

    return [
        items[i:i + size]
        for i in range(
            0,
            len(items),
            size,
        )
    ]


def flatten(
    nested: Iterable[Iterable[Any]],
) -> List[Any]:
    """
    Flatten nested lists.
    """

    return [
        item
        for collection in nested
        for item in collection
    ]


# --------------------------------------------------
# Search
# --------------------------------------------------

def find_by_name(
    collection: Iterable[Any],
    name: str,
) -> Optional[Any]:
    """
    Find object by 'name' attribute.
    """

    for item in collection:

        if getattr(item, "name", None) == name:
            return item

    return None


# --------------------------------------------------
# Statistics
# --------------------------------------------------

def percentage(
    numerator: int,
    denominator: int,
) -> float:
    """
    Safe percentage calculation.
    """

    if denominator == 0:
        return 0.0

    return round(
        (numerator / denominator) * 100,
        2,
    )


def average(
    values: List[float],
) -> float:
    """
    Calculate average value.
    """

    if not values:
        return 0.0

    return round(
        sum(values) / len(values),
        3,
    )


# --------------------------------------------------
# Serialization
# --------------------------------------------------

def serialize_datetime(
    value: datetime,
) -> str:
    return value.isoformat()


def deserialize_datetime(
    value: str,
) -> datetime:
    return datetime.fromisoformat(value)


# --------------------------------------------------
# Diagnostics
# --------------------------------------------------

def build_statistics(
    **kwargs,
) -> Dict[str, Any]:
    """
    Build statistics dictionary.
    """

    return dict(kwargs)


def build_diagnostics(
    statistics: Dict[str, Any],
    **kwargs,
) -> Dict[str, Any]:
    """
    Build diagnostics dictionary.
    """

    diagnostics = {
        "statistics": statistics,
    }

    diagnostics.update(kwargs)

    return diagnostics