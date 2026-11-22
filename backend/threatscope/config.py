from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./threatscope.db"
    environment: Literal["development", "production", "test"] = "development"
    api_key: str = ""
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @field_validator("database_url")
    @classmethod
    def postgres_driver(cls, value: str) -> str:
        for prefix in ("postgres://", "postgresql://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    @property
    def origins(self) -> list[str]:
        return [s.strip().rstrip("/") for s in self.allowed_origins.split(",") if s.strip()]

    @model_validator(mode="after")
    def secure_production(self):
        if self.environment == "production":
            if len(self.api_key) < 32:
                raise ValueError("Production requires an API_KEY of at least 32 characters")
            if not self.origins or any(not s.startswith("https://") or "*" in s for s in self.origins):
                raise ValueError("Production requires explicit HTTPS origins")
        return self
