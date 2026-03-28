from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.audit import write_audit
from app.core.exceptions import AppError
from app.models import Application, Employer, JobListing, Jobseeker
from app.models.enums import (
    ApplicationStatus,
    EmployerReviewStatus,
    ListingLifecycleStatus,
    ListingReviewStatus,
)
from app.schemas.applications import (
    AdminApplicationJobseekerSummaryPayload,
    AdminApplicationJobSummaryPayload,
    AdminApplicationListItemPayload,
    ApplicationJobSummaryPayload,
    ApplicationPayload,
    JobDetailResponse,
    JobEligibilityPayload,
    JobWithEligibilityPayload,
    MyApplicationListItemPayload,
    UpdateApplicationStatusResultPayload,
)
from app.services.common import (
    PaginationParams,
    SortParams,
    apply_filters,
    apply_pagination,
    apply_sorting,
    build_paginated_response,
    ensure_found,
)
from app.services.employer import serialize_listing
from app.services.matching import evaluate_jobseeker_listing_match
from app.services.notifications import (
    notify_application_status_changed,
    notify_application_submitted,
)

VISIBLE_JOB_ALLOWED_SORTS = {
    "created_at": JobListing.created_at,
    "updated_at": JobListing.updated_at,
    "title": JobListing.title,
    "city": JobListing.city,
}
APPLICATION_ALLOWED_FILTERS = {
    "status": Application.status,
    "job_listing_id": Application.job_listing_id,
    "jobseeker_id": Application.jobseeker_id,
    "employer_id": JobListing.employer_id,
}
APPLICATION_ALLOWED_SORTS = {
    "applied_at": Application.applied_at,
    "updated_at": Application.updated_at,
    "status": Application.status,
}
ALLOWED_APPLICATION_TRANSITIONS = {
    ApplicationStatus.SUBMITTED: {
        ApplicationStatus.SUBMITTED,
        ApplicationStatus.REVIEWED,
        ApplicationStatus.HIRED,
    },
    ApplicationStatus.REVIEWED: {ApplicationStatus.REVIEWED, ApplicationStatus.HIRED},
    ApplicationStatus.HIRED: {ApplicationStatus.HIRED},
}


def _visible_jobs_statement():
    return (
        select(JobListing)
        .join(JobListing.employer)
        .options(joinedload(JobListing.employer).joinedload(Employer.app_user))
        .where(
            Employer.review_status == EmployerReviewStatus.APPROVED,
            JobListing.review_status == ListingReviewStatus.APPROVED,
            JobListing.lifecycle_status == ListingLifecycleStatus.OPEN,
        )
    )


def _applications_statement():
    return select(Application).options(
        joinedload(Application.job_listing)
        .joinedload(JobListing.employer)
        .joinedload(Employer.app_user),
        joinedload(Application.jobseeker).joinedload(Jobseeker.app_user),
    )


def serialize_application(application: Application) -> ApplicationPayload:
    return ApplicationPayload(
        id=application.id,
        jobseeker_id=application.jobseeker_id,
        job_listing_id=application.job_listing_id,
        status=application.status.value,
        applied_at=application.applied_at,
        updated_at=application.updated_at,
    )


def serialize_job_with_eligibility(
    jobseeker: Jobseeker, listing: JobListing, *, has_applied: bool = False
) -> JobWithEligibilityPayload:
    result = evaluate_jobseeker_listing_match(jobseeker, listing)
    return JobWithEligibilityPayload(
        job=serialize_listing(listing),
        is_eligible=result.is_eligible,
        ineligibility_tag=result.ineligibility_tag,
        has_applied=has_applied,
    )


def build_job_detail_for_jobseeker(
    jobseeker: Jobseeker, listing: JobListing, *, has_applied: bool = False
) -> JobDetailResponse:
    result = evaluate_jobseeker_listing_match(jobseeker, listing)
    return JobDetailResponse(
        job=serialize_listing(listing),
        eligibility=JobEligibilityPayload(
            is_eligible=result.is_eligible,
            ineligibility_tag=result.ineligibility_tag,
            has_applied=has_applied,
        ),
    )


def serialize_my_application(application: Application) -> MyApplicationListItemPayload:
    return MyApplicationListItemPayload(
        id=application.id,
        status=application.status.value,
        applied_at=application.applied_at,
        updated_at=application.updated_at,
        job=ApplicationJobSummaryPayload(
            id=application.job_listing.id,
            title=application.job_listing.title,
            city=application.job_listing.city,
            lifecycle_status=application.job_listing.lifecycle_status.value,
        ),
    )


def serialize_admin_application(
    application: Application,
) -> AdminApplicationListItemPayload:
    return AdminApplicationListItemPayload(
        id=application.id,
        status=application.status.value,
        applied_at=application.applied_at,
        updated_at=application.updated_at,
        jobseeker=AdminApplicationJobseekerSummaryPayload(
            id=application.jobseeker.id,
            full_name=application.jobseeker.full_name,
        ),
        job=AdminApplicationJobSummaryPayload(
            id=application.job_listing.id,
            title=application.job_listing.title,
        ),
    )


