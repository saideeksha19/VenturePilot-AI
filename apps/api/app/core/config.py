from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


REPOSITORY_ROOT = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    app_name: str = "VenturePilot AI API"
    app_env: str = "development"
    database_url: str = "postgresql+psycopg://venturepilot:venturepilot@localhost:5432/venturepilot"
    gemini_api_key: str | None = None
    # Dev-friendly default; tighten to explicit origins before shipping.
    cors_origins: list[str] = ["*"]
    gemini_model: str = "gemini-2.0-flash"
    ai_timeout_seconds: int = 30

    model_config = SettingsConfigDict(env_file=REPOSITORY_ROOT / ".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
