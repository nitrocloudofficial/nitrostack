from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from agents.state import AgentState, AgentStatus


class AgentLifecycle:
    """
    Enterprise Agent Lifecycle Manager.

    Responsible for:
        • Lifecycle transitions
        • Transition validation
        • Lifecycle timestamps
        • Runtime tracking
        • Lifecycle diagnostics
    """

    VALID_TRANSITIONS = {
        AgentStatus.CREATED: {
            AgentStatus.INITIALIZING,
        },

        AgentStatus.INITIALIZING: {
            AgentStatus.READY,
            AgentStatus.FAILED,
        },

        AgentStatus.READY: {
            AgentStatus.RUNNING,
            AgentStatus.STOPPED,
        },

        AgentStatus.RUNNING: {
            AgentStatus.PAUSED,
            AgentStatus.WAITING,
            AgentStatus.COMPLETED,
            AgentStatus.FAILED,
            AgentStatus.STOPPED,
        },

        AgentStatus.PAUSED: {
            AgentStatus.RUNNING,
            AgentStatus.STOPPED,
        },

        AgentStatus.WAITING: {
            AgentStatus.RUNNING,
            AgentStatus.STOPPED,
            AgentStatus.FAILED,
        },

        AgentStatus.COMPLETED: {
            AgentStatus.READY,
            AgentStatus.STOPPED,
        },

        AgentStatus.FAILED: {
            AgentStatus.READY,
            AgentStatus.STOPPED,
        },

        AgentStatus.STOPPED: set(),
    }

    def __init__(self, state: AgentState):

        self.state = state

        self.started_at: Optional[datetime] = None
        self.finished_at: Optional[datetime] = None

        self.transition_log: List[Dict[str, Any]] = []

    # --------------------------------------------------
    # Validation
    # --------------------------------------------------

    def can_transition(
        self,
        target: AgentStatus,
    ) -> bool:

        current = AgentStatus(self.state.status())

        return target in self.VALID_TRANSITIONS[current]

    # --------------------------------------------------
    # Internal Transition
    # --------------------------------------------------

    def transition(
        self,
        target: AgentStatus,
    ) -> bool:

        if not self.can_transition(target):
            return False

        previous = self.state.status()

        if target == AgentStatus.INITIALIZING:
            self.state.initialize()

        elif target == AgentStatus.RUNNING:

            if self.started_at is None:
                self.started_at = datetime.utcnow()

            self.state.start()

        elif target == AgentStatus.PAUSED:
            self.state.pause()

        elif target == AgentStatus.WAITING:
            self.state.wait()

        elif target == AgentStatus.COMPLETED:

            self.finished_at = datetime.utcnow()

            self.state.complete()

        elif target == AgentStatus.STOPPED:

            self.finished_at = datetime.utcnow()

            self.state.stop()

        elif target == AgentStatus.FAILED:

            self.finished_at = datetime.utcnow()

            self.state.fail("Lifecycle Failure")

        elif target == AgentStatus.READY:

            self.state.reset()
            self.state.initialize()

        self.transition_log.append(
            {
                "from": previous,
                "to": self.state.status(),
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        return True

    # --------------------------------------------------
    # Runtime
    # --------------------------------------------------

    def runtime_seconds(self) -> Optional[float]:

        if self.started_at is None:
            return None

        end = self.finished_at or datetime.utcnow()

        return (end - self.started_at).total_seconds()

    # --------------------------------------------------
    # Helpers
    # --------------------------------------------------

    def current_status(self) -> str:

        return self.state.status()

    def is_active(self) -> bool:

        return self.current_status() in (
            AgentStatus.RUNNING.value,
            AgentStatus.WAITING.value,
            AgentStatus.PAUSED.value,
        )

    def is_finished(self) -> bool:

        return self.current_status() in (
            AgentStatus.COMPLETED.value,
            AgentStatus.FAILED.value,
            AgentStatus.STOPPED.value,
        )

    # --------------------------------------------------
    # History
    # --------------------------------------------------

    def history(self) -> List[Dict[str, Any]]:

        return list(self.transition_log)

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "status": self.current_status(),
            "started_at": (
                self.started_at.isoformat()
                if self.started_at
                else None
            ),
            "finished_at": (
                self.finished_at.isoformat()
                if self.finished_at
                else None
            ),
            "runtime_seconds": self.runtime_seconds(),
            "transition_count": len(self.transition_log),
        }

    # --------------------------------------------------
    # Serialization
    # --------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:

        return {
            "status": self.current_status(),
            "started_at": (
                self.started_at.isoformat()
                if self.started_at
                else None
            ),
            "finished_at": (
                self.finished_at.isoformat()
                if self.finished_at
                else None
            ),
            "runtime_seconds": self.runtime_seconds(),
            "history": self.transition_log,
        }

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __repr__(self):

        return (
            f"AgentLifecycle("
            f"status={self.current_status()}, "
            f"runtime={self.runtime_seconds()})"
        )