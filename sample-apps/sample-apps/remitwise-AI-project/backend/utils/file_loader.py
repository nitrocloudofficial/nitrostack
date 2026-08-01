"""
RemitWise AI – Utility: File Loader
=====================================
Thread-safe, cached JSON file reader.
All services that need local data should use ``load_json_file`` from here.
"""

import json
import logging
import os
from functools import lru_cache
from typing import Any, Dict, List, Union

logger = logging.getLogger(__name__)


@lru_cache(maxsize=16)
def load_json_file(file_path: str) -> Union[Dict[str, Any], List[Any]]:
    """
    Load a JSON file from disk and cache the result in memory.

    The cache is keyed on the *absolute* path so relative-path variations
    don't cause duplicate reads.  Call ``load_json_file.cache_clear()`` in
    tests or wherever you need a fresh read.

    Parameters
    ----------
    file_path:
        Absolute or relative path to the JSON file.

    Returns
    -------
    dict | list
        Parsed JSON content.

    Raises
    ------
    FileNotFoundError
        When the file does not exist at the given path.
    json.JSONDecodeError
        When the file content is not valid JSON.
    """
    abs_path = os.path.abspath(file_path)

    if not os.path.exists(abs_path):
        logger.error("JSON file not found: %s", abs_path)
        raise FileNotFoundError(f"Data file not found: {abs_path}")

    logger.debug("Loading JSON file: %s", abs_path)
    with open(abs_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    logger.info("Successfully loaded JSON file: %s (%d top-level keys/items)",
                abs_path, len(data))
    return data


def reload_json_file(file_path: str) -> Union[Dict[str, Any], List[Any]]:
    """
    Force a cache-bust and reload the JSON file from disk.

    Useful for hot-reloading data without restarting the server.

    Parameters
    ----------
    file_path:
        Path to the JSON file (same value passed to ``load_json_file``).

    Returns
    -------
    dict | list
        Freshly parsed JSON content.
    """
    load_json_file.cache_clear()
    logger.info("Cache cleared. Reloading: %s", file_path)
    return load_json_file(file_path)
