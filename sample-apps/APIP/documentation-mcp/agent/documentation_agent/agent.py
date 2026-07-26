"""Documentation Agent orchestration service."""

import asyncio

from config import Settings
from exporter import Exporter
from generator import DocumentGenerator
from markdown_builder import MarkdownBuilder
from models import (
    GeneratedDocuments,
    ProductKnowledgeGraph,
    PublishResult,
    ValidationReport,
)
from planner import ContentPlanner
from prompts import PromptLibrary
from publisher import Publisher
from quality_checker import QualityChecker
from screenshot_mapper import ScreenshotMapper


class DocumentationAgent:
    """Coordinates planning, generation, validation, export, and publishing."""

    def __init__(self, settings: Settings) -> None:
        prompts = PromptLibrary()

        self._planner = ContentPlanner()
        self._generator = DocumentGenerator(settings, prompts)
        self._markdown_builder = MarkdownBuilder(ScreenshotMapper())
        self._exporter = Exporter()
        self._publisher = Publisher()
        self._quality_checker = QualityChecker()

    async def generate_all(
        self,
        graph: ProductKnowledgeGraph,
        use_llm: bool = True,
    ) -> GeneratedDocuments:
        """Generate User Guide, FAQ, and Release Notes."""
        plan = self._planner.create_plan(graph)

        workflow_lookup = {
            workflow.id: workflow
            for workflow in graph.workflows
        }

        workflows = [
            workflow_lookup[workflow_id]
            for workflow_id in plan.release_note_workflow_ids
        ]

        user_guide, faq, release_notes = await asyncio.gather(
            self._generator.generate_user_guide(
                graph,
                workflows,
                use_llm,
            ),
            self._generator.generate_faq(graph, use_llm),
            self._generator.generate_release_notes(
                graph,
                workflows,
                use_llm,
            ),
        )

        return GeneratedDocuments(
            user_guide=self._markdown_builder.add_screenshots(
                user_guide,
                graph,
            ),
            faq=faq,
            release_notes=release_notes,
        )

    async def generate_user_guide(
        self,
        graph: ProductKnowledgeGraph,
        use_llm: bool = True,
    ) -> str:
        """Generate one User Guide."""
        markdown = await self._generator.generate_user_guide(
            graph,
            graph.workflows,
            use_llm,
        )

        return self._markdown_builder.add_screenshots(markdown, graph)

    async def generate_faq(
        self,
        graph: ProductKnowledgeGraph,
        use_llm: bool = True,
    ) -> str:
        """Generate one FAQ."""
        return await self._generator.generate_faq(graph, use_llm)

    async def generate_release_notes(
        self,
        graph: ProductKnowledgeGraph,
        use_llm: bool = True,
    ) -> str:
        """Generate one Release Notes document."""
        return await self._generator.generate_release_notes(
            graph,
            graph.workflows,
            use_llm,
        )

    def validate(self, markdown_text: str) -> ValidationReport:
        """Validate Markdown documentation."""
        return self._quality_checker.validate(markdown_text)

    def export_pdf(
        self,
        markdown_text: str,
        output_path: str,
    ) -> str:
        """Create PDF and return its resolved path."""
        return str(
            self._exporter.export_pdf(
                markdown_text,
                output_path,
            ).resolve()
        )

    def publish(
        self,
        documents: GeneratedDocuments,
        folder: str,
    ) -> PublishResult:
        """Save Markdown documentation to disk."""
        return self._publisher.publish_to_folder(documents, folder)