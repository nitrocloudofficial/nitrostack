import time
import threading
from typing import Dict, Any, List
from .job_manager import JobManager, JobStatus, Task, Workflow
from .concurrency import ConcurrencyController
from .queues import QueueManager
from .resource_manager import ResourceManager
from .worker_pool import AgentWorkerPool

class Scheduler:
    """
    Continuous background scheduler monitoring queues, worker availability,
    concurrency limits, and resource utilization.
    
    Optimizes:
      - Maximum throughput
      - Minimum waiting time
      - Fair scheduling across users
      - Priority scheduling
      - Resource utilization
    """
    def __init__(
        self,
        job_manager: JobManager,
        queue_manager: QueueManager,
        concurrency: ConcurrencyController,
        resource_manager: ResourceManager,
        worker_pool: AgentWorkerPool
    ):
        self.job_manager = job_manager
        self.queue_manager = queue_manager
        self.concurrency = concurrency
        self.resource_manager = resource_manager
        self.worker_pool = worker_pool
        self._running = False
        self._thread = None
        self._lock = threading.Lock()

    def start(self):
        with self._lock:
            if self._running:
                return
            self._running = True
            self._thread = threading.Thread(target=self._schedule_loop, name="OrchestratorScheduler", daemon=True)
            self._thread.start()

    def stop(self):
        with self._lock:
            self._running = False

    def _schedule_loop(self):
        while self._running:
            try:
                if self.resource_manager.is_resource_available():
                    self._process_workflow_queue()
                    self._process_agent_queues()
                time.sleep(0.01)
            except Exception as e:
                print(f"[Scheduler Error]: {e}")
                time.sleep(0.05)

    def _process_workflow_queue(self):
        """
        Dequeues all waiting workflows and initializes their next required agent tasks.
        """
        while True:
            wf = self.queue_manager.dequeue_workflow()
            if not wf:
                break
            self.job_manager.update_workflow_status(wf.workflow_id, JobStatus.RUNNING)
            self._dispatch_next_workflow_step(wf)

    def _dispatch_next_workflow_step(self, wf: Workflow):
        if wf.current_step_index >= len(wf.plan):
            self.job_manager.update_workflow_status(wf.workflow_id, JobStatus.COMPLETED)
            return

        next_agent = wf.plan[wf.current_step_index]
        task = self.job_manager.create_task(
            workflow_id=wf.workflow_id,
            agent_name=next_agent,
            input_data={"context": wf.context, "goal": wf.goal},
            priority=wf.priority
        )
        self.queue_manager.enqueue_task(task)

    def _process_agent_queues(self):
        """
        Iterates over all agents and dispatches tasks while concurrency slot is available.
        """
        for agent_name in list(self.concurrency.limits.keys()):
            while self.concurrency.can_acquire(agent_name):
                task = self.queue_manager.dequeue_task(agent_name)
                if not task:
                    break
                if self.concurrency.acquire(agent_name):
                    wf = self.job_manager.get_workflow(task.workflow_id)
                    ctx = {"goal": wf.goal, **(wf.context if wf else {})} if wf else task.input_data
                    self.worker_pool.execute_task_async(
                        task=task,
                        context=ctx,
                        callback=lambda t, target_wf_id=task.workflow_id: self._on_task_complete(t, target_wf_id)
                    )

    def _on_task_complete(self, task: Task, workflow_id: str):
        wf = self.job_manager.get_workflow(workflow_id)
        if not wf:
            return

        if task.status == JobStatus.COMPLETED:
            if task.output_data:
                wf.context.update(task.output_data)
            wf.current_step_index += 1
            self.job_manager.update_workflow_status(workflow_id, JobStatus.RUNNING, context=wf.context)
            
            if wf.current_step_index < len(wf.plan):
                self._dispatch_next_workflow_step(wf)
            else:
                self.job_manager.update_workflow_status(workflow_id, JobStatus.COMPLETED, context=wf.context)
        elif task.status == JobStatus.FAILED:
            self.job_manager.update_workflow_status(workflow_id, JobStatus.FAILED)

    def get_metrics(self) -> Dict[str, Any]:
        return {
            "jobs_summary": self.job_manager.get_all_jobs_summary(),
            "concurrency": self.concurrency.get_status(),
            "queues": self.queue_manager.get_queue_lengths(),
            "resources": self.resource_manager.get_metrics()
        }
