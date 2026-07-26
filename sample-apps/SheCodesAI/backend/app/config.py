import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "ContextOS FastAPI Backend"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "https://contextos.vercel.app"]

    # Supabase (System Level)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://xyzcompany.supabase.co")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "mock-service-role-key")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "mock-anon-key")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/contextos")

    # AI LLM Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "sk-mock-openai-key")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "AIzaSy-mock-gemini-key")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "gsk-mock-groq-key")

    # Notifications Engine
    NOVU_API_KEY: str = os.getenv("NOVU_API_KEY", "nv_sec_mock_key")

    # Default Integration Fallback Credentials
    SLACK_BOT_TOKEN: str = os.getenv("SLACK_BOT_TOKEN", "xoxb-mock-token")
    JIRA_DOMAIN: str = os.getenv("JIRA_DOMAIN", "https://company.atlassian.net")
    JIRA_USER_EMAIL: str = os.getenv("JIRA_USER_EMAIL", "admin@company.com")
    JIRA_API_TOKEN: str = os.getenv("JIRA_API_TOKEN", "mock-jira-token")
    NOTION_API_KEY: str = os.getenv("NOTION_API_KEY", "ntn_mock_secret")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "ghp_mock_token")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "mock-google-client-id")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "mock-google-client-secret")

    # ChromaDB Vector Store
    CHROMADB_PATH: str = os.getenv("CHROMADB_PATH", "./chroma_db")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
