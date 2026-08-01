"""
Standardized logging configuration for the clinical decision pipeline.
Called once at process startup (Streamlit app, CLI scripts, tests) so
every module's logger shares one consistent, readable format.
"""
from __future__ import annotations

import logging
import sys

def setup_logging(level: int = logging.INFO) -> None:
    """
    Configures the root logger to write structured, timestamped output
    to stdout. Idempotent -- safe to call multiple times (e.g. once from
    the Streamlit entrypoint and once from a script) without duplicating
    handlers or log lines.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    if root_logger.handlers:
        return

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    root_logger.addHandler(handler)