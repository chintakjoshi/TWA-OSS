from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TWA Backend"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("TWA_ENVIRONMENT", "ENVIRONMENT"),
    )
    debug: bool = Field(default=True, validation_alias="TWA_DEBUG")
    database_url: str = Field(
        default="postgresql+psycopg://twa:twa@localhost:5432/twa",
        validation_alias="DATABASE_URL",
    )
    auth_base_url: str = Field(
        default="http://localhost:8000",
        validation_alias="AUTH_BASE_URL",
    )
    twa_auth_audience: str = Field(
        default="twa-api",
        validation_alias="TWA_AUTH_AUDIENCE",
    )
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:5174,http://localhost:5175",
        validation_alias="TWA_CORS_ORIGINS",
    )

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()