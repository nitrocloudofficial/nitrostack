from __future__ import annotations

from threading import RLock
from typing import Dict, List, Optional, Type

from agents.base_agent import BaseAgent


class AgentRegistry:
    """
    Central registry for all enterprise agents.

    Responsibilities:
        - Register agents
        - Remove agents
        - Lookup agents
        - Search agents
        - Track agent status
        - Maintain metadata
    """

    def __init__(self) -> None:

        self._agents: Dict[str, BaseAgent] = {}
        self._lock = RLock()

    # --------------------------------------------------
    # Registration
    # --------------------------------------------------

    def register(
        self,
        agent: BaseAgent,
    ) -> None:

        with self._lock:
            self._agents[agent.agent_id] = agent

    def unregister(
        self,
        agent_id: str,
    ) -> None:

        with self._lock:
            self._agents.pop(agent_id, None)

    def clear(self) -> None:

        with self._lock:
            self._agents.clear()

    # --------------------------------------------------
    # Lookup
    # --------------------------------------------------

    def get(
        self,
        agent_id: str,
    ) -> Optional[BaseAgent]:

        return self._agents.get(agent_id)

    def exists(
        self,
        agent_id: str,
    ) -> bool:

        return agent_id in self._agents

    # --------------------------------------------------
    # Search
    # --------------------------------------------------

    def find_by_name(
        self,
        name: str,
    ) -> Optional[BaseAgent]:

        for agent in self._agents.values():

            if agent.name == name:
                return agent

        return None

    def find_by_role(
        self,
        role: str,
    ) -> List[BaseAgent]:

        return [
            agent
            for agent in self._agents.values()
            if agent.role == role
        ]

    def find_by_status(
        self,
        status: str,
    ) -> List[BaseAgent]:

        return [
            agent
            for agent in self._agents.values()
            if agent.status == status
        ]

    def find_by_type(
        self,
        agent_type: Type[BaseAgent],
    ) -> List[BaseAgent]:

        return [
            agent
            for agent in self._agents.values()
            if isinstance(agent, agent_type)
        ]

    # --------------------------------------------------
    # Listing
    # --------------------------------------------------

    def list_agents(self) -> List[BaseAgent]:

        return list(self._agents.values())

    def names(self) -> List[str]:

        return [
            agent.name
            for agent in self._agents.values()
        ]

    def roles(self) -> List[str]:

        return sorted(
            {
                agent.role
                for agent in self._agents.values()
            }
        )

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def count(self) -> int:

        return len(self._agents)

    def statistics(self) -> dict:

        role_counts = {}

        for agent in self._agents.values():

            role_counts.setdefault(
                agent.role,
                0,
            )

            role_counts[agent.role] += 1

        return {
            "total_agents": len(self._agents),
            "roles": role_counts,
        }

    # --------------------------------------------------
    # Lifecycle Helpers
    # --------------------------------------------------

    def start_all(self) -> None:

        for agent in self._agents.values():
            agent.start()

    def stop_all(self) -> None:

        for agent in self._agents.values():
            agent.stop()

    def pause_all(self) -> None:

        for agent in self._agents.values():
            agent.pause()

    def resume_all(self) -> None:

        for agent in self._agents.values():
            agent.resume()

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self):

        return {
            "statistics": self.statistics(),
            "agents": [
                agent.diagnostics()
                for agent in self._agents.values()
            ],
        }

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __contains__(
        self,
        agent_id: str,
    ) -> bool:

        return agent_id in self._agents

    def __len__(self) -> int:

        return len(self._agents)

    def __iter__(self):

        return iter(self._agents.values())

    def __repr__(self) -> str:

        return (
            f"AgentRegistry("
            f"agents={len(self._agents)})"
        )