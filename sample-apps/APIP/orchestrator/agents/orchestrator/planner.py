class WorkflowPlanner:
    def create_plan(self, request_type: str) -> list:
        """
        Creates execution plan based on request type.
        Available agents: explorer, knowledge_graph, documentation, qa, demo, release.
        """
        base_plan = ["explorer", "knowledge_graph"]
        req = request_type.lower()
        
        if req == "qa":
            return base_plan + ["qa"]
        elif req == "documentation":
            return base_plan + ["documentation"]
        elif req == "demo":
            return base_plan + ["demo"]
        elif req == "release":
            return base_plan + ["release"]
            
        # Default full suite
        return base_plan + ["documentation", "qa", "demo", "release"]
