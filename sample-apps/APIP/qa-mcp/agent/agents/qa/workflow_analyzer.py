from typing import List, Dict, Any
from .models import Workflow, Page, APIEndpoint, Form

class WorkflowAnalyzer:
    def __init__(self, workflows: List[Workflow], pages: List[Page], apis: List[APIEndpoint], forms: List[Form]):
        self.workflows = workflows
        self.pages = {p.id: p for p in pages}
        self.apis = {a.id: a for a in apis}
        self.forms = {f.id: f for f in forms}
        
    def analyze(self) -> List[Dict[str, Any]]:
        """
        Analyzes workflows to validate targets and trace paths.
        Returns a list of potential issues or insights.
        """
        insights = []
        for wf in self.workflows:
            if wf.start_page_id not in self.pages:
                insights.append({
                    "workflow_id": wf.id,
                    "issue": f"Start page '{wf.start_page_id}' not found in the graph."
                })
            
            for step in wf.steps:
                target_id = step.target_id
                if not any(target_id in collection for collection in [self.pages, self.apis, self.forms]):
                    insights.append({
                        "workflow_id": wf.id,
                        "issue": f"Step target '{target_id}' is invalid or missing.",
                        "step_action": step.action
                    })
        return insights
