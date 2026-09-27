from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4


@dataclass
class AgentTask:
    """
    Represents a single executable task.
    """

    task_id: str = field(default_factory=lambda: str(uuid4()))
    name: str = ""
    description: str = ""
    priority: int = 1

    status: str = "PENDING"

    dependencies: List[str] = field(default_factory=list)

    metadata: Dict[str, Any] = field(default_factory=dict)

    created_at: str = field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )


class AgentPlanner:
    """
    Enterprise Planning Engine.

    Responsibilities

    • Goal decomposition
    • Task planning
    • Dependency tracking
    • Priority management
    • Execution ordering
    """

    def __init__(self):

        self._tasks: Dict[str, AgentTask] = {}

        self.goal: Optional[str] = None

    # --------------------------------------------------
    # Goal
    # --------------------------------------------------

    def set_goal(
        self,
        goal: str,
    ) -> None:

        self.goal = goal

    # --------------------------------------------------
    # Task Creation
    # --------------------------------------------------

    def add_task(
        self,
        name: str,
        description: str = "",
        priority: int = 1,
        dependencies: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AgentTask:

        task = AgentTask(
            name=name,
            description=description,
            priority=priority,
            dependencies=dependencies or [],
            metadata=metadata or {},
        )

        self._tasks[task.task_id] = task

        return task

    # --------------------------------------------------
    # Lookup
    # --------------------------------------------------

    def get_task(
        self,
        task_id: str,
    ) -> Optional[AgentTask]:

        return self._tasks.get(task_id)

    def list_tasks(self) -> List[AgentTask]:

        return list(self._tasks.values())

    # --------------------------------------------------
    # Status
    # --------------------------------------------------

    def update_status(
        self,
        task_id: str,
        status: str,
    ) -> bool:

        task = self.get_task(task_id)

        if task is None:
            return False

        task.status = status

        return True

    # --------------------------------------------------
    # Dependencies
    # --------------------------------------------------

    def ready_tasks(self) -> List[AgentTask]:

        ready = []

        for task in self._tasks.values():

            if task.status != "PENDING":
                continue

            completed = True

            for dependency in task.dependencies:

                dep = self.get_task(dependency)

                if dep is None:

                    completed = False
                    break

                if dep.status != "COMPLETED":

                    completed = False
                    break

            if completed:
                ready.append(task)

        ready.sort(
            key=lambda x: x.priority,
            reverse=True,
        )

        return ready

    # --------------------------------------------------
    # Planning
    # --------------------------------------------------

    def execution_plan(self) -> List[AgentTask]:

        return sorted(
            self._tasks.values(),
            key=lambda task: task.priority,
            reverse=True,
        )

    # --------------------------------------------------
    # Completion
    # --------------------------------------------------

    def completed(self) -> List[AgentTask]:

        return [
            task
            for task in self._tasks.values()
            if task.status == "COMPLETED"
        ]

    def pending(self) -> List[AgentTask]:

        return [
            task
            for task in self._tasks.values()
            if task.status == "PENDING"
        ]

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def statistics(self) -> Dict[str, Any]:

        return {
            "goal": self.goal,
            "tasks": len(self._tasks),
            "completed": len(self.completed()),
            "pending": len(self.pending()),
            "ready": len(self.ready_tasks()),
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "statistics": self.statistics(),
            "execution_order": [
                task.name
                for task in self.execution_plan()
            ],
        }

    # --------------------------------------------------
    # Reset
    # --------------------------------------------------

    def clear(self) -> None:

        self.goal = None
        self._tasks.clear()

    # --------------------------------------------------
    # Serialization
    # --------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:

        return {
            "goal": self.goal,
            "tasks": [
                task.__dict__
                for task in self.execution_plan()
            ],
        }

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __len__(self):

        return len(self._tasks)

    def __repr__(self):

        return (
            f"AgentPlanner("
            f"goal={self.goal}, "
            f"tasks={len(self)})"
        )