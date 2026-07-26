"""Custom exception hierarchy for the Explorer Agent."""


class ExplorerException(Exception):
    """Base exception for all Explorer Agent errors."""
    pass


class BrowserControllerError(ExplorerException):
    """Raised when browser initialization, navigation, or tab management fails."""
    pass


class ActionExecutionError(ExplorerException):
    """Raised when an action fails to execute on a target element."""
    pass


class DOMAnalysisError(ExplorerException):
    """Raised when DOM parsing or element extraction fails."""
    pass


class PlanningError(ExplorerException):
    """Raised when the exploration planner encounters an unrecoverable decision loop or invalid state."""
    pass


class PublishingError(ExplorerException):
    """Raised when publishing or saving exploration results fails."""
    pass


class NavigationGraphError(ExplorerException):
    """Raised when graph operations fail."""
    pass


class AuthenticationError(ExplorerException):
    """Raised when target application authentication fails."""
    pass
