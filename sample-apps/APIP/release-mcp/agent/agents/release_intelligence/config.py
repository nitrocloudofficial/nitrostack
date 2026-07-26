"""Configuration settings for Release Intelligence Agent."""

from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ReleaseIntelligenceConfig(BaseSettings):
    """Configuration options for Release Intelligence Agent."""

    agent_name: str = Field(default="Release Intelligence Agent", description="Agent identification name")
    output_dir: Path = Field(default=Path("artifacts/release_intelligence"), description="Directory to publish release output files")
    
    # LLM Settings
    llm_provider: str = Field(default="mock", description="LLM provider: 'openai', 'gemini', 'anthropic', or 'mock'")
    api_key: Optional[str] = Field(default=None, description="API Key for LLM provider")
    model_name: str = Field(default="gpt-4o", description="Model identifier for LLM reasoning")
    temperature: float = Field(default=0.2, description="Sampling temperature for LLM impact analysis")
    
    # Validation & Execution Flags
    strict_validation: bool = Field(default=True, description="Fail release pipeline if validation errors are detected")
    auto_publish: bool = Field(default=True, description="Automatically write Markdown and JSON outputs to disk")
    log_level: str = Field(default="INFO", description="Log level: DEBUG, INFO, WARNING, ERROR")

    model_config = SettingsConfigDict(
        env_prefix="RELEASE_INTEL_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def get_output_dir(self) -> Path:
        """Ensure output directory exists and return resolved path."""
        self.output_dir.mkdir(parents=True, exist_ok=True)
        return self.output_dir.resolve()
