from dataclasses import dataclass, field
from datetime import datetime
import uuid

VALID_TYPES = ("fact", "decision", "event", "result")

@dataclass
class Memory:
    content: str
    memory_type: str
    project_id: str
    task_id: str
    agent_id: str
    importance: float = 0.5
    memory_id: str = field(default_factory=lambda: f"mem_{uuid.uuid4().hex[:8]}")
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def __post_init__(self):
        if self.memory_type not in VALID_TYPES:
            raise ValueError(f"memory_type must be one of {VALID_TYPES}, got {self.memory_type}")

    def to_dict(self):
        return {
            "memory_id": self.memory_id,
            "content": self.content,
            "memory_type": self.memory_type,
            "project_id": self.project_id,
            "task_id": self.task_id,
            "agent_id": self.agent_id,
            "importance": self.importance,
            "timestamp": self.timestamp,
        }
