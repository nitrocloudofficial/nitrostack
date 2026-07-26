"""Custom exception hierarchy for Release Intelligence Agent."""


class ReleaseIntelligenceError(Exception):
    """Base exception class for all Release Intelligence Agent errors."""
    pass


class VersionLoadError(ReleaseIntelligenceError):
    """Raised when loading or validating a Knowledge Graph version fails."""
    pass


class DiffError(ReleaseIntelligenceError):
    """Raised when graph comparison or diffing fails."""
    pass


class ImpactAnalysisError(ReleaseIntelligenceError):
    """Raised when impact analysis logic or LLM inference fails."""
    pass


class ValidationError(ReleaseIntelligenceError):
    """Raised when release validation rules fail."""
    pass


class PublishError(ReleaseIntelligenceError):
    """Raised when publishing release outputs fails."""
    pass
