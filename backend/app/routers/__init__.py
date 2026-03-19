from fastapi import APIRouter

from app.routers.health import router as health_router
from app.routers.v1 import router as v1_router

router = APIRouter()
router.include_router(health_router)
router.include_router(v1_router)
