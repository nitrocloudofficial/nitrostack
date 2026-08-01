"""
File I/O helpers used across the pipeline to read prompt templates,
parse YAML configs, and persist JSON outputs (audit entries, case
snapshots, evaluation results).
"""
from __future__ import annotations

import json
from pathlib import Path
import yaml

def load_text(file_path: str | Path) -> str:
    """
    Reads a UTF-8 text file (prompt templates, etc.) and returns its
    contents as a string. Raises FileNotFoundError with a clear message
    if the path does not exist, rather than letting a bare OSError
    surface from deep inside a prompt-loading call site.
    """
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"Text file not found: {path}")
    return path.read_text(encoding="utf-8")

def load_yaml(file_path: str | Path) -> dict:
    """
    Parses a YAML config file into a dict using yaml.safe_load -- never
    yaml.load, which can execute arbitrary Python objects embedded in an
    untrusted file. Raises FileNotFoundError if missing, and ValueError
    if the file does not parse to a mapping (a list or scalar at the top
    level is almost certainly a misconfigured file, not a valid config).
    """
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"YAML file not found: {path}")

    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if data is None:
        return {}
    if not isinstance(data, dict):
        raise ValueError(
            f"Expected a YAML mapping at top level in {path}, got {type(data).__name__}"
        )
    return data

def save_json(data: dict, file_path: str | Path) -> None:
    """
    Writes data to file_path as indented JSON, creating parent
    directories if needed. default=str prevents a save from crashing
    on non-JSON-native values (e.g. datetime, Path) by falling back to
    their string representation rather than raising.
    """
    path = Path(file_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, default=str)