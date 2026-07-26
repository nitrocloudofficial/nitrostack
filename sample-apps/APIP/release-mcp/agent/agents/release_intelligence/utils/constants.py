"""Constants and enumeration definitions for Release Intelligence Agent."""

from enum import Enum


class ChangeCategory(str, Enum):
    """Categories for graph differences."""
    ADDED = "Added"
    MODIFIED = "Modified"
    REMOVED = "Removed"
    RENAMED = "Renamed"
    MOVED = "Moved"
    DEPRECATED = "Deprecated"
    RELATIONSHIP_CHANGED = "Relationship Changed"
    PERMISSION_CHANGED = "Permission Changed"
    WORKFLOW_CHANGED = "Workflow Changed"


class RiskLevel(str, Enum):
    """Release risk severity level."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class TargetAudience(str, Enum):
    """Audiences for Release Notes."""
    CUSTOMER = "Customer"
    INTERNAL_ENGINEERING = "Internal Engineering"
    EXECUTIVE = "Executive"
    TECHNICAL = "Technical"


class ChangelogFormat(str, Enum):
    """Output formats for Changelog."""
    MARKDOWN = "Markdown"
    JSON = "JSON"
    PLAIN_TEXT = "Plain Text"
    HTML = "HTML"


AGENT_NAME = "Release Intelligence Agent"
DEFAULT_OUTPUT_DIR = "artifacts/release_intelligence"
DEFAULT_LOG_LEVEL = "INFO"
