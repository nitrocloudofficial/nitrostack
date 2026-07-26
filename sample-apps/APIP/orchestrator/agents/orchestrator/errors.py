class ErrorHandler:
    """
    Handles failures gracefully.
    """
    def handle(self, exception: Exception, step: str) -> bool:
        print(f"[ERROR] Step '{step}' failed: {str(exception)}")
        # For Hackathon MVP: stop execution on any error by returning False
        return False 
