import asyncio
import time
import datetime
from typing import Dict, Any, List
from app.workflow.models import WorkflowRun, WorkflowNodeState, ExecutionLog
from app.workflow.nodes import (
    BaseNode, 
    PlannerNode,
    ResearchSearchNode, 
    KnowledgeGraphNode,
    CorrelationNode, 
    EvidenceNode, 
    ReportNode
)

class WorkflowEngine:
    def __init__(self, run: WorkflowRun):
        self.run = run
        self.state: Dict[str, Any] = {"query": run.query}
        
        # Define the sequential DAG using MCP Server components
        self.nodes: List[BaseNode] = [
            PlannerNode(),
            ResearchSearchNode(),
            KnowledgeGraphNode(),
            CorrelationNode(),
            EvidenceNode(),
            ReportNode()
        ]
        
        # Initialize run nodes
        for n in self.nodes:
            self.run.nodes.append(WorkflowNodeState(
                id=n.id,
                type=n.type,
                label=n.label,
                status="pending"
            ))

    def _log(self, level: str, message: str, node_id: str):
        self.run.logs.append(ExecutionLog(
            level=level,
            message=message,
            node_id=node_id
        ))

    async def execute(self):
        self.run.status = "running"
        
        for i, executor in enumerate(self.nodes):
            node_state = self.run.nodes[i]
            node_state.status = "running"
            node_state.start_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
            
            start_ms = time.time()
            self._log("info", f"Starting {executor.label}...", executor.id)
            
            try:
                # Add slight delay for visual effect
                await asyncio.sleep(0.5)
                
                outputs, confidence, message = await executor.execute(self.state)
                
                # Merge outputs into global state
                for k, v in outputs.items():
                    self.state[k] = v
                    
                node_state.outputs = {k: "..." for k in outputs.keys()} # Don't serialize massive objects
                node_state.confidence = confidence
                node_state.status = "completed"
                
                self._log("success", message, executor.id)
                
            except Exception as e:
                node_state.status = "failed"
                node_state.error = str(e)
                self.run.status = "failed"
                self._log("error", f"Failed: {str(e)}", executor.id)
                break
                
            finally:
                node_state.end_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
                node_state.execution_ms = int((time.time() - start_ms) * 1000)

        if self.run.status != "failed":
            self.run.status = "completed"
            self.run.summary = self.state.get("summary", {})
            self.run.state_snapshot = self.state
            
        self.run.end_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