def get_visible_job_listing_by_id(
    session: Session, listing_id: UUID
) -> JobListing | None:
    statement = _visible_jobs_statement().where(JobListing.id == listing_id)
    return session.execute(statement).unique().scalar_one_or_none()


def get_application_by_id(session: Session, application_id: UUID) -> Application | None:
    statement = _applications_statement().where(Application.id == application_id)
    return session.execute(statement).unique().scalar_one_or_none()


def get_jobseeker_application_by_listing(
    session: Session, *, jobseeker_id: UUID, job_listing_id: UUID
) -> Application | None:
    statement = _applications_statement().where(
        Application.jobseeker_id == jobseeker_id,
        Application.job_listing_id == job_listing_id,
    )
    return session.execute(statement).unique().scalar_one_or_none()


def list_visible_jobs_for_jobseeker(
    session: Session,
    *,
    jobseeker: Jobseeker,
    pagination: PaginationParams,
    sort: SortParams,
    search: str | None = None,
    city: str | None = None,
    transit_required: str | None = None,
    is_eligible: bool | None = None,
):
    base_statement = _visible_jobs_statement()
    if search:
        term = f"%{search.strip()}%"
        base_statement = base_statement.where(
            or_(
                JobListing.title.ilike(term),
                JobListing.description.ilike(term),
                JobListing.city.ilike(term),
            )
        )
    base_statement = apply_filters(
        base_statement,
        filters={
            "city": city,
            "transit_required": transit_required,
        },
        allowed_filters={
            "city": JobListing.city,
            "transit_required": JobListing.transit_required,
        },
    )
    statement = apply_sorting(
        base_statement, sort=sort, allowed_sorts=VISIBLE_JOB_ALLOWED_SORTS
    )
    listings = session.execute(statement).unique().scalars().all()
    applied_listing_ids: set[UUID] = set()
    if listings:
        applied_listing_ids = set(
            session.execute(
                select(Application.job_listing_id).where(
                    Application.jobseeker_id == jobseeker.id,
                    Application.job_listing_id.in_(
                        [listing.id for listing in listings]
                    ),
                )
            )
            .scalars()
            .all()
        )
    serialized_items = [
        serialize_job_with_eligibility(
            jobseeker,
            listing,
            has_applied=listing.id in applied_listing_ids,
        )
        for listing in listings
    ]
    if is_eligible is not None:
        serialized_items = [
            item for item in serialized_items if item.is_eligible is is_eligible
        ]
    total_items = len(serialized_items)
    page_items = serialized_items[
        pagination.offset : pagination.offset + pagination.page_size
    ]
    return build_paginated_response(
        items=page_items,
        total_items=total_items,
        pagination=pagination,
    )


def get_job_detail_for_jobseeker(
    session: Session, *, jobseeker: Jobseeker, job_listing_id: UUID
) -> JobDetailResponse:
    listing = ensure_found(
        get_visible_job_listing_by_id(session, job_listing_id),
        entity_name="Job listing",
    )
    has_applied = (
        get_jobseeker_application_by_listing(
            session,
            jobseeker_id=jobseeker.id,
            job_listing_id=job_listing_id,
        )
        is not None
    )
    return build_job_detail_for_jobseeker(jobseeker, listing, has_applied=has_applied)


def create_application(
    session: Session, *, jobseeker: Jobseeker, job_listing_id: UUID, actor_id: UUID
) -> Application:
    listing = ensure_found(
        get_visible_job_listing_by_id(session, job_listing_id),
        entity_name="Job listing",
    )

    existing = get_jobseeker_application_by_listing(
        session, jobseeker_id=jobseeker.id, job_listing_id=job_listing_id
    )
    if existing is not None:
        raise AppError(
            status_code=409,
            code="CONFLICT",
            detail="This jobseeker has already applied to this listing.",
        )

    eligibility = evaluate_jobseeker_listing_match(jobseeker, listing)
    if not eligibility.is_eligible:
        raise AppError(
            status_code=422,
            code="LISTING_NOT_ELIGIBLE",
            detail="This jobseeker is not eligible to apply for this listing.",
        )

    application = Application(
        jobseeker_id=jobseeker.id,
        job_listing_id=listing.id,
        status=ApplicationStatus.SUBMITTED,
    )
    session.add(application)
    session.flush()
    application = ensure_found(
        get_application_by_id(session, application.id), entity_name="Application"
    )
    write_audit(
        session,
        actor_id=actor_id,
        action="application.submitted",
        entity_type="application",
        entity_id=application.id,
        new_value=serialize_application(application).model_dump(mode="json"),
    )
    session.commit()
    application = ensure_found(
        get_application_by_id(session, application.id), entity_name="Application"
    )
    notify_application_submitted(session, application=application)
    return application


