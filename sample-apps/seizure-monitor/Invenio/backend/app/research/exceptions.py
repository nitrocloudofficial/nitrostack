"""
Domain exceptions for the Research package.
"""

class ResearchException(Exception):
    """Base exception for research package."""
    pass

class ProviderError(ResearchException):
    """Raised when a specific provider fails to respond or errors out."""
    def __init__(self, provider_name: str, message: str, status_code: int | None = None):
        self.provider_name = provider_name
        self.status_code = status_code
        super().__init__(f"[{provider_name}] {message}")

class NormalizationError(ResearchException):
    """Raised when raw provider data cannot be normalized to the canonical model."""
    pass
