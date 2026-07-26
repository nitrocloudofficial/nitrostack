"""Abstract Base Classes and Interfaces for Release Intelligence Agent components."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pathlib import Path


class IVersionLoader(ABC):
    """Interface for loading and validating Knowledge Graph versions."""

    @abstractmethod
    def load_graph(self, version_data: Any) -> Any:
        """Load and deserialize a Knowledge Graph version input into strongly typed models."""
        pass


class IGraphDiffEngine(ABC):
    """Interface for comparing two Knowledge Graph versions deterministically."""

    @abstractmethod
    def compare(self, old_graph: Any, new_graph: Any) -> Any:
        """Compare two Knowledge Graph versions and return a GraphDiff model."""
        pass


class IChangeAnalyzer(ABC):
    """Interface for categorizing and structuring graph differences into Change objects."""

    @abstractmethod
    def analyze_changes(self, diff: Any) -> List[Any]:
        """Categorize raw graph diffs into structured Change objects."""
        pass


class IImpactAnalyzer(ABC):
    """Interface for evaluating AI-driven business, technical, and risk impacts from changes."""

    @abstractmethod
    async def analyze_impact(self, changes: List[Any]) -> Any:
        """Analyze business and technical impact using LLM reasoning or fallback heuristics."""
        pass


class IReleaseNotesGenerator(ABC):
    """Interface for generating release notes tailored for multiple audiences."""

    @abstractmethod
    def generate(self, changes: List[Any], impact: Any) -> Any:
        """Generate Release Notes model containing multi-audience sections."""
        pass


class IChangelogGenerator(ABC):
    """Interface for generating formatted changelogs in multiple formats."""

    @abstractmethod
    def generate(self, changes: List[Any], format_type: str = "Markdown") -> Any:
        """Generate structured Changelog in the specified format (Markdown, JSON, Text, HTML)."""
        pass


class IValidationChecker(ABC):
    """Interface for checking consistency and quality of generated release outputs."""

    @abstractmethod
    def validate_release(self, release_result: Any) -> Any:
        """Validate complete ReleaseResult object."""
        pass

    @abstractmethod
    def validate_changes(self, changes: List[Any]) -> Any:
        """Validate structured list of Change objects."""
        pass


class IPublisher(ABC):
    """Interface for packaging and publishing release intelligence outputs."""

    @abstractmethod
    def publish(self, release_result: Any, output_dir: Optional[Path] = None) -> Dict[str, str]:
        """Publish ReleaseResult artifacts to disk or external targets."""
        pass
