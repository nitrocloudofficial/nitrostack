"""
RemitWise AI – Agent Logger
============================
Structured logging for the multi-agent execution pipeline.

Every agent execution is logged with:
  - Session ID and query
  - Planner output (which agents were selected)
  - Tool calls and results per agent
  - Merged response summary
  - Total execution time

Usage::

    from agents.shared.logger import AgentLogger
    logger = AgentLogger("ExchangeAgent")
    logger.log_execution_start("session-123", "USD to INR rate")
    logger.log_tool_call("get_latest_rate", {"base": "USD", "target": "INR"})
    logger.log_result("success", 42.5)
"""

import logging
import sys
import time
from typing import Any, Dict, List, Optional


# ANSI colour codes — used only when stdout is a TTY
_RESET  = "\033[0m"
_BOLD   = "\033[1m"
_CYAN   = "\033[36m"
_GREEN  = "\033[32m"
_YELLOW = "\033[33m"
_RED    = "\033[31m"
_MAGENTA = "\033[35m"
_BLUE   = "\033[34m"


def _supports_color() -> bool:
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


class AgentLogger:
    """
    Structured logger scoped to a single agent or orchestrator component.

    Wraps Python's standard logging module with extra context (session_id,
    agent name) and colourised console output for easy debugging during
    hackathon demos.
    """

    def __init__(self, agent_name: str) -> None:
        self.agent_name = agent_name
        self._logger = logging.getLogger(f"remitwise.agents.{agent_name}")
        self._color = _supports_color()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _fmt(self, color: str, msg: str) -> str:
        if self._color:
            return f"{_BOLD}{color}[{self.agent_name}]{_RESET} {msg}"
        return f"[{self.agent_name}] {msg}"

    # ------------------------------------------------------------------
    # Public logging API
    # ------------------------------------------------------------------

    def log_execution_start(self, session_id: str, query: str) -> None:
        """Log the beginning of an agent execution."""
        self._logger.info(
            self._fmt(_CYAN, f"▶ START | session={session_id} | query={query!r}")
        )

    def log_plan(self, agents: List[str], intents: List[str]) -> None:
        """Log the planner's decision."""
        self._logger.info(
            self._fmt(
                _MAGENTA,
                f"📋 PLAN  | agents={agents} | intents={intents}"
            )
        )

    def log_tool_call(
        self,
        tool_name: str,
        params: Dict[str, Any],
        result: Optional[Any] = None,
        latency_ms: float = 0.0,
    ) -> None:
        """Log a tool invocation with its parameters and result summary."""
        param_str = ", ".join(f"{k}={v!r}" for k, v in params.items())
        result_summary = str(result)[:120] if result is not None else "..."
        self._logger.info(
            self._fmt(
                _BLUE,
                f"🔧 TOOL  | {tool_name}({param_str}) → {result_summary} [{latency_ms:.1f}ms]"
            )
        )

    def log_tool_error(self, tool_name: str, error: str) -> None:
        """Log a tool failure."""
        self._logger.warning(
            self._fmt(_YELLOW, f"⚠ TOOL ERR | {tool_name} failed: {error}")
        )

    def log_result(
        self,
        status: str,
        execution_time_ms: float,
        summary: str = "",
    ) -> None:
        """Log the agent's final result."""
        color = _GREEN if status == "success" else (_YELLOW if status == "partial" else _RED)
        icon  = "✅" if status == "success" else ("⚡" if status == "partial" else "❌")
        self._logger.info(
            self._fmt(
                color,
                f"{icon} RESULT | status={status} | {execution_time_ms:.1f}ms | {summary[:100]}"
            )
        )

    def log_error(self, error: str, exc: Optional[Exception] = None) -> None:
        """Log an agent-level error."""
        if exc:
            self._logger.exception(self._fmt(_RED, f"❌ ERROR  | {error}"))
        else:
            self._logger.error(self._fmt(_RED, f"❌ ERROR  | {error}"))

    def log_merge(self, agents_merged: List[str], summary_preview: str) -> None:
        """Log the merger's output."""
        self._logger.info(
            self._fmt(
                _GREEN,
                f"🔀 MERGE | combined={agents_merged} | preview={summary_preview[:80]!r}"
            )
        )

    def info(self, msg: str) -> None:
        """Generic info log."""
        self._logger.info(self._fmt(_CYAN, msg))

    def warning(self, msg: str) -> None:
        """Generic warning log."""
        self._logger.warning(self._fmt(_YELLOW, msg))

    def error(self, msg: str) -> None:
        """Generic error log."""
        self._logger.error(self._fmt(_RED, msg))


# ---------------------------------------------------------------------------
# Module-level convenience logger for orchestrator pipeline
# ---------------------------------------------------------------------------

pipeline_logger = AgentLogger("Pipeline")
