from __future__ import annotations

import os
from typing import Any, Dict

from dotenv import load_dotenv

from shared.logger import get_logger
from kernel.kernel import EnterpriseKernel

load_dotenv()

logger = get_logger(__name__)


class Bootstrap:
    def __init__(self, config: Dict[str, Any] | None = None) -> None:
        self.config = config or {}
        self.kernel = EnterpriseKernel()

    def validate_dependencies(self) -> Dict[str, bool]:
        checks: Dict[str, bool] = {}
        checks["groq_api_key"] = bool(os.getenv("GROQ_API_KEY"))
        checks["groq_model"] = bool(os.getenv("GROQ_MODEL"))
        return checks

    def initialize(self) -> EnterpriseKernel:
        logger.info("Bootstrapping AEIOS-X Enterprise Kernel...")

        deps = self.validate_dependencies()
        for name, ok in deps.items():
            status = "OK" if ok else "MISSING"
            logger.info("  [%s] %s", status, name)

        if not deps.get("groq_api_key"):
            logger.warning("GROQ_API_KEY is not configured — LLM features will be unavailable")

        return self.kernel

    def start(self) -> EnterpriseKernel:
        if not self.kernel.is_running():
            self.initialize()
            self.kernel.start()
        return self.kernel

    def stop(self) -> None:
        self.kernel.stop()

    def status(self) -> Dict[str, Any]:
        return {
            "running": self.kernel.is_running(),
            "version": EnterpriseKernel.VERSION,
            "dependencies": self.validate_dependencies(),
        }

    def diagnostics(self) -> Dict[str, Any]:
        return {
            "kernel": self.kernel.kernel_info(),
            "dependencies": self.validate_dependencies(),
        }
