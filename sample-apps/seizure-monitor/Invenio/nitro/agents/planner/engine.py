import asyncio
import time
import json
import logging
from typing import AsyncGenerator, Callable, Any, Dict

from nitro.agents.research.engine import ResearchEngine
from nitro.agents.correlation.engine import CorrelationEngine
from nitro.agents.evidence.engine import EvidenceEngine
from nitro.agents.hypothesis.engine import HypothesisEngine
from nitro.agents.report.engine import ReportEngine
from .models import PlannerContext, TaskContext, AgentState

logger = logging.getLogger(__name__)

class PlannerEngine:
    def __init__(self):
        self.r_engine = ResearchEngine()
        self.c_engine = CorrelationEngine()
        self.e_engine = EvidenceEngine()
        self.h_engine = HypothesisEngine()
        self.rep_engine = ReportEngine()

    async def _execute_task(self, ctx: PlannerContext, agent_name: str, func: Callable, *args, retries: int = 2) -> Any:
        task = ctx.tasks[agent_name]
        task.state = AgentState.RUNNING
        task.start_time = time.time()
        
        attempt = 0
        while attempt <= retries:
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args)
                else:
                    result = func(*args)
                    
                task.artifact = result
                task.state = AgentState.COMPLETED
                task.end_time = time.time()
                return result
            except Exception as e:
                attempt += 1
                if attempt <= retries:
                    task.state = AgentState.RETRYING
                    await asyncio.sleep(1) # Backoff
                else:
                    task.state = AgentState.FAILED
                    task.end_time = time.time()
                    task.error = str(e)
                    raise e

    async def execute_pipeline(self, query: str) -> AsyncGenerator[str, None]:
        """Runs the entire DAG. Yields JSON state updates for the Canvas UI."""
        ctx = PlannerContext(
            query=query,
            tasks={
                "ResearchAgent": TaskContext(agent_name="ResearchAgent"),
                "DatasetAgent": TaskContext(agent_name="DatasetAgent"),
                "RepositoryAgent": TaskContext(agent_name="RepositoryAgent"),
                "CorrelationAgent": TaskContext(agent_name="CorrelationAgent"),
                "EvidenceAgent": TaskContext(agent_name="EvidenceAgent"),
                "HypothesisAgent": TaskContext(agent_name="HypothesisAgent"),
                "ReportAgent": TaskContext(agent_name="ReportAgent")
            }
        )
        
        def dump_state():
            state_dict = {}
            for name, task in ctx.tasks.items():
                state_dict[name] = {
                    "state": task.state.value,
                    "execution_time": round(task.execution_time, 2),
                    "has_artifact": task.artifact is not None
                }
            return json.dumps(state_dict)

        yield dump_state()
        
        try:
            # 1. PARALLEL EXECUTION: Research + Mock Datasets + Mock Repos
            # We mock Datasets and Repos just to prove parallel orchestration capability
            async def mock_dataset_engine(q):
                await asyncio.sleep(0.5)
                return "MockDatasetPackage"
            
            async def mock_repo_engine(q):
                await asyncio.sleep(0.5)
                return "MockRepoPackage"
                
            results = await asyncio.gather(
                self._execute_task(ctx, "ResearchAgent", self.r_engine.search_papers, query),
                self._execute_task(ctx, "DatasetAgent", mock_dataset_engine, query),
                self._execute_task(ctx, "RepositoryAgent", mock_repo_engine, query),
                return_exceptions=False
            )
            r_pkg = results[0]
            yield dump_state()
            
            # 2. SEQUENTIAL EXECUTION: Correlation
            c_pkg = await self._execute_task(ctx, "CorrelationAgent", self.c_engine.process, r_pkg)
            yield dump_state()
            
            # 3. SEQUENTIAL EXECUTION: Evidence
            e_pkg = await self._execute_task(ctx, "EvidenceAgent", self.e_engine.process, c_pkg, r_pkg.papers)
            yield dump_state()
            
            # 4. SEQUENTIAL EXECUTION: Hypothesis
            h_pkg = await self._execute_task(ctx, "HypothesisAgent", self.h_engine.process, e_pkg)
            yield dump_state()
            
            # 5. SEQUENTIAL EXECUTION: Report
            rep_pkg = await self._execute_task(ctx, "ReportAgent", self.rep_engine.process, query, r_pkg, c_pkg, e_pkg, h_pkg)
            yield dump_state()
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            yield dump_state()
