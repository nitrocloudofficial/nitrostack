import time
import os
from typing import Dict, Any, Optional

from .router import RequestRouter
from .planner import WorkflowPlanner
from .registry import AgentRegistry
from .persistence import DatabaseManager
from .job_manager import JobManager, JobStatus, Workflow
from .concurrency import ConcurrencyController
from .queues import QueueManager
from .resource_manager import ResourceManager
from .worker_pool import AgentWorkerPool
from .scheduler import Scheduler

class OrchestratorAgent:
    """
    Enterprise Orchestrator Agent featuring Overload Protection architecture:
      - Workflow & Task Queues (Unlimited, Priority-based)
      - Per-agent Concurrency Control (Explorer: 5, Knowledge: 10, Documentation: 10, QA: 4, Demo: 2, Release: 5)
      - SQLite Persistence & Auto-Recovery after restart
      - Multi-user non-blocking worker pools
      - Continuous Resource & Queue Scheduler
    """
    def __init__(self, db_path: str = None, custom_limits: Dict[str, int] = None):
        self.router = RequestRouter()
        self.planner = WorkflowPlanner()
        self.registry = AgentRegistry()
        
        self.db = DatabaseManager(db_path=db_path)
        self.job_manager = JobManager(db_manager=self.db)
        self.concurrency = ConcurrencyController(custom_limits=custom_limits)
        self.queue_manager = QueueManager()
        self.resource_manager = ResourceManager()
        self.worker_pool = AgentWorkerPool(
            job_manager=self.job_manager,
            queue_manager=self.queue_manager,
            concurrency_controller=self.concurrency,
            registry=self.registry
        )
        self.scheduler = Scheduler(
            job_manager=self.job_manager,
            queue_manager=self.queue_manager,
            concurrency=self.concurrency,
            resource_manager=self.resource_manager,
            worker_pool=self.worker_pool
        )
        
        # Start background engine & recover any pending work
        self.start()

    def start(self):
        """
        Loads persisted state, recovers interrupted jobs, starts worker pool & scheduler.
        """
        recovered_wfs = self.job_manager.recover_from_db()
        for wf in recovered_wfs:
            self.queue_manager.enqueue_workflow(wf)
            
        self.worker_pool.start(num_workers=8)
        self.scheduler.start()

    def stop(self):
        self.scheduler.stop()
        self.worker_pool.stop()

    def submit_workflow(self, request: Dict[str, Any], user_id: str = "anonymous", priority: int = 1) -> str:
        """
        Non-blocking workflow submission.
        Enqueues workflow and returns unique workflow_id immediately.
        """
        goal = request.get("goal", "")
        req_type = self.router.route_request(goal)
        plan = self.planner.create_plan(req_type)

        wf = self.job_manager.create_workflow(
            user_id=user_id,
            goal=goal,
            plan=plan,
            priority=priority
        )
        
        self.queue_manager.enqueue_workflow(wf)
        return wf.workflow_id

    def get_workflow_status(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        wf = self.job_manager.get_workflow(workflow_id)
        if not wf:
            # Check DB directly in case of un-cached record
            db_wf = self.db.get_workflow(workflow_id)
            if not db_wf:
                return None
            return {
                "workflow_id": db_wf["workflow_id"],
                "status": db_wf["status"],
                "goal": db_wf["goal"],
                "context": db_wf["context"]
            }
            
        tasks = self.db.get_tasks_for_workflow(workflow_id)
        return {
            "workflow_id": wf.workflow_id,
            "user_id": wf.user_id,
            "goal": wf.goal,
            "status": wf.status.value,
            "priority": wf.priority,
            "context": wf.context,
            "tasks": tasks
        }

    def run(self, request: Dict[str, Any], user_id: str = "default_user", timeout: float = 30.0) -> Dict[str, Any]:
        """
        Synchronous wrapper around submit_workflow for backward compatibility / CLI execution.
        Waits for completion or timeout.
        """
        wf_id = self.submit_workflow(request, user_id=user_id)
        start_time = time.time()

        while time.time() - start_time < timeout:
            status = self.get_workflow_status(wf_id)
            if status and status["status"] in [JobStatus.COMPLETED.value, JobStatus.FAILED.value]:
                return status
            time.sleep(0.05)

        return {"workflow_id": wf_id, "status": "TIMEOUT", "error": "Workflow did not finish within timeout."}

    def get_system_status(self) -> Dict[str, Any]:
        return self.scheduler.get_metrics()
