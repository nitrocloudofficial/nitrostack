"""Error Detector monitoring console logs, HTTP statuses, and interaction failures."""

import datetime
from typing import List, Optional
from agents.explorer.browser.browser_controller import BrowserController
from agents.explorer.models.error import ErrorRecord, ErrorType
from agents.explorer.interfaces import AbstractErrorDetector
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class ErrorDetector(AbstractErrorDetector):
    """Detects and captures runtime errors, uncaught exceptions, 4xx/5xx responses, and validation bugs."""

    def __init__(self, browser_controller: BrowserController):
        self.browser = browser_controller
        self._errors: List[ErrorRecord] = []
        self._counter = 0

    def attach_listeners(self) -> None:
        """Attach console and dialog event listeners to Playwright page."""
        page = self.browser.page
        page.on("console", self._on_console_message)
        page.on("dialog", self._on_dialog)
        logger.info("Error detector listeners attached.")

    def _on_console_message(self, msg) -> None:
        if msg.type in ("error", "warning") and "Failed to load resource" not in msg.text:
            self.record_console_error(
                message=msg.text,
                location=f"{msg.location.get('url', '')}:{msg.location.get('lineNumber', '')}"
            )

    def _on_dialog(self, dialog) -> None:
        import asyncio
        self._counter += 1
        curr_url = self.browser.page.url if self.browser.page else ""
        err = ErrorRecord(
            error_id=f"err_{self._counter:04d}",
            error_type=ErrorType.UNEXPECTED_DIALOG,
            message=f"Unexpected {dialog.type} dialog: {dialog.message}",
            url=curr_url,
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )
        self._errors.append(err)
        logger.warning(f"Recorded unexpected dialog: {dialog.message}")
        try:
            asyncio.create_task(dialog.dismiss())
        except Exception:
            pass

    def record_console_error(self, message: str, location: Optional[str] = None) -> None:
        """Record JavaScript console error."""
        self._counter += 1
        curr_url = self.browser.page.url if self.browser.page else ""
        err = ErrorRecord(
            error_id=f"err_{self._counter:04d}",
            error_type=ErrorType.CONSOLE_ERROR,
            message=message,
            url=curr_url,
            stack_trace=location,
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )
        self._errors.append(err)
        logger.warning(f"Recorded console error: {message}")

    def record_http_error(self, url: str, status_code: int, message: str) -> None:
        """Record HTTP 4xx / 5xx error."""
        self._counter += 1
        err_type = ErrorType.HTTP_404 if status_code == 404 else ErrorType.HTTP_500
        err = ErrorRecord(
            error_id=f"err_{self._counter:04d}",
            error_type=err_type,
            message=f"HTTP {status_code}: {message}",
            url=url,
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )
        self._errors.append(err)
        logger.warning(f"Recorded HTTP error {status_code} for {url}")

    def record_action_failure(self, url: str, selector: str, error_msg: str, screenshot_path: Optional[str] = None) -> None:
        """Record broken button or action execution failure."""
        self._counter += 1
        err = ErrorRecord(
            error_id=f"err_{self._counter:04d}",
            error_type=ErrorType.BROKEN_BUTTON,
            message=f"Action execution failure on '{selector}': {error_msg}",
            url=url,
            selector=selector,
            screenshot_path=screenshot_path,
            timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
        )
        self._errors.append(err)

    def get_errors(self) -> List[ErrorRecord]:
        """Return all captured error records."""
        return self._errors
