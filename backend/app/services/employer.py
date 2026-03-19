from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.audit import write_audit
from app.core.exceptions import AppError
from app.models import AppUser, Application, Employer, JobListing, Jobseeker
from app.models.enums import EmployerReviewStatus, ListingLifecycleStatus, ListingReviewStatus, TransitRequirement
from app.schemas.employer import ChargeFlagsPayload
from app.services.common import (
    PaginationParams,
    SortParams,
    apply_filters,
    apply_pagination,
    apply_sorting,
    build_paginated_response,
    ensure_found,
)
from app.services.geocoding import geocode_address
from app.services.jobseeker import is_jobseeker_profile_complete, serialize_charge_flags
from app.services.notifications import get_notification_config
from app.services.notifications import notify_employer_review_decision, notify_listing_review_decision
from app.services.transit import compute_transit_accessibility

EMPLOYER_ALLOWED_FILTERS = {
    "review_status": Employer.review_status,
}
EMPLOYER_ALLOWED_SORTS = {
    "created_at": Employer.created_at,
    "updated_at": Employer.updated_at,
    "org_name": Employer.org_name,
}
LISTING_ALLOWED_FILTERS = {
    "review_status": JobListing.review_status,
    "lifecycle_status": JobListing.lifecycle_status,
    "employer_id": JobListing.employer_id,
}
LISTING_ALLOWED_SORTS = {
    "created_at": JobListing.created_at,
    "updated_at": JobListing.updated_at,
    "title": JobListing.title,
}



def _charge_flags_payload(*, sex_offense: bool, violent: bool, armed: bool, children: bool, drug: bool, theft: bool) -> ChargeFlagsPayload:
    return ChargeFlagsPayload(
        sex_offense=sex_offense,
        violent=violent,
        armed=armed,
        children=children,
        drug=drug,
        theft=theft,
    )



def serialize_employer(employer: Employer):
    from app.schemas.employer import EmployerProfilePayload

    return EmployerProfilePayload(
        id=employer.id,
        app_user_id=employer.app_user_id,
        auth_user_id=employer.app_user.auth_user_id,
        org_name=employer.org_name,
        contact_name=employer.contact_name,
        phone=employer.phone,
        address=employer.address,
        city=employer.city,
        zip=employer.zip,
        review_status=employer.review_status.value,
        review_note=employer.review_note,
        reviewed_by=employer.reviewed_by,
        reviewed_at=employer.reviewed_at,
        created_at=employer.created_at,
        updated_at=employer.updated_at,
    )



def serialize_listing(listing: JobListing, *, include_employer: bool = False):
    from app.schemas.employer import JobListingListItemPayload, JobListingPayload

    payload_type = JobListingListItemPayload if include_employer else JobListingPayload
    kwargs = {
        "id": listing.id,
        "employer_id": listing.employer_id,
        "title": listing.title,
        "description": listing.description,
        "location_address": listing.location_address,
        "city": listing.city,
        "zip": listing.zip,
        "transit_required": listing.transit_required.value,
        "disqualifying_charges": _charge_flags_payload(
            sex_offense=listing.disq_sex_offense,
            violent=listing.disq_violent,
            armed=listing.disq_armed,
            children=listing.disq_children,
            drug=listing.disq_drug,
            theft=listing.disq_theft,
        ),
        "transit_accessible": listing.transit_accessible,
        "job_lat": listing.job_lat,
        "job_lon": listing.job_lon,
        "review_status": listing.review_status.value,
        "lifecycle_status": listing.lifecycle_status.value,
        "review_note": listing.review_note,
        "reviewed_by": listing.reviewed_by,
        "reviewed_at": listing.reviewed_at,
        "created_at": listing.created_at,
        "updated_at": listing.updated_at,
    }
    if include_employer:
        kwargs["employer"] = serialize_employer(listing.employer)
    return payload_type(**kwargs)




def serialize_employer_applicant(application: Application):
    from app.schemas.employer import EmployerApplicantJobseekerPayload, EmployerListingApplicantPayload

    jobseeker = application.jobseeker
    return EmployerListingApplicantPayload(
        application_id=application.id,
        status=application.status.value,
        applied_at=application.applied_at,
        updated_at=application.updated_at,
        jobseeker=EmployerApplicantJobseekerPayload(
            id=jobseeker.id,
            full_name=jobseeker.full_name,
            phone=jobseeker.phone,
            address=jobseeker.address,
            city=jobseeker.city,
            zip=jobseeker.zip,
            transit_type=jobseeker.transit_type.value if jobseeker.transit_type else None,
            charges=serialize_charge_flags(jobseeker),
            profile_complete=is_jobseeker_profile_complete(jobseeker),
            status=jobseeker.status.value,
        ),
    )

