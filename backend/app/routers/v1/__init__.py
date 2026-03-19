from fastapi import APIRouter

from app.routers.v1.admin import router as admin_router
from app.routers.v1.auth import router as auth_router
from app.routers.v1.employer import router as employer_router
from app.routers.v1.health import router as health_router
from app.routers.v1.jobseekers import router as jobseeker_router
from app.routers.v1.meta import router as meta_router
from app.routers.v1.notifications import router as notifications_router

router = APIRouter()
router.include_router(meta_router)
router.include_router(health_router)
router.include_router(auth_router)
router.include_router(jobseeker_router)
router.include_router(employer_router)
router.include_router(admin_router)
router.include_router(notifications_router)
