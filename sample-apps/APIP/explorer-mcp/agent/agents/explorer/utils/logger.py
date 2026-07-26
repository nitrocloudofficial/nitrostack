"""Logging setup using loguru."""

import sys
from pathlib import Path
from loguru import logger

_configured = False


def setup_logger(log_dir: Path | None = None, log_level: str = "INFO") -> None:
    """Configure loguru logger for Explorer Agent."""
    global _configured
    if _configured:
        return

    logger.remove()
    logger.add(
        sys.stderr,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level:7}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        level=log_level.upper(),
        colorize=True,
    )

    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "explorer.log"
        logger.add(
            str(log_file),
            rotation="10 MB",
            retention="7 days",
            level="DEBUG",
            enqueue=True,
        )

    _configured = True


def get_logger():
    """Get loguru logger instance."""
    if not _configured:
        setup_logger()
    return logger
