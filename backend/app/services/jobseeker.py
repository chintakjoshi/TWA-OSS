from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.audit import write_audit
from app.models import Application, AppUser, Jobseeker
from app.models.enums import JobseekerStatus, TransitType
from app.schemas.employer import ChargeFlagsPayload
from app.schemas.jobseeker import (
    AdminJobseekerDetailResponse,
    JobseekerApplicationSummaryPayload,
    JobseekerListItemPayload,
    JobseekerProfilePayload,
    JobseekerProfileUpdateResultPayload,
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

JOBSEEKER_ALLOWED_FILTERS = {
    "status": Jobseeker.status,
    "transit_type": Jobseeker.transit_type,
    "charge_sex_offense": Jobseeker.charge_sex_offense,
    "charge_violent": Jobseeker.charge_violent,
    "charge_armed": Jobseeker.charge_armed,
    "charge_children": Jobseeker.charge_children,
    "charge_drug": Jobseeker.charge_drug,
    "charge_theft": Jobseeker.charge_theft,
}
JOBSEEKER_ALLOWED_SORTS = {
    "created_at": Jobseeker.created_at,
    "updated_at": Jobseeker.updated_at,
    "full_name": Jobseeker.full_name,
    "city": Jobseeker.city,
}


def is_jobseeker_profile_complete(jobseeker: Jobseeker | None) -> bool:
    if jobseeker is None:
        return False
    required_fields = [
        jobseeker.full_name,
        jobseeker.phone,
        jobseeker.address,
        jobseeker.city,
        jobseeker.zip,
    ]
    if any(value is None or not str(value).strip() for value in required_fields):
        return False
    return jobseeker.transit_type is not None


def serialize_charge_flags(jobseeker: Jobseeker) -> ChargeFlagsPayload:
    return ChargeFlagsPayload(
        sex_offense=jobseeker.charge_sex_offense,
        violent=jobseeker.charge_violent,
        armed=jobseeker.charge_armed,
        children=jobseeker.charge_children,
        drug=jobseeker.charge_drug,
        theft=jobseeker.charge_theft,
    )


def serialize_jobseeker(jobseeker: Jobseeker) -> JobseekerProfilePayload:
    return JobseekerProfilePayload(
        id=jobseeker.id,
        app_user_id=jobseeker.app_user_id,
        auth_user_id=jobseeker.app_user.auth_user_id,
        full_name=jobseeker.full_name,
        phone=jobseeker.phone,
        address=jobseeker.address,
        city=jobseeker.city,
        zip=jobseeker.zip,
        transit_type=jobseeker.transit_type.value if jobseeker.transit_type else None,
        charges=serialize_charge_flags(jobseeker),
        profile_complete=is_jobseeker_profile_complete(jobseeker),
        status=jobseeker.status.value,
        created_at=jobseeker.created_at,
        updated_at=jobseeker.updated_at,
    )


def serialize_jobseeker_update_result(
    jobseeker: Jobseeker,
) -> JobseekerProfileUpdateResultPayload:
    return JobseekerProfileUpdateResultPayload(
        id=jobseeker.id,
        profile_complete=is_jobseeker_profile_complete(jobseeker),
        updated_at=jobseeker.updated_at,
    )


def serialize_jobseeker_list_item(jobseeker: Jobseeker) -> JobseekerListItemPayload:
    return JobseekerListItemPayload(
        id=jobseeker.id,
        full_name=jobseeker.full_name,
        city=jobseeker.city,
        zip=jobseeker.zip,
        transit_type=jobseeker.transit_type.value if jobseeker.transit_type else None,
        status=jobseeker.status.value,
    )


def serialize_application_summary(
    application: Application,
) -> JobseekerApplicationSummaryPayload:
    return JobseekerApplicationSummaryPayload(
        id=application.id,
        status=application.status.value,
        job_listing_id=application.job_listing_id,
    )


def get_jobseeker_by_app_user_id(
    session: Session, app_user_id: UUID
) -> Jobseeker | None:
    statement = (
        select(Jobseeker)
        .options(joinedload(Jobseeker.app_user))
        .where(Jobseeker.app_user_id == app_user_id)
    )
    return session.execute(statement).unique().scalar_one_or_none()


def get_jobseeker_by_id(session: Session, jobseeker_id: UUID) -> Jobseeker | None:
    statement = (
        select(Jobseeker)
        .options(
            joinedload(Jobseeker.app_user),
            joinedload(Jobseeker.applications).joinedload(Application.job_listing),
        )
        .where(Jobseeker.id == jobseeker_id)
    )
    return session.execute(statement).unique().scalar_one_or_none()


def update_jobseeker_profile(
    session: Session,
    *,
    jobseeker: Jobseeker,
    payload: Any,
    actor_id: UUID | None,
    action: str,
) -> Jobseeker:
    old_value = serialize_jobseeker(jobseeker).model_dump(mode="json")

    for field in ("full_name", "phone", "address", "city", "zip"):
        value = getattr(payload, field, None)
        if value is not None:
            setattr(jobseeker, field, value)

    transit_type = getattr(payload, "transit_type", None)
    if transit_type is not None:
        jobseeker.transit_type = TransitType(transit_type)

    charges = getattr(payload, "charges", None)
    if charges is not None:
        jobseeker.charge_sex_offense = charges.sex_offense
        jobseeker.charge_violent = charges.violent
        jobseeker.charge_armed = charges.armed
        jobseeker.charge_children = charges.children
        jobseeker.charge_drug = charges.drug
        jobseeker.charge_theft = charges.theft

    status = getattr(payload, "status", None)
    if status is not None:
        jobseeker.status = JobseekerStatus(status)

    session.flush()
    write_audit(
        session,
        actor_id=actor_id,
        action=action,
        entity_type="jobseeker",
        entity_id=jobseeker.id,
        old_value=old_value,
        new_value=serialize_jobseeker(jobseeker).model_dump(mode="json"),
    )
    session.commit()
    session.refresh(jobseeker)
    return ensure_found(
        get_jobseeker_by_id(session, jobseeker.id), entity_name="Jobseeker"
    )


def list_jobseekers(
    session: Session,
    *,
    pagination: PaginationParams,
    sort: SortParams,
    search: str | None = None,
    status: str | None = None,
    transit_type: str | None = None,
    charge_sex_offense: bool | None = None,
    charge_violent: bool | None = None,
    charge_armed: bool | None = None,
    charge_children: bool | None = None,
    charge_drug: bool | None = None,
    charge_theft: bool | None = None,
):
    base_statement = select(Jobseeker).options(joinedload(Jobseeker.app_user))
    if search:
        term = f"%{search.strip()}%"
        base_statement = base_statement.join(Jobseeker.app_user).where(
            or_(
                Jobseeker.full_name.ilike(term),
                Jobseeker.city.ilike(term),
                Jobseeker.zip.ilike(term),
                AppUser.email.ilike(term),
            )
        )

    base_statement = apply_filters(
        base_statement,
        filters={
            "status": status,
            "transit_type": transit_type,
            "charge_sex_offense": charge_sex_offense,
            "charge_violent": charge_violent,
            "charge_armed": charge_armed,
            "charge_children": charge_children,
            "charge_drug": charge_drug,
            "charge_theft": charge_theft,
        },
        allowed_filters=JOBSEEKER_ALLOWED_FILTERS,
    )
    total_items = session.execute(
        select(func.count()).select_from(base_statement.subquery())
    ).scalar_one()
    statement = apply_sorting(
        base_statement, sort=sort, allowed_sorts=JOBSEEKER_ALLOWED_SORTS
    )
    statement = apply_pagination(statement, pagination)
    items = session.execute(statement).unique().scalars().all()
    return build_paginated_response(
        items=[serialize_jobseeker_list_item(item) for item in items],
        total_items=total_items,
        pagination=pagination,
    )


def build_admin_jobseeker_detail(jobseeker: Jobseeker) -> AdminJobseekerDetailResponse:
    applications = [
        serialize_application_summary(application)
        for application in jobseeker.applications
    ]
    return AdminJobseekerDetailResponse(
        jobseeker=serialize_jobseeker(jobseeker), applications=applications
    )