def _enrich_listing_location_data(listing: JobListing) -> str | None:
    if not listing.location_address or not listing.city or not listing.zip:
        listing.job_lat = None
        listing.job_lon = None
        listing.transit_accessible = None
        return "Listing location is incomplete, so geocoding and transit computation were skipped."

    geocoded = geocode_address(
        address=listing.location_address,
        city=listing.city,
        zip_code=listing.zip,
    )
    if geocoded is None:
        listing.job_lat = None
        listing.job_lon = None
        listing.transit_accessible = None
        return "Geocoding failed for the listing address."

    listing.job_lat = geocoded.latitude
    listing.job_lon = geocoded.longitude
    transit_result = compute_transit_accessibility(job_lat=listing.job_lat, job_lon=listing.job_lon)
    listing.transit_accessible = transit_result.transit_accessible
    return transit_result.warning



def _write_location_warning_audit(session: Session, *, actor_id: UUID, listing: JobListing, warning: str | None) -> None:
    if warning is None:
        return
    write_audit(
        session,
        actor_id=actor_id,
        action="listing.location_warning",
        entity_type="job_listing",
        entity_id=listing.id,
        new_value={"warning": warning},
    )



def get_employer_by_app_user_id(session: Session, app_user_id: UUID) -> Employer | None:
    statement = select(Employer).options(joinedload(Employer.app_user)).where(Employer.app_user_id == app_user_id)
    return session.execute(statement).unique().scalar_one_or_none()



def get_employer_by_id(session: Session, employer_id: UUID) -> Employer | None:
    statement = select(Employer).options(joinedload(Employer.app_user)).where(Employer.id == employer_id)
    return session.execute(statement).unique().scalar_one_or_none()



def get_listing_by_id(session: Session, listing_id: UUID) -> JobListing | None:
    statement = (
        select(JobListing)
        .options(joinedload(JobListing.employer).joinedload(Employer.app_user))
        .where(JobListing.id == listing_id)
    )
    return session.execute(statement).unique().scalar_one_or_none()



def update_employer_profile(session: Session, employer: Employer, payload) -> Employer:
    for field in ("org_name", "contact_name", "phone", "address", "city", "zip"):
        value = getattr(payload, field)
        if value is not None:
            setattr(employer, field, value)
    session.commit()
    session.refresh(employer)
    return employer



def create_listing(session: Session, employer: Employer, payload) -> JobListing:
    listing = JobListing(
        employer_id=employer.id,
        title=payload.title,
        description=payload.description,
        location_address=payload.location_address,
        city=payload.city,
        zip=payload.zip,
        transit_required=TransitRequirement(payload.transit_required),
        disq_sex_offense=payload.disqualifying_charges.sex_offense,
        disq_violent=payload.disqualifying_charges.violent,
        disq_armed=payload.disqualifying_charges.armed,
        disq_children=payload.disqualifying_charges.children,
        disq_drug=payload.disqualifying_charges.drug,
        disq_theft=payload.disqualifying_charges.theft,
        review_status=ListingReviewStatus.PENDING,
        lifecycle_status=ListingLifecycleStatus.OPEN,
    )
    warning = _enrich_listing_location_data(listing)
    session.add(listing)
    session.flush()
    _write_location_warning_audit(session, actor_id=employer.app_user_id, listing=listing, warning=warning)
    write_audit(
        session,
        actor_id=employer.app_user_id,
        action="listing.created",
        entity_type="job_listing",
        entity_id=listing.id,
        new_value=serialize_listing(listing).model_dump(mode="json"),
    )
    session.commit()
    session.refresh(listing)
    return ensure_found(get_listing_by_id(session, listing.id), entity_name="Job listing")



def list_employer_listings(
    session: Session,
    employer: Employer,
    *,
    pagination: PaginationParams,
    sort: SortParams,
    review_status: str | None = None,
    lifecycle_status: str | None = None,
):
    base_statement = select(JobListing).where(JobListing.employer_id == employer.id)
    base_statement = apply_filters(
        base_statement,
        filters={"review_status": review_status, "lifecycle_status": lifecycle_status},
        allowed_filters=LISTING_ALLOWED_FILTERS,
    )
    total_items = session.execute(select(func.count()).select_from(base_statement.subquery())).scalar_one()
    statement = apply_sorting(base_statement, sort=sort, allowed_sorts=LISTING_ALLOWED_SORTS)
    statement = apply_pagination(statement, pagination)
    items = session.execute(statement).scalars().all()
    return build_paginated_response(
        items=[serialize_listing(item) for item in items],
        total_items=total_items,
        pagination=pagination,
    )



def list_employers(
    session: Session,
    *,
    pagination: PaginationParams,
    sort: SortParams,
    review_status: str | None = None,
    pending_only: bool = False,
):
    base_statement = select(Employer).options(joinedload(Employer.app_user))
    filters = {"review_status": review_status}
    if pending_only:
        filters["review_status"] = EmployerReviewStatus.PENDING.value
    base_statement = apply_filters(base_statement, filters=filters, allowed_filters=EMPLOYER_ALLOWED_FILTERS)
    total_items = session.execute(select(func.count()).select_from(base_statement.subquery())).scalar_one()
    statement = apply_sorting(base_statement, sort=sort, allowed_sorts=EMPLOYER_ALLOWED_SORTS)
    statement = apply_pagination(statement, pagination)
    items = session.execute(statement).unique().scalars().all()
    return build_paginated_response(
        items=[serialize_employer(item) for item in items],
        total_items=total_items,
        pagination=pagination,
    )



