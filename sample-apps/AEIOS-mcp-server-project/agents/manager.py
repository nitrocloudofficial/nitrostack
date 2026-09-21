from __future__ import annotations

from typing import Dict, List, Optional

from agents.base_agent import BaseAgent
from agents.registry import AgentRegistry


class AgentManager:
    """
    Enterprise Agent Manager.

    Responsibilities:
        • Register agents
        • Start / Stop agents
        • Pause / Resume agents
        • Restart agents
        • Remove agents
        • Monitor agent health
    """

    def __init__(
        self,
        registry: Optional[AgentRegistry] = None,
    ) -> None:

        self.registry = registry if registry is not None else AgentRegistry()
    # --------------------------------------------------
    # Registration
    # --------------------------------------------------

    def add_agent(
        self,
        agent: BaseAgent,
    ) -> BaseAgent:

        self.registry.register(agent)

        return agent

    def remove_agent(
        self,
        agent_id: str,
    ) -> bool:

        if not self.registry.exists(agent_id):
            return False

        self.registry.unregister(agent_id)

        return True

    # --------------------------------------------------
    # Lookup
    # --------------------------------------------------

    def get_agent(
        self,
        agent_id: str,
    ) -> Optional[BaseAgent]:

        return self.registry.get(agent_id)

    def get_agent_by_name(
        self,
        name: str,
    ) -> Optional[BaseAgent]:

        return self.registry.find_by_name(name)

    def list_agents(self) -> List[BaseAgent]:

        return self.registry.list_agents()

    # --------------------------------------------------
    # Lifecycle
    # --------------------------------------------------

    def initialize_agent(
        self,
        agent_id: str,
    ) -> bool:

        agent = self.get_agent(agent_id)

        if agent is None:
            return False

        agent.initialize()

        return True

    def start_agent(
        self,
        agent_id: str,
    ) -> bool:

        agent = self.get_agent(agent_id)

        if agent is None:
            return False

        agent.start()

        return True

    def stop_agent(
        self,
        agent_id: str,
    ) -> bool:

        agent = self.get_agent(agent_id)

        if agent is None:
            return False

        agent.stop()

        return True

    def pause_agent(
        self,
        agent_id: str,
    ) -> bool:

        agent = self.get_agent(agent_id)

        if agent is None:
            return False

        agent.pause()

        return True

    def resume_agent(
        self,
        agent_id: str,
    ) -> bool:

        agent = self.get_agent(agent_id)

        if agent is None:
            return False

        agent.resume()

        return True

    def restart_agent(
        self,
        agent_id: str,
    ) -> bool:

        agent = self.get_agent(agent_id)

        if agent is None:
            return False

        agent.stop()
        agent.initialize()
        agent.start()

        return True

    # --------------------------------------------------
    # Bulk Operations
    # --------------------------------------------------

    def start_all(self) -> None:

        self.registry.start_all()

    def stop_all(self) -> None:

        self.registry.stop_all()

    def pause_all(self) -> None:

        self.registry.pause_all()

    def resume_all(self) -> None:

        self.registry.resume_all()

    # --------------------------------------------------
    # Monitoring
    # --------------------------------------------------

    def running_agents(self) -> List[BaseAgent]:

        return self.registry.find_by_status("RUNNING")

    def paused_agents(self) -> List[BaseAgent]:

        return self.registry.find_by_status("PAUSED")

    def stopped_agents(self) -> List[BaseAgent]:

        return self.registry.find_by_status("STOPPED")

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def statistics(self) -> Dict:

        return {
            **self.registry.statistics(),
            "running": len(self.running_agents()),
            "paused": len(self.paused_agents()),
            "stopped": len(self.stopped_agents()),
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict:

        return {
            "statistics": self.statistics(),
            "agents": [
                agent.diagnostics()
                for agent in self.list_agents()
            ],
        }

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __len__(self) -> int:

        return len(self.registry)

    def __contains__(
        self,
        agent_id: str,
    ) -> bool:

        return self.registry.exists(agent_id)

    def __iter__(self):

        return iter(self.registry)

    def __repr__(self) -> str:

        return (
            f"AgentManager("
            f"agents={len(self.registry)})"
        )