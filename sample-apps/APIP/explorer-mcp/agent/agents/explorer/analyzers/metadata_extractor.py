"""Metadata Extractor compiling raw observations into structured exploration output."""

import datetime
from typing import List
from agents.explorer.models.page import PageNode
from agents.explorer.models.element import UIElement
from agents.explorer.models.form import FormModel
from agents.explorer.models.navigation import NavigationGraphExport
from agents.explorer.models.workflow import WorkflowSequence
from agents.explorer.models.screenshot import ScreenshotRecord
from agents.explorer.models.error import ErrorRecord
from agents.explorer.models.network import NetworkRequest
from agents.explorer.models.exploration_result import ExplorationResult, ExplorationSummary
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class MetadataExtractor:
    """Aggregates raw page, element, form, graph, screenshot, network, and error observations without business logic bias."""

    def assemble_result(
        self,
        exploration_id: str,
        target_url: str,
        pages: List[PageNode],
        elements: List[UIElement],
        forms: List[FormModel],
        navigation_graph: NavigationGraphExport,
        workflows: List[WorkflowSequence],
        screenshots: List[ScreenshotRecord],
        errors: List[ErrorRecord],
        network_requests: List[NetworkRequest],
        duration_seconds: float,
        actions_count: int,
    ) -> ExplorationResult:
        """Assemble structured ExplorationResult container."""

        summary = ExplorationSummary(
            target_url=target_url,
            total_pages_discovered=len(pages),
            total_elements_extracted=len(elements),
            total_forms_found=len(forms),
            total_workflows_detected=len(workflows),
            total_actions_executed=actions_count,
            total_errors_detected=len(errors),
            total_network_requests=len(network_requests),
            total_screenshots_taken=len(screenshots),
            duration_seconds=round(duration_seconds, 2),
        )

        timestamp_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        logger.info(f"Assembled ExplorationResult for {target_url} (ID: {exploration_id})")

        return ExplorationResult(
            exploration_id=exploration_id,
            timestamp=timestamp_iso,
            summary=summary,
            pages=pages,
            elements=elements,
            forms=forms,
            navigation_graph=navigation_graph,
            workflows=workflows,
            screenshots=screenshots,
            errors=errors,
            network_requests=network_requests,
        )
