from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_staff
from app.core.exceptions import AppError
from app.core.responses import PaginatedResponse
from app.db.session import get_db_session
from app.models import AppUser
from app.schemas.admin import AdminDashboardPayload, AuditLogPayload
from app.schemas.applications import (
    AdminApplicationListItemPayload,
    UpdateApplicationStatusRequest,
    UpdateApplicationStatusResponse,
)
from app.schemas.employer import (
    EmployerProfilePayload,
    JobListingListItemPayload,
    UpdateEmployerReviewRequest,
    UpdateEmployerReviewResponse,
    UpdateListingReviewRequest,
    UpdateListingReviewResponse,
)
from app.schemas.jobseeker import (
    AdminJobseekerDetailResponse,
    AdminJobseekerUpdateRequest,
    AdminJobseekerUpdateResponse,
    JobseekerListItemPayload,
)
from app.schemas.matching import (
    JobForJobseekerMatchResponse,
    JobseekerForListingMatchResponse,
)
from app.schemas.notifications import (
    NotificationConfigPayload,
    NotificationConfigResponse,
    NotificationConfigUpdateRequest,
)
from app.services.admin import get_admin_dashboard_summary, list_audit_logs
from app.services.applications import (
    get_application_by_id,
    list_admin_applications,
    serialize_application_update_result,
    update_application_status,
)
from app.services.common import (
    DEFAULT_PAGE_SIZE,
    PaginationParams,
    SortParams,
    ensure_found,
    get_pagination_params,
    get_sort_params,
)
from app.services.employer import (
    get_employer_by_id,
    get_listing_by_id,
    list_employers,
    list_listings,
    review_employer,
    review_listing,
    serialize_employer,
    serialize_listing,
)
from app.services.jobseeker import (
    build_admin_jobseeker_detail,
    get_jobseeker_by_id,
    list_jobseekers,
    serialize_jobseeker_update_result,
    update_jobseeker_profile,
)
from app.services.matching import (
    get_eligible_jobs_for_jobseeker,
    get_eligible_jobseekers_for_job,
)
from app.services.notifications import (
    get_notification_config,
    serialize_notification_config,
    update_notification_config,
)

AUDIT_LOG_MAX_PAGE_SIZE = 50

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def get_audit_log_pagination_params(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=AUDIT_LOG_MAX_PAGE_SIZE),
) -> PaginationParams:
    return PaginationParams(page=page, page_size=page_size)


