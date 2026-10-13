import uuid
import asyncio
from typing import Dict, Optional
from app.workflow.models import WorkflowRun
from app.workflow.engine import WorkflowEngine

class WorkflowService:
    def __init__(self):
        # In-memory store for active workflow runs
        self._runs: Dict[str, WorkflowRun] = {}

    def start_workflow(self, query: str) -> str:
        run_id = str(uuid.uuid4())
        run = WorkflowRun(id=run_id, query=query)
        self._runs[run_id] = run
        
        # Fire and forget execution
        engine = WorkflowEngine(run)
        asyncio.create_task(engine.execute())
        
        return run_id

    def get_run(self, run_id: str) -> Optional[WorkflowRun]:
        return self._runs.get(run_id)

# Global singleton to retain state across API requests
workflow_service = WorkflowService()

def get_workflow_service() -> WorkflowService:
    return workflow_service
