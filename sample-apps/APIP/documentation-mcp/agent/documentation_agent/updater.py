"""Regenerate changed workflow documentation only."""

from generator import DocumentGenerator
from models import ProductKnowledgeGraph


class DocumentUpdater:
    """Updates User Guide content for workflows marked as changed."""

    def __init__(self, generator: DocumentGenerator) -> None:
        self._generator = generator

    async def update_user_guide(
        self,
        old_documentation: str,
        graph: ProductKnowledgeGraph,
        use_llm: bool = True,
    ) -> str:
        """Append regenerated documentation for changed workflows."""
        changed_workflows = [
            workflow
            for workflow in graph.workflows
            if workflow.changed
        ]

        if not changed_workflows:
            return old_documentation

        updated_content = await self._generator.generate_user_guide(
            graph=graph,
            workflows=changed_workflows,
            use_llm=use_llm,
        )

        return (
            old_documentation.rstrip()
            + "\n\n## Updated workflows\n\n"
            + updated_content
        )