import threading
import time
import traceback
from typing import Dict, Any, Callable
from .job_manager import JobManager, Task, JobStatus
from .concurrency import ConcurrencyController
from .queues import QueueManager
from .registry import AgentRegistry

class AgentWorkerPool:
    """
    Manages asynchronous worker threads per agent.
    Pulls queued tasks when concurrency slots open up.
    """
    def __init__(self, job_manager: JobManager, queue_manager: QueueManager, concurrency_controller: ConcurrencyController, registry: AgentRegistry):
        self.job_manager = job_manager
        self.queue_manager = queue_manager
        self.concurrency = concurrency_controller
        self.registry = registry
        self._running = False
        self._workers: list[threading.Thread] = []
        self._lock = threading.Lock()

    def start(self, num_workers: int = 8):
        with self._lock:
            if self._running:
                return
            self._running = True
            for i in range(num_workers):
                t = threading.Thread(target=self._worker_loop, name=f"AgentWorker-{i+1}", daemon=True)
                t.start()
                self._workers.append(t)

    def stop(self):
        with self._lock:
            self._running = False

    def execute_task_async(self, task: Task, context: Dict[str, Any], callback: Callable = None):
        """
        Dispatches a task execution to a background thread once slot acquired.
        """
        def _run():
            agent_name = task.agent_name
            try:
                task.status = JobStatus.RUNNING
                self.job_manager.update_task_status(task.task_id, JobStatus.RUNNING)
                agent = self.registry.get(agent_name)
                if not agent:
                    raise ValueError(f"Agent '{agent_name}' not found in registry")

                output = agent.run(context)
                task.status = JobStatus.COMPLETED
                task.output_data = output
                self.job_manager.update_task_status(task.task_id, JobStatus.COMPLETED, output_data=output)
            except Exception as e:
                err_msg = f"{str(e)}\n{traceback.format_exc()}"
                task.status = JobStatus.FAILED
                task.error_msg = err_msg
                self.job_manager.update_task_status(task.task_id, JobStatus.FAILED, error_msg=err_msg)
            finally:
                self.concurrency.release(agent_name)
                if callback:
                    callback(task)

        t = threading.Thread(target=_run, daemon=True)
        t.start()

    def _worker_loop(self):
        while self._running:
            time.sleep(0.01)
