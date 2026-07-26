from __future__ import annotations

import signal
import sys
from typing import Any, Dict

from kernel.bootstrap import Bootstrap
from shared.logger import get_logger

logger = get_logger(__name__)


class AEIOSApplication:

    def __init__(self, config: Dict[str, Any] | None = None) -> None:
        self.config = config or {}
        self.bootstrap = Bootstrap(self.config)
        self.kernel = None
        self._running = False

    def initialize(self) -> None:
        self.kernel = self.bootstrap.initialize()

    def start(self) -> None:
        if self.kernel is None:
            self.initialize()

        self.bootstrap.start()

        self._running = True

        logger.info("AEIOS-X started successfully.")

    def stop(self) -> None:
        if not self._running:
            return

        self.bootstrap.stop()

        self._running = False

        logger.info("AEIOS-X stopped.")

    def restart(self) -> None:
        logger.info("Restarting AEIOS-X")

        self.stop()

        self.start()

    def status(self) -> Dict[str, Any]:
        if self.kernel is None:
            return {
                "running": False,
            }

        return self.bootstrap.status()

    def diagnostics(self) -> Dict[str, Any]:
        if self.kernel is None:
            return {}

        return self.bootstrap.diagnostics()

    def run_task(
        self,
        task_name: str,
        payload: Dict[str, Any],
        priority: int = 5,
    ) -> Dict[str, Any]:
        if self.kernel is None:
            raise RuntimeError("Kernel is not initialized.")

        return self.kernel.run(
            task_name=task_name,
            payload=payload,
            priority=priority,
        )


app = AEIOSApplication()


def shutdown_handler(signum, frame):
    logger.info("Shutdown signal received.")
    app.stop()
    sys.exit(0)


def main() -> None:
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    app.start()

    logger.info("AEIOS-X Enterprise AI Kernel is running.")

    try:
        while True:
            signal.pause()
    except AttributeError:
        try:
            while True:
                pass
        except KeyboardInterrupt:
            shutdown_handler(None, None)


if __name__ == "__main__":
    main()