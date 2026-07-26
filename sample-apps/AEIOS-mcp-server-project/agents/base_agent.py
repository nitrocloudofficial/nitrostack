from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4

from agents.memory import AgentMemory
from agents.state import AgentState
from mcp.client import MCPClient
from mcp.context import MCPContext
from mcp.executor import MCPExecutor


class BaseAgent(ABC):
    """
    Base class for all AEIOS-X enterprise agents.

    Every enterprise agent derives from this class.
    """

    def __init__(
        self,
        name: str,
        role: str,
        goal: str,
        client: MCPClient,
    ) -> None:

        self.agent_id = str(uuid4())

        self.name = name
        self.role = role
        self.goal = goal

        self.created_at = datetime.utcnow()

        self.client = client
        self.executor = MCPExecutor(client)

        self.context = MCPContext()
        self.memory = AgentMemory()
        self.state = AgentState()

        self.metadata: Dict[str, Any] = {}

    # --------------------------------------------------
    # Lifecycle
    # --------------------------------------------------

    def initialize(self) -> None:

        self.state.initialize()

    def start(self) -> None:

        self.state.start()

    def stop(self) -> None:

        self.state.stop()

    def pause(self) -> None:

        self.state.pause()

    def resume(self) -> None:

        self.state.resume()

    # --------------------------------------------------
    # Context
    # --------------------------------------------------

    def set_context(
        self,
        key: str,
        value: Any,
    ) -> None:

        self.context.set(key, value)

    def get_context(
        self,
        key: str,
        default=None,
    ) -> Any:

        return self.context.get(key, default)

    # --------------------------------------------------
    # Memory
    # --------------------------------------------------

    def remember(
        self,
        key: str,
        value: Any,
    ) -> None:

        self.memory.store(key, value)

    def recall(
        self,
        key: str,
        default=None,
    ) -> Any:

        return self.memory.retrieve(key, default)

    # --------------------------------------------------
    # MCP Tool Execution
    # --------------------------------------------------

    def execute_tool(
        self,
        tool: str,
        arguments: Optional[Dict[str, Any]] = None,
    ):

        return self.executor.execute_tool(
            tool,
            arguments or {},
        )

    # --------------------------------------------------
    # Planning
    # --------------------------------------------------

    @abstractmethod
    def plan(
        self,
        objective: str,
    ):
        """
        Generate an execution plan.
        """
        ...

    # --------------------------------------------------
    # Execution
    # --------------------------------------------------

    @abstractmethod
    def act(
        self,
        task: Dict[str, Any],
    ):
        """
        Execute a task.
        """
        ...

    # --------------------------------------------------
    # Reflection
    # --------------------------------------------------

    def reflect(
        self,
        result: Any,
    ) -> Dict[str, Any]:

        return {
            "agent": self.name,
            "success": True,
            "timestamp": datetime.utcnow().isoformat(),
            "result": result,
        }

    # --------------------------------------------------
    # Metadata
    # --------------------------------------------------

    def set_metadata(
        self,
        key: str,
        value: Any,
    ) -> None:

        self.metadata[key] = value

    def get_metadata(
        self,
        key: str,
        default=None,
    ):

        return self.metadata.get(key, default)

    # --------------------------------------------------
    # Status
    # --------------------------------------------------

    @property
    def status(self):

        return self.state.status()

    def diagnostics(self):

        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "role": self.role,
            "goal": self.goal,
            "status": self.status,
            "memory": self.memory.statistics(),
            "executor": self.executor.statistics(),
        }

    # --------------------------------------------------
    # Serialization
    # --------------------------------------------------

    def to_dict(self):

        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "role": self.role,
            "goal": self.goal,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata,
            "status": self.status,
        }

    # --------------------------------------------------

    def __repr__(self):

        return (
            f"{self.__class__.__name__}("
            f"name='{self.name}', "
            f"role='{self.role}', "
            f"status='{self.status}')"
        )