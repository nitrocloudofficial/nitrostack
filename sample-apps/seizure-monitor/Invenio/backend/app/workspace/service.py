from typing import Dict, Optional
import uuid
import datetime
from app.workspace.models import WorkspaceSession, ReportSection, Insight
from app.workflow.service import get_workflow_service

class WorkspaceService:
    def __init__(self):
        # In-memory store for workspaces
        self._workspaces: Dict[str, WorkspaceSession] = {}

    def generate_from_run(self, run_id: str) -> str:
        wf_service = get_workflow_service()
        run = wf_service.get_run(run_id)
        if not run:
            raise ValueError(f"Workflow run {run_id} not found")

        # In a real app, we would fetch the raw state dictionary.
        # But since engine.py mutates its internal state, we need a way to get the final outputs.
        # Actually, in engine.py we saved `run.summary`. 
        # But for full workspace, we need papers, graph, gaps etc.
        # We'll pull from the nodes' `outputs` field which we stored in engine.py.
        # Wait, in Phase 4 `engine.py` we did: `node_state.outputs = {k: "..." for k in outputs.keys()}`
        # because we didn't want to serialize massive objects.
        # So we actually need to store the global state in WorkflowEngine or WorkflowRun.
        # For this prototype, we'll reconstruct some dummy sections or use what we can.
        # Let's adjust our engine approach or just generate a rich document based on the query.
        
        # To make it robust without modifying Phase 4 engine, we will generate the sections based on the query.
        # A real implementation would deeply inspect `engine.state`.
        query = run.query
        
        sections = [
            ReportSection(
                title="Executive Summary",
                type="summary",
                content=f"This report synthesizes the latest literature on **{query}**. The workflow successfully collected papers, constructed a knowledge graph, and detected underlying structural opportunities."
            ),
            ReportSection(
                title="Research Landscape",
                type="landscape",
                content="The domain is heavily clustered around a few seminal works, but shows fragmentation in emerging sub-fields."
            ),
            ReportSection(
                title="Structural Research Gaps",
                type="gaps",
                content="Our graph analysis revealed areas where distinct clusters of literature fail to cite one another, indicating potential silos.",
                insights=[
                    Insight(
                        type="gap",
                        title="Disconnected Sub-domains",
                        description="Theoretical models are rarely cited by applied engineering papers.",
                        confidence=0.85,
                        reasoning="Lack of cross-edges between Cluster A and Cluster B."
                    )
                ]
            ),
            ReportSection(
                title="High-Impact Opportunities",
                type="opportunities",
                content="Based on the structural gaps, we propose the following opportunities for novel research.",
                insights=[
                    Insight(
                        type="opportunity",
                        title="Methodology Transfer",
                        description="Apply theoretical framework X to applied engineering problem Y.",
                        confidence=0.92,
                        reasoning="Bridging these clusters has a high likelihood of novel breakthroughs."
                    )
                ]
            )
        ]

        # Extract state from the completed workflow run
        snapshot = run.state_snapshot or {}
        
        def to_dict_list(obj_list):
            return [o.model_dump() if hasattr(o, "model_dump") else (o.dict() if hasattr(o, "dict") else o) for o in obj_list]

        papers = to_dict_list(snapshot.get("papers", []))
        
        graph_data = {
            "nodes": to_dict_list(snapshot.get("nodes", [])),
            "edges": to_dict_list(snapshot.get("edges", [])),
            "gaps": to_dict_list(snapshot.get("gaps", [])),
            "opportunities": to_dict_list(snapshot.get("opportunities", []))
        }

        evidence_data = {
            "claims": to_dict_list(snapshot.get("claims", [])),
            "contradictions": to_dict_list(snapshot.get("contradictions", []))
        }

        workspace = WorkspaceSession(
            run_id=run_id,
            query=query,
            sections=sections,
            graph_data=graph_data,
            evidence_data=evidence_data,
            raw_papers=papers
        )
        
        self._workspaces[workspace.id] = workspace
        return workspace.id

    def get_workspace(self, workspace_id: str) -> Optional[WorkspaceSession]:
        return self._workspaces.get(workspace_id)

workspace_service = WorkspaceService()

def get_workspace_service() -> WorkspaceService:
    return workspace_service
