from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Application, AuditLog, Employer, JobListing, Jobseeker
from app.models.enums import ApplicationStatus, EmployerReviewStatus, JobseekerStatus, ListingLifecycleStatus, ListingReviewStatus
from app.schemas.admin import AdminDashboardPayload, AuditLogPayload
from app.services.common import PaginationParams, apply_pagination, build_paginated_response



def get_admin_dashboard_summary(session: Session) -> AdminDashboardPayload:
    pending_employers = session.execute(
        select(func.count()).select_from(Employer).where(Employer.review_status == EmployerReviewStatus.PENDING)
    ).scalar_one()
    pending_listings = session.execute(
        select(func.count()).select_from(JobListing).where(JobListing.review_status == ListingReviewStatus.PENDING)
    ).scalar_one()
    active_jobseekers = session.execute(
        select(func.count()).select_from(Jobseeker).where(Jobseeker.status == JobseekerStatus.ACTIVE)
    ).scalar_one()
    open_applications = session.execute(
        select(func.count()).select_from(Application).where(Application.status != ApplicationStatus.HIRED)
    ).scalar_one()
    open_listings = session.execute(
        select(func.count())
        .select_from(JobListing)
        .where(
            JobListing.review_status == ListingReviewStatus.APPROVED,
            JobListing.lifecycle_status == ListingLifecycleStatus.OPEN,
        )
    ).scalar_one()
    return AdminDashboardPayload(
        pending_employers=pending_employers,
        pending_listings=pending_listings,
        active_jobseekers=active_jobseekers,
        open_applications=open_applications,
        open_listings=open_listings,
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

    total_items = session.execute(select(func.count()).select_from(base_statement.subquery())).scalar_one()
    statement = base_statement.order_by(AuditLog.timestamp.desc())
    statement = apply_pagination(statement, pagination)
    items = session.execute(statement).scalars().all()
    return build_paginated_response(
        items=[serialize_audit_log(item) for item in items],
        total_items=total_items,
        pagination=pagination,
    )
