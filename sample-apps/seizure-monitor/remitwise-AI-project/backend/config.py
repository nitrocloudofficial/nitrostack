"""
RemitWise AI - Central Configuration
=====================================
All environment-level settings and constants live here.
Import `settings` anywhere in the project; do NOT scatter magic strings.
"""

import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()


class Settings:
    """Application-wide settings with sensible defaults."""

    # ---------------------------------------------------------------------------
    # Application metadata
    # ---------------------------------------------------------------------------
    APP_NAME: str = "RemitWise AI Backend"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = (
        "Agent-ready REST backend for the RemitWise AI remittance advisor. "
        "Exposes live exchange rates, provider details, and compliance rules."
    )

    # ---------------------------------------------------------------------------
    # Server
    # ---------------------------------------------------------------------------
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    RELOAD: bool = os.getenv("RELOAD", "true").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

    # ---------------------------------------------------------------------------
    # CORS
    # ---------------------------------------------------------------------------
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173,http://localhost:8080",
    ).split(",")
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # ---------------------------------------------------------------------------
    # External APIs & Multi-Tier Fallback Stack
    # ---------------------------------------------------------------------------
    FRANKFURTER_BASE_URL: str = os.getenv(
        "FRANKFURTER_BASE_URL", "https://api.frankfurter.app"
    )
    EXCHANGERATE_HOST_BASE_URL: str = os.getenv(
        "EXCHANGERATE_HOST_BASE_URL", "https://api.exchangerate.host"
    )
    OPEN_ER_API_BASE_URL: str = os.getenv(
        "OPEN_ER_API_BASE_URL", "https://open.er-api.com/v6/latest"
    )
    HTTP_TIMEOUT_SECONDS: int = int(os.getenv("HTTP_TIMEOUT_SECONDS", 5))
    USER_AGENT: str = "RemitWiseAI/1.0"
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", 30))

    # ---------------------------------------------------------------------------
    # Local data files
    # ---------------------------------------------------------------------------
    DATA_DIR: str = os.path.join(os.path.dirname(__file__), "data")
    PROVIDERS_FILE: str = os.path.join(DATA_DIR, "providers.json")
    COMPLIANCE_FILE: str = os.path.join(DATA_DIR, "compliance_rules.json")

    # ---------------------------------------------------------------------------
    # LLM & Multi-Agent Planning Configuration
    # ---------------------------------------------------------------------------
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1")

    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")
    LLM_TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.0"))
    LLM_MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "500"))
    LLM_TIMEOUT: float = float(os.getenv("TIMEOUT", "5.0"))

    # ---------------------------------------------------------------------------
    # Supported currencies (ISO-4217 subset used by Frankfurter)
    # ---------------------------------------------------------------------------
    SUPPORTED_CURRENCIES: List[str] = [
        "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY",
        "INR", "MXN", "BRL", "SGD", "HKD", "NOK", "SEK", "DKK",
        "NZD", "ZAR", "PHP", "THB", "MYR", "IDR", "AED", "SAR",
        "KWD", "BDT", "PKR", "LKR", "NPR", "EGP", "KES",
    ]


# Singleton instance – import this everywhere
settings = Settings()

