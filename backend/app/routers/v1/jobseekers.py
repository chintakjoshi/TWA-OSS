from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_jobseeker
from app.db.session import get_db_session
from app.schemas.jobseeker import (
    JobseekerProfileResponse,
    JobseekerProfileUpdateRequest,
    JobseekerProfileUpdateResponse,
)
from app.services.common import ensure_found
from app.services.jobseeker import (
    get_jobseeker_by_app_user_id,
    serialize_jobseeker,
    serialize_jobseeker_update_result,
    update_jobseeker_profile,
)

router = APIRouter(prefix="/api/v1/jobseekers", tags=["jobseekers"])


@router.get("/me", response_model=JobseekerProfileResponse)
def get_my_jobseeker_profile(
    auth_context: AuthContext = Depends(require_jobseeker),
    session: Session = Depends(get_db_session),
) -> JobseekerProfileResponse:
    jobseeker = ensure_found(get_jobseeker_by_app_user_id(session, auth_context.app_user_id), entity_name="Jobseeker")
    return JobseekerProfileResponse(profile=serialize_jobseeker(jobseeker))


@router.patch("/me", response_model=JobseekerProfileUpdateResponse)
def patch_my_jobseeker_profile(
    payload: JobseekerProfileUpdateRequest,
    auth_context: AuthContext = Depends(require_jobseeker),
    session: Session = Depends(get_db_session),
) -> JobseekerProfileUpdateResponse:
    jobseeker = ensure_found(get_jobseeker_by_app_user_id(session, auth_context.app_user_id), entity_name="Jobseeker")
    jobseeker = update_jobseeker_profile(
        session,
        jobseeker=jobseeker,
        payload=payload,
        actor_id=auth_context.app_user_id,
        action="jobseeker.profile_updated",
    )
    return JobseekerProfileUpdateResponse(profile=serialize_jobseeker_update_result(jobseeker))
