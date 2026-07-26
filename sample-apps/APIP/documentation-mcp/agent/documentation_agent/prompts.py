"""Reusable LLM prompt templates."""

import json

from models import ProductKnowledgeGraph, Workflow


class PromptLibrary:
    """Builds prompts for documentation generation."""

    SYSTEM_PROMPT = """
You are an expert Technical Writer.

Write professional documentation for enterprise SaaS software.
Use clear language.
Generate Markdown.
Include numbered steps.
Include Notes sections.
Include Tips sections.
Do not hallucinate unavailable information.
Use only the provided Product Knowledge Graph.
""".strip()

    def user_guide(
        self,
        graph: ProductKnowledgeGraph,
        workflows: list[Workflow],
    ) -> str:
        """Build the User Guide prompt."""
        return (
            f"{self.SYSTEM_PROMPT}\n\n"
            f"Create a professional User Guide for version {graph.version}.\n"
            f"Workflows:\n{self._serialize(workflows)}"
        )

    def faq(self, graph: ProductKnowledgeGraph) -> str:
        """Build the FAQ prompt."""
        return (
            f"{self.SYSTEM_PROMPT}\n\n"
            "Create a concise FAQ based only on this graph:\n"
            f"{self._serialize(graph)}"
        )

    def release_notes(
        self,
        graph: ProductKnowledgeGraph,
        workflows: list[Workflow],
    ) -> str:
        """Build the Release Notes prompt."""
        return (
            f"{self.SYSTEM_PROMPT}\n\n"
            f"Create Release Notes for version {graph.version}.\n"
            "Do not invent release dates, fixes, or changes.\n"
            f"Documented capabilities:\n{self._serialize(workflows)}"
        )

    @staticmethod
    def _serialize(value: object) -> str:
        """Convert Pydantic content to readable JSON."""
        return json.dumps(
            value,
            default=lambda item: (
                item.model_dump()
                if hasattr(item, "model_dump")
                else str(item)
            ),
            indent=2,
        )