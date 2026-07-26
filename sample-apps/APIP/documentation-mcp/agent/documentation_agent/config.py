"""Runtime configuration for the Documentation Agent."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Loads settings from environment variables or a local .env file."""

    openai_api_key: str | None = None
    openai_model: str = "gpt-5"

    neo4j_uri: str | None = None
    neo4j_username: str | None = None
    neo4j_password: str | None = None

    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="DOC_AGENT_",
    )