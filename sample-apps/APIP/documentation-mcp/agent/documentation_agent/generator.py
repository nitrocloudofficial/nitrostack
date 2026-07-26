"""Generate documentation using OpenAI GPT-5."""

import logging

from openai import AsyncOpenAI

from config import Settings
from models import ProductKnowledgeGraph, Workflow
from prompts import PromptLibrary


class DocumentGenerator:
    """Generates Markdown documents using GPT-5 or a safe local fallback."""

    def __init__(
        self,
        settings: Settings,
        prompts: PromptLibrary,
    ) -> None:
        self._settings = settings
        self._prompts = prompts
        self._logger = logging.getLogger(__name__)

        self._client = (
            AsyncOpenAI(api_key=settings.openai_api_key)
            if settings.openai_api_key
            else None
        )

    async def generate_user_guide(
        self,
        graph: ProductKnowledgeGraph,
        workflows: list[Workflow],
        use_llm: bool = True,
    ) -> str:
        """Generate a User Guide."""
        fallback = self._offline_user_guide(graph, workflows)

        return await self._generate(
            self._prompts.user_guide(graph, workflows),
            fallback,
            use_llm,
        )

    async def generate_faq(
        self,
        graph: ProductKnowledgeGraph,
        use_llm: bool = True,
    ) -> str:
        """Generate an FAQ."""
        topics = graph.features or graph.workflows

        fallback_sections = ["# FAQ"]

        for topic in topics:
            title = getattr(topic, "name", "Feature")
            description = getattr(
                topic,
                "description",
                "Refer to the User Guide for available information.",
            )

            fallback_sections.append(
                f"## What is {title}?\n\n{description or 'No additional details are available.'}"
            )

        return await self._generate(
            self._prompts.faq(graph),
            "\n\n".join(fallback_sections),
            use_llm,
        )

    async def generate_release_notes(
        self,
        graph: ProductKnowledgeGraph,
        workflows: list[Workflow],
        use_llm: bool = True,
    ) -> str:
        """Generate Release Notes."""
        lines = [
            "# Release Notes",
            f"## Version {graph.version}",
            "### Documented capabilities",
        ]

        for workflow in workflows:
            lines.append(
                f"- **{workflow.name}**: "
                f"{workflow.description or 'Workflow documented in this release.'}"
            )

        return await self._generate(
            self._prompts.release_notes(graph, workflows),
            "\n\n".join(lines),
            use_llm,
        )

    async def _generate(
        self,
        prompt: str,
        fallback: str,
        use_llm: bool,
    ) -> str:
        """Call OpenAI, or return graph-only fallback Markdown."""
        if not use_llm or self._client is None:
            return fallback

        try:
            response = await self._client.responses.create(
                model=self._settings.openai_model,
                input=prompt,
            )

            return response.output_text.strip() or fallback

        except Exception:
            self._logger.exception(
                "GPT-5 generation failed. Using deterministic fallback."
            )
            return fallback

    @staticmethod
    def _offline_user_guide(
        graph: ProductKnowledgeGraph,
        workflows: list[Workflow],
    ) -> str:
        """Create User Guide Markdown without using an LLM."""
        sections = [
            "# User Guide",
            (
                "## About this guide\n\n"
                f"This guide documents version {graph.version} using the "
                "Product Knowledge Graph."
            ),
        ]

        for workflow in workflows:
            steps = sorted(workflow.steps, key=lambda step: step.order)

            content = [
                f"## {workflow.name}",
                workflow.description or "Complete the following workflow.",
                "### Steps",
            ]

            for number, step in enumerate(steps, start=1):
                content.append(
                    f"{number}. **{step.title}** — {step.instruction}"
                )

            content.extend(
                [
                    "> **Note:** Only information captured in the Product "
                    "Knowledge Graph is included.",
                    "> **Tip:** Keep this guide open while completing the workflow.",
                ]
            )

            sections.append("\n\n".join(content))

        return "\n\n".join(sections)