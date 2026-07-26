"""Action Executor for Playwright element interaction."""

import time
import asyncio
from typing import Optional
from agents.explorer.browser.browser_controller import BrowserController
from agents.explorer.models.action import ActionTarget, ActionResult, ActionType
from agents.explorer.interfaces import AbstractActionExecutor
from agents.explorer.exceptions import ActionExecutionError
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class ActionExecutor(AbstractActionExecutor):
    """Executes browser interactions and measures execution metrics."""

    def __init__(self, browser_controller: BrowserController):
        self.browser = browser_controller

    async def execute(self, action: ActionTarget) -> ActionResult:
        """Execute action target on active page."""
        page = self.browser.page
        start_url = page.url
        start_time = time.perf_counter()
        success = False
        error_msg: Optional[str] = None

        logger.info(f"Executing {action.action_type.value} on selector '{action.css_selector}'...")

        try:
            locator = page.locator(action.css_selector).first

            if action.action_type == ActionType.CLICK:
                await locator.click(timeout=self.browser.config.action_timeout_ms)

            elif action.action_type == ActionType.DOUBLE_CLICK:
                await locator.dblclick(timeout=self.browser.config.action_timeout_ms)

            elif action.action_type == ActionType.HOVER:
                await locator.hover(timeout=self.browser.config.action_timeout_ms)

            elif action.action_type == ActionType.SCROLL:
                await locator.scroll_into_view_if_needed(timeout=self.browser.config.action_timeout_ms)

            elif action.action_type == ActionType.TYPE:
                text_val = action.value or ""
                await locator.fill(text_val, timeout=self.browser.config.action_timeout_ms)

            elif action.action_type == ActionType.SELECT_OPTION:
                val = action.value or ""
                await locator.select_option(value=val, timeout=self.browser.config.action_timeout_ms)

            elif action.action_type == ActionType.CHECK:
                await locator.check(timeout=self.browser.config.action_timeout_ms)

            elif action.action_type == ActionType.UNCHECK:
                await locator.uncheck(timeout=self.browser.config.action_timeout_ms)

            elif action.action_type == ActionType.UPLOAD_FILE:
                if action.value:
                    await locator.set_input_files(action.value, timeout=self.browser.config.action_timeout_ms)

            elif action.action_type == ActionType.NAVIGATE:
                if action.value:
                    await page.goto(action.value, wait_until="domcontentloaded")

            elif action.action_type == ActionType.WAIT:
                ms = int(action.value) if action.value and action.value.isdigit() else 1000
                await asyncio.sleep(ms / 1000.0)

            else:
                raise ActionExecutionError(f"Unsupported action type: {action.action_type}")

            # Brief pause to allow page transitions / DOM updates
            await asyncio.sleep(0.3)
            success = True
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Action {action.action_type.value} on '{action.css_selector}' failed: {error_msg}")

        end_time = time.perf_counter()
        execution_time_ms = (end_time - start_time) * 1000.0
        end_url = page.url

        state_changed = (start_url != end_url)

        return ActionResult(
            action=action,
            success=success,
            error_message=error_msg,
            execution_time_ms=round(execution_time_ms, 2),
            start_url=start_url,
            end_url=end_url,
            state_changed=state_changed
        )
