import threading
from typing import Dict, Any

class ConcurrencyController:
    """
    Manages per-agent concurrency limits safely.
    Enforces overload protection without rejecting requests or blocking other agents.
    
    Default Configured Limits:
      Explorer = 5
      Knowledge = 10
      Documentation = 10
      QA = 4
      Demo = 2
      Release = 5
    """
    DEFAULT_LIMITS = {
        "explorer": 5,
        "knowledge_graph": 10,
        "documentation": 10,
        "qa": 4,
        "demo": 2,
        "release": 5
    }

    def __init__(self, custom_limits: Dict[str, int] = None):
        self._lock = threading.Lock()
        self.limits: Dict[str, int] = dict(self.DEFAULT_LIMITS)
        if custom_limits:
            self.limits.update(custom_limits)
            
        self.active_counts: Dict[str, int] = {agent: 0 for agent in self.limits}

    def can_acquire(self, agent_name: str) -> bool:
        with self._lock:
            max_limit = self.limits.get(agent_name, 5)
            current_active = self.active_counts.get(agent_name, 0)
            return current_active < max_limit

    def acquire(self, agent_name: str) -> bool:
        """
        Attempts to acquire a slot for the agent. Returns True if acquired.
        """
        with self._lock:
            max_limit = self.limits.get(agent_name, 5)
            current_active = self.active_counts.get(agent_name, 0)
            if current_active < max_limit:
                self.active_counts[agent_name] = current_active + 1
                return True
            return False

    def release(self, agent_name: str):
        """
        Releases a slot for the agent.
        """
        with self._lock:
            if agent_name in self.active_counts and self.active_counts[agent_name] > 0:
                self.active_counts[agent_name] -= 1

    def set_limit(self, agent_name: str, limit: int):
        with self._lock:
            self.limits[agent_name] = max(1, limit)
            if agent_name not in self.active_counts:
                self.active_counts[agent_name] = 0

    def get_status(self) -> Dict[str, Dict[str, int]]:
        with self._lock:
            status = {}
            for agent, limit in self.limits.items():
                active = self.active_counts.get(agent, 0)
                status[agent] = {
                    "active": active,
                    "limit": limit,
                    "available": max(0, limit - active)
                }
            return status
