"""Map workflow steps to screenshots."""

from models import ProductKnowledgeGraph, ScreenshotMapping, Workflow


class ScreenshotMapper:
    """Resolves screenshot paths for workflow steps."""

    def map_workflow(
        self,
        workflow: Workflow,
        graph: ProductKnowledgeGraph,
    ) -> dict[str, ScreenshotMapping]:
        """Return a mapping from step ID to screenshot information."""
        screenshots_by_step = {
            screenshot.step_id: screenshot
            for screenshot in graph.screenshots
            if screenshot.step_id
        }

        workflow_screenshots = [
            screenshot
            for screenshot in graph.screenshots
            if screenshot.workflow_id == workflow.id and not screenshot.step_id
        ]

        mappings: dict[str, ScreenshotMapping] = {}

        for index, step in enumerate(
            sorted(workflow.steps, key=lambda item: item.order)
        ):
            screenshot = screenshots_by_step.get(
                step.screenshot_id or step.id
            )

            if screenshot is None and index < len(workflow_screenshots):
                screenshot = workflow_screenshots[index]

            mappings[step.id] = ScreenshotMapping(
                step_id=step.id,
                image_path=screenshot.path if screenshot else None,
                caption=screenshot.caption if screenshot else None,
            )

        return mappings