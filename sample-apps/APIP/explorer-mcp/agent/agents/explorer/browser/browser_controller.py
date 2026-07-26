"""Playwright wrapper for browser management and lifecycle control."""

import asyncio
from typing import Optional, Dict, Any, List
# pyrefly: ignore [missing-import]
from playwright.async_api import async_playwright, Playwright, Browser, BrowserContext, Page
from agents.explorer.config import ExplorerConfig
from agents.explorer.exceptions import BrowserControllerError
from agents.explorer.utils.logger import get_logger

logger = get_logger()


class BrowserController:
    """Manages Playwright browser instance, contexts, pages, tabs, and authentication."""

    def __init__(self, config: ExplorerConfig):
        self.config = config
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._is_authenticated: bool = False

    async def start(self) -> None:
        """Launch Playwright browser and create main context and page."""
        try:
            logger.info(f"Launching {self.config.browser_type} browser (headless={self.config.headless})...")
            self._playwright = await async_playwright().start()

            browser_type = getattr(self._playwright, self.config.browser_type, None)
            if not browser_type:
                raise BrowserControllerError(f"Unsupported browser type: {self.config.browser_type}")

            slow_mo_ms = 1000 if not self.config.headless else 0
            self._browser = await browser_type.launch(
                headless=self.config.headless,
                slow_mo=slow_mo_ms,
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )

            video_dir = (self.config.get_output_dir() / "videos") if self.config.save_screenshots else None
            if video_dir:
                video_dir.mkdir(parents=True, exist_ok=True)

            self._context = await self._browser.new_context(
                viewport={"width": self.config.viewport_width, "height": self.config.viewport_height},
                user_agent="ADIP-ExplorerAgent/1.0",
                ignore_https_errors=True,
                record_video_dir=str(video_dir) if video_dir else None,
            )

            self._context.set_default_timeout(self.config.action_timeout_ms)
            self._context.set_default_navigation_timeout(self.config.navigation_timeout_ms)

            self._page = await self._context.new_page()
            logger.info("Browser initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to start browser: {e}")
            await self.stop()
            raise BrowserControllerError(f"Browser launch failure: {e}") from e

    async def stop(self) -> None:
        """Close browser context and stop Playwright."""
        try:
            if self._context:
                await self._context.close()
                self._context = None
            if self._browser:
                await self._browser.close()
                self._browser = None
            if self._playwright:
                await self._playwright.stop()
                self._playwright = None
            logger.info("Browser stopped and resources released.")
        except Exception as e:
            logger.warning(f"Error during browser teardown: {e}")

    @property
    def page(self) -> Page:
        """Access active page instance."""
        if not self._page or self._page.is_closed():
            raise BrowserControllerError("No active Playwright page available.")
        return self._page

    @property
    def context(self) -> BrowserContext:
        """Access active context instance."""
        if not self._context:
            raise BrowserControllerError("No active Playwright context available.")
        return self._context

    async def navigate_to(self, url: str) -> str:
        """Navigate active page to target URL."""
        try:
            logger.info(f"Navigating to URL: {url}")
            response = await self.page.goto(url, wait_until="domcontentloaded", timeout=self.config.navigation_timeout_ms)
            status = response.status if response else "N/A"
            logger.info(f"Navigated to {self.page.url} [Status: {status}]")
            return self.page.url
        except Exception as e:
            logger.error(f"Navigation error for {url}: {e}")
            raise BrowserControllerError(f"Failed to navigate to {url}: {e}") from e

    async def authenticate_if_required(self) -> bool:
        """Handle login flow if credentials are provided in config."""
        if not self.config.username or not self.config.password:
            logger.info("No credentials provided. Skipping automated authentication.")
            return False

        login_target = self.config.login_url or self.config.target_url
        logger.info(f"Attempting authentication at {login_target}...")
        try:
            await self.navigate_to(login_target)
            page = self.page

            # Locate common login input selectors
            username_field = page.locator("input[type='text'], input[type='email'], input[name='username'], input[name='email'], #username, #email").first
            password_field = page.locator("input[type='password'], input[name='password'], #password").first
            submit_btn = page.locator("button[type='submit'], input[type='submit'], button:has-text('Login'), button:has-text('Sign In')").first

            if await username_field.is_visible() and await password_field.is_visible():
                await username_field.fill(self.config.username)
                await password_field.fill(self.config.password.get_secret_value())
                await submit_btn.click()
                await page.wait_for_load_state("networkidle", timeout=5000)
                self._is_authenticated = True
                logger.info("Authentication submitted successfully.")
                return True
            else:
                logger.warning("Login fields not detected on login page.")
                return False
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False

    @property
    def is_authenticated(self) -> bool:
        return self._is_authenticated

    async def get_cookies(self) -> List[Dict[str, Any]]:
        """Retrieve active session cookies."""
        if self._context:
            return await self._context.cookies()
        return []
