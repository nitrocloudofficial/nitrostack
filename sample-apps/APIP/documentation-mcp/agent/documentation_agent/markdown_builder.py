"""Compose Markdown with screenshot references."""

from models import ProductKnowledgeGraph
from screenshot_mapper import ScreenshotMapper


class MarkdownBuilder:
    """Adds screenshots or placeholders to generated Markdown."""

    def __init__(self, screenshot_mapper: ScreenshotMapper) -> None:
        self._screenshot_mapper = screenshot_mapper

    def add_screenshots(
        self,
        markdown: str,
        graph: ProductKnowledgeGraph,
    ) -> str:
        """Append screenshot content for every workflow step."""
        sections = ["## Workflow screenshots"]

        for workflow in graph.workflows:
            mappings = self._screenshot_mapper.map_workflow(workflow, graph)

            for step in sorted(workflow.steps, key=lambda item: item.order):
                mapping = mappings[step.id]

                sections.append(f"### {workflow.name}: {step.title}")

                if mapping.image_path:
                    caption = mapping.caption or step.title
                    sections.append(f"![{caption}]({mapping.image_path})")
                else:
                    sections.append(
                        "<!-- Screenshot placeholder: no screenshot "
                        "available for this step. -->"
                    )

        return markdown.rstrip() + "\n\n" + "\n\n".join(sections) + "\n"