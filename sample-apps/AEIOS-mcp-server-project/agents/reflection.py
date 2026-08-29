from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional


class ReflectionRecord:
    """
    Represents a single reflection entry generated after task execution.
    """

    def __init__(
        self,
        task_id: str,
        success: bool,
        result: Any = None,
        error: Optional[str] = None,
    ) -> None:

        self.task_id = task_id
        self.success = success
        self.result = result
        self.error = error

        self.feedback: str = ""
        self.recommendations: List[str] = []

        self.timestamp = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:

        return {
            "task_id": self.task_id,
            "success": self.success,
            "result": self.result,
            "error": self.error,
            "feedback": self.feedback,
            "recommendations": self.recommendations,
            "timestamp": self.timestamp.isoformat(),
        }


class AgentReflection:
    """
    Enterprise Reflection Engine.

    Responsibilities

        • Analyze task executions
        • Record failures
        • Suggest improvements
        • Build execution knowledge
        • Produce reflection reports
    """

    def __init__(self):

        self._records: List[ReflectionRecord] = []

    # --------------------------------------------------
    # Reflection
    # --------------------------------------------------

    def reflect(
        self,
        execution: Dict[str, Any],
    ) -> ReflectionRecord:

        record = ReflectionRecord(
            task_id=execution["task_id"],
            success=execution["success"],
            result=execution.get("result"),
            error=execution.get("error"),
        )

        if record.success:

            record.feedback = (
                "Execution completed successfully."
            )

            record.recommendations.append(
                "Reuse this execution strategy."
            )

        else:

            record.feedback = (
                "Execution failed."
            )

            record.recommendations.extend(
                [
                    "Review tool inputs.",
                    "Check MCP server availability.",
                    "Retry execution if appropriate.",
                ]
            )

        self._records.append(record)

        return record

    # --------------------------------------------------
    # Retrieval
    # --------------------------------------------------

    def latest(self) -> Optional[ReflectionRecord]:

        if not self._records:
            return None

        return self._records[-1]

    def history(self) -> List[ReflectionRecord]:

        return list(self._records)

    def failures(self) -> List[ReflectionRecord]:

        return [
            item
            for item in self._records
            if not item.success
        ]

    def successes(self) -> List[ReflectionRecord]:

        return [
            item
            for item in self._records
            if item.success
        ]

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def statistics(self) -> Dict[str, Any]:

        total = len(self._records)

        successful = len(self.successes())

        failed = len(self.failures())

        success_rate = (
            (successful / total) * 100
            if total
            else 0.0
        )

        return {
            "total_reflections": total,
            "successful": successful,
            "failed": failed,
            "success_rate": round(success_rate, 2),
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        latest = self.latest()

        return {
            "statistics": self.statistics(),
            "latest": (
                latest.to_dict()
                if latest
                else None
            ),
        }

    # --------------------------------------------------
    # Maintenance
    # --------------------------------------------------

    def clear(self) -> None:

        self._records.clear()

    # --------------------------------------------------
    # Serialization
    # --------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:

        return {
            "reflections": [
                record.to_dict()
                for record in self._records
            ]
        }

    @classmethod
    def from_dict(
        cls,
        data: Dict[str, Any],
    ) -> "AgentReflection":

        reflection = cls()

        for item in data.get("reflections", []):

            record = ReflectionRecord(
                task_id=item["task_id"],
                success=item["success"],
                result=item.get("result"),
                error=item.get("error"),
            )

            record.feedback = item.get(
                "feedback",
                "",
            )

            record.recommendations = item.get(
                "recommendations",
                [],
            )

            reflection._records.append(record)

        return reflection

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __len__(self):

        return len(self._records)

    def __repr__(self):

        return (
            f"AgentReflection("
            f"records={len(self)})"
        )