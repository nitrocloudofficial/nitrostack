"""
RemitWise AI – Orchestrator Executor
=====================================
Executes a planned list of agents, collecting their responses.

Key properties:
  • Sequential execution by default (preserves determinism for demos)
  • Error isolation: if one agent fails, execution continues for the rest
  • Returns partial results rather than crashing on individual failures
  • Records full execution trace for the orchestrator response

Usage::

    executor = Executor()
    responses = executor.execute(plan, agent_request)
    # responses: List[AgentResponse] — one per plan step, in priority order
"""

from __future__ import annotations

from typing import Dict, List, Type

from agents.shared.base_agent import BaseAgent
from agents.shared.logger import AgentLogger
from agents.shared.schemas import (
    AgentName,
    AgentRequest,
    AgentResponse,
    AgentStatus,
    ExecutionPlan,
)

# Import all specialist agents
from agents.exchange.exchange_agent   import ExchangeAgent
from agents.provider.provider_agent   import ProviderAgent
from agents.compliance.compliance_agent import ComplianceAgent


logger = AgentLogger("Executor")


# ---------------------------------------------------------------------------
# Agent Registry
# ---------------------------------------------------------------------------

AGENT_REGISTRY: Dict[AgentName, Type[BaseAgent]] = {
    AgentName.EXCHANGE:   ExchangeAgent,
    AgentName.PROVIDER:   ProviderAgent,
    AgentName.COMPLIANCE: ComplianceAgent,
}


class Executor:
    """
    Runs agents from an ExecutionPlan in priority order.

    Each agent is instantiated freshly per execution (stateless).
    Failures in one agent do NOT stop execution of subsequent agents.
    """

    def __init__(self) -> None:
        self._logger = logger

    def execute(
        self,
        plan: ExecutionPlan,
        base_request: AgentRequest,
    ) -> List[AgentResponse]:
        """
        Execute all agents in the plan and return their responses.

        Parameters
        ----------
        plan : ExecutionPlan
            Output from the Planner — ordered list of PlanSteps.
        base_request : AgentRequest
            The request to pass to each agent (contains session_id + context).

        Returns
        -------
        list[AgentResponse]
            One response per successfully started agent, in priority order.
            An agent that raises an unhandled exception returns a FAILED
            AgentResponse (BaseAgent.execute() guarantees this).
        """
        if not plan.steps:
            self._logger.warning("Empty execution plan — no agents to run.")
            return []

        responses: List[AgentResponse] = []

        for step in sorted(plan.steps, key=lambda s: s.priority):
            agent_cls = AGENT_REGISTRY.get(step.agent)

            if agent_cls is None:
                self._logger.error(
                    f"Unknown agent in plan: {step.agent.value} — skipping."
                )
                responses.append(
                    AgentResponse(
                        agent=step.agent,
                        status=AgentStatus.FAILED,
                        data={},
                        summary=f"Agent {step.agent.value} is not registered.",
                        error=f"No implementation found for {step.agent.value}",
                    )
                )
                continue

            self._logger.info(
                f"→ Executing {step.agent.value} (priority {step.priority}): {step.reason}"
            )

            # Instantiate a fresh agent instance (stateless, dependency-injection-ready)
            agent_instance: BaseAgent = agent_cls()

            # BaseAgent.execute() guarantees no exception propagation
            response = agent_instance.execute(base_request)
            responses.append(response)

            self._logger.info(
                f"  ✓ {step.agent.value} completed "
                f"[{response.status.value}] in {response.execution_time_ms:.1f}ms"
            )

        return responses
