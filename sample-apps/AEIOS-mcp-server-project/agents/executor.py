from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from agents.planner import AgentPlanner, AgentTask
from mcp.client import MCPClient
from mcp.executor import MCPExecutor


class AgentExecutor:
    """
    Enterprise Agent Execution Engine.

    Responsibilities
        • Execute planned tasks
        • Invoke MCP tools
        • Track execution history
        • Measure execution time
        • Handle failures
    """

    def __init__(
        self,
        planner: AgentPlanner,
        client: MCPClient,
    ) -> None:

        self.planner = planner

        self.client = client

        self.executor = MCPExecutor(client)

        self.execution_history: List[Dict[str, Any]] = []

    # --------------------------------------------------
    # Execute Single Task
    # --------------------------------------------------

    def execute_task(
        self,
        task: AgentTask,
        tool: Optional[str] = None,
        arguments: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:

        start = datetime.utcnow()

        task.status = "RUNNING"

        try:

            result = None

            if tool is not None:

                result = self.executor.execute_tool(
                    tool,
                    arguments or {},
                )

            task.status = "COMPLETED"

            success = True
            error = None

        except Exception as exc:

            task.status = "FAILED"

            success = False
            result = None
            error = str(exc)

        end = datetime.utcnow()

        execution = {
            "task_id": task.task_id,
            "task_name": task.name,
            "status": task.status,
            "tool": tool,
            "success": success,
            "result": result,
            "error": error,
            "started_at": start.isoformat(),
            "finished_at": end.isoformat(),
            "duration_seconds": (
                end - start
            ).total_seconds(),
        }

        self.execution_history.append(execution)

        return execution

    # --------------------------------------------------
    # Execute Ready Tasks
    # --------------------------------------------------

    def execute_ready(
        self,
    ) -> List[Dict[str, Any]]:

        results = []

        for task in self.planner.ready_tasks():

            results.append(
                self.execute_task(task)
            )

        return results

    # --------------------------------------------------
    # Execute Entire Plan
    # --------------------------------------------------

    def execute_plan(self) -> List[Dict[str, Any]]:

        results = []

        while True:

            ready = self.planner.ready_tasks()

            if not ready:
                break

            for task in ready:

                results.append(
                    self.execute_task(task)
                )

        return results

    # --------------------------------------------------
    # History
    # --------------------------------------------------

    def history(self) -> List[Dict[str, Any]]:

        return list(self.execution_history)

    def last_execution(
        self,
    ) -> Optional[Dict[str, Any]]:

        if not self.execution_history:
            return None

        return self.execution_history[-1]

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def statistics(self) -> Dict[str, Any]:

        total = len(self.execution_history)

        successful = len([
            item
            for item in self.execution_history
            if item["success"]
        ])

        failed = total - successful

        duration = sum(
            item["duration_seconds"]
            for item in self.execution_history
        )

        return {
            "executions": total,
            "successful": successful,
            "failed": failed,
            "total_runtime": duration,
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "statistics": self.statistics(),
            "last_execution": self.last_execution(),
        }

    # --------------------------------------------------
    # Reset
    # --------------------------------------------------

    def clear_history(self) -> None:

        self.execution_history.clear()

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __len__(self):

        return len(self.execution_history)

    def __repr__(self):

        return (
            f"AgentExecutor("
            f"executions={len(self)})"
        )