"""
RemitWise AI – Conversation Memory
=====================================
Lightweight, in-memory, session-scoped conversation memory.

Memory is NOT persisted across server restarts.  That is intentional —
we only need conversational continuity within a single user session during
a hackathon demo.  For production, replace the dict store with Redis.

Usage::

    from agents.shared.memory import memory_store

    memory_store.add_turn("session-abc", "user", "What is USD to INR?")
    memory_store.add_turn("session-abc", "assistant", "The rate is 96.56.", ["exchange"])

    recent = memory_store.get_recent("session-abc", n=5)
"""

from __future__ import annotations

import threading
from collections import defaultdict, deque
from typing import Deque, Dict, List, Optional

from agents.shared.schemas import ConversationMessage


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_MAX_TURNS: int = 20   # keep last 20 messages per session
MAX_SESSIONS:      int = 1000  # evict oldest session after this many


class ConversationMemory:
    """
    Thread-safe in-memory conversation memory store.

    Each session is a bounded deque of ConversationMessage objects.
    Access is protected by a per-session lock to support concurrent requests.
    """

    def __init__(self, max_turns: int = DEFAULT_MAX_TURNS) -> None:
        self._max_turns = max_turns
        self._store: Dict[str, Deque[ConversationMessage]] = defaultdict(
            lambda: deque(maxlen=max_turns)
        )
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    def add_turn(
        self,
        session_id: str,
        role: str,
        content: str,
        agents_used: Optional[List[str]] = None,
        planner_name: Optional[str] = None,
        provider_name: Optional[str] = None,
        reasoning: Optional[str] = None,
        confidence: Optional[float] = None,
    ) -> None:
        """
        Append a message to the session's conversation history.

        Parameters
        ----------
        session_id : str
            Unique session identifier.
        role : str
            ``'user'`` or ``'assistant'``.
        content : str
            Message text.
        agents_used : list[str], optional
            Which agents produced this assistant message (for traceability).
        planner_name : str, optional
            Name of the planner used ('llm' or 'rule_based').
        provider_name : str, optional
            LLM provider name ('ollama', 'mock', 'openai').
        reasoning : str, optional
            Planner reasoning summary.
        confidence : float, optional
            Planner confidence score.
        """
        msg = ConversationMessage(
            role=role,
            content=content,
            agents_used=agents_used or [],
            planner_name=planner_name,
            provider_name=provider_name,
            reasoning=reasoning,
            confidence=confidence,
        )
        with self._lock:
            self._store[session_id].append(msg)


    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    def get_recent(
        self,
        session_id: str,
        n: int = 10,
    ) -> List[ConversationMessage]:
        """
        Return the *n* most recent messages for a session.

        Returns an empty list if the session does not exist.
        """
        with self._lock:
            history = list(self._store.get(session_id, deque()))
        return history[-n:] if len(history) > n else history

    def get_all(self, session_id: str) -> List[ConversationMessage]:
        """Return the full conversation history for a session."""
        with self._lock:
            return list(self._store.get(session_id, deque()))

    def session_exists(self, session_id: str) -> bool:
        """Check whether a session has any history."""
        with self._lock:
            return session_id in self._store and len(self._store[session_id]) > 0

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def clear(self, session_id: str) -> None:
        """Delete all history for a session."""
        with self._lock:
            if session_id in self._store:
                del self._store[session_id]

    def clear_all(self) -> None:
        """Wipe all sessions (use with caution)."""
        with self._lock:
            self._store.clear()

    def session_count(self) -> int:
        """Return the number of active sessions."""
        with self._lock:
            return len(self._store)

    def message_count(self, session_id: str) -> int:
        """Return number of messages in a session."""
        with self._lock:
            return len(self._store.get(session_id, deque()))


# ---------------------------------------------------------------------------
# Singleton – import this everywhere
# ---------------------------------------------------------------------------

memory_store = ConversationMemory(max_turns=DEFAULT_MAX_TURNS)