def list_my_applications(
    session: Session,
    *,
    jobseeker: Jobseeker,
    pagination: PaginationParams,
    sort: SortParams,
    status: str | None = None,
):
    base_statement = _applications_statement().where(
        Application.jobseeker_id == jobseeker.id
    )
    base_statement = apply_filters(
        base_statement,
        filters={"status": status},
        allowed_filters=APPLICATION_ALLOWED_FILTERS,
    )
    total_items = session.execute(
        select(func.count()).select_from(base_statement.subquery())
    ).scalar_one()
    statement = apply_sorting(
        base_statement, sort=sort, allowed_sorts=APPLICATION_ALLOWED_SORTS
    )
    statement = apply_pagination(statement, pagination)
    items = session.execute(statement).unique().scalars().all()
    return build_paginated_response(
        items=[serialize_my_application(item) for item in items],
        total_items=total_items,
        pagination=pagination,
    )


def list_admin_applications(
    session: Session,
    *,
    pagination: PaginationParams,
    sort: SortParams,
    status: str | None = None,
    job_listing_id: UUID | None = None,
    jobseeker_id: UUID | None = None,
    employer_id: UUID | None = None,
):
    base_statement = _applications_statement()
    if employer_id is not None:
        base_statement = base_statement.join(Application.job_listing).where(
            JobListing.employer_id == employer_id
        )
    base_statement = apply_filters(
        base_statement,
        filters={
            "status": status,
            "job_listing_id": job_listing_id,
            "jobseeker_id": jobseeker_id,
        },
        allowed_filters={
            key: value
            for key, value in APPLICATION_ALLOWED_FILTERS.items()
            if key != "employer_id"
        },
    )
    total_items = session.execute(
        select(func.count()).select_from(base_statement.subquery())
    ).scalar_one()
    statement = apply_sorting(
        base_statement, sort=sort, allowed_sorts=APPLICATION_ALLOWED_SORTS
    )
    statement = apply_pagination(statement, pagination)
    items = session.execute(statement).unique().scalars().all()
    return build_paginated_response(
        items=[serialize_admin_application(item) for item in items],
        total_items=total_items,
        pagination=pagination,
    )


def _validate_application_transition(
    *, current_status: ApplicationStatus, next_status: ApplicationStatus
) -> None:
    allowed_statuses = ALLOWED_APPLICATION_TRANSITIONS[current_status]
    if next_status not in allowed_statuses:
        raise AppError(
            status_code=422,
            code="INVALID_APPLICATION_STATUS_TRANSITION",
            detail=f"Applications cannot move from {current_status.value} to {next_status.value}.",
        )


def update_application_status(
    session: Session,
    *,
    application: Application,
    actor_id: UUID,
    status: str,
    close_listing_after_hire: bool,
) -> Application:
    target_status = ApplicationStatus(status)
    _validate_application_transition(
        current_status=application.status, next_status=target_status
    )

    if close_listing_after_hire and target_status != ApplicationStatus.HIRED:
        raise AppError(
            status_code=422,
            code="INVALID_APPLICATION_STATUS_TRANSITION",
            detail="Listings may only be closed automatically when an application is marked hired.",
        )

    old_application_value = serialize_application(application).model_dump(mode="json")
    previous_status = application.status
    listing_will_close = (
        close_listing_after_hire
        and target_status == ApplicationStatus.HIRED
        and application.job_listing.lifecycle_status != ListingLifecycleStatus.CLOSED
    )
    old_listing_value = (
        serialize_listing(application.job_listing).model_dump(mode="json")
        if listing_will_close
        else None
    )

    application_changed = application.status != target_status
    if application_changed:
        application.status = target_status
        application.updated_at = datetime.now(timezone.utc)

    if listing_will_close:
        application.job_listing.lifecycle_status = ListingLifecycleStatus.CLOSED

    session.flush()

    if application_changed:
        write_audit(
            session,
            actor_id=actor_id,
            action=f"application.{target_status.value}",
            entity_type="application",
            entity_id=application.id,
            old_value=old_application_value,
            new_value=serialize_application(application).model_dump(mode="json"),
        )

    if listing_will_close:
        write_audit(
            session,
            actor_id=actor_id,
            action="listing.closed",
            entity_type="job_listing",
            entity_id=application.job_listing.id,
            old_value=old_listing_value,
            new_value=serialize_listing(application.job_listing).model_dump(
                mode="json"
            ),
        )

    session.commit()
    application = ensure_found(
        get_application_by_id(session, application.id), entity_name="Application"
    )
    if application_changed:
        notify_application_status_changed(
            session, application=application, previous_status=previous_status
        )
    return application


def serialize_application_update_result(
    application: Application,
) -> UpdateApplicationStatusResultPayload:
    return UpdateApplicationStatusResultPayload(
        id=application.id,
        status=application.status.value,
        updated_at=application.updated_at,
    )