@router.get("/dashboard", response_model=AdminDashboardPayload)
def get_admin_dashboard(
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> AdminDashboardPayload:
    return get_admin_dashboard_summary(session)


@router.get(
    "/queue/employers", response_model=PaginatedResponse[EmployerProfilePayload]
)
def get_pending_employer_queue(
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[EmployerProfilePayload]:
    return list_employers(session, pagination=pagination, sort=sort, pending_only=True)


@router.get("/employers", response_model=PaginatedResponse[EmployerProfilePayload])
def get_all_employers(
    review_status: str | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[EmployerProfilePayload]:
    return list_employers(
        session, pagination=pagination, sort=sort, review_status=review_status
    )


@router.patch("/employers/{employer_id}", response_model=UpdateEmployerReviewResponse)
def patch_employer_review(
    employer_id: UUID,
    payload: UpdateEmployerReviewRequest,
    auth_context: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> UpdateEmployerReviewResponse:
    employer = ensure_found(
        get_employer_by_id(session, employer_id), entity_name="Employer"
    )
    reviewer = ensure_found(
        session.get(AppUser, auth_context.app_user_id), entity_name="Staff user"
    )
    employer = review_employer(
        session,
        employer=employer,
        reviewer=reviewer,
        review_status=payload.review_status,
        review_note=payload.review_note,
    )
    return UpdateEmployerReviewResponse(employer=serialize_employer(employer))


@router.get(
    "/queue/listings", response_model=PaginatedResponse[JobListingListItemPayload]
)
def get_pending_listing_queue(
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[JobListingListItemPayload]:
    return list_listings(session, pagination=pagination, sort=sort, pending_only=True)


@router.get("/listings", response_model=PaginatedResponse[JobListingListItemPayload])
def get_all_listings(
    review_status: str | None = Query(default=None),
    lifecycle_status: str | None = Query(default=None),
    employer_id: UUID | None = Query(default=None),
    city: str | None = Query(default=None),
    search: str | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[JobListingListItemPayload]:
    return list_listings(
        session,
        pagination=pagination,
        sort=sort,
        review_status=review_status,
        lifecycle_status=lifecycle_status,
        employer_id=employer_id,
        city=city,
        search=search,
    )


@router.patch("/listings/{listing_id}", response_model=UpdateListingReviewResponse)
def patch_listing_review(
    listing_id: UUID,
    payload: UpdateListingReviewRequest,
    auth_context: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> UpdateListingReviewResponse:
    listing = ensure_found(
        get_listing_by_id(session, listing_id), entity_name="Job listing"
    )
    reviewer = ensure_found(
        session.get(AppUser, auth_context.app_user_id), entity_name="Staff user"
    )
    listing = review_listing(
        session,
        listing=listing,
        reviewer=reviewer,
        review_status=payload.review_status,
        lifecycle_status=payload.lifecycle_status,
        review_note=payload.review_note,
    )
    return UpdateListingReviewResponse(listing=serialize_listing(listing))


@router.get("/jobseekers", response_model=PaginatedResponse[JobseekerListItemPayload])
def get_all_jobseekers(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    transit_type: str | None = Query(default=None),
    charge_sex_offense: bool | None = Query(default=None),
    charge_violent: bool | None = Query(default=None),
    charge_armed: bool | None = Query(default=None),
    charge_children: bool | None = Query(default=None),
    charge_drug: bool | None = Query(default=None),
    charge_theft: bool | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[JobseekerListItemPayload]:
    return list_jobseekers(
        session,
        pagination=pagination,
        sort=sort,
        search=search,
        status=status,
        transit_type=transit_type,
        charge_sex_offense=charge_sex_offense,
        charge_violent=charge_violent,
        charge_armed=charge_armed,
        charge_children=charge_children,
        charge_drug=charge_drug,
        charge_theft=charge_theft,
    )


@router.get("/jobseekers/{jobseeker_id}", response_model=AdminJobseekerDetailResponse)
def get_admin_jobseeker_detail(
    jobseeker_id: UUID,
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> AdminJobseekerDetailResponse:
    jobseeker = ensure_found(
        get_jobseeker_by_id(session, jobseeker_id), entity_name="Jobseeker"
    )
    return build_admin_jobseeker_detail(jobseeker)


@router.patch("/jobseekers/{jobseeker_id}", response_model=AdminJobseekerUpdateResponse)
def patch_admin_jobseeker(
    jobseeker_id: UUID,
    payload: AdminJobseekerUpdateRequest,
    auth_context: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> AdminJobseekerUpdateResponse:
    jobseeker = ensure_found(
        get_jobseeker_by_id(session, jobseeker_id), entity_name="Jobseeker"
    )
    jobseeker = update_jobseeker_profile(
        session,
        jobseeker=jobseeker,
        payload=payload,
        actor_id=auth_context.app_user_id,
        action="admin.jobseeker_updated",
    )
    return AdminJobseekerUpdateResponse(
        jobseeker=serialize_jobseeker_update_result(jobseeker)
    )


@router.get(
    "/applications", response_model=PaginatedResponse[AdminApplicationListItemPayload]
)
def get_all_applications(
    status: str | None = Query(default=None),
    job_listing_id: UUID | None = Query(default=None),
    jobseeker_id: UUID | None = Query(default=None),
    employer_id: UUID | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[AdminApplicationListItemPayload]:
    return list_admin_applications(
        session,
        pagination=pagination,
        sort=sort,
        status=status,
        job_listing_id=job_listing_id,
        jobseeker_id=jobseeker_id,
        employer_id=employer_id,
    )


@router.patch(
    "/applications/{application_id}", response_model=UpdateApplicationStatusResponse
)
def patch_application_status(
    application_id: UUID,
    payload: UpdateApplicationStatusRequest,
    auth_context: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> UpdateApplicationStatusResponse:
    application = ensure_found(
        get_application_by_id(session, application_id), entity_name="Application"
    )
    application = update_application_status(
        session,
        application=application,
        actor_id=auth_context.app_user_id,
        status=payload.status,
        close_listing_after_hire=payload.close_listing_after_hire,
    )
    return UpdateApplicationStatusResponse(
        application=serialize_application_update_result(application)
    )


@router.get("/config/notifications", response_model=NotificationConfigPayload)
def get_admin_notification_config(
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> NotificationConfigPayload:
    config = get_notification_config(session, persist_if_missing=True)
    return serialize_notification_config(config)


@router.patch("/config/notifications", response_model=NotificationConfigResponse)
def patch_admin_notification_config(
    payload: NotificationConfigUpdateRequest,
    auth_context: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> NotificationConfigResponse:
    if not payload.has_updates():
        raise AppError(
            status_code=422,
            code="VALIDATION_ERROR",
            detail="At least one notification config field must be provided.",
        )
    config = update_notification_config(
        session,
        actor_id=auth_context.app_user_id,
        notify_staff_on_apply=payload.notify_staff_on_apply,
        notify_employer_on_apply=payload.notify_employer_on_apply,
        share_applicants_with_employer=payload.share_applicants_with_employer,
    )
    return NotificationConfigResponse(config=serialize_notification_config(config))


@router.get("/audit-log", response_model=PaginatedResponse[AuditLogPayload])
def get_admin_audit_log(
    actor_id: UUID | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    entity_id: UUID | None = Query(default=None),
    action: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    pagination: PaginationParams = Depends(get_audit_log_pagination_params),
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[AuditLogPayload]:
    return list_audit_logs(
        session,
        pagination=pagination,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        date_from=date_from,
        date_to=date_to,
    )


@router.get(
    "/match/jobseeker/{jobseeker_id}", response_model=JobForJobseekerMatchResponse
)
def get_matches_for_jobseeker(
    jobseeker_id: UUID,
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> JobForJobseekerMatchResponse:
    return JobForJobseekerMatchResponse(
        items=get_eligible_jobs_for_jobseeker(session, jobseeker_id)
    )


@router.get(
    "/match/listing/{listing_id}", response_model=JobseekerForListingMatchResponse
)
def get_matches_for_listing(
    listing_id: UUID,
    _: AuthContext = Depends(require_staff),
    session: Session = Depends(get_db_session),
) -> JobseekerForListingMatchResponse:
    return JobseekerForListingMatchResponse(
        items=get_eligible_jobseekers_for_job(session, listing_id)
    )
