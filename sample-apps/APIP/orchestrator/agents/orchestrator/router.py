class RequestRouter:
    def route_request(self, user_request: str) -> str:
        """
        Determines what the user wants and routes to the appropriate primary flow.
        """
        req = user_request.lower()
        if "qa" in req or "test" in req:
            return "qa"
        elif "doc" in req:
            return "documentation"
        elif "demo" in req:
            return "demo"
        return "full_suite"
