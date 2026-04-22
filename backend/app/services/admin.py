from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import case, desc, func, select
from sqlalchemy.orm import Session

from app.models import Application, AuditLog, Employer, JobListing, Jobseeker
from app.models.enums import (
    ApplicationStatus,
    EmployerReviewStatus,
    JobseekerStatus,
    ListingLifecycleStatus,
    ListingReviewStatus,
)
from app.schemas.admin import (
    AdminDashboardPayload,
    AuditLogPayload,
    PlacementSummaryPayload,
    PlacementSummaryRowPayload,
)
from app.services.common import (
    PaginationParams,
    apply_pagination,
    build_paginated_response,
)


def _serialize_month_bucket(year: int, month: int) -> datetime:
    return datetime(year, month, 1, tzinfo=UTC)


def get_admin_dashboard_placement_summary(session: Session) -> PlacementSummaryPayload:
    current_year = datetime.now(UTC).year
    current_year_start = datetime(current_year, 1, 1, tzinfo=UTC)
    next_year_start = datetime(current_year + 1, 1, 1, tzinfo=UTC)

    monthly_rows = session.execute(
        select(
            func.extract("year", Application.applied_at).label("year"),
            func.extract("month", Application.applied_at).label("month"),
            func.count(Application.id).label("applications"),
            func.coalesce(
                func.sum(
                    case(
                        (Application.status == ApplicationStatus.HIRED, 1),
                        else_=0,
                    )
                ),
                0,
            ).label("hires"),
        )
        .select_from(Application)
        .group_by("year", "month")
        .order_by(desc("year"), desc("month"))
        .limit(4)
    ).all()

    ytd_applications, ytd_hires = session.execute(
        select(
            func.count(Application.id),
            func.coalesce(
                func.sum(
                    case(
                        (Application.status == ApplicationStatus.HIRED, 1),
                        else_=0,
                    )
                ),
                0,
            ),
        )
        .select_from(Application)
        .where(
            Application.applied_at >= current_year_start,
            Application.applied_at < next_year_start,
        )
    ).one()

    ytd_employers = session.execute(
        select(func.count(func.distinct(JobListing.employer_id)))
        .select_from(Application)
        .join(JobListing, JobListing.id == Application.job_listing_id)
        .where(
            Application.status == ApplicationStatus.HIRED,
            Application.applied_at >= current_year_start,
            Application.applied_at < next_year_start,
        )
    ).scalar_one()

    return PlacementSummaryPayload(
        rows=[
            PlacementSummaryRowPayload(
                month=_serialize_month_bucket(int(row.year), int(row.month)),
                applications=int(row.applications),
                hires=int(row.hires),
            )
            for row in monthly_rows
        ],
        ytd_applications=int(ytd_applications),
        ytd_hires=int(ytd_hires),
        ytd_employers=int(ytd_employers),
    )


def get_admin_dashboard_summary(session: Session) -> AdminDashboardPayload:
    pending_employers = session.execute(
        select(func.count())
        .select_from(Employer)
        .where(Employer.review_status == EmployerReviewStatus.PENDING)
    ).scalar_one()
    pending_listings = session.execute(
        select(func.count())
        .select_from(JobListing)
        .where(JobListing.review_status == ListingReviewStatus.PENDING)
    ).scalar_one()
    active_jobseekers = session.execute(
        select(func.count())
        .select_from(Jobseeker)
        .where(Jobseeker.status == JobseekerStatus.ACTIVE)
    ).scalar_one()
    open_applications = session.execute(
        select(func.count())
        .select_from(Application)
        .where(Application.status != ApplicationStatus.HIRED)
    ).scalar_one()
    open_listings = session.execute(
        select(func.count())
        .select_from(JobListing)
        .where(
            JobListing.review_status == ListingReviewStatus.APPROVED,
            JobListing.lifecycle_status == ListingLifecycleStatus.OPEN,
        )
    ).scalar_one()
    placement_summary = get_admin_dashboard_placement_summary(session)
    return AdminDashboardPayload(
        pending_employers=pending_employers,
        pending_listings=pending_listings,
        active_jobseekers=active_jobseekers,
        open_applications=open_applications,
        open_listings=open_listings,
        placement_summary=placement_summary,
    )


def serialize_audit_log(entry: AuditLog) -> AuditLogPayload:
    return AuditLogPayload(
        id=entry.id,
        actor_id=entry.actor_id,
        action=entry.action,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        old_value=entry.old_value,
        new_value=entry.new_value,
        timestamp=entry.timestamp,
    )


def list_audit_logs(
    session: Session,
    *,
    pagination: PaginationParams,
    actor_id: UUID | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    action: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
):
    base_statement = select(AuditLog)

    if actor_id is not None:
        base_statement = base_statement.where(AuditLog.actor_id == actor_id)
    if entity_type is not None:
        base_statement = base_statement.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        base_statement = base_statement.where(AuditLog.entity_id == entity_id)
    if action is not None:
        base_statement = base_statement.where(AuditLog.action == action)
    if date_from is not None:
        base_statement = base_statement.where(AuditLog.timestamp >= date_from)
    if date_to is not None:
        base_statement = base_statement.where(AuditLog.timestamp <= date_to)

    total_items = session.execute(
        select(func.count()).select_from(base_statement.subquery())
    ).scalar_one()
    statement = base_statement.order_by(AuditLog.timestamp.desc())
    statement = apply_pagination(statement, pagination)
    items = session.execute(statement).scalars().all()
    return build_paginated_response(
        items=[serialize_audit_log(item) for item in items],
        total_items=total_items,
        pagination=pagination,
    )
