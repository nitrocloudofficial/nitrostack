"""
Configuration — app/core/config.py

Phase 2: Activated. Reads from .env using pydantic-settings.
All provider API settings live here.

Environment variables → see .env.example in project root.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────
    APP_NAME: str = "Invenio"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    API_V1_PREFIX: str = "/api/v1"

    # ── CORS ──────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Research Provider Config ──────────────────
    # OpenAlex: polite pool requires an email for higher rate limits
    OPENALEX_EMAIL: str = "research@invenio.ai"
    OPENALEX_BASE_URL: str = "https://api.openalex.org"

    # arXiv: no auth required; be polite with delays
    ARXIV_BASE_URL: str = "https://export.arxiv.org/api"

    # Crossref: mailto improves rate limit tier
    CROSSREF_BASE_URL: str = "https://api.crossref.org"
    CROSSREF_MAILTO: str = "research@invenio.ai"

    # ── HTTP Client ───────────────────────────────
    # Timeout per provider request
    HTTP_TIMEOUT_SECONDS: float = 15.0
    # Max results per provider per query (Phase 2 limit)
    PROVIDER_MAX_RESULTS: int = 25

    # ── Future phases ─────────────────────────────
    # DATABASE_URL: str = ""
    # NEO4J_URI: str = "bolt://localhost:7687"
    # REDIS_URL: str = "redis://localhost:6379"
    # SECRET_KEY: str = ""


# Singleton — import from here everywhere
settings = Settings()
