from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    APP_NAME: str = "AEIOS-X"

    VERSION: str = "1.0.0"

    DESCRIPTION: str = "Autonomous Enterprise Intelligence Operating System"

    HOST: str = "127.0.0.1"

    PORT: int = 8000

    DEBUG: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()