def list_listings(
    session: Session,
    *,
    pagination: PaginationParams,
    sort: SortParams,
    review_status: str | None = None,
    lifecycle_status: str | None = None,
    employer_id: UUID | None = None,
    pending_only: bool = False,
):
    base_statement = select(JobListing).options(joinedload(JobListing.employer).joinedload(Employer.app_user))
    filters = {
        "review_status": review_status,
        "lifecycle_status": lifecycle_status,
        "employer_id": employer_id,
    }
    if pending_only:
        filters["review_status"] = ListingReviewStatus.PENDING.value
    base_statement = apply_filters(base_statement, filters=filters, allowed_filters=LISTING_ALLOWED_FILTERS)
    total_items = session.execute(select(func.count()).select_from(base_statement.subquery())).scalar_one()
    statement = apply_sorting(base_statement, sort=sort, allowed_sorts=LISTING_ALLOWED_SORTS)
    statement = apply_pagination(statement, pagination)
    items = session.execute(statement).unique().scalars().all()
    return build_paginated_response(
        items=[serialize_listing(item, include_employer=True) for item in items],
        total_items=total_items,
        pagination=pagination,
    )



def review_employer(session: Session, *, employer: Employer, reviewer: AppUser, review_status: str, review_note: str | None) -> Employer:
    old_value = serialize_employer(employer).model_dump(mode="json")
    previous_review_status = employer.review_status
    employer.review_status = EmployerReviewStatus(review_status)
    employer.review_note = review_note
    employer.reviewed_by = reviewer.id
    employer.reviewed_at = datetime.now(timezone.utc)
    session.flush()
    write_audit(
        session,
        actor_id=reviewer.id,
        action=f"employer.{review_status}",
        entity_type="employer",
        entity_id=employer.id,
        old_value=old_value,
        new_value=serialize_employer(employer).model_dump(mode="json"),
    )
    session.commit()
    session.refresh(employer)
    if employer.review_status != previous_review_status and employer.review_status.value in {"approved", "rejected"}:
        notify_employer_review_decision(session, employer=employer)
    return employer



def review_listing(
    session: Session,
    *,
    listing: JobListing,
    reviewer: AppUser,
    review_status: str | None,
    lifecycle_status: str | None,
    review_note: str | None,
) -> JobListing:
    if review_status is None and lifecycle_status is None and review_note is None:
        raise AppError(status_code=422, code="VALIDATION_ERROR", detail="At least one listing review field must be provided.")

    old_value = serialize_listing(listing).model_dump(mode="json")
    previous_review_status = listing.review_status
    if review_status is not None:
        listing.review_status = ListingReviewStatus(review_status)
    if lifecycle_status is not None:
        listing.lifecycle_status = ListingLifecycleStatus(lifecycle_status)
    if review_note is not None:
        listing.review_note = review_note
    listing.reviewed_by = reviewer.id
    listing.reviewed_at = datetime.now(timezone.utc)

    warning = None
    if review_status == ListingReviewStatus.APPROVED.value:
        warning = _enrich_listing_location_data(listing)

    session.flush()
    _write_location_warning_audit(session, actor_id=reviewer.id, listing=listing, warning=warning)

    if lifecycle_status == ListingLifecycleStatus.CLOSED.value:
        action = "listing.closed"
    elif review_status is not None:
        action = f"listing.{review_status}"
    else:
        action = "listing.updated"

    write_audit(
        session,
        actor_id=reviewer.id,
        action=action,
        entity_type="job_listing",
        entity_id=listing.id,
        old_value=old_value,
        new_value=serialize_listing(listing).model_dump(mode="json"),
    )
    session.commit()
    session.refresh(listing)
    listing = ensure_found(get_listing_by_id(session, listing.id), entity_name="Job listing")
    if listing.review_status != previous_review_status and listing.review_status.value in {"approved", "rejected"}:
        notify_listing_review_decision(session, listing=listing)
    return listing


def list_employer_listing_applicants(
    session: Session,
    *,
    listing: JobListing,
    pagination: PaginationParams,
):
    config = get_notification_config(session)
    if not config.share_applicants_with_employer:
        raise AppError(
            status_code=403,
            code="APPLICANT_VISIBILITY_DISABLED",
            detail="Applicant visibility is currently disabled for employers.",
        )

    base_statement = (
        select(Application)
        .options(
            joinedload(Application.jobseeker).joinedload(Jobseeker.app_user),
            joinedload(Application.job_listing).joinedload(JobListing.employer),
        )
        .where(Application.job_listing_id == listing.id)
    )
    total_items = session.execute(select(func.count()).select_from(base_statement.subquery())).scalar_one()
    statement = apply_pagination(base_statement.order_by(Application.applied_at.desc()), pagination)
    items = session.execute(statement).unique().scalars().all()
    return build_paginated_response(
        items=[serialize_employer_applicant(item) for item in items],
        total_items=total_items,
        pagination=pagination,
    )
