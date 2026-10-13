from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "INVENIO Scientific OS"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"

    # PostgreSQL
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "invenio"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "invenio_db"
    POSTGRES_PORT: int = 5432

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"

    # Redis
    REDIS_URI: str = "redis://localhost:6379/0"

    # RabbitMQ
    RABBITMQ_URI: str = "amqp://invenio:password@localhost:5672/"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
