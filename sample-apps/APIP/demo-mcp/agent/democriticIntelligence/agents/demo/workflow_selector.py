from .models import Workflow
from typing import List

class WorkflowSelector:
    """Chooses which workflow becomes a demo."""
    
    def select(self, workflows: List[Workflow], strategy: str = "most_used") -> Workflow:
        if not workflows:
            raise ValueError("No workflows provided to select from.")
            
        # Implementing simple selection strategy
        if strategy == "most_used":
            # In a real implementation, this would sort by usage metrics
            return workflows[0]
        elif strategy == "longest":
            return max(workflows, key=lambda w: len(w.steps))
        elif strategy == "random":
            import random
            return random.choice(workflows)
        
        return workflows[0]
