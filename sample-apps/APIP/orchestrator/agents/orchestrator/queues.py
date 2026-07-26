import queue
import threading
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from .job_manager import Task, Workflow

@dataclass(order=True)
class PrioritizedTask:
    priority: int  # lower number = higher priority for PriorityQueue
    created_at: float
    task: Task = field(compare=False)

@dataclass(order=True)
class PrioritizedWorkflow:
    priority: int
    created_at: float
    workflow: Workflow = field(compare=False)

class QueueManager:
    """
    Manages Workflow Queues and Per-Agent Priority Task Queues.
    Supports unlimited queuing without rejection, crash, or blocking.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self.workflow_queue: queue.PriorityQueue[PrioritizedWorkflow] = queue.PriorityQueue()
        self.agent_queues: Dict[str, queue.PriorityQueue[PrioritizedTask]] = {}

    def _get_agent_queue(self, agent_name: str) -> queue.PriorityQueue[PrioritizedTask]:
        with self._lock:
            if agent_name not in self.agent_queues:
                self.agent_queues[agent_name] = queue.PriorityQueue()
            return self.agent_queues[agent_name]

    def enqueue_workflow(self, workflow: Workflow):
        # Priority mapping: 1 (High) -> 10, priority in PriorityQueue is lower number first
        # Convert user priority (higher number = higher priority) to sorting key (lower number = first)
        sort_priority = 100 - workflow.priority
        item = PrioritizedWorkflow(priority=sort_priority, created_at=workflow.created_at, workflow=workflow)
        self.workflow_queue.put(item)

    def dequeue_workflow(self) -> Optional[Workflow]:
        try:
            item = self.workflow_queue.get_nowait()
            return item.workflow
        except queue.Empty:
            return None

    def enqueue_task(self, task: Task):
        q = self._get_agent_queue(task.agent_name)
        sort_priority = 100 - task.priority
        item = PrioritizedTask(priority=sort_priority, created_at=task.created_at, task=task)
        q.put(item)

    def dequeue_task(self, agent_name: str) -> Optional[Task]:
        q = self._get_agent_queue(agent_name)
        try:
            item = q.get_nowait()
            return item.task
        except queue.Empty:
            return None

    def get_queue_lengths(self) -> Dict[str, int]:
        with self._lock:
            lengths = {
                "workflows": self.workflow_queue.qsize()
            }
            for agent, q in self.agent_queues.items():
                lengths[f"agent_{agent}"] = q.qsize()
            return lengths
