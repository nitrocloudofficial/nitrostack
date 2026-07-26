import uuid
import time
import threading
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from .persistence import DatabaseManager

class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    WAITING = "WAITING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

@dataclass
class Task:
    task_id: str
    workflow_id: str
    agent_name: str
    status: JobStatus = JobStatus.QUEUED
    priority: int = 1
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    error_msg: Optional[str] = None
    retry_count: int = 0
    created_at: float = field(default_factory=time.time)

@dataclass
class Workflow:
    workflow_id: str
    user_id: str
    goal: str
    plan: List[str]
    current_step_index: int = 0
    status: JobStatus = JobStatus.QUEUED
    priority: int = 1
    context: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)

class JobManager:
    """
    Manages state, tracking, priority, and lifecycle for Workflows and Tasks.
    Thread-safe and backed by DatabaseManager for persistent recovery.
    """
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self._lock = threading.Lock()
        self.workflows: Dict[str, Workflow] = {}
        self.tasks: Dict[str, Task] = {}

    def create_workflow(self, user_id: str, goal: str, plan: List[str], priority: int = 1) -> Workflow:
        workflow_id = f"wf-{uuid.uuid4().hex[:8]}"
        wf = Workflow(
            workflow_id=workflow_id,
            user_id=user_id,
            goal=goal,
            plan=plan,
            priority=priority,
            status=JobStatus.QUEUED
        )
        with self._lock:
            self.workflows[workflow_id] = wf
            self.db.save_workflow(
                workflow_id=wf.workflow_id,
                user_id=wf.user_id,
                goal=wf.goal,
                status=wf.status.value,
                priority=wf.priority,
                plan=wf.plan,
                context=wf.context
            )
        return wf

    def create_task(self, workflow_id: str, agent_name: str, input_data: Dict[str, Any], priority: int = 1) -> Task:
        task_id = f"task-{uuid.uuid4().hex[:8]}"
        task = Task(
            task_id=task_id,
            workflow_id=workflow_id,
            agent_name=agent_name,
            priority=priority,
            input_data=input_data,
            status=JobStatus.QUEUED
        )
        with self._lock:
            self.tasks[task_id] = task
            self.db.save_task(
                task_id=task.task_id,
                workflow_id=task.workflow_id,
                agent_name=task.agent_name,
                status=task.status.value,
                priority=task.priority,
                input_data=task.input_data
            )
        return task

    def update_workflow_status(self, workflow_id: str, status: JobStatus, context: Dict[str, Any] = None):
        with self._lock:
            if workflow_id in self.workflows:
                wf = self.workflows[workflow_id]
                wf.status = status
                if context is not None:
                    wf.context = context
                self.db.save_workflow(
                    workflow_id=wf.workflow_id,
                    user_id=wf.user_id,
                    goal=wf.goal,
                    status=wf.status.value,
                    priority=wf.priority,
                    plan=wf.plan,
                    context=wf.context
                )

    def update_task_status(self, task_id: str, status: JobStatus, output_data: Dict[str, Any] = None, error_msg: str = None):
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                task.status = status
                if output_data is not None:
                    task.output_data = output_data
                if error_msg is not None:
                    task.error_msg = error_msg
                self.db.save_task(
                    task_id=task.task_id,
                    workflow_id=task.workflow_id,
                    agent_name=task.agent_name,
                    status=task.status.value,
                    priority=task.priority,
                    input_data=task.input_data,
                    output_data=task.output_data,
                    error_msg=task.error_msg,
                    retry_count=task.retry_count
                )

    def get_workflow(self, workflow_id: str) -> Optional[Workflow]:
        with self._lock:
            return self.workflows.get(workflow_id)

    def get_task(self, task_id: str) -> Optional[Task]:
        with self._lock:
            return self.tasks.get(task_id)

    def get_all_jobs_summary(self) -> Dict[str, Any]:
        with self._lock:
            running_wfs = sum(1 for w in self.workflows.values() if w.status == JobStatus.RUNNING)
            queued_wfs = sum(1 for w in self.workflows.values() if w.status == JobStatus.QUEUED)
            completed_wfs = sum(1 for w in self.workflows.values() if w.status == JobStatus.COMPLETED)
            failed_wfs = sum(1 for w in self.workflows.values() if w.status == JobStatus.FAILED)
            
            running_tasks = sum(1 for t in self.tasks.values() if t.status == JobStatus.RUNNING)
            queued_tasks = sum(1 for t in self.tasks.values() if t.status == JobStatus.QUEUED)
            
            return {
                "workflows": {
                    "running": running_wfs,
                    "queued": queued_wfs,
                    "completed": completed_wfs,
                    "failed": failed_wfs,
                    "total": len(self.workflows)
                },
                "tasks": {
                    "running": running_tasks,
                    "queued": queued_tasks,
                    "total": len(self.tasks)
                }
            }

    def recover_from_db(self) -> List[Workflow]:
        """
        Reloads persistent state from database after server restart.
        Resets interrupted RUNNING jobs to QUEUED and returns workflows to re-enqueue.
        """
        self.db.recover_interrupted_tasks()
        recovered_workflows = []
        
        active_wfs = self.db.get_active_workflows()
        for wf_dict in active_wfs:
            wf = Workflow(
                workflow_id=wf_dict["workflow_id"],
                user_id=wf_dict["user_id"],
                goal=wf_dict["goal"],
                plan=wf_dict["plan"],
                status=JobStatus(wf_dict["status"]),
                priority=wf_dict["priority"],
                context=wf_dict["context"]
            )
            self.workflows[wf.workflow_id] = wf
            recovered_workflows.append(wf)

        unfinished_ts = self.db.get_unfinished_tasks()
        for t_dict in unfinished_ts:
            t = Task(
                task_id=t_dict["task_id"],
                workflow_id=t_dict["workflow_id"],
                agent_name=t_dict["agent_name"],
                status=JobStatus(t_dict["status"]),
                priority=t_dict["priority"],
                input_data=t_dict["input_data"],
                output_data=t_dict["output_data"],
                error_msg=t_dict["error_msg"],
                retry_count=t_dict["retry_count"]
            )
            self.tasks[t.task_id] = t
            
        return recovered_workflows
