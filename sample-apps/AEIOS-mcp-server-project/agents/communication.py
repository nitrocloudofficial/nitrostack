from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from queue import Queue, Empty
from threading import RLock
from typing import Any, Dict, List, Optional
from uuid import uuid4


@dataclass
class AgentMessage:
    """
    Represents a message exchanged between enterprise agents.
    """

    message_id: str = field(default_factory=lambda: str(uuid4()))
    sender: str = ""
    receiver: str = ""
    message_type: str = "INFO"
    payload: Any = None
    timestamp: str = field(
        default_factory=lambda: datetime.utcnow().isoformat()
    )
    metadata: Dict[str, Any] = field(default_factory=dict)


class AgentCommunication:
    """
    Enterprise Agent Communication Layer.

    Responsibilities:
        • Direct messaging
        • Broadcast messaging
        • Inbox management
        • Message history
    """

    def __init__(self) -> None:

        self._queues: Dict[str, Queue] = {}

        self._history: List[AgentMessage] = []

        self._lock = RLock()

    # --------------------------------------------------
    # Registration
    # --------------------------------------------------

    def register(
        self,
        agent_id: str,
    ) -> None:

        with self._lock:

            if agent_id not in self._queues:
                self._queues[agent_id] = Queue()

    def unregister(
        self,
        agent_id: str,
    ) -> None:

        with self._lock:

            self._queues.pop(agent_id, None)

    # --------------------------------------------------
    # Messaging
    # --------------------------------------------------

    def send(
        self,
        sender: str,
        receiver: str,
        payload: Any,
        message_type: str = "INFO",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AgentMessage:

        if receiver not in self._queues:
            raise ValueError(
                f"Agent '{receiver}' is not registered."
            )

        message = AgentMessage(
            sender=sender,
            receiver=receiver,
            payload=payload,
            message_type=message_type,
            metadata=metadata or {},
        )

        self._queues[receiver].put(message)

        self._history.append(message)

        return message

    # --------------------------------------------------
    # Broadcast
    # --------------------------------------------------

    def broadcast(
        self,
        sender: str,
        payload: Any,
        message_type: str = "BROADCAST",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[AgentMessage]:

        messages = []

        for receiver in self._queues.keys():

            if receiver == sender:
                continue

            messages.append(
                self.send(
                    sender=sender,
                    receiver=receiver,
                    payload=payload,
                    message_type=message_type,
                    metadata=metadata,
                )
            )

        return messages

    # --------------------------------------------------
    # Receiving
    # --------------------------------------------------

    def receive(
        self,
        agent_id: str,
        timeout: Optional[float] = None,
    ) -> Optional[AgentMessage]:

        if agent_id not in self._queues:
            return None

        try:

            return self._queues[agent_id].get(
                timeout=timeout,
            )

        except Empty:

            return None

    def pending(
        self,
        agent_id: str,
    ) -> int:

        if agent_id not in self._queues:
            return 0

        return self._queues[agent_id].qsize()

    # --------------------------------------------------
    # History
    # --------------------------------------------------

    def history(self) -> List[AgentMessage]:

        return list(self._history)

    def history_for(
        self,
        agent_id: str,
    ) -> List[AgentMessage]:

        return [
            message
            for message in self._history
            if (
                message.sender == agent_id
                or message.receiver == agent_id
            )
        ]

    # --------------------------------------------------
    # Statistics
    # --------------------------------------------------

    def statistics(self) -> Dict[str, Any]:

        return {
            "registered_agents": len(self._queues),
            "messages_sent": len(self._history),
            "pending_messages": {
                agent: queue.qsize()
                for agent, queue in self._queues.items()
            },
        }

    # --------------------------------------------------
    # Diagnostics
    # --------------------------------------------------

    def diagnostics(self) -> Dict[str, Any]:

        return {
            "statistics": self.statistics(),
        }

    # --------------------------------------------------
    # Utilities
    # --------------------------------------------------

    def clear_history(self) -> None:

        self._history.clear()

    def registered_agents(self) -> List[str]:

        return list(self._queues.keys())

    # --------------------------------------------------
    # Magic Methods
    # --------------------------------------------------

    def __len__(self):

        return len(self._queues)

    def __contains__(
        self,
        agent_id: str,
    ) -> bool:

        return agent_id in self._queues

    def __repr__(self):

        return (
            f"AgentCommunication("
            f"agents={len(self)}, "
            f"messages={len(self._history)})"
        )