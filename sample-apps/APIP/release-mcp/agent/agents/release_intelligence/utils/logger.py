"""Logging setup for Release Intelligence Agent using loguru."""

import sys
from loguru import logger

# Configure loguru logger for the release intelligence package
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level:<8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO",
)

__all__ = ["logger"]
