"""Screenshot recorder with deterministic naming and extension hooks."""

import datetime
from pathlib import Path
from typing import Optional
from agents.explorer.browser.browser_controller import BrowserController
from agents.explorer.models.screenshot import ScreenshotRecord, ScreenshotType
from agents.explorer.interfaces import AbstractScreenshotRecorder
from agents.explorer.utils.helpers import sanitize_filename
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class ScreenshotRecorder(AbstractScreenshotRecorder):
    """Captures and manages full-page and element screenshot artifacts."""

    def __init__(self, browser_controller: BrowserController, output_dir: Path):
        self.browser = browser_controller
        self.screenshots_dir = output_dir / "screenshots"
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)
        self._count = 0

    async def capture(
        self, screenshot_type: ScreenshotType, url: str, selector: Optional[str] = None
    ) -> ScreenshotRecord:
        """Capture screenshot and save to output directory."""
        self._count += 1
        timestamp_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        clean_url = sanitize_filename(url)
        filename = f"{self._count:04d}_{screenshot_type.value}_{clean_url}.png"
        filepath = self.screenshots_dir / filename

        page = self.browser.page

        try:
            if screenshot_type == ScreenshotType.ELEMENT and selector:
                locator = page.locator(selector).first
                await locator.screenshot(path=str(filepath))
            else:
                await page.screenshot(path=str(filepath), full_page=(screenshot_type == ScreenshotType.FULL_PAGE))

            logger.debug(f"Saved screenshot ({screenshot_type.value}): {filepath.name}")

            return ScreenshotRecord(
                screenshot_id=f"scr_{self._count:04d}",
                file_path=str(filepath),
                screenshot_type=screenshot_type,
                url=url,
                selector=selector,
                width=self.browser.config.viewport_width,
                height=self.browser.config.viewport_height,
                timestamp=timestamp_str,
            )
        except Exception as e:
            logger.warning(f"Failed to capture screenshot ({screenshot_type.value}): {e}")
            return ScreenshotRecord(
                screenshot_id=f"scr_err_{self._count:04d}",
                file_path="",
                screenshot_type=screenshot_type,
                url=url,
                selector=selector,
                timestamp=timestamp_str,
            )

    # Extension point for future video recording
    async def start_video_recording(self) -> None:
        """Extension point: Start video recording stream."""
        logger.info("Video recording extension point initialized.")

    async def stop_video_recording(self) -> Optional[str]:
        """Extension point: Stop video recording stream and return video file path."""
        return None
