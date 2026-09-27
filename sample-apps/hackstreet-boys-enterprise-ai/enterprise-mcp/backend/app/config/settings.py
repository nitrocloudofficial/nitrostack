from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise Knowledge MCP Server"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days
    
    # Database
    DATABASE_URL: str
    
    # Redis & Celery
    REDIS_URL: str
    
    # AI & Vector Search
    OPENAI_API_KEY: Optional[str] = None
    FAISS_INDEX_PATH: str = "./faiss_index"
    
    # External APIs (Connectors)
    JIRA_API_URL: Optional[str] = None
    JIRA_API_KEY: Optional[str] = None
    SLACK_BOT_TOKEN: Optional[str] = None
    
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
