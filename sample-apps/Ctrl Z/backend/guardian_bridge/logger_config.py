import logging
import sys
from logging.handlers import RotatingFileHandler

from config import (
    DEBUG,
    LOG_BACKUP_COUNT,
    LOG_FILE,
    LOG_LEVEL,
    LOG_MAX_BYTES,
)

_CONSOLE_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
_FILE_FORMAT = (
    "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    " (%(filename)s:%(lineno)d)"
)

_resolved_levels: dict[str, int] = {}


def _resolve_level(name: str = "guardian_bridge") -> int:
    """Resolve the effective log level once per module name."""
    if name not in _resolved_levels:
        if LOG_LEVEL in ("DEBUG", "INFO", "WARNING", "WARN", "ERROR", "CRITICAL"):
            level = getattr(logging, LOG_LEVEL, logging.INFO)
        else:
            level = logging.DEBUG if DEBUG else logging.INFO
        _resolved_levels[name] = level
    return _resolved_levels[name]


def setup_logging(name: str = "guardian_bridge") -> logging.Logger:
    logger = logging.getLogger(name)

    if logger.handlers:
        return logger

    level = _resolve_level(name)
    logger.setLevel(level)
    logger.propagate = False

    formatter = logging.Formatter(_CONSOLE_FORMAT, datefmt="%Y-%m-%d %H:%M:%S")

    console = logging.StreamHandler(sys.stdout)
    console.setLevel(level)
    console.setFormatter(formatter)
    logger.addHandler(console)

    if LOG_FILE:
        file_formatter = logging.Formatter(_FILE_FORMAT, datefmt="%Y-%m-%d %H:%M:%S")
        file_handler = RotatingFileHandler(
            LOG_FILE,
            maxBytes=LOG_MAX_BYTES,
            backupCount=LOG_BACKUP_COUNT,
            encoding="utf-8",
        )
        file_handler.setLevel(level)
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)

    return logger
