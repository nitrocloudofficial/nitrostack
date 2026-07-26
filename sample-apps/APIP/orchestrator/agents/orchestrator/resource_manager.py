import os
import sys
import threading
from typing import Dict, Any

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

class ResourceManager:
    """
    Monitors system resource usage (CPU, Memory, Active Task Slots).
    Used by the Scheduler to dynamically adjust execution throughput.
    """
    def __init__(self, max_cpu_percent: float = 90.0, max_memory_percent: float = 90.0):
        self.max_cpu_percent = max_cpu_percent
        self.max_memory_percent = max_memory_percent
        self._lock = threading.Lock()

    def get_metrics(self) -> Dict[str, Any]:
        with self._lock:
            if HAS_PSUTIL:
                cpu_percent = psutil.cpu_percent(interval=None)
                mem = psutil.virtual_memory()
                memory_percent = mem.percent
                available_mb = mem.available / (1024 * 1024)
            else:
                cpu_percent = 0.0  # Fallback
                memory_percent = 0.0
                available_mb = 4096.0

            return {
                "cpu_percent": cpu_percent,
                "memory_percent": memory_percent,
                "available_memory_mb": available_mb,
                "is_overloaded": cpu_percent > self.max_cpu_percent or memory_percent > self.max_memory_percent
            }

    def is_resource_available(self) -> bool:
        metrics = self.get_metrics()
        return not metrics["is_overloaded"]
