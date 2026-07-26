class ResultAggregator:
    """
    Collects outputs and returns one combined response.
    """
    def combine(self, context: dict) -> dict:
        result = {
            "status": "Completed",
            "outputs": {}
        }
        for key, value in context.items():
            result["outputs"][key] = value
            
        return result
