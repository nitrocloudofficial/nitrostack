"""Configuration management for Explorer Agent."""

from pathlib import Path
from typing import Dict, Any, Optional
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class ExplorerConfig(BaseSettings):
    """Explorer Agent configuration with environment variable and explicit support."""

    target_url: str = Field(default="http://localhost:8000", description="Target application base URL")
    headless: bool = Field(default=True, description="Run browser in headless mode")
    browser_type: str = Field(default="chromium", description="Browser type: chromium, firefox, webkit")
    viewport_width: int = Field(default=1280, description="Browser viewport width")
    viewport_height: int = Field(default=800, description="Browser viewport height")
    navigation_timeout_ms: int = Field(default=10000, description="Page navigation timeout in ms")
    action_timeout_ms: int = Field(default=5000, description="Action execution timeout in ms")

    max_depth: int = Field(default=3, description="Maximum exploration graph depth")
    max_actions: int = Field(default=50, description="Maximum total actions to execute")
    max_page_visits: int = Field(default=20, description="Maximum page node visits")

    output_dir: Path = Field(default=Path("./exploration_output"), description="Output directory for results & screenshots")
    save_screenshots: bool = Field(default=True, description="Capture & save screenshots")

    username: Optional[str] = Field(default=None, description="Auth username if login required")
    password: Optional[SecretStr] = Field(default=None, description="Auth password if login required")
    login_url: Optional[str] = Field(default=None, description="Auth login page URL if separate")

    log_level: str = Field(default="INFO", description="Log verbosity level")
    capture_network: bool = Field(default=True, description="Record network traffic")
    capture_console: bool = Field(default=True, description="Capture browser console logs")

    model_config = SettingsConfigDict(
        env_prefix="ADIP_EXPLORER_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_output_dir(self) -> Path:
        """Ensure and return resolved output directory."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        (self.output_dir / "screenshots").mkdir(parents=True, exist_ok=True)
        return self.output_dir.resolve()
