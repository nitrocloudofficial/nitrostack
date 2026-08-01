"""
RemitWise AI – Base Agent
===========================
Abstract base class that every specialist agent inherits from.

Provides:
  - Standardised execute() contract
  - Automatic execution timing
  - Structured error wrapping → always returns AgentResponse (never raises)
  - Built-in logging via AgentLogger
  - Tool invocation helper with error isolation

Usage::

    class MyAgent(BaseAgent):
        @property
        def name(self) -> AgentName:
            return AgentName.EXCHANGE

        @property
        def description(self) -> str:
            return "Handles exchange rate queries."

        @property
        def system_prompt(self) -> str:
            return EXCHANGE_SYSTEM_PROMPT

        def _run(self, request: AgentRequest) -> AgentResponse:
            # actual agent logic here
            ...
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, Optional, Tuple

from agents.shared.logger import AgentLogger
from agents.shared.schemas import (
    AgentName,
    AgentRequest,
    AgentResponse,
    AgentStatus,
    ToolCall,
)


class BaseAgent(ABC):
    """
    Abstract base for all RemitWise AI specialist agents.

    Subclasses must implement:
      - ``name`` property → AgentName
      - ``description`` property → str
      - ``system_prompt`` property → str
      - ``_run(request)`` → AgentResponse   (core agent logic)

    The public ``execute()`` method wraps ``_run()`` with:
      - Execution timing
      - Top-level exception catching → partial/failed response (never raises)
      - Start/end logging
    """

    def __init__(self) -> None:
        self._logger = AgentLogger(self.__class__.__name__)

    # ------------------------------------------------------------------
    # Abstract properties — subclasses must define these
    # ------------------------------------------------------------------

    @property
    @abstractmethod
    def name(self) -> AgentName:
        """Enum name of this agent."""

    @property
    @abstractmethod
    def description(self) -> str:
        """One-line description of what this agent does."""

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """System prompt that defines this agent's persona and constraints."""

    # ------------------------------------------------------------------
    # Abstract core logic — subclasses implement this
    # ------------------------------------------------------------------

    @abstractmethod
    def _run(self, request: AgentRequest) -> AgentResponse:
        """
        Core agent logic.

        Implementations should:
          1. Extract what they need from ``request.context``
          2. Call tools via ``self._call_tool()``
          3. Build and return a structured ``AgentResponse``

        This method MAY raise exceptions — they are caught by ``execute()``.
        """

    # ------------------------------------------------------------------
    # Public execute — wraps _run with timing + error handling
    # ------------------------------------------------------------------

    def execute(self, request: AgentRequest) -> AgentResponse:
        """
        Execute this agent safely.

        Always returns an ``AgentResponse`` — never raises.
        On unhandled exception, returns a FAILED response with the error.
        """
        start = time.perf_counter()
        self._logger.log_execution_start(
            request.session_id,
            request.context.raw_query[:120],
        )

        try:
            response = self._run(request)
            response.execution_time_ms = round(
                (time.perf_counter() - start) * 1000, 2
            )
            self._logger.log_result(
                response.status.value,
                response.execution_time_ms,
                response.summary[:100],
            )
            return response

        except Exception as exc:  # noqa: BLE001
            elapsed = round((time.perf_counter() - start) * 1000, 2)
            self._logger.log_error(
                f"Unhandled exception in {self.name.value}: {exc}", exc
            )
            return AgentResponse(
                agent=self.name,
                status=AgentStatus.FAILED,
                data={},
                summary=f"Agent {self.name.value} encountered an unexpected error.",
                error=str(exc),
                execution_time_ms=elapsed,
            )

    # ------------------------------------------------------------------
    # Tool invocation helper
    # ------------------------------------------------------------------

    def _call_tool(
        self,
        tool_name: str,
        fn: Callable[..., Any],
        params: Dict[str, Any],
        tool_calls_list: list,
    ) -> Tuple[Optional[Any], Optional[str]]:
        """
        Call a tool function safely, recording the call in tool_calls_list.

        Parameters
        ----------
        tool_name : str
            Human-readable name for logging.
        fn : callable
            The tool function to invoke.
        params : dict
            Keyword arguments to pass to fn.
        tool_calls_list : list
            Mutable list to append the ToolCall record to.

        Returns
        -------
        (result, error) : (Any | None, str | None)
            result is None on failure; error is None on success.
        """
        start = time.perf_counter()
        try:
            result = fn(**params)
            latency = round((time.perf_counter() - start) * 1000, 2)
            self._logger.log_tool_call(tool_name, params, result, latency)
            tool_calls_list.append(
                ToolCall(
                    tool_name=tool_name,
                    parameters=params,
                    result=result,
                    latency_ms=latency,
                )
            )
            return result, None

        except Exception as exc:  # noqa: BLE001
            latency = round((time.perf_counter() - start) * 1000, 2)
            error_str = str(exc)
            self._logger.log_tool_error(tool_name, error_str)
            tool_calls_list.append(
                ToolCall(
                    tool_name=tool_name,
                    parameters=params,
                    result=None,
                    error=error_str,
                    latency_ms=latency,
                )
            )
            return None, error_str
