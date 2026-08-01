"""
RemitWise AI – Orchestrator Agent
=====================================
The central coordinator of the multi-agent system.

Responsibilities:
  1. Accept user query (OrchestratorRequest)
  2. Load recent conversation memory for session
  3. Call Planner → produce ExecutionPlan
  4. Call Executor → run selected agents
  5. Call Merger → synthesise responses
  6. Save turn to memory
  7. Return OrchestratorResponse

The orchestrator is the ONLY public entry point to the agent layer.
External callers (the /agent/chat API endpoint, MCP tools) should
instantiate and call this class only.

Usage::

    orch = OrchestratorAgent()
    resp = orch.run(OrchestratorRequest(
        query="Send 1000 USD to India — cheapest provider and KYC docs?",
        session_id="user-session-abc",
    ))
    print(resp.summary)
    print(resp.results)
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from agents.shared.logger import AgentLogger, pipeline_logger
from agents.shared.memory import memory_store
from agents.shared.schemas import (
    AgentContext,
    AgentName,
    AgentRequest,
    AgentResponse,
    ExecutionPlan,
    OrchestratorRequest,
    OrchestratorResponse,
)
from agents.orchestrator.base_planner import BasePlanner
from agents.orchestrator.planner import RuleBasedPlanner, Planner
from agents.orchestrator.llm_planner import LLMPlanner
from agents.orchestrator.executor import Executor
from agents.orchestrator.merger import Merger


logger = AgentLogger("Orchestrator")


class OrchestratorAgent:
    """
    Top-level agent orchestrator.

    Coordinates planning, execution, memory, and response synthesis.
    Stateless between requests — all state lives in ConversationMemory.
    """

    def __init__(
        self,
        llm_planner: Optional[BasePlanner] = None,
        rule_planner: Optional[BasePlanner] = None,
    ) -> None:
        self._llm_planner = llm_planner or LLMPlanner()
        self._rule_planner = rule_planner or RuleBasedPlanner()
        # self._planner is provided for backwards compatibility
        self._planner = self._llm_planner
        self._executor = Executor()
        self._merger = Merger()
        self._logger = logger

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, request: OrchestratorRequest) -> OrchestratorResponse:
        """
        Process a user query end-to-end through the agent pipeline.

        Parameters
        ----------
        request : OrchestratorRequest
            Contains: query, session_id, optional context override, optional history.

        Returns
        -------
        OrchestratorResponse
            Full structured response with agent results, merged summary,
            plan trace, and timing.
        """
        wall_start = time.perf_counter()
        session_id = request.session_id or "default"

        self._logger.log_execution_start(session_id, request.query[:100])

        # ── Step 1: Load conversation memory ─────────────────────────
        history = request.history or memory_store.get_recent(session_id, n=10)

        # ── Step 2: Plan — detect intent, select agents ──────────────
        plan: ExecutionPlan
        fallback_reason: Optional[str] = None

        try:
            plan = self._llm_planner.plan(
                query=request.query,
                context_override=request.context or {},
            )
            self._logger.info(
                f"🧠 Primary Planner (LLM) selected: {[s.agent.value for s in plan.steps]} | "
                f"Confidence: {plan.confidence} | Latency: {plan.planning_latency_ms:.1f}ms | "
                f"Reasoning: {plan.reasoning}"
            )
        except Exception as exc:
            fallback_reason = str(exc)
            self._logger.info("Using RuleBasedPlanner.")
            self._logger.warning(
                f"⚠️ LLMPlanner failed: {exc}. Automatically falling back to RuleBasedPlanner."
            )
            plan = self._rule_planner.plan(
                query=request.query,
                context_override=request.context or {},
            )
            self._logger.info(
                f"🔄 Fallback Planner (RuleBased) selected: {[s.agent.value for s in plan.steps]} | "
                f"Fallback reason: {fallback_reason} | Latency: {plan.planning_latency_ms:.1f}ms"
            )

        ctx = plan.extracted_context

        # ── Step 3: Build AgentRequest ───────────────────────────────
        agent_request = AgentRequest(
            session_id=session_id,
            context=ctx,
            history=history,
        )

        # ── Step 4: Execute agents ───────────────────────────────────
        if plan.steps:
            agent_responses: List[AgentResponse] = self._executor.execute(
                plan, agent_request
            )
        else:
            self._logger.warning("Planner produced empty plan — running Exchange as fallback.")
            from agents.exchange.exchange_agent import ExchangeAgent
            fallback_agent = ExchangeAgent()
            agent_responses = [fallback_agent.execute(agent_request)]

        # ── Step 5: Merge responses ──────────────────────────────────
        merged = self._merger.merge(agent_responses)

        # ── Step 6: Update conversation memory ──────────────────────
        memory_store.add_turn(session_id, "user", request.query)
        memory_store.add_turn(
            session_id,
            "assistant",
            merged.summary,
            agents_used=merged.agents_used,
            planner_name=plan.planner_name or ("llm" if not fallback_reason else "rule_based"),
            provider_name=plan.provider_name,
            reasoning=plan.reasoning,
            confidence=plan.confidence,
        )

        # ── Step 7: Build final response ─────────────────────────────
        total_ms = round((time.perf_counter() - wall_start) * 1000, 2)

        pipeline_logger.log_merge(merged.agents_used, merged.summary[:80])
        self._logger.info(
            f"✅ Orchestrator complete | {len(agent_responses)} agent(s) | "
            f"Planner={plan.planner_name or 'rule_based'} | {total_ms:.1f}ms | status={merged.status}"
        )


        return OrchestratorResponse(
            session_id=session_id,
            query=request.query,
            agents_used=merged.agents_used,
            plan=plan.steps,
            results=merged.results,
            agent_responses=agent_responses,
            summary=merged.summary,
            status=merged.status,
            total_execution_ms=total_ms,
        )

    # ------------------------------------------------------------------
    # Convenience: clear session memory
    # ------------------------------------------------------------------

    def clear_session(self, session_id: str) -> None:
        """Clear conversation memory for a session."""
        memory_store.clear(session_id)
        self._logger.info(f"Session {session_id} memory cleared.")

    def get_session_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Return conversation history for a session (for debugging)."""
        msgs = memory_store.get_all(session_id)
        return [m.model_dump() for m in msgs]
