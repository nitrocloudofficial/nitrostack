from __future__ import annotations

from enum import Enum
from datetime import datetime
from typing import Any, Dict, List, Optional


class AgentStatus(str, Enum):
    """
    Valid lifecycle states for an enterprise agent.
    """

    CREATED = "CREATED"
    INITIALIZING = "INITIALIZING"
    READY = "READY"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    WAITING = "WAITING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    STOPPED = "STOPPED"


class AgentState:
    """
    Tracks an agent's lifecycle state and state history.
    """

    def __init__(self) -> None:

        self._status = AgentStatus.CREATED

        self.created_at = datetime.utcnow()
        self.updated_at = self.created_at

        self.current_task: Optional[str] = None

        self.error: Optional[str] = None

        self.history: List[Dict[str, Any]] = []

        self._record(self._status)

    # --------------------------------------------------
    # Internal
    # --------------------------------------------------

    def _record(
        self,
        status: AgentStatus,
    ) -> None:

        self.updated_at = datetime.utcnow()

        self.history.append(
            {
                "status": status.value,
                "timestamp": self.updated_at.isoformat(),
            }
        )

    def _transition(
        self,
        status: AgentStatus,
    ) -> None:

        self._status = status
        self._record(status)

    # --------------------------------------------------
    # Lifecycle
    # --------------------------------------------------

    def initialize(self) -> None:

        self._transition(AgentStatus.INITIALIZING)
        self._transition(AgentStatus.READY)

    def start(self) -> None:

        self._transition(AgentStatus.RUNNING)

    def pause(self) -> None:

        self._transition(AgentStatus.PAUSED)

    def resume(self) -> None:

        self._transition(AgentStatus.RUNNING)

    def wait(self) -> None:

        self._transition(AgentStatus.WAITING)

    def complete(self) -> None:

        self._transition(AgentStatus.COMPLETED)

    def stop(self) -> None:

        self._transition(AgentStatus.STOPPED)

    def fail(
        self,
        message: str,
    ) -> None:

        self.error = message

        self._transition(AgentStatus.FAILED)

    def reset(self) -> None:

        self.error = None
        self.current_task = None

        self._transition(AgentStatus.CREATED)

    # --------------------------------------------------
    # Task Tracking
    # --------------------------------------------------

    def assign_task(
        self,
        task: str,
    ) -> None:

        self.current_task = task

    def clear_task(self) -> None:

        self.current_task = None

    # --------------------------------------------------
    # Status Checks
    # --------------------------------------------------

    def status(self) -> str:

        return self._status.value

    def is_created(self) -> bool:

        return self._status == AgentStatus.CREATED

    def is_ready(self) -> bool:

        return self._status == AgentStatus.READY

    def is_running(self) -> bool:

        return self._status == AgentStatus.RUNNING

    def is_paused(self) -> bool:

        return self._status == AgentStatus.PAUSED

    def is_waiting(self) -> bool:

        return self._status == AgentStatus.WAITING

    def is_completed(self) -> bool:

        return self._status == AgentStatus.COMPLETED

    def is_failed(self) -> bool:

        return self._status == AgentStatus.FAILED

    def is_stopped(self) -> bool:

        return self._status == AgentStatus.STOPPED

    # --------------------------------------------------
    # History
    # --------------------------------------------------

    def last_transition(self) -> Optional[Dict[str, Any]]:

        if not self.history:
            return None

        return self.history[-1]

    def transitions(self) -> List[Dict[str, Any]]:

        return list(self.history)

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "status": self.status(),
            "current_task": self.current_task,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "transitions": len(self.history),
        }

    # --------------------------------------------------
    # Serialization
    # --------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:

        return {
            "status": self.status(),
            "current_task": self.current_task,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "history": self.history,
        }

    @classmethod
    def from_dict(
        cls,
        data: Dict[str, Any],
    ) -> "AgentState":

        state = cls()

        state._status = AgentStatus(
            data.get("status", AgentStatus.CREATED.value)
        )

        state.current_task = data.get("current_task")
        state.error = data.get("error")

        state.history = data.get("history", [])

        return state

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __str__(self) -> str:

        return self.status()

    def __repr__(self) -> str:

        return (
            f"AgentState("
            f"status={self.status()}, "
            f"task={self.current_task})"
        )