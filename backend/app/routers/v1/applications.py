from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_completed_jobseeker, require_jobseeker
from app.core.responses import PaginatedResponse
from app.db.session import get_db_session
from app.schemas.applications import (
    ApplicationResponse,
    CreateApplicationRequest,
    MyApplicationListItemPayload,
)
from app.services.applications import create_application, list_my_applications, serialize_application
from app.services.common import PaginationParams, SortParams, ensure_found, get_pagination_params, get_sort_params
from app.services.jobseeker import get_jobseeker_by_app_user_id

router = APIRouter(prefix="/api/v1/applications", tags=["applications"])


@router.post("", response_model=ApplicationResponse)
def post_application(
    payload: CreateApplicationRequest,
    auth_context: AuthContext = Depends(require_completed_jobseeker),
    session: Session = Depends(get_db_session),
) -> ApplicationResponse:
    jobseeker = ensure_found(get_jobseeker_by_app_user_id(session, auth_context.app_user_id), entity_name="Jobseeker")
    application = create_application(
        session,
        jobseeker=jobseeker,
        job_listing_id=payload.job_listing_id,
        actor_id=auth_context.app_user_id,
    )
    return ApplicationResponse(application=serialize_application(application))


@router.get("/me", response_model=PaginatedResponse[MyApplicationListItemPayload])
def get_my_applications(
    status: str | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    auth_context: AuthContext = Depends(require_jobseeker),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[MyApplicationListItemPayload]:
    jobseeker = ensure_found(get_jobseeker_by_app_user_id(session, auth_context.app_user_id), entity_name="Jobseeker")
    return list_my_applications(session, jobseeker=jobseeker, pagination=pagination, sort=sort, status=status)
