"""Main coordinator for the ADIP Explorer Agent."""

import time
import uuid
import asyncio
from pathlib import Path
from typing import Optional

from agents.explorer.config import ExplorerConfig
from agents.explorer.control.state import StateManager
from agents.explorer.control.planner import ExplorationPlanner
from agents.explorer.control.publisher import ResultPublisher
from agents.explorer.browser.browser_controller import BrowserController
from agents.explorer.browser.action_executor import ActionExecutor
from agents.explorer.browser.recorder import ScreenshotRecorder
from agents.explorer.browser.network_monitor import NetworkMonitor
from agents.explorer.analyzers.dom_analyzer import DOMAnalyzer
from agents.explorer.analyzers.vision_analyzer import VisionAnalyzer
from agents.explorer.analyzers.form_analyzer import FormAnalyzer
from agents.explorer.analyzers.workflow_detector import WorkflowDetector
from agents.explorer.analyzers.navigation_graph import NavigationGraphBuilder
from agents.explorer.analyzers.error_detector import ErrorDetector
from agents.explorer.analyzers.metadata_extractor import MetadataExtractor
from agents.explorer.models.action import ActionTarget, ActionType
from agents.explorer.models.screenshot import ScreenshotType
from agents.explorer.models.exploration_result import ExplorationResult
from agents.explorer.exceptions import ExplorerException
from agents.explorer.utils.logger import setup_logger, get_logger

logger = get_logger()


class ExplorerAgent:
    """Autonomous Explorer Agent for the ADIP platform.
    
    Navigates web applications using Playwright, extracts interactive UI elements, forms,
    workflows, network metrics, errors, and exports a clean NetworkX navigation graph.
    """

    def __init__(self, config: Optional[ExplorerConfig] = None):
        self.config = config or ExplorerConfig()
        self.output_dir = self.config.get_output_dir()
        setup_logger(log_dir=self.output_dir, log_level=self.config.log_level)

        self.exploration_id = f"exp_{uuid.uuid4().hex[:8]}"
        self.state_manager = StateManager(base_url=self.config.target_url)

        # Components
        self.browser = BrowserController(self.config)
        self.action_executor = ActionExecutor(self.browser)
        self.recorder = ScreenshotRecorder(self.browser, self.output_dir)
        self.network_monitor = NetworkMonitor(self.browser)
        
        self.dom_analyzer = DOMAnalyzer(self.browser)
        self.vision_analyzer = VisionAnalyzer()
        self.form_analyzer = FormAnalyzer(self.browser)
        self.workflow_detector = WorkflowDetector()
        self.nav_graph_builder = NavigationGraphBuilder()
        self.error_detector = ErrorDetector(self.browser)
        self.metadata_extractor = MetadataExtractor()

        self.planner = ExplorationPlanner(self.config, self.state_manager)
        self.publisher = ResultPublisher(self.output_dir)

    async def explore(self, target_url: Optional[str] = None) -> ExplorationResult:
        """Execute autonomous exploration workflow."""
        start_time = time.perf_counter()
        entry_url = target_url or self.config.target_url
        logger.info(f"=== Starting Autonomous Exploration [ID: {self.exploration_id}] ===")
        logger.info(f"Target URL: {entry_url}")

        screenshots_captured = []
        all_pages = []
        all_elements = []
        all_forms = []
        actions_count = 0

        try:
            # 1. Launch Browser
            await self.browser.start()

            # 2. Attach Monitors
            if self.config.capture_network:
                self.network_monitor.attach_listeners()
            if self.config.capture_console:
                self.error_detector.attach_listeners()

            # 3. Authenticate if required
            await self.browser.authenticate_if_required()

            # 4. Initial Navigation
            current_url = await self.browser.navigate_to(entry_url)
            self.state_manager.mark_url_visited(current_url)

            # Capture initial screenshot
            if self.config.save_screenshots:
                scr = await self.recorder.capture(ScreenshotType.FULL_PAGE, current_url)
                screenshots_captured.append(scr)

            # 5. Exploration Loop
            while self.planner.has_remaining_work():
                current_url = self.browser.page.url

                # DOM Analysis
                page_node = await self.dom_analyzer.extract_page_node(current_url)
                self.state_manager.register_page_node(page_node)
                self.nav_graph_builder.add_page_node(page_node)
                all_pages.append(page_node)
                all_elements.extend(page_node.elements)

                # Form Analysis
                forms = await self.form_analyzer.extract_forms(current_url)
                all_forms.extend(forms)

                # Plan next action
                next_action = self.planner.plan_next_action(page_node, page_node.elements)
                if not next_action:
                    logger.info("No further actions planned on active page.")
                    break

                # Execute Action
                actions_count += 1
                result = await self.action_executor.execute(next_action)

                if result.success:
                    self.planner.mark_completed(next_action, result)

                    # Update Workflow & Graph
                    self.workflow_detector.record_transition(
                        from_url=result.start_url,
                        action=next_action,
                        to_url=result.end_url
                    )

                    if result.start_url != result.end_url:
                        target_node = await self.dom_analyzer.extract_page_node(result.end_url)
                        self.nav_graph_builder.add_page_node(target_node)
                        self.nav_graph_builder.add_transition_edge(
                            source_page_id=page_node.page_id,
                            target_page_id=target_node.page_id,
                            action=next_action,
                            trigger_text=next_action.css_selector
                        )
                        self.state_manager.mark_url_visited(result.end_url)

                        if self.config.save_screenshots:
                            scr = await self.recorder.capture(ScreenshotType.FULL_PAGE, result.end_url)
                            screenshots_captured.append(scr)
                else:
                    self.planner.mark_failed(next_action, result.error_message or "Execution failed")
                    self.error_detector.record_action_failure(
                        url=current_url,
                        selector=next_action.css_selector,
                        error_msg=result.error_message or "Unknown failure"
                    )

            # 6. Complete Exploration & Compile Results
            duration = time.perf_counter() - start_time
            graph_export = self.nav_graph_builder.export()
            workflows = self.workflow_detector.get_detected_workflows()
            errors = self.error_detector.get_errors()
            network_reqs = self.network_monitor.get_network_requests()

            final_result = self.metadata_extractor.assemble_result(
                exploration_id=self.exploration_id,
                target_url=entry_url,
                pages=all_pages,
                elements=all_elements,
                forms=all_forms,
                navigation_graph=graph_export,
                workflows=workflows,
                screenshots=screenshots_captured,
                errors=errors,
                network_requests=network_reqs,
                duration_seconds=duration,
                actions_count=actions_count,
            )

            # 7. Publish Results
            await self.publisher.publish(final_result)
            logger.info("=== Autonomous Exploration Completed Successfully ===")
            return final_result

        except Exception as e:
            logger.error(f"Critical error during exploration execution: {e}")
            raise ExplorerException(f"Exploration run failed: {e}") from e
        finally:
            await self.browser.stop()


async def main():
    """CLI entrypoint for executing Explorer Agent directly."""
    import sys
    url = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "https://www.wikipedia.org"
    headless = True
    for arg in sys.argv:
        if arg.lower() in ("--headful", "--headless=false"):
            headless = False
        elif arg.lower() == "--headless=true":
            headless = True
    config = ExplorerConfig(target_url=url, headless=headless, max_actions=15)
    agent = ExplorerAgent(config)
    await agent.explore()


if __name__ == "__main__":
    asyncio.run(main())
