import json
import threading
import time
from pathlib import Path

from config import WRITE_BATCH_SIZE, WRITE_FLUSH_INTERVAL
from logger_config import setup_logging

logger = setup_logging(__name__)


class DatasetWriter:
    """Buffered, thread-safe JSONL writer."""

    def __init__(self, output_path: str):
        self.output_path = Path(output_path)
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        self._file = open(self.output_path, "a", buffering=8192)
        self._lock = threading.Lock()
        self._batch: list[dict] = []
        self._last_flush = time.time()
        logger.info("Dataset writer opened: %s", self.output_path)

    def save(self, packet: dict) -> None:
        self.save_batch([packet])

    def save_batch(self, packets: list[dict]) -> None:
        if not packets:
            return

        with self._lock:
            self._batch.extend(packets)
            should_flush = (
                len(self._batch) >= WRITE_BATCH_SIZE
                or (time.time() - self._last_flush) >= WRITE_FLUSH_INTERVAL
            )
            if should_flush:
                self._flush_locked()

    def flush(self) -> None:
        with self._lock:
            self._flush_locked()

    def _flush_locked(self) -> None:
        if not self._batch:
            return
        lines = "".join(json.dumps(p) + "\n" for p in self._batch)
        self._file.write(lines)
        self._file.flush()
        logger.debug("Flushed %d packets to disk", len(self._batch))
        self._batch.clear()
        self._last_flush = time.time()

    def close(self) -> None:
        with self._lock:
            self._flush_locked()
            self._file.close()
        logger.info("Dataset writer closed")
