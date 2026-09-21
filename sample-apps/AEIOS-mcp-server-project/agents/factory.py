from __future__ import annotations

from typing import Any, Dict, Optional, Type

from agents.base_agent import BaseAgent
from agents.capabilities import AgentCapabilities
from agents.communication import AgentCommunication
from agents.events import AgentEventBus
from agents.executor import AgentExecutor
from agents.lifecycle import AgentLifecycle
from agents.memory import AgentMemory
from agents.metrics import AgentMetrics
from agents.permissions import AgentPermissions
from agents.planner import AgentPlanner
from agents.reflection import AgentReflection
from agents.state import AgentState

from mcp.client import MCPClient


class AgentFactory:
    """
    Enterprise Agent Factory.

    Responsibilities

        • Create enterprise agents
        • Configure dependencies
        • Apply default settings
        • Support custom agent creation
    """

    def __init__(
        self,
        client: MCPClient,
        communication: Optional[AgentCommunication] = None,
        event_bus: Optional[AgentEventBus] = None,
    ) -> None:

        self.client = client

        self.communication = (
            communication
            if communication
            else AgentCommunication()
        )

        self.event_bus = (
            event_bus
            if event_bus
            else AgentEventBus()
        )

    # --------------------------------------------------
    # Create Agent
    # --------------------------------------------------

    def create(
        self,
        agent_class: Type[BaseAgent],
        name: str,
        role: str,
        goal: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> BaseAgent:

        agent = agent_class(
            name=name,
            role=role,
            goal=goal,
            client=self.client,
            metadata=metadata or {},
        )

        # Core Components

        agent.state = AgentState()

        agent.lifecycle = AgentLifecycle(state=agent.state)

        agent.memory = AgentMemory()

        agent.planner = AgentPlanner()

        agent.executor = AgentExecutor(
            planner=agent.planner,
            client=self.client,
        )

        agent.reflection = AgentReflection()

        agent.capabilities = AgentCapabilities()

        agent.permissions = AgentPermissions()

        agent.metrics = AgentMetrics()

        # Shared Components

        agent.communication = self.communication

        agent.events = self.event_bus

        return agent

    # --------------------------------------------------
    # Batch Creation
    # --------------------------------------------------

    def create_many(
        self,
        agent_class: Type[BaseAgent],
        definitions: list[dict],
    ) -> list[BaseAgent]:

        agents = []

        for definition in definitions:

            agents.append(
                self.create(
                    agent_class=agent_class,
                    name=definition["name"],
                    role=definition["role"],
                    goal=definition["goal"],
                    metadata=definition.get(
                        "metadata",
                        {},
                    ),
                )
            )

        return agents

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "client": self.client.__class__.__name__,
            "communication": self.communication.__class__.__name__,
            "event_bus": self.event_bus.__class__.__name__,
        }

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __repr__(self):

        return (
            f"AgentFactory("
            f"client={self.client.__class__.__name__})"
        )