from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.meta import ApiVersionResponse

settings = get_settings()
router = APIRouter(prefix=settings.api_v1_prefix, tags=["meta"])


@router.get("", response_model=ApiVersionResponse)
def api_root() -> ApiVersionResponse:
    current_settings = get_settings()
    return ApiVersionResponse(
        service=current_settings.app_name,
        version=current_settings.app_version,
        docs_url="/docs" if current_settings.docs_enabled else None,
        openapi_url="/openapi.json" if current_settings.docs_enabled else None,
    )
