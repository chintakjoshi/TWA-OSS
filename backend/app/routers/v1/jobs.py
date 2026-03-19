from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_completed_jobseeker
from app.core.responses import PaginatedResponse
from app.db.session import get_db_session
from app.schemas.applications import JobDetailResponse, JobWithEligibilityPayload
from app.services.common import PaginationParams, SortParams, ensure_found, get_pagination_params, get_sort_params
from app.services.jobseeker import get_jobseeker_by_app_user_id
from app.services.applications import get_job_detail_for_jobseeker, list_visible_jobs_for_jobseeker

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.get("", response_model=PaginatedResponse[JobWithEligibilityPayload])
def list_jobs(
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    auth_context: AuthContext = Depends(require_completed_jobseeker),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[JobWithEligibilityPayload]:
    jobseeker = ensure_found(get_jobseeker_by_app_user_id(session, auth_context.app_user_id), entity_name="Jobseeker")
    return list_visible_jobs_for_jobseeker(session, jobseeker=jobseeker, pagination=pagination, sort=sort)


@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job_detail(
    job_id: UUID,
    auth_context: AuthContext = Depends(require_completed_jobseeker),
    session: Session = Depends(get_db_session),
) -> JobDetailResponse:
    jobseeker = ensure_found(get_jobseeker_by_app_user_id(session, auth_context.app_user_id), entity_name="Jobseeker")
    return get_job_detail_for_jobseeker(session, jobseeker=jobseeker, job_listing_id=job_id)
