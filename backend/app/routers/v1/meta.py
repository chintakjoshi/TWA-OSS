from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.meta import ApiVersionResponse

settings = get_settings()
router = APIRouter(prefix=settings.api_v1_prefix, tags=["meta"])


@router.get("", response_model=ApiVersionResponse)
def api_root() -> ApiVersionResponse:
    return ApiVersionResponse(
        service=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )
