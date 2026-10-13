import re
from .models import CopilotRequest, CopilotResponse, CopilotAction, ActionType

class CopilotEngine:
    def process(self, request: CopilotRequest) -> CopilotResponse:
        query = request.query.lower()
        ctx = request.context
        
        actions = []
        cited_evidence_ids = []
        cited_paper_ids = []
        markdown_text = ""
        confidence = 0.0

        # Heuristic Intent 1: Explain active contradiction
        if "explain" in query and "contradiction" in query and ctx.active_node_type == "Contradiction":
            evidence_pkg = request.packages.get("evidencePackage", {})
            contradictions = evidence_pkg.get("contradictions", [])
            
            # Find the exact contradiction from context
            target = next((c for c in contradictions if c.get("id") == ctx.active_node_id), None)
            
            if target:
                markdown_text = f"This contradiction arises because **Paper {target['evidence']['claim_1']['source_paper_id']}** and **Paper {target['evidence']['claim_2']['source_paper_id']}** present fundamentally opposed findings.\n\n"
                markdown_text += f"> **Claim 1:** {target['evidence']['claim_1']['text']}\n\n"
                markdown_text += f"> **Claim 2:** {target['evidence']['claim_2']['text']}\n\n"
                markdown_text += "I have highlighted both source papers in your Knowledge Graph for review."
                
                cited_paper_ids.extend([
                    target['evidence']['claim_1']['source_paper_id'],
                    target['evidence']['claim_2']['source_paper_id']
                ])
                cited_evidence_ids.extend([
                    target['evidence']['claim_1']['id'],
                    target['evidence']['claim_2']['id']
                ])
                confidence = 0.95
                
                # Emit UI Action
                actions.append(CopilotAction(
                    action_type=ActionType.HIGHLIGHT_GRAPH,
                    payload={"node_ids": cited_paper_ids}
                ))
            else:
                markdown_text = "I could not locate the specific contradiction in the Evidence Package."
                confidence = 0.0
                
        # Heuristic Intent 2: Search more papers (Planner Delegation)
        elif "search more papers" in query or "find more" in query:
            markdown_text = "I am instructing the Planner Agent to execute another pass through the Research Agent to expand the corpus."
            confidence = 1.0
            actions.append(CopilotAction(
                action_type=ActionType.DELEGATE_PLANNER,
                payload={"agent": "ResearchAgent", "command": "expand_corpus"}
            ))
            
        # Fallback
        else:
            markdown_text = "My context is strictly bound to the generated Invenio packages. Please select a node in the Knowledge Graph or Workspace, or ask me to explain a specific contradiction, hypothesis, or claim."
            confidence = 1.0

        return CopilotResponse(
            markdown_text=markdown_text,
            cited_evidence_ids=cited_evidence_ids,
            cited_paper_ids=cited_paper_ids,
            confidence=confidence,
            actions=actions
        )
