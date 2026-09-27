import queue
import threading
import time
from dataclasses import dataclass, field

from logger_config import setup_logging

logger = setup_logging(__name__)


@dataclass
class HealthMetrics:
    packets_read: int = 0
    packets_parsed: int = 0
    packets_written: int = 0
    packets_sent: int = 0
    parse_errors: int = 0
    validation_errors: int = 0
    http_errors: int = 0
    raw_queue_drops: int = 0
    packet_queue_drops: int = 0
    serial_reconnects: int = 0
    started_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        elapsed = max(time.time() - self.started_at, 0.001)
        return {
            "uptime_seconds": round(elapsed, 1),
            "packets_read": self.packets_read,
            "packets_parsed": self.packets_parsed,
            "packets_written": self.packets_written,
            "packets_sent": self.packets_sent,
            "parse_errors": self.parse_errors,
            "validation_errors": self.validation_errors,
            "http_errors": self.http_errors,
            "raw_queue_drops": self.raw_queue_drops,
            "packet_queue_drops": self.packet_queue_drops,
            "serial_reconnects": self.serial_reconnects,
            "read_rate": round(self.packets_read / elapsed, 2),
            "parse_rate": round(self.packets_parsed / elapsed, 2),
        }


class MetricsTracker:
    """Thread-safe wrapper around HealthMetrics."""

    def __init__(self):
        self._metrics = HealthMetrics()
        self._lock = threading.Lock()

    def increment(self, field_name: str, amount: int = 1) -> None:
        with self._lock:
            current = getattr(self._metrics, field_name, 0)
            setattr(self._metrics, field_name, current + amount)

    def snapshot(self) -> dict:
        with self._lock:
            return self._metrics.to_dict()


class DropAwareQueue:
    """Bounded queue that tracks drops when full."""

    def __init__(
        self,
        maxsize: int,
        metrics: MetricsTracker,
        drop_field: str,
    ):
        self._queue: queue.Queue = queue.Queue(maxsize=maxsize)
        self._metrics = metrics
        self._drop_field = drop_field

    def put(self, item, block: bool = True, timeout: float | None = None) -> bool:
        try:
            self._queue.put(item, block=block, timeout=timeout)
            return True
        except queue.Full:
            self._metrics.increment(self._drop_field)
            return False

    def get(self, block: bool = True, timeout: float | None = None):
        return self._queue.get(block=block, timeout=timeout)

    def qsize(self) -> int:
        return self._queue.qsize()

    def task_done(self) -> None:
        self._queue.task_done()
