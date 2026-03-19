from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.health import HealthResponse

settings = get_settings()
router = APIRouter(prefix=settings.api_v1_prefix, tags=["health"])


@router.get("/health", response_model=HealthResponse)
def versioned_health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        timestamp=datetime.now(timezone.utc),
    )
