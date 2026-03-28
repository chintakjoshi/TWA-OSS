from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth import AuthContext, require_approved_employer, require_employer
from app.core.responses import PaginatedResponse
from app.db.session import get_db_session
from app.schemas.employer import (
    CreateJobListingRequest,
    EmployerApplicantPayload,
    EmployerListingApplicantPayload,
    EmployerProfileResponse,
    EmployerProfileUpdateRequest,
    JobListingPayload,
    JobListingResponse,
)
from app.services.common import (
    PaginationParams,
    SortParams,
    ensure_found,
    ensure_permission,
    get_pagination_params,
    get_sort_params,
)
from app.services.employer import (
    create_listing,
    get_employer_by_app_user_id,
    get_listing_by_id,
    list_employer_applicants,
    list_employer_listing_applicants,
    list_employer_listings,
    serialize_employer,
    serialize_listing,
    update_employer_profile,
)

router = APIRouter(tags=["employer"])


@router.get("/api/v1/employers/me", response_model=EmployerProfileResponse)
def get_my_employer_profile(
    auth_context: AuthContext = Depends(require_employer),
    session: Session = Depends(get_db_session),
) -> EmployerProfileResponse:
    employer = ensure_found(
        get_employer_by_app_user_id(session, auth_context.app_user_id),
        entity_name="Employer",
    )
    return EmployerProfileResponse(employer=serialize_employer(employer))


@router.patch("/api/v1/employers/me", response_model=EmployerProfileResponse)
def patch_my_employer_profile(
    payload: EmployerProfileUpdateRequest,
    auth_context: AuthContext = Depends(require_approved_employer),
    session: Session = Depends(get_db_session),
) -> EmployerProfileResponse:
    employer = ensure_found(
        get_employer_by_app_user_id(session, auth_context.app_user_id),
        entity_name="Employer",
    )
    employer = update_employer_profile(session, employer, payload)
    return EmployerProfileResponse(employer=serialize_employer(employer))


@router.post("/api/v1/employer/listings", response_model=JobListingResponse)
def create_employer_listing(
    payload: CreateJobListingRequest,
    auth_context: AuthContext = Depends(require_approved_employer),
    session: Session = Depends(get_db_session),
) -> JobListingResponse:
    employer = ensure_found(
        get_employer_by_app_user_id(session, auth_context.app_user_id),
        entity_name="Employer",
    )
    listing = create_listing(session, employer, payload)
    return JobListingResponse(listing=serialize_listing(listing))


@router.get(
    "/api/v1/employer/listings", response_model=PaginatedResponse[JobListingPayload]
)
def get_employer_listings(
    search: str | None = Query(default=None),
    review_status: str | None = Query(default=None),
    lifecycle_status: str | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    auth_context: AuthContext = Depends(require_employer),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[JobListingPayload]:
    employer = ensure_found(
        get_employer_by_app_user_id(session, auth_context.app_user_id),
        entity_name="Employer",
    )
    return list_employer_listings(
        session,
        employer,
        pagination=pagination,
        sort=sort,
        search=search,
        review_status=review_status,
        lifecycle_status=lifecycle_status,
    )


@router.get("/api/v1/employer/listings/{listing_id}", response_model=JobListingResponse)
def get_employer_listing(
    listing_id: UUID,
    auth_context: AuthContext = Depends(require_employer),
    session: Session = Depends(get_db_session),
) -> JobListingResponse:
    listing = ensure_found(
        get_listing_by_id(session, listing_id), entity_name="Job listing"
    )
    ensure_permission(listing.employer.app_user_id == auth_context.app_user_id)
    return JobListingResponse(listing=serialize_listing(listing))


@router.get(
    "/api/v1/employer/applicants",
    response_model=PaginatedResponse[EmployerApplicantPayload],
)
def get_employer_applicants(
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    job_listing_id: UUID | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    auth_context: AuthContext = Depends(require_approved_employer),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[EmployerApplicantPayload]:
    employer = ensure_found(
        get_employer_by_app_user_id(session, auth_context.app_user_id),
        entity_name="Employer",
    )
    return list_employer_applicants(
        session,
        employer,
        pagination=pagination,
        sort=sort,
        status=status,
        job_listing_id=job_listing_id,
        search=search,
    )


@router.get(
    "/api/v1/employer/listings/{listing_id}/applicants",
    response_model=PaginatedResponse[EmployerListingApplicantPayload],
)
def get_employer_listing_applicants(
    listing_id: UUID,
    search: str | None = Query(default=None),
    status: str | None = Query(default=None),
    pagination: PaginationParams = Depends(get_pagination_params),
    sort: SortParams = Depends(get_sort_params),
    auth_context: AuthContext = Depends(require_approved_employer),
    session: Session = Depends(get_db_session),
) -> PaginatedResponse[EmployerListingApplicantPayload]:
    listing = ensure_found(
        get_listing_by_id(session, listing_id), entity_name="Job listing"
    )
    ensure_permission(listing.employer.app_user_id == auth_context.app_user_id)
    return list_employer_listing_applicants(
        session,
        listing=listing,
        pagination=pagination,
        sort=sort,
        status=status,
        search=search,
    )
