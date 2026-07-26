"""Helper functions for Release Intelligence Agent."""

import json
from typing import Any, Dict


def sanitize_text(text: str) -> str:
    """Sanitize and clean user or LLM input text."""
    if not text:
        return ""
    return text.strip()


def format_json(data: Dict[str, Any], indent: int = 2) -> str:
    """Format dictionary as readable JSON string."""
    return json.dumps(data, indent=indent, default=str)


def compute_dict_diff(old_dict: Dict[str, Any], new_dict: Dict[str, Any]) -> Dict[str, Any]:
    """Compute key-level differences between two dictionaries."""
    added = {k: v for k, v in new_dict.items() if k not in old_dict}
    removed = {k: v for k, v in old_dict.items() if k not in new_dict}
    modified = {
        k: {"old": old_dict[k], "new": new_dict[k]}
        for k in old_dict
        if k in new_dict and old_dict[k] != new_dict[k]
    }
    return {
        "added": added,
        "removed": removed,
        "modified": modified
    }
