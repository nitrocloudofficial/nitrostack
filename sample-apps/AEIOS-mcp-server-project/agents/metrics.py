from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Any, Dict, List, Optional


class AgentMetrics:
    """
    Enterprise Agent Metrics Engine.

    Responsibilities

        • Track task execution
        • Measure execution time
        • Calculate success rate
        • Monitor tool usage
        • Maintain execution history
    """

    def __init__(self) -> None:

        self.created_at = datetime.utcnow()

        self.tasks_started = 0
        self.tasks_completed = 0
        self.tasks_failed = 0

        self.tools_executed = 0

        self.messages_sent = 0
        self.messages_received = 0

        self.total_runtime = 0.0

        self.tool_usage: Counter[str] = Counter()

        self.execution_times: List[float] = []

    # --------------------------------------------------
    # Task Metrics
    # --------------------------------------------------

    def record_task_started(self) -> None:

        self.tasks_started += 1

    def record_task_completed(
        self,
        duration: float,
    ) -> None:

        self.tasks_completed += 1

        self.total_runtime += duration

        self.execution_times.append(duration)

    def record_task_failed(
        self,
        duration: float = 0.0,
    ) -> None:

        self.tasks_failed += 1

        self.total_runtime += duration

        if duration > 0:
            self.execution_times.append(duration)

    # --------------------------------------------------
    # Tool Metrics
    # --------------------------------------------------

    def record_tool_execution(
        self,
        tool_name: str,
    ) -> None:

        self.tools_executed += 1

        self.tool_usage[tool_name] += 1

    # --------------------------------------------------
    # Messaging Metrics
    # --------------------------------------------------

    def record_message_sent(self) -> None:

        self.messages_sent += 1

    def record_message_received(self) -> None:

        self.messages_received += 1

    # --------------------------------------------------
    # Derived Metrics
    # --------------------------------------------------

    @property
    def total_tasks(self) -> int:

        return (
            self.tasks_completed
            + self.tasks_failed
        )

    @property
    def success_rate(self) -> float:

        if self.total_tasks == 0:
            return 0.0

        return round(
            (
                self.tasks_completed
                / self.total_tasks
            )
            * 100,
            2,
        )

    @property
    def failure_rate(self) -> float:

        if self.total_tasks == 0:
            return 0.0

        return round(
            (
                self.tasks_failed
                / self.total_tasks
            )
            * 100,
            2,
        )

    @property
    def average_execution_time(
        self,
    ) -> float:

        if not self.execution_times:
            return 0.0

        return round(
            sum(self.execution_times)
            / len(self.execution_times),
            3,
        )

    @property
    def uptime_seconds(self) -> float:

        return round(
            (
                datetime.utcnow()
                - self.created_at
            ).total_seconds(),
            2,
        )

    # --------------------------------------------------
    # Reports
    # --------------------------------------------------

    def most_used_tools(
        self,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:

        return [
            {
                "tool": tool,
                "count": count,
            }
            for tool, count
            in self.tool_usage.most_common(limit)
        ]

    def statistics(self) -> Dict[str, Any]:

        return {
            "tasks_started": self.tasks_started,
            "tasks_completed": self.tasks_completed,
            "tasks_failed": self.tasks_failed,
            "total_tasks": self.total_tasks,
            "success_rate": self.success_rate,
            "failure_rate": self.failure_rate,
            "average_execution_time": (
                self.average_execution_time
            ),
            "total_runtime": round(
                self.total_runtime,
                3,
            ),
            "tools_executed": self.tools_executed,
            "messages_sent": self.messages_sent,
            "messages_received": (
                self.messages_received
            ),
            "uptime_seconds": (
                self.uptime_seconds
            ),
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "statistics": self.statistics(),
            "top_tools": self.most_used_tools(),
        }

    # --------------------------------------------------
    # Maintenance
    # --------------------------------------------------

    def reset(self) -> None:

        self.__init__()

    # --------------------------------------------------
    # Serialization
    # --------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:

        return {
            "created_at": (
                self.created_at.isoformat()
            ),
            "statistics": self.statistics(),
            "tool_usage": dict(
                self.tool_usage
            ),
            "execution_times": (
                self.execution_times
            ),
        }

    @classmethod
    def from_dict(
        cls,
        data: Dict[str, Any],
    ) -> "AgentMetrics":

        metrics = cls()

        stats = data.get(
            "statistics",
            {},
        )

        metrics.tasks_started = stats.get(
            "tasks_started",
            0,
        )

        metrics.tasks_completed = stats.get(
            "tasks_completed",
            0,
        )

        metrics.tasks_failed = stats.get(
            "tasks_failed",
            0,
        )

        metrics.tools_executed = stats.get(
            "tools_executed",
            0,
        )

        metrics.messages_sent = stats.get(
            "messages_sent",
            0,
        )

        metrics.messages_received = stats.get(
            "messages_received",
            0,
        )

        metrics.total_runtime = stats.get(
            "total_runtime",
            0.0,
        )

        metrics.execution_times = data.get(
            "execution_times",
            [],
        )

        metrics.tool_usage.update(
            data.get(
                "tool_usage",
                {},
            )
        )

        return metrics

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __len__(self):

        return self.total_tasks

    def __repr__(self):

        return (
            f"AgentMetrics("
            f"tasks={self.total_tasks}, "
            f"success_rate={self.success_rate}%)"
        )