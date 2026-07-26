class ContextManager:
    """
    Passes outputs from one agent to the next.
    """
    def __init__(self):
        self.context = {}
    
    def get_context(self):
        return self.context
        
    def update(self, key: str, value: any):
        self.context[key] = value
