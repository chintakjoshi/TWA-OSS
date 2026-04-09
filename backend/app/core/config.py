from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "TWA Backend"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("TWA_ENVIRONMENT", "ENVIRONMENT"),
    )
    debug: bool = Field(default=False, validation_alias="TWA_DEBUG")
    docs_enabled: bool = Field(default=False, validation_alias="TWA_DOCS_ENABLED")
    auth_enabled: bool = Field(default=True, validation_alias="TWA_AUTH_ENABLED")
    log_level: str = Field(default="INFO", validation_alias="TWA_LOG_LEVEL")
    request_id_header: str = Field(
        default="X-Request-ID", validation_alias="TWA_REQUEST_ID_HEADER"
    )
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
    auth_access_cookie_name: str = Field(
        default="twa_auth_access",
        validation_alias="TWA_AUTH_ACCESS_COOKIE_NAME",
    )
    auth_csrf_cookie_name: str = Field(
        default="twa_auth_csrf",
        validation_alias="TWA_AUTH_CSRF_COOKIE_NAME",
    )
    auth_csrf_header_name: str = Field(
        default="X-CSRF-Token",
        validation_alias="TWA_AUTH_CSRF_HEADER_NAME",
    )
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:5174,http://localhost:5175",
        validation_alias="TWA_CORS_ORIGINS",
    )
    gtfs_feed_path: Path = Field(
        default=BASE_DIR / "data" / "metro_stl_gtfs.zip",
        validation_alias="TWA_GTFS_FEED_PATH",
    )
    transit_stop_radius_miles: float = Field(
        default=0.5, validation_alias="TWA_TRANSIT_STOP_RADIUS_MILES"
    )
    geocoding_timeout_seconds: float = Field(
        default=10.0, validation_alias="TWA_GEOCODING_TIMEOUT_SECONDS"
    )
    geocoding_user_agent: str = Field(
        default="twa-backend/0.1.0", validation_alias="TWA_GEOCODING_USER_AGENT"
    )
    geocoding_base_url: str = Field(
        default="https://nominatim.openstreetmap.org/search",
        validation_alias="TWA_GEOCODING_BASE_URL",
    )
    notification_email_enabled: bool = Field(
        default=True, validation_alias="TWA_NOTIFICATION_EMAIL_ENABLED"
    )
    smtp_host: str = Field(default="localhost", validation_alias="TWA_SMTP_HOST")
    smtp_port: int = Field(default=1025, validation_alias="TWA_SMTP_PORT")
    smtp_timeout_seconds: float = Field(
        default=10.0, validation_alias="TWA_SMTP_TIMEOUT_SECONDS"
    )
    email_from: str = Field(
        default="notifications@localhost", validation_alias="TWA_EMAIL_FROM"
    )

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
