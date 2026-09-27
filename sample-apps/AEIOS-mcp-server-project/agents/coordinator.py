from __future__ import annotations

from typing import Any, Dict, List, Optional

from agents.base_agent import BaseAgent
from agents.communication import AgentCommunication
from agents.events import AgentEventBus
from agents.registry import AgentRegistry


class AgentCoordinator:
    """
    Enterprise Agent Coordinator.

    Responsibilities

        • Coordinate multiple agents
        • Route tasks
        • Select capable agents
        • Broadcast events
        • Monitor execution
    """

    def __init__(
        self,
        registry: AgentRegistry,
        communication: AgentCommunication,
        event_bus: AgentEventBus,
    ) -> None:

        self.registry = registry
        self.communication = communication
        self.event_bus = event_bus

    # --------------------------------------------------
    # Agent Selection
    # --------------------------------------------------

    def select_agent(
        self,
        capability: str,
    ) -> Optional[BaseAgent]:
        """
        Return the first agent that supports
        the requested capability.
        """

        for agent in self.registry.list_agents():

            capabilities = getattr(
                agent,
                "capabilities",
                None,
            )

            if capabilities is None:
                continue

            if (
                capabilities.has_tool(capability)
                or capabilities.has_skill(capability)
                or capabilities.has_workflow(capability)
                or capabilities.has_resource(capability)
                or capabilities.has_prompt(capability)
            ):
                return agent

        return None

    # --------------------------------------------------
    # Task Assignment
    # --------------------------------------------------

    def assign_task(
        self,
        capability: str,
        task_name: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[BaseAgent]:

        agent = self.select_agent(capability)

        if agent is None:
            return None

        planner = getattr(agent, "planner", None)

        if planner is not None:

            planner.add_task(
                name=task_name,
                metadata=metadata or {},
            )

        self.event_bus.publish(
            event_type="TASK_ASSIGNED",
            source="AgentCoordinator",
            payload={
                "agent": agent.name,
                "task": task_name,
                "capability": capability,
            },
        )

        return agent

    # --------------------------------------------------
    # Messaging
    # --------------------------------------------------

    def send_message(
        self,
        sender: str,
        receiver: str,
        message: str,
    ) -> None:

        self.communication.send(
            sender=sender,
            receiver=receiver,
            content=message,
        )

    def broadcast(
        self,
        sender: str,
        message: str,
    ) -> None:

        self.communication.broadcast(
            sender=sender,
            content=message,
        )

    # --------------------------------------------------
    # Monitoring
    # --------------------------------------------------

    def active_agents(self) -> List[BaseAgent]:

        return [
            agent
            for agent in self.registry.list_agents()
            if getattr(
                agent.state,
                "status",
                "",
            )
            == "RUNNING"
        ]

    def idle_agents(self) -> List[BaseAgent]:

        return [
            agent
            for agent in self.registry.list_agents()
            if getattr(
                agent.state,
                "status",
                "",
            )
            == "READY"
        ]

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def statistics(self) -> Dict[str, Any]:

        agents = self.registry.list_agents()

        return {
            "registered_agents": len(agents),
            "active_agents": len(
                self.active_agents()
            ),
            "idle_agents": len(
                self.idle_agents()
            ),
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "statistics": self.statistics(),
            "agents": [
                {
                    "name": agent.name,
                    "role": agent.role,
                    "status": getattr(
                        agent.state,
                        "status",
                        "UNKNOWN",
                    ),
                }
                for agent in self.registry.list_agents()
            ],
        }

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __repr__(self):

        return (
            f"AgentCoordinator("
            f"agents={len(self.registry)})"
        )