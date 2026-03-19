from fastapi import APIRouter

from app.core.config import get_settings

settings = get_settings()
router = APIRouter(prefix=f"{settings.api_v1_prefix}/auth", tags=["auth"])
